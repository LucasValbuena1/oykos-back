import { Test } from '@nestjs/testing';
import {
  BadGatewayException,
  BadRequestException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { AiService } from './ai.service.js';
import { ClaudeClient } from './claude.client.js';
import { ServicesService } from '../services/services.service.js';
import { InvoicesService } from '../invoices/invoices.service.js';
import { lucas } from '../../test/helpers.js';

describe('AiService', () => {
  let service: AiService;
  const claude = { isConfigured: vi.fn(() => true), structured: vi.fn() };
  const services = {
    findByHousehold: vi.fn(async () => [
      { id: 1, type: 'energia', provider: 'Enel Colombia' },
    ]),
  };
  const invoices = { findAll: vi.fn(async () => [] as unknown[]) };

  beforeEach(async () => {
    claude.isConfigured.mockReturnValue(true);
    claude.structured.mockReset();
    const module = await Test.createTestingModule({
      providers: [
        AiService,
        { provide: ClaudeClient, useValue: claude },
        { provide: ServicesService, useValue: services },
        { provide: InvoicesService, useValue: invoices },
      ],
    }).compile();
    service = module.get(AiService);
  });

  const dto = { householdId: 1, mediaType: 'image/png' as const, data: 'QUJD' };

  it('lee el recibo y sugiere el servicio del hogar', async () => {
    claude.structured.mockResolvedValue({
      provider: { value: 'ENEL', confidence: 0.9 },
      serviceType: { value: 'energia', confidence: 0.9 },
      amount: { value: 1000, confidence: 0.8 },
    });
    const r = await service.scanReceipt(dto, lucas);
    expect(r.suggestedServiceId).toBe(1);
    expect(r.extraction.amount.value).toBe(1000);
  });

  it('también acepta PDF', async () => {
    claude.structured.mockResolvedValue({
      amount: { value: 5, confidence: 1 },
    });
    await service.scanReceipt({ ...dto, mediaType: 'application/pdf' }, lucas);
    expect(claude.structured.mock.calls[0][0].content[0].type).toBe('document');
  });

  it('400 con un archivo inválido, 503 sin API key, 502 si Claude falla y 422 si no se lee nada', async () => {
    await expect(
      service.scanReceipt({ ...dto, data: '%%' }, lucas),
    ).rejects.toThrow(BadRequestException);
    claude.isConfigured.mockReturnValue(false);
    await expect(service.scanReceipt(dto, lucas)).rejects.toThrow(
      ServiceUnavailableException,
    );
    claude.isConfigured.mockReturnValue(true);
    claude.structured.mockRejectedValue(new Error('timeout'));
    await expect(service.scanReceipt(dto, lucas)).rejects.toThrow(
      BadGatewayException,
    );
    claude.structured.mockResolvedValue({});
    await expect(service.scanReceipt(dto, lucas)).rejects.toThrow(
      UnprocessableEntityException,
    );
  });

  it('sin historial suficiente no llama a Claude', async () => {
    invoices.findAll.mockResolvedValue([]);
    expect(await service.recommendations({ householdId: 1 }, lucas)).toEqual({
      sufficientHistory: false,
      recommendations: [],
    });
    expect(claude.structured).not.toHaveBeenCalled();
  });

  it('devuelve recomendaciones sanitizadas y maneja fallas', async () => {
    const s = { id: 1, type: 'energia', provider: 'Enel' };
    invoices.findAll.mockResolvedValue([
      { period: '2026-09', amount: 100, consumption: 1, service: s },
      { period: '2026-10', amount: 100, consumption: 1, service: s },
    ]);
    claude.structured.mockResolvedValue({
      recommendations: [
        {
          serviceType: 'energia',
          title: 'Bombillos LED',
          reason: 'Gastan 80 % menos que los incandescentes.',
          estimatedSaving: 20,
        },
      ],
    });
    const r = await service.recommendations({ householdId: 1 }, lucas);
    expect(r.recommendations).toHaveLength(1);
    claude.structured.mockRejectedValue(new Error('x'));
    await expect(
      service.recommendations({ householdId: 1 }, lucas),
    ).rejects.toThrow(BadGatewayException);
    claude.isConfigured.mockReturnValue(false);
    await expect(
      service.recommendations({ householdId: 1 }, lucas),
    ).rejects.toThrow(ServiceUnavailableException);
  });
});
