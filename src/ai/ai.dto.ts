import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsString } from 'class-validator';
import { ALLOWED_MEDIA } from './ai.logic.js';

export class ScanReceiptDto {
  @ApiProperty({
    example: 1,
    description: 'Hogar donde se buscará el servicio del recibo',
  })
  @IsInt()
  householdId!: number;
  @ApiProperty({ enum: ALLOWED_MEDIA })
  @IsIn(ALLOWED_MEDIA)
  mediaType!: (typeof ALLOWED_MEDIA)[number];
  @ApiProperty({ description: 'Archivo en base64, sin el prefijo data:' })
  @IsString()
  data!: string;
}

export class RecommendationsQueryDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  householdId!: number;
}
