import { ApiProperty } from '@nestjs/swagger';
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
import { User } from '../users/user.entity.js';
import { UtilityService } from '../services/service.entity.js';

export const PROPERTY_TYPES = ['casa', 'apartamento', 'local'] as const;
export type PropertyType = (typeof PROPERTY_TYPES)[number];

@Entity('households')
export class Household {
  @ApiProperty() @PrimaryGeneratedColumn() id: number;

  @ApiProperty() @Column({ name: 'owner_id' }) ownerId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'owner_id' })
  owner?: Relation<User>;

  @ApiProperty({ example: 'Casa Chapinero' }) @Column() name: string;
  @ApiProperty({ enum: PROPERTY_TYPES })
  @Column({ type: 'varchar' })
  type: PropertyType;
  @ApiProperty({ example: 'Calle 57 # 9-30' }) @Column() address: string;
  @ApiProperty({ example: 'Bogotá' }) @Column() city: string;
  @ApiProperty({ minimum: 1, maximum: 6 })
  @Column({ type: 'int' })
  stratum: number;

  @OneToMany(() => UtilityService, (s) => s.household)
  services?: Relation<UtilityService[]>;

  @ApiProperty() @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @ApiProperty() @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
