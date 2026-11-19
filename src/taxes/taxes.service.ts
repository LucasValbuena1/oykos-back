import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tax } from './tax.entity.js';
import { HouseholdsService } from '../households/households.service.js';
import { VehiclesService } from '../vehicles/vehicles.service.js';
import { today } from '../common/dates.js';
import type {
  CreateTaxDto,
  PayTaxDto,
  TaxesQueryDto,
  UpdateTaxDto,
} from './taxes.dto.js';
import type { User } from '../users/user.entity.js';

@Injectable()
export class TaxesService {
  constructor(
    @InjectRepository(Tax) private readonly taxes: Repository<Tax>,
    private readonly households: HouseholdsService,
    private readonly vehicles: VehiclesService,
  ) {}

  /** Impuestos del hogar y de los vehículos del hogar. */
  async findAll(q: TaxesQueryDto, user: User) {
    await this.households.findOwned(q.householdId, user);
    return this.taxes.find({
      where: [
        { householdId: q.householdId },
        { vehicle: { householdId: q.householdId } },
      ],
      relations: { vehicle: true },
      order: { dueDate: 'ASC' },
    });
  }

  async findOwned(id: number, user: User) {
    const tax = await this.taxes.findOne({
      where: { id },
      relations: { vehicle: true },
    });
    if (!tax) throw new NotFoundException(`El impuesto ${id} no existe`);
    await this.households.findOwned(
      tax.householdId ?? tax.vehicle!.householdId,
      user,
    );
    return tax;
  }

  async create(dto: CreateTaxDto, user: User) {
    const onVehicle = dto.type === 'vehicular';
    if (
      onVehicle
        ? !dto.vehicleId || dto.householdId
        : !dto.householdId || dto.vehicleId
    ) {
      throw new BadRequestException(
        onVehicle
          ? 'El impuesto vehicular va sobre un vehículo (vehicleId)'
          : `El impuesto ${dto.type} va sobre un hogar (householdId)`,
      );
    }
    if (onVehicle) await this.vehicles.findOwned(dto.vehicleId!, user);
    else await this.households.findOwned(dto.householdId!, user);
    if (Number(dto.dueDate.slice(0, 4)) < dto.year)
      throw new BadRequestException(
        'La fecha límite no puede ser anterior al año gravable',
      );

    const exists = await this.taxes.existsBy(
      onVehicle
        ? { type: dto.type, vehicleId: dto.vehicleId, year: dto.year }
        : { type: dto.type, householdId: dto.householdId, year: dto.year },
    );
    if (exists)
      throw new ConflictException(
        `Ya hay un impuesto ${dto.type} de ${dto.year} para ese bien`,
      );
    return this.taxes.save(
      this.taxes.create({
        ...dto,
        householdId: dto.householdId ?? null,
        vehicleId: dto.vehicleId ?? null,
        status: 'pendiente',
      }),
    );
  }

  async update(id: number, dto: UpdateTaxDto, user: User) {
    const tax = await this.findOwned(id, user);
    if (tax.status === 'pagado')
      throw new ConflictException('No se puede modificar un impuesto pagado');
    if (dto.dueDate && Number(dto.dueDate.slice(0, 4)) < tax.year)
      throw new BadRequestException(
        'La fecha límite no puede ser anterior al año gravable',
      );
    Object.assign(tax, dto);
    return this.taxes.save(tax);
  }

  async pay(id: number, dto: PayTaxDto, user: User) {
    const tax = await this.findOwned(id, user);
    if (tax.status === 'pagado')
      throw new ConflictException('El impuesto ya está pagado');
    const paidAt = dto.paidAt ?? today();
    if (paidAt > today())
      throw new BadRequestException('La fecha de pago no puede ser futura');
    const paidAmount = dto.paidAmount ?? tax.amount;
    if (paidAmount < tax.amount)
      throw new BadRequestException(
        'El valor pagado es menor al valor del impuesto',
      );
    Object.assign(tax, { status: 'pagado', paidAt, paidAmount });
    return this.taxes.save(tax);
  }

  async remove(id: number, user: User) {
    await this.taxes.remove(await this.findOwned(id, user));
  }
}
