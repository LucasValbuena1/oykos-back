import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { IncidentsService } from './incidents.service.js';
import { Incident, IncidentLog } from './incident.entities.js';
import { ServicesService } from '../services/services.service.js';
import { HouseholdsService } from '../households/households.service.js';
import {
  daysFromNow,
  lucas,
  mockHouseholds,
  mockRepo,
  type MockRepo,
} from '../../test/helpers.js';

describe('IncidentsService', () => {
  let service: IncidentsService;
  let repo: MockRepo;
  let logs: MockRepo;

  beforeEach(async () => {
    repo = mockRepo();
    logs = mockRepo();
    repo.createQueryBuilder.mockReturnValue({
      where: () => ({ getCount: async () => 4 }),
    });
    const module = await Test.createTestingModule({
      providers: [
        IncidentsService,
        { provide: getRepositoryToken(Incident), useValue: repo },
        { provide: getRepositoryToken(IncidentLog), useValue: logs },
        {
          provide: ServicesService,
          useValue: {
            findOwned: vi.fn(async (id: number) => ({ id, householdId: 1 })),
          },
        },
        { provide: HouseholdsService, useValue: mockHouseholds() },
      ],
    }).compile();
    service = module.get(IncidentsService);
  });

  const dto = {
    serviceId: 1,
    type: 'corte' as const,
    startedAt: daysFromNow(0),
    description: 'Sin luz en el sector',
  };
  const incident = (over: Partial<Incident> = {}) =>
    ({
      id: 1,
      status: 'abierto',
      filingNumber: null,
      service: { householdId: 1 },
      log: [],
      ...over,
    }) as Incident;

  it('crea el incidente con código consecutivo del año y su primera entrada de bitácora', async () => {
    const created = await service.create(dto, lucas);
    expect(created.code).toBe(`INC-${new Date().getFullYear()}-0005`);
    expect(created.status).toBe('abierto');
    expect(created.log).toHaveLength(1);
  });

  it('no permite un incidente en el futuro ni dos abiertos del mismo tipo', async () => {
    await expect(
      service.create({ ...dto, startedAt: daysFromNow(1) }, lucas),
    ).rejects.toThrow(BadRequestException);
    repo.existsBy.mockResolvedValue(true);
    await expect(service.create(dto, lucas)).rejects.toThrow(ConflictException);
  });

  it('cambia el estado, guarda el radicado y deja la entrada en la bitácora', async () => {
    repo.findOne.mockResolvedValue(incident());
    await service.changeStatus(
      1,
      { status: 'en_gestion', comment: 'ok', filingNumber: 'RAD-1' },
      lucas,
    );
    expect(logs.save).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'en_gestion' }),
    );
    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({ filingNumber: 'RAD-1', closedAt: null }),
    );
  });

  it('respeta el ciclo de vida: no se repite el estado y cerrado es final', async () => {
    repo.findOne.mockResolvedValue(incident());
    await expect(
      service.changeStatus(1, { status: 'abierto', comment: 'x' }, lucas),
    ).rejects.toThrow(ConflictException);
    repo.findOne.mockResolvedValue(incident({ status: 'cerrado' }));
    await expect(
      service.changeStatus(1, { status: 'abierto', comment: 'x' }, lucas),
    ).rejects.toThrow(ConflictException);
  });

  it('al cerrar guarda la fecha de solución, que no puede ser futura ni anterior al inicio', async () => {
    const open = () =>
      incident({ status: 'resuelto', startedAt: '2026-01-10' });
    repo.findOne.mockResolvedValue(open());
    await service.changeStatus(
      1,
      { status: 'cerrado', comment: 'Listo' },
      lucas,
    );
    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'cerrado',
        closedAt: expect.any(Date),
      }),
    );
    repo.findOne.mockResolvedValue(open());
    await expect(
      service.changeStatus(
        1,
        { status: 'cerrado', comment: 'x', closedAt: daysFromNow(2) },
        lucas,
      ),
    ).rejects.toThrow(/futura/);
    repo.findOne.mockResolvedValue(open());
    await expect(
      service.changeStatus(
        1,
        { status: 'cerrado', comment: 'x', closedAt: '2026-01-01' },
        lucas,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('corrige la descripción y el radicado, salvo si está cerrado', async () => {
    repo.findOne.mockResolvedValue(incident());
    await service.update(
      1,
      { description: ' Nueva descripción larga ', filingNumber: '' },
      lucas,
    );
    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        description: 'Nueva descripción larga',
        filingNumber: null,
      }),
    );
    repo.findOne.mockResolvedValue(incident({ status: 'cerrado' }));
    await expect(
      service.update(1, { description: 'otra cosa más' }, lucas),
    ).rejects.toThrow(ConflictException);
  });

  it('solo se borra un incidente abierto; lista y 404', async () => {
    repo.findOne.mockResolvedValue(incident({ status: 'en_gestion' }));
    await expect(service.remove(1, lucas)).rejects.toThrow(ConflictException);
    repo.findOne.mockResolvedValue(incident());
    await service.remove(1, lucas);
    expect(repo.remove).toHaveBeenCalled();
    await service.findAll({ householdId: 1, status: 'abierto' }, lucas);
    repo.findOne.mockResolvedValue(null);
    await expect(service.findOwned(5, lucas)).rejects.toThrow(
      NotFoundException,
    );
  });
});
