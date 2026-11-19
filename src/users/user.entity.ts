import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type UserRole = 'user' | 'admin';

@Entity('users')
export class User {
  @ApiProperty({ example: 2 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 'lucas@oykos.co' })
  @Column({ unique: true })
  email: string;

  @ApiProperty({ example: 'Lucas Valbuena' })
  @Column()
  name: string;

  @ApiPropertyOptional({ example: '3001234567', type: String, nullable: true })
  @Column({ type: 'varchar', nullable: true })
  phone: string | null;

  /** Nunca sale en una respuesta: ClassSerializerInterceptor lo quita. */
  @Exclude()
  @Column({ name: 'password_hash' })
  passwordHash: string;

  @ApiProperty({ enum: ['user', 'admin'] })
  @Column({ type: 'varchar', default: 'user' })
  role: UserRole;

  @ApiProperty()
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
