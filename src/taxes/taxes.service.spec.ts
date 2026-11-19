import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { TaxesService } from './taxes.service.js';
import { Tax } from './tax.entity.js';
import { HouseholdsService } from '../households/households.service.js';
import { VehiclesService } from '../vehicles/vehicles.service.js';
import {
  daysFromNow,
  lucas,
  mockHouseholds,
  mockRepo,
  type MockRepo,
} from '../../test/helpers.js';

describe('TaxesService', () => {
  let service: TaxesService;
  let repo: MockRepo;
  const vehicles = {
    findOwned: vi.fn(async (id: number) => ({ id, householdId: 1 })),
  };

  beforeEach(async () => {
    repo = mockRepo();
    const module = await Test.createTestingModule({
      providers: [
        TaxesService,
        { provide: getRepositoryToken(Tax), useValue: repo },
        { provide: HouseholdsService, useValue: mockHouseholds() },
        { provide: VehiclesService, useValue: vehicles },
      ],
    }).compile();
    service = module.get(TaxesService);
  });

  const predial = {
    type: 'predial' as const,
    householdId: 1,
    year: 2026,
    amount: 1000,
    dueDate: '2026-07-10',
  };

  it('el predial va sobre un hogar y el vehicular sobre un vehículo', async () => {
    await expect(service.create(predial, lucas)).resolves.toMatchObject({
      householdId: 1,
      vehicleId: null,
      status: 'pendiente',
    });
    await expect(
      service.create({ ...predial, type: 'vehicular' }, lucas),
    ).rejects.toThrow(/vehículo/);
    await expect(
      service.create({ ...predial, vehicleId: 2 }, lucas),
    ).rejects.toThrow(/hogar/);
    await expect(
      service.create(
        {
          type: 'vehicular',
          vehicleId: 2,
          year: 2026,
          amount: 5,
          dueDate: '2026-12-01',
        },
        lucas,
      ),
    ).resolves.toMatchObject({ vehicleId: 2 });
    expect(vehicles.findOwned).toHaveBeenCalledWith(2, lucas);
  });

  it('409 si ya hay un impuesto igual para el bien y el año; 400 si vence antes del año gravable', async () => {
    await expect(
      service.create({ ...predial, dueDate: '2025-12-31' }, lucas),
    ).rejects.toThrow(BadRequestException);
    repo.existsBy.mockResolvedValue(true);
    await expect(service.create(predial, lucas)).rejects.toThrow(
      ConflictException,
    );
  });

  it('paga por el valor completo con la fecha de hoy', async () => {
    repo.findOne.mockResolvedValue({
      id: 1,
      householdId: 1,
      amount: 1000,
      status: 'pendiente',
      year: 2026,
    });
    await expect(service.pay(1, {}, lucas)).resolves.toMatchObject({
      status: 'pagado',
      paidAmount: 1000,
      paidAt: daysFromNow(0),
    });
  });

  it('rechaza pagar menos, en el futuro, o dos veces; y editar un impuesto pagado', async () => {
    repo.findOne.mockResolvedValue({
      id: 1,
      householdId: 1,
      amount: 1000,
      status: 'pendiente',
      year: 2026,
    });
    await expect(service.pay(1, { paidAmount: 10 }, lucas)).rejects.toThrow(
      /menor/,
    );
    await expect(
      service.pay(1, { paidAt: daysFromNow(5) }, lucas),
    ).rejects.toThrow(/futura/);
    repo.findOne.mockResolvedValue({
      id: 1,
      householdId: 1,
      amount: 1000,
      status: 'pagado',
      year: 2026,
    });
    await expect(service.pay(1, {}, lucas)).rejects.toThrow(ConflictException);
    await expect(service.update(1, { amount: 5 }, lucas)).rejects.toThrow(
      ConflictException,
    );
  });

  it('edita un impuesto pendiente validando la fecha', async () => {
    repo.findOne.mockResolvedValue({
      id: 1,
      householdId: null,
      vehicle: { householdId: 1 },
      amount: 1000,
      status: 'pendiente',
      year: 2026,
    });
    await expect(
      service.update(1, { dueDate: '2025-01-01' }, lucas),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.update(1, { amount: 1200 }, lucas),
    ).resolves.toMatchObject({ amount: 1200 });
  });

  it('lista, borra y responde 404', async () => {
    await service.findAll({ householdId: 1 }, lucas);
    expect(repo.find).toHaveBeenCalled();
    await expect(service.findOwned(9, lucas)).rejects.toThrow(
      NotFoundException,
    );
    repo.findOne.mockResolvedValue({ id: 1, householdId: 1 });
    await service.remove(1, lucas);
    expect(repo.remove).toHaveBeenCalled();
  });
});
