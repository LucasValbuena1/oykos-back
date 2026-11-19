import { Body, Controller, Get, HttpCode, Post, Query } from '@nestjs/common';
import {
  ApiBadGatewayResponse,
  ApiBearerAuth,
  ApiOkResponse,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '@nestjs/authentication';
import { Can } from '@nestjs/authorization';
import { Throttle } from '@nestjs/throttler';
import { AiService } from './ai.service.js';
import { RecommendationsQueryDto, ScanReceiptDto } from './ai.dto.js';
import type { User } from '../users/user.entity.js';

@ApiTags('Inteligencia artificial')
@ApiBearerAuth()
@ApiServiceUnavailableResponse({ description: 'Falta ANTHROPIC_API_KEY' })
@ApiBadGatewayResponse({ description: 'Claude no respondió' })
@Can.Anyone()
@Throttle({ default: { limit: 10, ttl: 60_000 } })
@Controller('ai')
export class AiController {
  constructor(private readonly ai: AiService) {}

  @ApiOkResponse({
    description: 'Campos leídos con su confianza y el servicio sugerido',
  })
  @ApiUnprocessableEntityResponse({ description: 'No se pudo leer el recibo' })
  @HttpCode(200)
  @Post('receipts/scan')
  scan(@Body() dto: ScanReceiptDto, @CurrentUser() user: User) {
    return this.ai.scanReceipt(dto, user);
  }

  @ApiOkResponse({ description: 'Recomendaciones de ahorro por servicio' })
  @Get('recommendations')
  recommendations(
    @Query() q: RecommendationsQueryDto,
    @CurrentUser() user: User,
  ) {
    return this.ai.recommendations(q, user);
  }
}
