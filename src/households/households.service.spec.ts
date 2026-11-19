import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { AuthorizationService } from '@nestjs/authorization';
import {
  HouseholdsService,
  MAX_HOUSEHOLDS_PER_USER,
} from './households.service.js';
import { Household } from './household.entity.js';
import { HouseholdPolicy } from './household.policy.js';
import { admin, lucas, mockRepo, type MockRepo } from '../../test/helpers.js';

describe('HouseholdsService', () => {
  let service: HouseholdsService;
  let repo: MockRepo;
  const policy = new HouseholdPolicy();
  // AuthorizationService falso que aplica la policy real.
  const authz = {
    authorize: vi.fn(
      async (
        _p: unknown,
        ability: 'manage',
        user: typeof lucas,
        h: Household,
      ) => {
        if (policy.before(user) !== true && !policy[ability](user, h))
          throw new ForbiddenException();
      },
    ),
  };

  beforeEach(async () => {
    repo = mockRepo();
    const module = await Test.createTestingModule({
      providers: [
        HouseholdsService,
        { provide: getRepositoryToken(Household), useValue: repo },
        { provide: AuthorizationService, useValue: authz },
      ],
    }).compile();
    service = module.get(HouseholdsService);
  });

  const dto = {
    name: ' Casa Nueva ',
    type: 'casa' as const,
    address: 'Calle 1 # 2-3',
    city: 'Bogotá',
    stratum: 3,
  };

  it('lista solo los hogares del usuario', async () => {
    await service.findAllFor(lucas);
    expect(repo.find).toHaveBeenCalledWith(
      expect.objectContaining({ where: { ownerId: lucas.id } }),
    );
  });

  it('crea un hogar a nombre del usuario y limpia el nombre', async () => {
    const h = await service.create(dto, lucas);
    expect(h).toMatchObject({ name: 'Casa Nueva', ownerId: lucas.id });
  });

  it('responde 409 si el usuario ya tiene un hogar con ese nombre', async () => {
    repo.existsBy.mockResolvedValue(true);
    await expect(service.create(dto, lucas)).rejects.toThrow(ConflictException);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it(`no permite más de ${MAX_HOUSEHOLDS_PER_USER} hogares por usuario`, async () => {
    repo.countBy.mockResolvedValue(MAX_HOUSEHOLDS_PER_USER);
    await expect(service.create(dto, lucas)).rejects.toThrow(/máximo/);
  });

  it('404 si el hogar no existe', async () => {
    await expect(service.findOwned(7, lucas)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('403 si el hogar es de otro usuario, pero el admin sí entra', async () => {
    repo.findOneBy.mockResolvedValue({ id: 3, ownerId: 3 });
    await expect(service.findOwned(3, lucas)).rejects.toThrow(
      ForbiddenException,
    );
    await expect(service.findOwned(3, admin)).resolves.toMatchObject({ id: 3 });
  });

  it('al renombrar valida que el nombre no se repita, sin contarse a sí mismo', async () => {
    repo.findOneBy.mockResolvedValue({ id: 1, ownerId: 2, name: 'Viejo' });
    await service.update(1, { name: 'Nuevo' }, lucas);
    expect(repo.existsBy).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerId: 2,
        name: 'Nuevo',
        id: expect.anything(),
      }),
    );
    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Nuevo' }),
    );
  });

  it('actualiza sin cambiar el nombre y borra', async () => {
    repo.findOneBy.mockResolvedValue({ id: 1, ownerId: 2, name: 'Casa' });
    await service.update(1, { stratum: 5 }, lucas);
    expect(repo.existsBy).not.toHaveBeenCalled();
    await service.remove(1, lucas);
    expect(repo.remove).toHaveBeenCalled();
  });
});

describe('HouseholdPolicy', () => {
  const policy = new HouseholdPolicy();
  it('el admin pasa siempre; los demás solo sobre lo suyo', () => {
    expect(policy.before(admin)).toBe(true);
    expect(policy.before(lucas)).toBeUndefined();
    expect(policy.manage(lucas, { ownerId: 2 } as Household)).toBe(true);
    expect(policy.manage(lucas, { ownerId: 3 } as Household)).toBe(false);
    expect(policy.manage(null, { ownerId: 2 } as Household)).toBe(false);
    expect(policy.listAll(lucas)).toBe(false);
  });
});
