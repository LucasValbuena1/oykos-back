import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '@nestjs/authentication';
import { Can } from '@nestjs/authorization';
import { ReportsService } from './reports.service.js';
import { ReportQueryDto } from './reports.dto.js';
import type { User } from '../users/user.entity.js';

@ApiTags('Reportes')
@ApiBearerAuth()
@Can.Anyone()
@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @ApiOkResponse({
    description:
      'Total, variación frente al periodo anterior, desglose por servicio y serie mensual',
  })
  @ApiBadRequestResponse({ description: 'Rango inválido o mayor a 24 meses' })
  @Get()
  generate(@Query() q: ReportQueryDto, @CurrentUser() user: User) {
    return this.reports.generate(q, user);
  }
}
