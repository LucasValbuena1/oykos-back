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
import { today } from '../common/dates.js';
import { Household } from '../households/household.entity.js';
import { Vehicle } from '../vehicles/vehicle.entities.js';

export const TAX_TYPES = ['predial', 'vehicular', 'valorizacion'] as const;
export type TaxType = (typeof TAX_TYPES)[number];
export type TaxStatus = 'pendiente' | 'pagado';

@Entity('taxes')
export class Tax {
  @ApiProperty() @PrimaryGeneratedColumn() id: number;
  @ApiProperty({ enum: TAX_TYPES }) @Column({ type: 'varchar' }) type: TaxType;

  @ApiPropertyOptional({ type: Number, nullable: true })
  @Column({ name: 'household_id', type: 'int', nullable: true })
  householdId: number | null;
  @ManyToOne(() => Household, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'household_id' })
  household?: Relation<Household> | null;

  @ApiPropertyOptional({ type: Number, nullable: true })
  @Column({ name: 'vehicle_id', type: 'int', nullable: true })
  vehicleId: number | null;
  @ManyToOne(() => Vehicle, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vehicle_id' })
  vehicle?: Relation<Vehicle> | null;

  @ApiProperty({ example: 2026 }) @Column({ type: 'int' }) year: number;
  @ApiProperty({ example: 910000 })
  @Column({ type: 'numeric', transformer: numeric })
  amount: number;
  @ApiProperty({ example: '2026-12-11' })
  @Column({ name: 'due_date', type: 'date' })
  dueDate: string;
  @ApiProperty({ enum: ['pendiente', 'pagado'] })
  @Column({ type: 'varchar', default: 'pendiente' })
  status: TaxStatus;
  @ApiPropertyOptional({ type: String, nullable: true })
  @Column({ name: 'paid_at', type: 'date', nullable: true })
  paidAt: string | null;
  @ApiPropertyOptional({ type: Number, nullable: true })
  @Column({
    name: 'paid_amount',
    type: 'numeric',
    nullable: true,
    transformer: numeric,
  })
  paidAmount: number | null;

  @ApiProperty() @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @ApiProperty() @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;

  @ApiProperty({ enum: ['pendiente', 'pagado', 'vencido'] })
  @Expose()
  get displayStatus(): TaxStatus | 'vencido' {
    return this.status === 'pendiente' && this.dueDate < today()
      ? 'vencido'
      : this.status;
  }
}
