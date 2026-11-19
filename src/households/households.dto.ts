import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsIn, IsInt, IsString, Length, Max, Min } from 'class-validator';
import { PROPERTY_TYPES, type PropertyType } from './household.entity.js';

export class CreateHouseholdDto {
  @ApiProperty({ example: 'Casa Chapinero' })
  @IsString()
  @Length(2, 80)
  name!: string;

  @ApiProperty({ enum: PROPERTY_TYPES })
  @IsIn(PROPERTY_TYPES)
  type!: PropertyType;

  @ApiProperty({ example: 'Calle 57 # 9-30' })
  @IsString()
  @Length(5, 150)
  address!: string;

  @ApiProperty({ example: 'Bogotá' })
  @IsString()
  @Length(2, 80)
  city!: string;

  @ApiProperty({ minimum: 1, maximum: 6, example: 4 })
  @IsInt()
  @Min(1)
  @Max(6)
  stratum!: number;
}

export class UpdateHouseholdDto extends PartialType(CreateHouseholdDto) {}
