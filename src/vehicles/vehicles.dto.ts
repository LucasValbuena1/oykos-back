import { ApiProperty, OmitType, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNumber,
  IsPositive,
  IsString,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { DATE_REGEX } from '../common/patterns.js';
import {
  EXPENSE_CATEGORIES,
  VEHICLE_TYPES,
  type ExpenseCategory,
  type VehicleType,
} from './vehicle.entities.js';

export class CreateVehicleDto {
  @ApiProperty({ example: 1 }) @IsInt() householdId!: number;

  @ApiProperty({
    example: 'KDT482',
    description: 'Carro: ABC123 · Moto: ABC12D',
  })
  @Transform(({ value }) =>
    typeof value === 'string'
      ? value.replace(/[\s-]/g, '').toUpperCase()
      : value,
  )
  @Matches(/^[A-Z]{3}\d{2}[A-Z0-9]$/, {
    message: 'plate debe ser una placa colombiana (ABC123 o ABC12D)',
  })
  plate!: string;

  @ApiProperty({ example: 'Mazda' }) @IsString() @Length(2, 40) brand!: string;
  @ApiProperty({ example: '3 Touring' })
  @IsString()
  @Length(1, 40)
  model!: string;
  @ApiProperty({ example: 2021 }) @IsInt() @Min(1950) @Max(2100) year!: number;
  @ApiProperty({ enum: VEHICLE_TYPES }) @IsIn(VEHICLE_TYPES) type!: VehicleType;
}

export class UpdateVehicleDto extends PartialType(
  OmitType(CreateVehicleDto, ['householdId', 'plate'] as const),
) {}

export class CreateExpenseDto {
  @ApiProperty({ enum: EXPENSE_CATEGORIES })
  @IsIn(EXPENSE_CATEGORIES)
  category!: ExpenseCategory;
  @ApiProperty({ example: 'Tanqueada' })
  @IsString()
  @Length(2, 150)
  description!: string;
  @ApiProperty({ example: 180000 }) @IsNumber() @IsPositive() amount!: number;
  @ApiProperty({ example: '2026-11-01' })
  @Matches(DATE_REGEX, { message: 'date debe tener formato YYYY-MM-DD' })
  date!: string;
}

export class VehiclesQueryDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  householdId!: number;
}
