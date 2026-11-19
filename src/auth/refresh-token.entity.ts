import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('refresh_tokens')
export class RefreshTokenRow {
  @PrimaryColumn() id: string;
  @Column({ name: 'family_id' }) familyId: string;
  @Column({ name: 'user_id' }) userId: string;
  @Column({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
  @Column({ name: 'expires_at', type: 'timestamptz' }) expiresAt: Date;
  @Column({ name: 'family_expires_at', type: 'timestamptz' })
  familyExpiresAt: Date;
  @Column({ name: 'used_at', type: 'timestamptz', nullable: true })
  usedAt: Date | null;
  @Column({ type: 'jsonb', nullable: true }) claims: Record<
    string,
    unknown
  > | null;
}

@Entity('revoked_token_families')
export class RevokedFamilyRow {
  @PrimaryColumn({ name: 'family_id' }) familyId: string;
  @Column({ name: 'revoked_at', type: 'timestamptz' }) revokedAt: Date;
}
