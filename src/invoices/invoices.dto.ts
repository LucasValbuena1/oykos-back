import {
  ApiProperty,
  ApiPropertyOptional,
  OmitType,
  PartialType,
} from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  Matches,
  Min,
} from 'class-validator';
import { DATE_REGEX, PERIOD_REGEX } from '../common/patterns.js';
import { INVOICE_SOURCES } from './invoice.entity.js';

export class CreateInvoiceDto {
  @ApiProperty({ example: 1 }) @IsInt() serviceId!: number;

  @ApiProperty({ example: '2026-11' })
  @Matches(PERIOD_REGEX, { message: 'period debe tener formato YYYY-MM' })
  period!: string;

  @ApiProperty({ example: 240 }) @IsNumber() @Min(0) consumption!: number;
  @ApiProperty({ example: 210000 }) @IsNumber() @IsPositive() amount!: number;

  @ApiProperty({ example: '2026-12-05' })
  @Matches(DATE_REGEX, { message: 'dueDate debe tener formato YYYY-MM-DD' })
  dueDate!: string;

  @ApiPropertyOptional({ example: '2026-11-15' })
  @IsOptional()
  @Matches(DATE_REGEX, { message: 'cutoffDate debe tener formato YYYY-MM-DD' })
  cutoffDate?: string;

  @ApiPropertyOptional({ example: '900100203' })
  @IsOptional()
  @Matches(/^[A-Za-z0-9-]{3,40}$/, {
    message: 'reference solo admite letras, números y guiones (3 a 40)',
  })
  reference?: string;

  @ApiPropertyOptional({ enum: INVOICE_SOURCES, default: 'manual' })
  @IsOptional()
  @IsIn(INVOICE_SOURCES)
  source?: (typeof INVOICE_SOURCES)[number];
}

export class UpdateInvoiceDto extends PartialType(
  OmitType(CreateInvoiceDto, ['serviceId', 'source'] as const),
) {}

export class PayInvoiceDto {
  @ApiPropertyOptional({
    example: '2026-11-02',
    description: 'Por defecto hoy. No puede ser futura.',
  })
  @IsOptional()
  @Matches(DATE_REGEX, { message: 'paidAt debe tener formato YYYY-MM-DD' })
  paidAt?: string;
}

export class InvoicesQueryDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  householdId!: number;

  @ApiPropertyOptional({
    enum: ['pendiente', 'pagada', 'vencida', 'por_vencer'],
  })
  @IsOptional()
  @IsIn(['pendiente', 'pagada', 'vencida', 'por_vencer'])
  status?: 'pendiente' | 'pagada' | 'vencida' | 'por_vencer';

  @ApiPropertyOptional({ example: '2026-10' })
  @IsOptional()
  @Matches(PERIOD_REGEX, { message: 'period debe tener formato YYYY-MM' })
  period?: string;
}
