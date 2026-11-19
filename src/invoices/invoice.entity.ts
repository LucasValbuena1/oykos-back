import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  type Relation,
} from 'typeorm';
import { numeric } from '../common/numeric.transformer.js';
import { daysBetween, today } from '../common/dates.js';
import { UtilityService } from '../services/service.entity.js';

export const INVOICE_SOURCES = ['manual', 'foto', 'ia'] as const;
export type InvoiceStatus = 'pendiente' | 'pagada';
export type InvoiceDisplayStatus = InvoiceStatus | 'vencida' | 'por_vencer';
/** Días antes del vencimiento en que una factura pasa a "por vencer". */
export const DUE_SOON_DAYS = 5;

export function displayStatus(
  inv: { status: InvoiceStatus; dueDate: string },
  now = today(),
): InvoiceDisplayStatus {
  if (inv.status === 'pagada') return 'pagada';
  const left = daysBetween(now, inv.dueDate);
  if (left < 0) return 'vencida';
  return left <= DUE_SOON_DAYS ? 'por_vencer' : 'pendiente';
}

@Entity('invoices')
export class Invoice {
  @ApiProperty() @PrimaryGeneratedColumn() id: number;

  @ApiProperty() @Column({ name: 'service_id' }) serviceId: number;

  @ManyToOne(() => UtilityService, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'service_id' })
  service?: Relation<UtilityService>;

  @ApiProperty({ example: '2026-10', description: 'Periodo facturado YYYY-MM' })
  @Column({ type: 'char', length: 7 })
  period: string;
  @ApiProperty({ example: 260 })
  @Column({ type: 'numeric', transformer: numeric })
  consumption: number;
  @ApiProperty({ example: 231000 })
  @Column({ type: 'numeric', transformer: numeric })
  amount: number;
  @ApiProperty({ example: '2026-11-05' })
  @Column({ name: 'due_date', type: 'date' })
  dueDate: string;
  @ApiPropertyOptional({ type: String, nullable: true })
  @Column({ name: 'cutoff_date', type: 'date', nullable: true })
  cutoffDate: string | null;
  @ApiPropertyOptional({ type: String, nullable: true })
  @Column({ type: 'varchar', nullable: true })
  reference: string | null;
  @ApiProperty({ enum: ['pendiente', 'pagada'] })
  @Column({ type: 'varchar', default: 'pendiente' })
  status: InvoiceStatus;
  @ApiPropertyOptional({ type: String, nullable: true })
  @Column({ name: 'paid_at', type: 'date', nullable: true })
  paidAt: string | null;
  @ApiProperty({ enum: INVOICE_SOURCES })
  @Column({ type: 'varchar', default: 'manual' })
  source: (typeof INVOICE_SOURCES)[number];

  @ApiProperty() @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @ApiProperty() @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;

  /** Estado que ve el usuario: vencida y por vencer se calculan con la fecha de hoy. */
  @ApiProperty({ enum: ['pendiente', 'pagada', 'vencida', 'por_vencer'] })
  @Expose()
  get displayStatus(): InvoiceDisplayStatus {
    return displayStatus(this);
  }
}
