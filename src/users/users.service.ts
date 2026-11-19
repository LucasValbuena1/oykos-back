import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PasswordHasher } from '@nestjs/authentication';
import { Repository } from 'typeorm';
import { User } from './user.entity.js';
import type { ChangePasswordDto, UpdateProfileDto } from './users.dto.js';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly hasher: PasswordHasher,
  ) {}

  findById(id: number) {
    return this.users.findOneBy({ id });
  }

  findByEmail(email: string) {
    return this.users.findOneBy({ email: email.trim().toLowerCase() });
  }

  async register(input: {
    email: string;
    password: string;
    name: string;
    phone?: string;
  }) {
    const email = input.email.trim().toLowerCase();
    if (await this.users.existsBy({ email })) {
      throw new ConflictException('Ya existe un usuario con ese correo');
    }
    const passwordHash = await this.hasher.hash(input.password);
    // El rol lo pone el servidor: el DTO de registro no lo acepta.
    return this.users.save(
      this.users.create({
        email,
        name: input.name.trim(),
        phone: input.phone ?? null,
        passwordHash,
        role: 'user',
      }),
    );
  }

  /** Devuelve el usuario solo si la contraseña es correcta. Tarda lo mismo si el correo no existe. */
  async verifyCredentials(email: string, password: string) {
    const user = await this.findByEmail(email);
    const valid = await this.hasher.verify(password, user?.passwordHash);
    return user && valid ? user : null;
  }

  async updateProfile(user: User, dto: UpdateProfileDto) {
    const current = await this.findById(user.id);
    if (!current) throw new NotFoundException('Usuario no encontrado');
    if (dto.name !== undefined) current.name = dto.name.trim();
    if (dto.phone !== undefined) current.phone = dto.phone;
    return this.users.save(current);
  }

  async changePassword(user: User, dto: ChangePasswordDto) {
    const current = await this.findById(user.id);
    if (
      !current ||
      !(await this.hasher.verify(dto.currentPassword, current.passwordHash))
    ) {
      throw new UnauthorizedException('La contraseña actual no es correcta');
    }
    if (dto.currentPassword === dto.newPassword) {
      throw new ConflictException(
        'La nueva contraseña debe ser distinta de la actual',
      );
    }
    current.passwordHash = await this.hasher.hash(dto.newPassword);
    await this.users.save(current);
  }
}
