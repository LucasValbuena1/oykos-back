import { ApiProperty } from '@nestjs/swagger';
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
import { UtilityService } from '../services/service.entity.js';
import { Invoice } from '../invoices/invoice.entity.js';

export const THRESHOLD_TYPES = ['consumo', 'valor'] as const;
export const CHANNELS = ['app', 'email', 'ambos'] as const;
export type ThresholdType = (typeof THRESHOLD_TYPES)[number];

@Entity('alert_rules')
export class AlertRule {
  @ApiProperty() @PrimaryGeneratedColumn() id: number;
  @ApiProperty() @Column({ name: 'service_id' }) serviceId: number;

  @ManyToOne(() => UtilityService, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'service_id' })
  service?: Relation<UtilityService>;

  @ApiProperty({ enum: THRESHOLD_TYPES })
  @Column({ name: 'threshold_type', type: 'varchar' })
  thresholdType: ThresholdType;
  @ApiProperty({ example: 220000 })
  @Column({ type: 'numeric', transformer: numeric })
  threshold: number;
  @ApiProperty({ enum: CHANNELS })
  @Column({ type: 'varchar', default: 'app' })
  channel: (typeof CHANNELS)[number];
  @ApiProperty() @Column({ default: true }) active: boolean;
  @ApiProperty() @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @ApiProperty() @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}

@Entity('notifications')
export class AppNotification {
  @ApiProperty() @PrimaryGeneratedColumn() id: number;
  @ApiProperty() @Column({ name: 'rule_id' }) ruleId: number;

  @ManyToOne(() => AlertRule, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'rule_id' })
  rule?: Relation<AlertRule>;

  @ApiProperty() @Column({ name: 'invoice_id' }) invoiceId: number;

  @ManyToOne(() => Invoice, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'invoice_id' })
  invoice?: Relation<Invoice>;

  @ApiProperty({
    description: 'Consumo o valor de la factura que superó el umbral',
  })
  @Column({ type: 'numeric', transformer: numeric })
  value: number;

  @ApiProperty() @Column({ default: false }) read: boolean;
  @ApiProperty() @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
}
