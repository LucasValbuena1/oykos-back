import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Matches } from 'class-validator';
import { PERIOD_REGEX } from '../common/patterns.js';

export class CalendarQueryDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  householdId!: number;
  @ApiProperty({ example: '2026-11' })
  @Matches(PERIOD_REGEX, { message: 'month debe tener formato YYYY-MM' })
  month!: string;
}
