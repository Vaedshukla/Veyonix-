import type { RefreshTokenEntity } from '../entities/RefreshToken.entity';

export interface IRefreshTokenRepository {
  create(token: RefreshTokenEntity): Promise<RefreshTokenEntity>;
  findByTokenHash(hash: string): Promise<RefreshTokenEntity | null>;
  findByFamilyId(familyId: string): Promise<RefreshTokenEntity[]>;
  markUsed(id: string): Promise<void>;
  revoke(id: string): Promise<void>;
  revokeFamily(familyId: string): Promise<void>;
}
