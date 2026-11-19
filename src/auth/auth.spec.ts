import { DbRefreshTokenStore } from './refresh-token.store.js';
import { JwtAuth } from './jwt.auth.js';
import { mockRepo } from '../../test/helpers.js';

describe('DbRefreshTokenStore', () => {
  const tokens = mockRepo();
  const revoked = mockRepo();
  const storage = { registerSource: vi.fn() };
  const store = new DbRefreshTokenStore(
    tokens as never,
    revoked as never,
    storage as never,
  );
  const now = new Date();
  const record = {
    id: 'h1',
    familyId: 'f1',
    userId: '2',
    createdAt: now,
    expiresAt: now,
    familyExpiresAt: now,
  };

  it('se registra como almacén de refresh tokens', () => {
    expect(storage.registerSource).toHaveBeenCalledWith({
      refreshTokens: store,
    });
  });

  it('guarda limpiando las familias vencidas y lee el registro', async () => {
    await store.saveRefreshToken(record);
    expect(tokens.delete).toHaveBeenCalled();
    expect(tokens.save).toHaveBeenCalled();
    tokens.findOneBy.mockResolvedValue({
      ...record,
      usedAt: null,
      claims: null,
    });
    expect(await store.getRefreshToken('h1')).toMatchObject({
      id: 'h1',
      usedAt: undefined,
      claims: undefined,
    });
    tokens.findOneBy.mockResolvedValue(null);
    expect(await store.getRefreshToken('x')).toBeUndefined();
  });

  it('marcar como usado es una sola escritura condicional: solo una petición gana', async () => {
    tokens.update
      .mockResolvedValueOnce({ affected: 1 })
      .mockResolvedValueOnce({ affected: 0 });
    expect(await store.markRefreshTokenUsed('h1', now)).toBe(true);
    expect(await store.markRefreshTokenUsed('h1', now)).toBe(false);
  });

  it('revoca familias y todas las del usuario', async () => {
    await store.revokeRefreshTokenFamily('f1');
    expect(revoked.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ familyId: 'f1' }),
      ['familyId'],
    );
    revoked.existsBy.mockResolvedValue(true);
    expect(await store.isRefreshTokenFamilyRevoked('f1')).toBe(true);
    const qb = {
      select: () => qb,
      where: () => qb,
      getRawMany: async () => [{ familyId: 'a' }, { familyId: 'b' }],
    };
    tokens.createQueryBuilder.mockReturnValue(qb);
    revoked.upsert.mockClear();
    await store.revokeUserRefreshTokens('2');
    expect(revoked.upsert).toHaveBeenCalledTimes(2);
  });
});

describe('JwtAuth', () => {
  it('carga el usuario del sub del token; un sub inválido es 401 (null)', async () => {
    const users = { findById: vi.fn(async (id: number) => ({ id })) };
    const registry = { registerProvider: vi.fn() };
    const auth = new JwtAuth(users as never, registry as never);
    expect(registry.registerProvider).toHaveBeenCalledWith(auth, { order: 1 });
    expect(await auth.validate({ sub: '2' } as never)).toEqual({ id: 2 });
    expect(await auth.validate({ sub: 'abc' } as never)).toBeNull();
  });
});
