import * as crypto from 'node:crypto';
import { IEnrollmentTokenRepository } from '../../domain/repositories/IEnrollmentTokenRepository';
import { EnrollmentTokenEntity } from '../../domain/entities/EnrollmentToken.entity';
import { GenerateEnrollmentTokenDTO } from '../dtos/device.dto';
import { uuidv7 } from 'uuidv7';

export class GenerateEnrollmentTokenUseCase {
  constructor(
    private readonly enrollmentTokenRepo: IEnrollmentTokenRepository,
    private readonly hashService: { hash: (data: string) => Promise<string> }
  ) {}

  async execute(dto: GenerateEnrollmentTokenDTO): Promise<string> {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = await this.hashService.hash(rawToken);

    const token = new EnrollmentTokenEntity({
      id: uuidv7(),
      organizationId: dto.organizationId,
      tokenHash,
      expiresAt: dto.expiresAt,
      maxUses: dto.maxUses,
      uses: 0,
      createdBy: dto.createdBy,
      createdAt: new Date(),
    });

    await this.enrollmentTokenRepo.create(token);

    return rawToken;
  }
}
