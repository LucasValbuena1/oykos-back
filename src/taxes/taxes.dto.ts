import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { DATE_REGEX } from '../common/patterns.js';
import { TAX_TYPES, type TaxType } from './tax.entity.js';

export class CreateTaxDto {
  @ApiProperty({ enum: TAX_TYPES }) @IsIn(TAX_TYPES) type!: TaxType;
  @ApiPropertyOptional({
    example: 1,
    description: 'Obligatorio para predial y valorización',
  })
  @IsOptional()
  @IsInt()
  householdId?: number;
  @ApiPropertyOptional({
    example: 1,
    description: 'Obligatorio para vehicular',
  })
  @IsOptional()
  @IsInt()
  vehicleId?: number;
  @ApiProperty({ example: 2026 }) @IsInt() @Min(2000) @Max(2100) year!: number;
  @ApiProperty({ example: 2850000 }) @IsNumber() @IsPositive() amount!: number;
  @ApiProperty({ example: '2026-07-10' })
  @Matches(DATE_REGEX, { message: 'dueDate debe tener formato YYYY-MM-DD' })
  dueDate!: string;
}

export class UpdateTaxDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @IsPositive()
  amount?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @Matches(DATE_REGEX, { message: 'dueDate debe tener formato YYYY-MM-DD' })
  dueDate?: string;
}

export class PayTaxDto {
  @ApiPropertyOptional({ description: 'Por defecto hoy' })
  @IsOptional()
  @Matches(DATE_REGEX, { message: 'paidAt debe tener formato YYYY-MM-DD' })
  paidAt?: string;
  @ApiPropertyOptional({ description: 'Por defecto el valor del impuesto' })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  paidAmount?: number;
}

export class TaxesQueryDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  householdId!: number;
}
