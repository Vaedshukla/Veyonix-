import type { AuthRepository } from '../../domain/repositories/auth.repository';

export class LogoutUserHandler {
  private readonly authRepository: AuthRepository;

  constructor(dependencies: { authRepository: AuthRepository }) {
    this.authRepository = dependencies.authRepository;
  }

  async handle(sessionId: string): Promise<void> {
    await this.authRepository.revokeSession(sessionId);
  }
}
