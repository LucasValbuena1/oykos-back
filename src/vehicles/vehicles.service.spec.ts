import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { VehiclesService, plateMatchesType } from './vehicles.service.js';
import { Vehicle, VehicleExpense } from './vehicle.entities.js';
import { HouseholdsService } from '../households/households.service.js';
import {
  daysFromNow,
  lucas,
  mockHouseholds,
  mockRepo,
  type MockRepo,
} from '../../test/helpers.js';

describe('VehiclesService', () => {
  let service: VehiclesService;
  let vehicles: MockRepo;
  let expenses: MockRepo;

  beforeEach(async () => {
    vehicles = mockRepo();
    expenses = mockRepo();
    const module = await Test.createTestingModule({
      providers: [
        VehiclesService,
        { provide: getRepositoryToken(Vehicle), useValue: vehicles },
        { provide: getRepositoryToken(VehicleExpense), useValue: expenses },
        { provide: HouseholdsService, useValue: mockHouseholds() },
      ],
    }).compile();
    service = module.get(VehiclesService);
  });

  const car = {
    householdId: 1,
    plate: 'ABC123',
    brand: 'Mazda',
    model: '3',
    year: 2021,
    type: 'automovil' as const,
  };

  it('valida el formato de placa según el tipo', () => {
    expect(plateMatchesType('ABC123', 'automovil')).toBe(true);
    expect(plateMatchesType('ABC12D', 'moto')).toBe(true);
    expect(plateMatchesType('ABC123', 'moto')).toBe(false);
    expect(plateMatchesType('ABC12D', 'camioneta')).toBe(false);
    expect(plateMatchesType('ABC12D', 'otro')).toBe(true);
  });

  it('crea el vehículo; 409 si la placa ya existe; 400 si la placa no es del tipo', async () => {
    await expect(service.create(car, lucas)).resolves.toMatchObject({
      plate: 'ABC123',
    });
    vehicles.existsBy.mockResolvedValue(true);
    await expect(service.create(car, lucas)).rejects.toThrow(ConflictException);
    await expect(
      service.create({ ...car, type: 'moto' }, lucas),
    ).rejects.toThrow(BadRequestException);
  });

  it('400 si el modelo es de más de un año en el futuro', async () => {
    await expect(
      service.create({ ...car, year: new Date().getFullYear() + 2 }, lucas),
    ).rejects.toThrow(/futuro/);
  });

  it('al cambiar el tipo revisa que la placa siga siendo válida', async () => {
    vehicles.findOneBy.mockResolvedValue({
      id: 1,
      householdId: 1,
      plate: 'ABC123',
      year: 2021,
    });
    await expect(service.update(1, { type: 'moto' }, lucas)).rejects.toThrow(
      BadRequestException,
    );
    await expect(
      service.update(1, { brand: 'Kia' }, lucas),
    ).resolves.toMatchObject({ brand: 'Kia' });
  });

  it('registra gastos que no sean futuros ni anteriores al modelo', async () => {
    vehicles.findOneBy.mockResolvedValue({
      id: 1,
      householdId: 1,
      plate: 'ABC123',
      year: 2021,
    });
    const e = {
      category: 'combustible' as const,
      description: 'Tanqueada',
      amount: 100000,
      date: daysFromNow(0),
    };
    await expect(service.addExpense(1, e, lucas)).resolves.toMatchObject({
      vehicleId: 1,
    });
    await expect(
      service.addExpense(1, { ...e, date: daysFromNow(2) }, lucas),
    ).rejects.toThrow(/futura/);
    await expect(
      service.addExpense(1, { ...e, date: '2010-01-01' }, lucas),
    ).rejects.toThrow(/anterior/);
  });

  it('resume el gasto total por categoría', async () => {
    vehicles.findOneBy.mockResolvedValue({ id: 1, householdId: 1 });
    expenses.find.mockResolvedValue([
      { category: 'combustible', amount: 100 },
      { category: 'combustible', amount: 50 },
      { category: 'seguro', amount: 900 },
    ]);
    expect(await service.summary(1, lucas)).toEqual({
      vehicleId: 1,
      total: 1050,
      count: 3,
      byCategory: { combustible: 150, seguro: 900 },
    });
  });

  it('lista, borra y responde 404', async () => {
    await service.findByHousehold(1, lucas);
    await expect(service.findOwned(5, lucas)).rejects.toThrow(
      NotFoundException,
    );
    await expect(service.removeExpense(5, lucas)).rejects.toThrow(
      NotFoundException,
    );
    vehicles.findOneBy.mockResolvedValue({ id: 1, householdId: 1 });
    expenses.findOneBy.mockResolvedValue({ id: 5, vehicleId: 1 });
    await service.removeExpense(5, lucas);
    await service.remove(1, lucas);
    expect(expenses.remove).toHaveBeenCalled();
    expect(vehicles.remove).toHaveBeenCalled();
  });
});
