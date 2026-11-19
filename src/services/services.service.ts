import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UtilityService, type ServiceType } from './service.entity.js';
import { HouseholdsService } from '../households/households.service.js';
import type { CreateServiceDto, UpdateServiceDto } from './services.dto.js';
import type { User } from '../users/user.entity.js';

/** "  ENEL colombia " y "Enel Colombia" son la misma empresa. */
export const normalizeProvider = (p: string) =>
  p
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();

@Injectable()
export class ServicesService {
  constructor(
    @InjectRepository(UtilityService)
    private readonly services: Repository<UtilityService>,
    private readonly households: HouseholdsService,
  ) {}

  async findByHousehold(householdId: number, user: User) {
    await this.households.findOwned(householdId, user);
    return this.services.find({
      where: { householdId },
      order: { type: 'ASC' },
    });
  }

  /** Carga el servicio y verifica que su hogar sea del usuario. */
  async findOwned(id: number, user: User) {
    const service = await this.services.findOneBy({ id });
    if (!service) throw new NotFoundException(`El servicio ${id} no existe`);
    await this.households.findOwned(service.householdId, user);
    return service;
  }

  async create(dto: CreateServiceDto, user: User) {
    await this.households.findOwned(dto.householdId, user);
    await this.ensureNotDuplicate(dto.householdId, dto.type, dto.provider);
    return this.services.save(
      this.services.create({ ...dto, provider: dto.provider.trim() }),
    );
  }

  async update(id: number, dto: UpdateServiceDto, user: User) {
    const service = await this.findOwned(id, user);
    const type = dto.type ?? service.type;
    const provider = dto.provider ?? service.provider;
    if (dto.type !== undefined || dto.provider !== undefined) {
      await this.ensureNotDuplicate(service.householdId, type, provider, id);
    }
    Object.assign(service, dto, { provider: provider.trim() });
    return this.services.save(service);
  }

  async remove(id: number, user: User) {
    const service = await this.findOwned(id, user);
    await this.services.remove(service);
  }

  /** Regla de negocio: un hogar no puede tener dos veces el mismo tipo de servicio con la misma empresa. */
  private async ensureNotDuplicate(
    householdId: number,
    type: ServiceType,
    provider: string,
    exceptId?: number,
  ) {
    const same = await this.services.find({ where: { householdId, type } });
    const target = normalizeProvider(provider);
    if (
      same.some(
        (s) => s.id !== exceptId && normalizeProvider(s.provider) === target,
      )
    ) {
      throw new ConflictException(
        `Este hogar ya tiene un servicio de ${type} con ${provider.trim()}`,
      );
    }
  }
}
