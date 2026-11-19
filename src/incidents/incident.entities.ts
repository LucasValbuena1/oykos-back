import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  type Relation,
} from 'typeorm';
import { UtilityService } from '../services/service.entity.js';

export const INCIDENT_TYPES = ['corte', 'falla', 'cobro'] as const;
export const INCIDENT_STATUSES = [
  'abierto',
  'en_gestion',
  'resuelto',
  'cerrado',
] as const;
export type IncidentType = (typeof INCIDENT_TYPES)[number];
export type IncidentStatus = (typeof INCIDENT_STATUSES)[number];

/** Transiciones permitidas del ciclo de vida de un incidente. */
export const TRANSITIONS: Record<IncidentStatus, IncidentStatus[]> = {
  abierto: ['en_gestion', 'resuelto', 'cerrado'],
  en_gestion: ['abierto', 'resuelto', 'cerrado'],
  resuelto: ['abierto', 'en_gestion', 'cerrado'],
  // Un incidente cerrado ya no cambia: si el problema vuelve, se reporta uno nuevo.
  cerrado: [],
};

@Entity('incident_logs')
export class IncidentLog {
  @ApiProperty() @PrimaryGeneratedColumn() id: number;
  @Column({ name: 'incident_id' }) incidentId: number;

  @ManyToOne(() => Incident, (i) => i.log, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'incident_id' })
  incident?: Relation<Incident>;

  @ApiProperty({ enum: INCIDENT_STATUSES })
  @Column({ type: 'varchar' })
  status: IncidentStatus;
  @ApiProperty() @Column() comment: string;
  @ApiProperty() @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
}

@Entity('incidents')
export class Incident {
  @ApiProperty() @PrimaryGeneratedColumn() id: number;
  @ApiProperty({ example: 'INC-2026-0001' })
  @Column({ unique: true })
  code: string;
  @ApiProperty() @Column({ name: 'service_id' }) serviceId: number;

  @ManyToOne(() => UtilityService, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'service_id' })
  service?: Relation<UtilityService>;

  @ApiProperty({ enum: INCIDENT_TYPES })
  @Column({ type: 'varchar' })
  type: IncidentType;
  @ApiProperty({ example: '2026-10-20' })
  @Column({ name: 'started_at', type: 'date' })
  startedAt: string;
  @ApiProperty() @Column() description: string;
  @ApiPropertyOptional({ type: String, nullable: true })
  @Column({ name: 'filing_number', type: 'varchar', nullable: true })
  filingNumber: string | null;
  @ApiProperty({ enum: INCIDENT_STATUSES })
  @Column({ type: 'varchar', default: 'abierto' })
  status: IncidentStatus;

  @ApiProperty({ type: [IncidentLog] })
  @OneToMany(() => IncidentLog, (l) => l.incident, { cascade: ['insert'] })
  log?: Relation<IncidentLog[]>;

  @ApiProperty() @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @ApiProperty() @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
  @ApiPropertyOptional({ type: Date, nullable: true })
  @Column({ name: 'closed_at', type: 'timestamp', nullable: true })
  closedAt: Date | null;
}
