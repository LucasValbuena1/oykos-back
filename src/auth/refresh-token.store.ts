import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  AuthenticationStorage,
  type RefreshTokenRecord,
  type RefreshTokenStore,
} from '@nestjs/authentication';
import { IsNull, LessThan, Repository } from 'typeorm';
import { RefreshTokenRow, RevokedFamilyRow } from './refresh-token.entity.js';

/** Guarda los refresh tokens (su hash) en PostgreSQL en vez de en memoria. */
@Injectable()
export class DbRefreshTokenStore implements RefreshTokenStore {
  constructor(
    @InjectRepository(RefreshTokenRow)
    private readonly tokens: Repository<RefreshTokenRow>,
    @InjectRepository(RevokedFamilyRow)
    private readonly revoked: Repository<RevokedFamilyRow>,
    storage: AuthenticationStorage,
  ) {
    storage.registerSource({ refreshTokens: this });
  }

  async getRefreshToken(id: string): Promise<RefreshTokenRecord | undefined> {
    const row = await this.tokens.findOneBy({ id });
    if (!row) return undefined;
    return {
      id: row.id,
      familyId: row.familyId,
      userId: row.userId,
      createdAt: row.createdAt,
      expiresAt: row.expiresAt,
      familyExpiresAt: row.familyExpiresAt,
      usedAt: row.usedAt ?? undefined,
      claims: row.claims ?? undefined,
    };
  }

  async saveRefreshToken(record: RefreshTokenRecord): Promise<void> {
    // Limpia las familias que ya vencieron para que la tabla no crezca sin límite.
    await this.tokens.delete({ familyExpiresAt: LessThan(new Date()) });
    await this.tokens.save(
      this.tokens.create({
        ...record,
        usedAt: record.usedAt ?? null,
        claims: record.claims ?? null,
      }),
    );
  }

  /** Una sola escritura condicional: de dos peticiones simultáneas, solo una gana. */
  async markRefreshTokenUsed(id: string, at: Date): Promise<boolean> {
    const result = await this.tokens.update(
      { id, usedAt: IsNull() },
      { usedAt: at },
    );
    return (result.affected ?? 0) === 1;
  }

  async revokeRefreshTokenFamily(familyId: string): Promise<void> {
    await this.revoked.upsert({ familyId, revokedAt: new Date() }, [
      'familyId',
    ]);
  }

  async isRefreshTokenFamilyRevoked(familyId: string): Promise<boolean> {
    return this.revoked.existsBy({ familyId });
  }

  async revokeUserRefreshTokens(userId: string): Promise<void> {
    const rows = await this.tokens
      .createQueryBuilder('t')
      .select('DISTINCT t.family_id', 'familyId')
      .where('t.user_id = :userId', { userId })
      .getRawMany<{ familyId: string }>();
    for (const { familyId } of rows)
      await this.revokeRefreshTokenFamily(familyId);
  }
}
