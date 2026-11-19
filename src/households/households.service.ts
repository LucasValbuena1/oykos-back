import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AuthorizationService } from '@nestjs/authorization';
import { Not, Repository } from 'typeorm';
import { Household } from './household.entity.js';
import { HouseholdPolicy } from './household.policy.js';
import type {
  CreateHouseholdDto,
  UpdateHouseholdDto,
} from './households.dto.js';
import type { User } from '../users/user.entity.js';

export const MAX_HOUSEHOLDS_PER_USER = 10;

@Injectable()
export class HouseholdsService {
  constructor(
    @InjectRepository(Household)
    private readonly households: Repository<Household>,
    private readonly authz: AuthorizationService,
  ) {}

  findAllFor(user: User) {
    return this.households.find({
      where: { ownerId: user.id },
      order: { createdAt: 'ASC' },
    });
  }

  /** Busca el hogar y verifica que el usuario pueda usarlo: 404 si no existe, 403 si es de otro. */
  async findOwned(id: number, user: User) {
    const household = await this.households.findOneBy({ id });
    if (!household) throw new NotFoundException(`El hogar ${id} no existe`);
    await this.authz.authorize(HouseholdPolicy, 'manage', user, household);
    return household;
  }

  async create(dto: CreateHouseholdDto, user: User) {
    const count = await this.households.countBy({ ownerId: user.id });
    if (count >= MAX_HOUSEHOLDS_PER_USER) {
      throw new ConflictException(
        `Un usuario puede tener máximo ${MAX_HOUSEHOLDS_PER_USER} hogares`,
      );
    }
    await this.ensureUniqueName(user.id, dto.name);
    return this.households.save(
      this.households.create({
        ...dto,
        name: dto.name.trim(),
        ownerId: user.id,
      }),
    );
  }

  async update(id: number, dto: UpdateHouseholdDto, user: User) {
    const household = await this.findOwned(id, user);
    if (dto.name !== undefined)
      await this.ensureUniqueName(household.ownerId, dto.name, id);
    Object.assign(
      household,
      dto,
      dto.name !== undefined ? { name: dto.name.trim() } : {},
    );
    return this.households.save(household);
  }

  async remove(id: number, user: User) {
    const household = await this.findOwned(id, user);
    await this.households.remove(household);
  }

  private async ensureUniqueName(
    ownerId: number,
    name: string,
    exceptId?: number,
  ) {
    const exists = await this.households.existsBy({
      ownerId,
      name: name.trim(),
      ...(exceptId ? { id: Not(exceptId) } : {}),
    });
    if (exists)
      throw new ConflictException(
        `Ya tienes un hogar llamado "${name.trim()}"`,
      );
  }
}
