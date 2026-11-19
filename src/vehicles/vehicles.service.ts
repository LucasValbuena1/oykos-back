import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Vehicle,
  VehicleExpense,
  type VehicleType,
} from './vehicle.entities.js';
import { HouseholdsService } from '../households/households.service.js';
import { today } from '../common/dates.js';
import type {
  CreateExpenseDto,
  CreateVehicleDto,
  UpdateVehicleDto,
} from './vehicles.dto.js';
import type { User } from '../users/user.entity.js';

/** Las motos en Colombia tienen placa ABC12D; los demás vehículos ABC123. */
export function plateMatchesType(plate: string, type: VehicleType) {
  if (type === 'moto') return /^[A-Z]{3}\d{2}[A-Z]$/.test(plate);
  if (type === 'otro') return /^[A-Z]{3}\d{2}[A-Z0-9]$/.test(plate);
  return /^[A-Z]{3}\d{3}$/.test(plate);
}

@Injectable()
export class VehiclesService {
  constructor(
    @InjectRepository(Vehicle) private readonly vehicles: Repository<Vehicle>,
    @InjectRepository(VehicleExpense)
    private readonly expenses: Repository<VehicleExpense>,
    private readonly households: HouseholdsService,
  ) {}

  async findByHousehold(householdId: number, user: User) {
    await this.households.findOwned(householdId, user);
    return this.vehicles.find({
      where: { householdId },
      order: { createdAt: 'ASC' },
    });
  }

  async findOwned(id: number, user: User) {
    const vehicle = await this.vehicles.findOneBy({ id });
    if (!vehicle) throw new NotFoundException(`El vehículo ${id} no existe`);
    await this.households.findOwned(vehicle.householdId, user);
    return vehicle;
  }

  async create(dto: CreateVehicleDto, user: User) {
    await this.households.findOwned(dto.householdId, user);
    if (!plateMatchesType(dto.plate, dto.type)) {
      throw new BadRequestException(
        `La placa ${dto.plate} no corresponde a un vehículo tipo ${dto.type}`,
      );
    }
    if (dto.year > new Date().getFullYear() + 1)
      throw new BadRequestException(
        'El modelo no puede ser de más de un año en el futuro',
      );
    if (await this.vehicles.existsBy({ plate: dto.plate }))
      throw new ConflictException(`La placa ${dto.plate} ya está registrada`);
    return this.vehicles.save(this.vehicles.create(dto));
  }

  async update(id: number, dto: UpdateVehicleDto, user: User) {
    const vehicle = await this.findOwned(id, user);
    if (dto.type && !plateMatchesType(vehicle.plate, dto.type)) {
      throw new BadRequestException(
        `La placa ${vehicle.plate} no corresponde a un vehículo tipo ${dto.type}`,
      );
    }
    Object.assign(vehicle, dto);
    return this.vehicles.save(vehicle);
  }

  async remove(id: number, user: User) {
    await this.vehicles.remove(await this.findOwned(id, user));
  }

  async findExpenses(vehicleId: number, user: User) {
    await this.findOwned(vehicleId, user);
    return this.expenses.find({
      where: { vehicleId },
      order: { date: 'DESC' },
    });
  }

  async addExpense(vehicleId: number, dto: CreateExpenseDto, user: User) {
    const vehicle = await this.findOwned(vehicleId, user);
    if (dto.date > today())
      throw new BadRequestException('La fecha del gasto no puede ser futura');
    if (Number(dto.date.slice(0, 4)) < vehicle.year - 1) {
      throw new BadRequestException(
        'La fecha del gasto es anterior al modelo del vehículo',
      );
    }
    return this.expenses.save(this.expenses.create({ ...dto, vehicleId }));
  }

  async removeExpense(id: number, user: User) {
    const expense = await this.expenses.findOneBy({ id });
    if (!expense) throw new NotFoundException(`El gasto ${id} no existe`);
    await this.findOwned(expense.vehicleId, user);
    await this.expenses.remove(expense);
  }

  /** Total gastado en el vehículo, por categoría. */
  async summary(vehicleId: number, user: User) {
    const list = await this.findExpenses(vehicleId, user);
    const byCategory: Record<string, number> = {};
    for (const e of list)
      byCategory[e.category] = (byCategory[e.category] ?? 0) + e.amount;
    return {
      vehicleId,
      total: list.reduce((s, e) => s + e.amount, 0),
      count: list.length,
      byCategory,
    };
  }
}
