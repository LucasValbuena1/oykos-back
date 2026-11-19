import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ServicesService, normalizeProvider } from './services.service.js';
import { UtilityService } from './service.entity.js';
import { HouseholdsService } from '../households/households.service.js';
import {
  lucas,
  mockHouseholds,
  mockRepo,
  type MockRepo,
} from '../../test/helpers.js';

describe('ServicesService', () => {
  let service: ServicesService;
  let repo: MockRepo;
  let households: ReturnType<typeof mockHouseholds>;

  beforeEach(async () => {
    repo = mockRepo();
    households = mockHouseholds();
    const module = await Test.createTestingModule({
      providers: [
        ServicesService,
        { provide: getRepositoryToken(UtilityService), useValue: repo },
        { provide: HouseholdsService, useValue: households },
      ],
    }).compile();
    service = module.get(ServicesService);
  });

  const dto = {
    householdId: 1,
    type: 'energia' as const,
    provider: 'Enel Colombia ',
    accountNumber: '1234',
    cutoffDay: 15,
  };

  it('normaliza el nombre de la empresa (tildes, mayúsculas y espacios)', () => {
    expect(normalizeProvider('  ENEL   Colómbia ')).toBe('enel colombia');
  });

  it('crea el servicio después de verificar el hogar', async () => {
    const s = await service.create(dto, lucas);
    expect(households.findOwned).toHaveBeenCalledWith(1, lucas);
    expect(s).toMatchObject({ provider: 'Enel Colombia' });
  });

  it('409 si el hogar ya tiene ese tipo de servicio con la misma empresa', async () => {
    repo.find.mockResolvedValue([
      { id: 5, householdId: 1, type: 'energia', provider: 'enel  COLOMBIA' },
    ]);
    await expect(service.create(dto, lucas)).rejects.toThrow(ConflictException);
  });

  it('permite el mismo tipo con otra empresa', async () => {
    repo.find.mockResolvedValue([
      { id: 5, householdId: 1, type: 'energia', provider: 'Celsia' },
    ]);
    await expect(service.create(dto, lucas)).resolves.toBeDefined();
  });

  it('al editar, el mismo servicio no cuenta como duplicado', async () => {
    repo.findOneBy.mockResolvedValue({
      id: 5,
      householdId: 1,
      type: 'energia',
      provider: 'Enel',
    });
    repo.find.mockResolvedValue([
      { id: 5, householdId: 1, type: 'energia', provider: 'Enel' },
    ]);
    await expect(
      service.update(5, { provider: 'ENEL' }, lucas),
    ).resolves.toMatchObject({ provider: 'ENEL' });
  });

  it('al editar solo el día de corte no revisa duplicados', async () => {
    repo.findOneBy.mockResolvedValue({
      id: 5,
      householdId: 1,
      type: 'energia',
      provider: 'Enel',
    });
    await service.update(5, { cutoffDay: 3 }, lucas);
    expect(repo.find).not.toHaveBeenCalled();
  });

  it('404 si el servicio no existe; lista y borra verificando el hogar', async () => {
    await expect(service.findOwned(1, lucas)).rejects.toThrow(
      NotFoundException,
    );
    await service.findByHousehold(1, lucas);
    expect(households.findOwned).toHaveBeenCalledWith(1, lucas);
    repo.findOneBy.mockResolvedValue({ id: 5, householdId: 1 });
    await service.remove(5, lucas);
    expect(repo.remove).toHaveBeenCalled();
  });
});
