import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InvoicesService, validateDates } from './invoices.service.js';
import { Invoice, displayStatus } from './invoice.entity.js';
import { ServicesService } from '../services/services.service.js';
import { HouseholdsService } from '../households/households.service.js';
import { AlertsService } from '../alerts/alerts.service.js';
import {
  daysFromNow,
  lucas,
  mockHouseholds,
  mockRepo,
  type MockRepo,
} from '../../test/helpers.js';

describe('InvoicesService', () => {
  let service: InvoicesService;
  let repo: MockRepo;
  const services = {
    findOwned: vi.fn(async (id: number) => ({ id, householdId: 1 })),
  };
  const alerts = { evaluate: vi.fn(async () => []) };

  beforeEach(async () => {
    repo = mockRepo();
    alerts.evaluate.mockClear();
    const module = await Test.createTestingModule({
      providers: [
        InvoicesService,
        { provide: getRepositoryToken(Invoice), useValue: repo },
        { provide: ServicesService, useValue: services },
        { provide: HouseholdsService, useValue: mockHouseholds() },
        { provide: AlertsService, useValue: alerts },
      ],
    }).compile();
    service = module.get(InvoicesService);
  });

  const dto = {
    serviceId: 1,
    period: '2026-11',
    consumption: 200,
    amount: 180000,
    dueDate: '2026-12-05',
  };
  const existing = (over: Partial<Invoice> = {}) => ({
    id: 3,
    serviceId: 1,
    period: '2026-10',
    dueDate: '2026-11-05',
    status: 'pendiente',
    paidAt: null,
    service: { householdId: 1 },
    ...over,
  });

  it('crea la factura como pendiente y revisa las alertas', async () => {
    const inv = await service.create(dto, lucas);
    expect(inv).toMatchObject({ status: 'pendiente', paidAt: null });
    expect(alerts.evaluate).toHaveBeenCalledTimes(1);
  });

  it('409 si ya hay una factura del mismo servicio y periodo (recibo escaneado dos veces)', async () => {
    repo.existsBy.mockResolvedValue(true);
    await expect(service.create(dto, lucas)).rejects.toThrow(ConflictException);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('400 si las fechas no son coherentes', () => {
    expect(() => validateDates('2026-11', '2026-10-30')).toThrow(
      /anterior al periodo/,
    );
    expect(() => validateDates('2026-11', '2026-12-05', '2026-12-10')).toThrow(
      /corte/,
    );
    expect(() =>
      validateDates('2026-11', '2026-12-05', '2026-11-20'),
    ).not.toThrow();
  });

  it('marca como pagada con la fecha de hoy por defecto', async () => {
    repo.findOne.mockResolvedValue(existing());
    const inv = await service.pay(3, {}, lucas);
    expect(inv).toMatchObject({ status: 'pagada', paidAt: daysFromNow(0) });
  });

  it('no paga dos veces, ni con fecha futura, ni antes del periodo', async () => {
    repo.findOne.mockResolvedValue(
      existing({ status: 'pagada', paidAt: '2026-11-01' }),
    );
    await expect(service.pay(3, {}, lucas)).rejects.toThrow(ConflictException);
    repo.findOne.mockResolvedValue(existing());
    await expect(
      service.pay(3, { paidAt: daysFromNow(3) }, lucas),
    ).rejects.toThrow(/futura/);
    repo.findOne.mockResolvedValue(existing());
    await expect(
      service.pay(3, { paidAt: '2026-09-30' }, lucas),
    ).rejects.toThrow(BadRequestException);
  });

  it('desmarca un pago y rechaza desmarcar una pendiente', async () => {
    repo.findOne.mockResolvedValue(
      existing({ status: 'pagada', paidAt: '2026-11-01' }),
    );
    await expect(service.unpay(3, lucas)).resolves.toMatchObject({
      status: 'pendiente',
      paidAt: null,
    });
    repo.findOne.mockResolvedValue(existing());
    await expect(service.unpay(3, lucas)).rejects.toThrow(ConflictException);
  });

  it('al cambiar el periodo revisa duplicados; vuelve a evaluar alertas', async () => {
    repo.findOne.mockResolvedValue(existing());
    await service.update(
      3,
      { period: '2026-09', dueDate: '2026-10-05' },
      lucas,
    );
    expect(repo.existsBy).toHaveBeenCalledWith(
      expect.objectContaining({ serviceId: 1, period: '2026-09' }),
    );
    expect(alerts.evaluate).toHaveBeenCalled();
  });

  it('filtra por estado visible y responde 404 si no existe', async () => {
    repo.find.mockResolvedValue([
      existing({ dueDate: daysFromNow(-1) }),
      existing({ id: 4, dueDate: daysFromNow(30) }),
    ]);
    const overdue = await service.findAll(
      { householdId: 1, status: 'vencida' },
      lucas,
    );
    expect(overdue.map((i) => i.id)).toEqual([3]);
    await expect(service.findOwned(77, lucas)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('borra una factura', async () => {
    repo.findOne.mockResolvedValue(existing());
    await service.remove(3, lucas);
    expect(repo.remove).toHaveBeenCalled();
  });
});

describe('displayStatus', () => {
  it('calcula vencida, por vencer, pendiente y pagada', () => {
    expect(
      displayStatus({ status: 'pagada', dueDate: '2020-01-01' }, '2026-11-18'),
    ).toBe('pagada');
    expect(
      displayStatus(
        { status: 'pendiente', dueDate: '2026-11-17' },
        '2026-11-18',
      ),
    ).toBe('vencida');
    expect(
      displayStatus(
        { status: 'pendiente', dueDate: '2026-11-22' },
        '2026-11-18',
      ),
    ).toBe('por_vencer');
    expect(
      displayStatus(
        { status: 'pendiente', dueDate: '2026-12-22' },
        '2026-11-18',
      ),
    ).toBe('pendiente');
  });
});
