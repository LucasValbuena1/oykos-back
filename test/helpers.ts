import { vi } from 'vitest';
import type { User } from '../../src/users/user.entity.js';

/** Repositorio falso: cada método es un vi.fn() que la prueba programa. */
export function mockRepo() {
  return {
    find: vi.fn(async () => []),
    findBy: vi.fn(async () => []),
    findOne: vi.fn(async () => null),
    findOneBy: vi.fn(async () => null),
    existsBy: vi.fn(async () => false),
    count: vi.fn(async () => 0),
    countBy: vi.fn(async () => 0),
    create: vi.fn((dto: object) => ({ ...dto })),
    save: vi.fn(async (e: object) => ({ id: 99, ...e })),
    remove: vi.fn(async (e: object) => e),
    delete: vi.fn(async () => ({ affected: 0 })),
    update: vi.fn(async () => ({ affected: 1 })),
    upsert: vi.fn(async () => ({})),
    createQueryBuilder: vi.fn(),
  };
}
export type MockRepo = ReturnType<typeof mockRepo>;

export const lucas = {
  id: 2,
  email: 'lucas@oykos.co',
  name: 'Lucas',
  role: 'user',
} as User;
export const admin = {
  id: 1,
  email: 'admin@oykos.co',
  name: 'Admin',
  role: 'admin',
} as User;

/** HouseholdsService falso: findOwned resuelve un hogar del usuario. */
export function mockHouseholds() {
  return { findOwned: vi.fn(async (id: number) => ({ id, ownerId: 2 })) };
}

/** Fecha YYYY-MM-DD relativa a hoy. */
export function daysFromNow(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
