import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ClaudeClient } from './claude.client.js';
import { ServicesService } from '../services/services.service.js';
import { InvoicesService } from '../invoices/invoices.service.js';
import {
  matchService,
  monthlyFacts,
  sanitizeExtraction,
  sanitizeRecommendations,
  validateReceiptFile,
} from './ai.logic.js';
import type { RecommendationsQueryDto, ScanReceiptDto } from './ai.dto.js';
import type { User } from '../users/user.entity.js';

const fieldSchema = (type: string, extra: Record<string, unknown> = {}) => ({
  type: 'object',
  properties: {
    value: { type: [type, 'null'], ...extra },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
  },
  required: ['value', 'confidence'],
});

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly claude: ClaudeClient,
    private readonly services: ServicesService,
    private readonly invoices: InvoicesService,
  ) {}

  /** Lee un recibo con Claude y propone a qué servicio del hogar pertenece. */
  async scanReceipt(dto: ScanReceiptDto, user: User) {
    const services = await this.services.findByHousehold(dto.householdId, user);
    const fileError = validateReceiptFile(dto.mediaType, dto.data);
    if (fileError) throw new BadRequestException(fileError);
    if (!this.claude.isConfigured())
      throw new ServiceUnavailableException(
        'La IA no está configurada (falta ANTHROPIC_API_KEY)',
      );

    const source = {
      type: 'base64' as const,
      media_type: dto.mediaType,
      data: dto.data,
    };
    let raw: unknown;
    try {
      raw = await this.claude.structured({
        system:
          'Eres un lector de facturas de servicios públicos colombianas. Extrae solo lo que se lee en el documento; si un dato no aparece, value es null. ' +
          'Fechas en YYYY-MM-DD, periodo en YYYY-MM, valores en pesos sin separadores. confidence entre 0 y 1.',
        content: [
          dto.mediaType === 'application/pdf'
            ? {
                type: 'document',
                source: source as {
                  type: 'base64';
                  media_type: 'application/pdf';
                  data: string;
                },
              }
            : {
                type: 'image',
                source: source as {
                  type: 'base64';
                  media_type: 'image/png';
                  data: string;
                },
              },
          {
            type: 'text',
            text: `Empresas registradas en el hogar: ${services.map((s) => s.provider).join(', ') || 'ninguna'}.`,
          },
        ],
        tool: {
          name: 'registrar_recibo',
          description: 'Devuelve los campos leídos del recibo',
          input_schema: {
            type: 'object',
            properties: {
              provider: fieldSchema('string'),
              serviceType: fieldSchema('string', {
                enum: ['agua', 'energia', 'gas', 'internet', 'aseo', null],
              }),
              reference: fieldSchema('string'),
              amount: fieldSchema('number'),
              consumption: fieldSchema('number'),
              period: fieldSchema('string'),
              cutoffDate: fieldSchema('string'),
              dueDate: fieldSchema('string'),
            },
            required: [
              'provider',
              'serviceType',
              'reference',
              'amount',
              'consumption',
              'period',
              'cutoffDate',
              'dueDate',
            ],
          },
        },
      });
    } catch (e) {
      this.logger.error(`Error al leer el recibo: ${(e as Error).message}`);
      throw new BadGatewayException('La IA no respondió; intenta de nuevo');
    }
    const extraction = sanitizeExtraction(raw);
    if (Object.values(extraction).every((f) => f.value === null)) {
      throw new UnprocessableEntityException(
        'No se pudo leer el recibo: toma una foto más nítida',
      );
    }
    const match = matchService(extraction, services);
    return { extraction, suggestedServiceId: match?.id ?? null };
  }

  /** Recomendaciones de ahorro a partir del historial de facturas del hogar. */
  async recommendations(q: RecommendationsQueryDto, user: User) {
    const invoices = await this.invoices.findAll(
      { householdId: q.householdId },
      user,
    );
    const facts = monthlyFacts(invoices);
    if (facts.length === 0)
      return { sufficientHistory: false, recommendations: [] };
    if (!this.claude.isConfigured())
      throw new ServiceUnavailableException(
        'La IA no está configurada (falta ANTHROPIC_API_KEY)',
      );
    let raw: unknown;
    try {
      raw = await this.claude.structured({
        system:
          'Eres un asesor de ahorro en servicios públicos para hogares colombianos. Propón hasta 3 recomendaciones concretas, ' +
          'cada una para uno de los servicios dados, con un ahorro mensual estimado realista en pesos.',
        content: [{ type: 'text', text: JSON.stringify({ servicios: facts }) }],
        tool: {
          name: 'recomendar',
          description: 'Devuelve las recomendaciones de ahorro',
          input_schema: {
            type: 'object',
            properties: {
              recommendations: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    serviceType: {
                      type: 'string',
                      enum: facts.map((f) => f.serviceType),
                    },
                    title: { type: 'string' },
                    reason: { type: 'string' },
                    estimatedSaving: { type: 'number' },
                  },
                  required: [
                    'serviceType',
                    'title',
                    'reason',
                    'estimatedSaving',
                  ],
                },
              },
            },
            required: ['recommendations'],
          },
        },
      });
    } catch (e) {
      this.logger.error(
        `Error al pedir recomendaciones: ${(e as Error).message}`,
      );
      throw new BadGatewayException('La IA no respondió; intenta de nuevo');
    }
    return {
      sufficientHistory: true,
      facts,
      recommendations: sanitizeRecommendations(raw, facts),
    };
  }
}
