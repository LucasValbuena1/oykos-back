import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, Matches } from 'class-validator';
import { PERIOD_REGEX } from '../common/patterns.js';
import type { ReportType } from './reports.logic.js';

export class ReportQueryDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  householdId!: number;
  @ApiProperty({ enum: ['consumo', 'gastos', 'impuestos'] })
  @IsIn(['consumo', 'gastos', 'impuestos'])
  type!: ReportType;
  @ApiProperty({ example: '2026-08' })
  @Matches(PERIOD_REGEX, { message: 'from debe tener formato YYYY-MM' })
  from!: string;
  @ApiProperty({ example: '2026-10' })
  @Matches(PERIOD_REGEX, { message: 'to debe tener formato YYYY-MM' })
  to!: string;
}
