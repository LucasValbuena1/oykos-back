import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';
import { DATE_REGEX } from '../common/patterns.js';
import {
  INCIDENT_STATUSES,
  INCIDENT_TYPES,
  type IncidentStatus,
  type IncidentType,
} from './incident.entities.js';

export class CreateIncidentDto {
  @ApiProperty({ example: 1 }) @IsInt() serviceId!: number;
  @ApiProperty({ enum: INCIDENT_TYPES })
  @IsIn(INCIDENT_TYPES)
  type!: IncidentType;
  @ApiProperty({ example: '2026-11-15' })
  @Matches(DATE_REGEX, { message: 'startedAt debe tener formato YYYY-MM-DD' })
  startedAt!: string;
  @ApiProperty({ example: 'Sin luz desde las 6 a. m. en todo el sector' })
  @IsString()
  @Length(10, 500)
  description!: string;
  @ApiPropertyOptional({ example: 'ENEL-55821' })
  @IsOptional()
  @Matches(/^[A-Za-z0-9-]{3,40}$/)
  filingNumber?: string;
}

export class ChangeIncidentStatusDto {
  @ApiProperty({ enum: INCIDENT_STATUSES })
  @IsIn(INCIDENT_STATUSES)
  status!: IncidentStatus;
  @ApiProperty({ example: 'La empresa confirmó la visita técnica' })
  @IsString()
  @Length(3, 500)
  comment!: string;
  @ApiPropertyOptional({
    example: '2026-11-16',
    description: 'Fecha de solución al cerrar (por defecto hoy)',
  })
  @IsOptional()
  @Matches(DATE_REGEX, { message: 'closedAt debe tener formato YYYY-MM-DD' })
  closedAt?: string;
  @ApiPropertyOptional({ description: 'Radicado de la reclamación' })
  @IsOptional()
  @Matches(/^[A-Za-z0-9-]{3,40}$/)
  filingNumber?: string;
}

export class IncidentsQueryDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  householdId!: number;
  @ApiPropertyOptional({ enum: INCIDENT_STATUSES })
  @IsOptional()
  @IsIn(INCIDENT_STATUSES)
  status?: IncidentStatus;
}

export class UpdateIncidentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(10, 500)
  description?: string;
  @ApiPropertyOptional({ description: 'Vacío para quitarlo' })
  @IsOptional()
  @Matches(/^([A-Za-z0-9-]{3,40})?$/)
  filingNumber?: string;
}
