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
import { Household } from '../households/household.entity.js';

export const SERVICE_TYPES = [
  'agua',
  'energia',
  'gas',
  'internet',
  'aseo',
] as const;
export type ServiceType = (typeof SERVICE_TYPES)[number];

/** Un servicio público de un hogar (se llama UtilityService para no chocar con @Injectable services). */
@Entity('services')
export class UtilityService {
  @ApiProperty() @PrimaryGeneratedColumn() id: number;

  @ApiProperty() @Column({ name: 'household_id' }) householdId: number;

  @ManyToOne(() => Household, (h) => h.services, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'household_id' })
  household?: Relation<Household>;

  @ApiProperty({ enum: SERVICE_TYPES })
  @Column({ type: 'varchar' })
  type: ServiceType;
  @ApiProperty({ example: 'Enel Colombia' }) @Column() provider: string;
  @ApiProperty({ example: '1029384756' })
  @Column({ name: 'account_number' })
  accountNumber: string;
  @ApiProperty({ minimum: 1, maximum: 31 })
  @Column({ name: 'cutoff_day', type: 'int' })
  cutoffDay: number;

  @ApiProperty() @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @ApiProperty() @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
