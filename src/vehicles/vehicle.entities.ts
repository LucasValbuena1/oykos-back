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
import { Household } from '../households/household.entity.js';

export const VEHICLE_TYPES = [
  'automovil',
  'camioneta',
  'moto',
  'otro',
] as const;
export type VehicleType = (typeof VEHICLE_TYPES)[number];
export const EXPENSE_CATEGORIES = [
  'combustible',
  'mantenimiento',
  'seguro',
  'otro',
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

@Entity('vehicles')
export class Vehicle {
  @ApiProperty() @PrimaryGeneratedColumn() id: number;
  @ApiProperty() @Column({ name: 'household_id' }) householdId: number;

  @ManyToOne(() => Household, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'household_id' })
  household?: Relation<Household>;

  @ApiProperty({ example: 'KDT482' }) @Column({ unique: true }) plate: string;
  @ApiProperty({ example: 'Mazda' }) @Column() brand: string;
  @ApiProperty({ example: '3 Touring' }) @Column() model: string;
  @ApiProperty({ example: 2021 }) @Column({ type: 'int' }) year: number;
  @ApiProperty({ enum: VEHICLE_TYPES })
  @Column({ type: 'varchar' })
  type: VehicleType;
  @ApiProperty() @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @ApiProperty() @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}

@Entity('vehicle_expenses')
export class VehicleExpense {
  @ApiProperty() @PrimaryGeneratedColumn() id: number;
  @ApiProperty() @Column({ name: 'vehicle_id' }) vehicleId: number;

  @ManyToOne(() => Vehicle, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vehicle_id' })
  vehicle?: Relation<Vehicle>;

  @ApiProperty({ enum: EXPENSE_CATEGORIES })
  @Column({ type: 'varchar' })
  category: ExpenseCategory;
  @ApiProperty({ example: 'Cambio de aceite' }) @Column() description: string;
  @ApiProperty({ example: 240000 })
  @Column({ type: 'numeric', transformer: numeric })
  amount: number;
  @ApiProperty({ example: '2026-10-21' })
  @Column({ type: 'date' })
  date: string;
  @ApiProperty() @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
}
