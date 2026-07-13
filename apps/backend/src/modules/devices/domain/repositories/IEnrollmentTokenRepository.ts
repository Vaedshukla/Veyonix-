import { EnrollmentTokenEntity } from '../entities/EnrollmentToken.entity';

export interface IEnrollmentTokenRepository {
  findByTokenHash(hash: string): Promise<EnrollmentTokenEntity | null>;
  create(token: EnrollmentTokenEntity): Promise<void>;
  update(token: EnrollmentTokenEntity): Promise<void>;
}
