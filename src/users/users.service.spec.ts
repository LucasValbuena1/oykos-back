import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PasswordHasher } from '@nestjs/authentication';
import { UsersService } from './users.service.js';
import { User } from './user.entity.js';
import { lucas, mockRepo, type MockRepo } from '../../test/helpers.js';

describe('UsersService', () => {
  let service: UsersService;
  let repo: MockRepo;
  const hasher = {
    hash: vi.fn(async (p: string) => `hash(${p})`),
    verify: vi.fn(async (p: string, h?: string) => h === `hash(${p})`),
  };

  beforeEach(async () => {
    repo = mockRepo();
    const module = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: repo },
        { provide: PasswordHasher, useValue: hasher },
      ],
    }).compile();
    service = module.get(UsersService);
  });

  it('registra con el correo en minúscula, la contraseña con hash y rol user', async () => {
    const u = await service.register({
      email: ' Nuevo@Oykos.CO ',
      password: 'una-clave-larga',
      name: ' Ana ',
    });
    expect(u).toMatchObject({
      email: 'nuevo@oykos.co',
      name: 'Ana',
      passwordHash: 'hash(una-clave-larga)',
      role: 'user',
      phone: null,
    });
  });

  it('409 si el correo ya existe', async () => {
    repo.existsBy.mockResolvedValue(true);
    await expect(
      service.register({ email: 'a@b.co', password: 'x', name: 'A' }),
    ).rejects.toThrow(ConflictException);
  });

  it('verifica credenciales; con correo inexistente también llama a verify (mismo tiempo)', async () => {
    repo.findOneBy.mockResolvedValue({ ...lucas, passwordHash: 'hash(bien)' });
    expect(
      await service.verifyCredentials('lucas@oykos.co', 'bien'),
    ).toMatchObject({ id: 2 });
    expect(await service.verifyCredentials('lucas@oykos.co', 'mal')).toBeNull();
    repo.findOneBy.mockResolvedValue(null);
    hasher.verify.mockClear();
    expect(await service.verifyCredentials('nadie@oykos.co', 'x')).toBeNull();
    expect(hasher.verify).toHaveBeenCalledWith('x', undefined);
  });

  it('actualiza el perfil', async () => {
    repo.findOneBy.mockResolvedValue({ ...lucas });
    await expect(
      service.updateProfile(lucas, { name: ' Lucas V ', phone: '3011112233' }),
    ).resolves.toMatchObject({ name: 'Lucas V', phone: '3011112233' });
    repo.findOneBy.mockResolvedValue(null);
    await expect(service.updateProfile(lucas, {})).rejects.toThrow(
      NotFoundException,
    );
  });

  it('cambia la contraseña solo con la actual correcta y si es distinta', async () => {
    repo.findOneBy.mockResolvedValue({ ...lucas, passwordHash: 'hash(vieja)' });
    await expect(
      service.changePassword(lucas, {
        currentPassword: 'mala',
        newPassword: 'nueva-clave-123',
      }),
    ).rejects.toThrow(UnauthorizedException);
    await expect(
      service.changePassword(lucas, {
        currentPassword: 'vieja',
        newPassword: 'vieja',
      }),
    ).rejects.toThrow(ConflictException);
    await service.changePassword(lucas, {
      currentPassword: 'vieja',
      newPassword: 'nueva-clave-123',
    });
    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({ passwordHash: 'hash(nueva-clave-123)' }),
    );
  });
});
