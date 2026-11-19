import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { Invoice, displayStatus } from './invoice.entity.js';
import { ServicesService } from '../services/services.service.js';
import { AlertsService } from '../alerts/alerts.service.js';
import { HouseholdsService } from '../households/households.service.js';
import { today } from '../common/dates.js';
import type {
  CreateInvoiceDto,
  InvoicesQueryDto,
  PayInvoiceDto,
  UpdateInvoiceDto,
} from './invoices.dto.js';
import type { User } from '../users/user.entity.js';

@Injectable()
export class InvoicesService {
  constructor(
    @InjectRepository(Invoice) private readonly invoices: Repository<Invoice>,
    private readonly services: ServicesService,
    private readonly households: HouseholdsService,
    private readonly alerts: AlertsService,
  ) {}

  async findAll(q: InvoicesQueryDto, user: User) {
    await this.households.findOwned(q.householdId, user);
    const list = await this.invoices.find({
      where: {
        service: { householdId: q.householdId },
        ...(q.period ? { period: q.period } : {}),
      },
      relations: { service: true },
      order: { dueDate: 'DESC' },
    });
    return q.status ? list.filter((i) => displayStatus(i) === q.status) : list;
  }

  async findOwned(id: number, user: User) {
    const invoice = await this.invoices.findOne({
      where: { id },
      relations: { service: true },
    });
    if (!invoice) throw new NotFoundException(`La factura ${id} no existe`);
    await this.households.findOwned(invoice.service!.householdId, user);
    return invoice;
  }

  async create(dto: CreateInvoiceDto, user: User) {
    const service = await this.services.findOwned(dto.serviceId, user);
    validateDates(dto.period, dto.dueDate, dto.cutoffDate);
    await this.ensureNotDuplicate(dto.serviceId, dto.period);
    const saved = await this.invoices.save(
      this.invoices.create({
        ...dto,
        cutoffDate: dto.cutoffDate ?? null,
        reference: dto.reference ?? null,
        status: 'pendiente',
        paidAt: null,
      }),
    );
    saved.service = service;
    await this.alerts.evaluate(saved);
    return saved;
  }

  async update(id: number, dto: UpdateInvoiceDto, user: User) {
    const invoice = await this.findOwned(id, user);
    const period = dto.period ?? invoice.period;
    validateDates(
      period,
      dto.dueDate ?? invoice.dueDate,
      dto.cutoffDate ?? invoice.cutoffDate ?? undefined,
    );
    if (dto.period && dto.period !== invoice.period)
      await this.ensureNotDuplicate(invoice.serviceId, period, id);
    Object.assign(invoice, dto);
    const saved = await this.invoices.save(invoice);
    await this.alerts.evaluate(saved);
    return saved;
  }

  /** Marcar como pagada. La fecha de pago no puede ser futura ni anterior al periodo. */
  async pay(id: number, dto: PayInvoiceDto, user: User) {
    const invoice = await this.findOwned(id, user);
    if (invoice.status === 'pagada')
      throw new ConflictException('La factura ya está pagada');
    const paidAt = dto.paidAt ?? today();
    if (paidAt > today())
      throw new BadRequestException('La fecha de pago no puede ser futura');
    if (paidAt < `${invoice.period}-01`)
      throw new BadRequestException(
        'La fecha de pago es anterior al periodo facturado',
      );
    invoice.status = 'pagada';
    invoice.paidAt = paidAt;
    return this.invoices.save(invoice);
  }

  /** Desmarcar un pago registrado por error. */
  async unpay(id: number, user: User) {
    const invoice = await this.findOwned(id, user);
    if (invoice.status !== 'pagada')
      throw new ConflictException('La factura no está marcada como pagada');
    invoice.status = 'pendiente';
    invoice.paidAt = null;
    return this.invoices.save(invoice);
  }

  async remove(id: number, user: User) {
    const invoice = await this.findOwned(id, user);
    await this.invoices.remove(invoice);
  }

  /** Regla de negocio: una sola factura por servicio y periodo (p. ej. escanear dos veces el mismo recibo). */
  private async ensureNotDuplicate(
    serviceId: number,
    period: string,
    exceptId?: number,
  ) {
    const exists = await this.invoices.existsBy({
      serviceId,
      period,
      ...(exceptId ? { id: Not(exceptId) } : {}),
    });
    if (exists)
      throw new ConflictException(
        `Ya hay una factura de ese servicio para el periodo ${period}`,
      );
  }
}

/** La fecha límite no puede ser anterior al inicio del periodo, y el corte no puede ser posterior al vencimiento. */
export function validateDates(
  period: string,
  dueDate: string,
  cutoffDate?: string,
) {
  if (dueDate < `${period}-01`)
    throw new BadRequestException(
      'La fecha límite es anterior al periodo facturado',
    );
  if (cutoffDate && cutoffDate > dueDate)
    throw new BadRequestException(
      'La fecha de corte no puede ser posterior a la fecha límite',
    );
}
