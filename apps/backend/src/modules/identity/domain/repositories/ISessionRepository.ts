import type { SessionEntity } from '../entities/Session.entity';

export interface ISessionRepository {
  create(session: SessionEntity): Promise<SessionEntity>;
  findById(id: string): Promise<SessionEntity | null>;
  findActiveByUserId(userId: string): Promise<SessionEntity[]>;
  revoke(id: string, reason: string): Promise<void>;
  revokeAllForUser(userId: string, reason: string): Promise<void>;
  updateLastActive(id: string): Promise<void>;
}
