import {
  ApiProperty,
  ApiPropertyOptional,
  PickType,
  PartialType,
} from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
} from 'class-validator';
import {
  CHANNELS,
  THRESHOLD_TYPES,
  type ThresholdType,
} from './alert.entities.js';

export class CreateAlertRuleDto {
  @ApiProperty({ example: 1 }) @IsInt() serviceId!: number;
  @ApiProperty({ enum: THRESHOLD_TYPES })
  @IsIn(THRESHOLD_TYPES)
  thresholdType!: ThresholdType;
  @ApiProperty({ example: 220000 })
  @IsNumber()
  @IsPositive()
  threshold!: number;
  @ApiPropertyOptional({ enum: CHANNELS, default: 'app' })
  @IsOptional()
  @IsIn(CHANNELS)
  channel?: (typeof CHANNELS)[number];
}

export class UpdateAlertRuleDto extends PartialType(
  PickType(CreateAlertRuleDto, ['threshold', 'channel'] as const),
) {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() active?: boolean;
}

export class HouseholdQueryDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  householdId!: number;
}
