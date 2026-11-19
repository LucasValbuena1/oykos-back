import { ApiProperty, OmitType, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsString,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { SERVICE_TYPES, type ServiceType } from './service.entity.js';

export class CreateServiceDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  householdId!: number;

  @ApiProperty({ enum: SERVICE_TYPES })
  @IsIn(SERVICE_TYPES)
  type!: ServiceType;

  @ApiProperty({ example: 'Enel Colombia' })
  @IsString()
  @Length(2, 80)
  provider!: string;

  @ApiProperty({ example: '1029384756', description: 'Entre 4 y 40 dígitos' })
  @Matches(/^\d{4,40}$/, {
    message: 'accountNumber debe tener entre 4 y 40 dígitos',
  })
  accountNumber!: string;

  @ApiProperty({ minimum: 1, maximum: 31, example: 15 })
  @IsInt()
  @Min(1)
  @Max(31)
  cutoffDay!: number;
}

export class UpdateServiceDto extends PartialType(
  OmitType(CreateServiceDto, ['householdId'] as const),
) {}

export class ServicesQueryDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  householdId!: number;
}
