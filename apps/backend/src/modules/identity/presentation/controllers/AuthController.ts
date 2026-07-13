import type { FastifyRequest, FastifyReply } from 'fastify';
import {
  LoginUserSchema,
  RegisterUserSchema,
  RefreshTokenSchema,
  RequestPasswordResetSchema,
  ResetPasswordSchema,
  VerifyEmailSchema,
  RevokeSessionSchema,
} from '../../application/dtos/auth.dto';
import type { RegisterUserUseCase } from '../../application/use-cases/RegisterUser.usecase';
import type { LoginUserUseCase } from '../../application/use-cases/LoginUser.usecase';
import type { LogoutUserUseCase } from '../../application/use-cases/LogoutUser.usecase';
import type { RefreshTokensUseCase } from '../../application/use-cases/RefreshTokens.usecase';
import type { RequestPasswordResetUseCase } from '../../application/use-cases/RequestPasswordReset.usecase';
import type { ResetPasswordUseCase } from '../../application/use-cases/ResetPassword.usecase';
import type { VerifyEmailUseCase } from '../../application/use-cases/VerifyEmail.usecase';
import type { RevokeSessionUseCase } from '../../application/use-cases/RevokeSession.usecase';
import type { RedisSessionCache } from '../../infrastructure/services/RedisSessionCache';
import { env } from '@config/index';

export interface AuthControllerDeps {
  registerUserUseCase: RegisterUserUseCase;
  loginUserUseCase: LoginUserUseCase;
  logoutUserUseCase: LogoutUserUseCase;
  refreshTokensUseCase: RefreshTokensUseCase;
  requestPasswordResetUseCase: RequestPasswordResetUseCase;
  resetPasswordUseCase: ResetPasswordUseCase;
  verifyEmailUseCase: VerifyEmailUseCase;
  revokeSessionUseCase: RevokeSessionUseCase;
  sessionCache: RedisSessionCache;
}

const REFRESH_TOKEN_COOKIE = 'veyonix_refresh';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/api/v1/auth',
  maxAge: env.JWT_REFRESH_TTL,
};

export class AuthController {
  constructor(private readonly deps: AuthControllerDeps) {}

  async register(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const dto = RegisterUserSchema.parse(request.body);
    const ctx = {
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'] ?? null,
      correlationId: (request.headers['x-correlation-id'] as string) ?? null,
    };

    const { result, refreshToken } = await this.deps.registerUserUseCase.execute(dto, ctx);

    reply.setCookie(REFRESH_TOKEN_COOKIE, refreshToken, COOKIE_OPTIONS);
    reply.status(201).send({ success: true, data: result });
  }

  async login(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const dto = LoginUserSchema.parse(request.body);
    const ctx = {
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'] ?? null,
      correlationId: (request.headers['x-correlation-id'] as string) ?? null,
    };

    const { result, refreshToken } = await this.deps.loginUserUseCase.execute(dto, ctx);

    // Cache session in Redis for fast validation
    await this.deps.sessionCache.setSessionValid(
      result.session.id,
      result.user.id,
      env.JWT_REFRESH_TTL,
    );

    const cookieMaxAge = dto.rememberMe ? env.JWT_REFRESH_TTL * 3 : env.JWT_REFRESH_TTL;
    reply.setCookie(REFRESH_TOKEN_COOKIE, refreshToken, { ...COOKIE_OPTIONS, maxAge: cookieMaxAge });
    reply.status(200).send({ success: true, data: result });
  }

  async logout(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    if (!request.user) {
      return reply.status(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated.' } });
    }

    const rawRefreshToken = request.cookies?.[REFRESH_TOKEN_COOKIE] ?? null;
    const correlationId = (request.headers['x-correlation-id'] as string) ?? null;

    await this.deps.logoutUserUseCase.execute({
      userId: request.user.id,
      sessionId: request.user.sessionId,
      rawRefreshToken,
      correlationId,
      ipAddress: request.ip,
    });

    // Invalidate from Redis immediately
    await this.deps.sessionCache.invalidateSession(request.user.sessionId);

    reply.clearCookie(REFRESH_TOKEN_COOKIE, { path: '/api/v1/auth' });
    reply.status(200).send({ success: true, data: null });
  }

  async refresh(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    // Support both cookie and body delivery of refresh token
    const cookieToken = request.cookies?.[REFRESH_TOKEN_COOKIE];
    const bodyResult = RefreshTokenSchema.safeParse(request.body);
    const rawToken = cookieToken ?? (bodyResult.success ? bodyResult.data.refreshToken : null);

    if (!rawToken) {
      return reply.status(401).send({
        success: false,
        error: { code: 'INVALID_REFRESH_TOKEN', message: 'No refresh token provided.' },
      });
    }

    const ctx = {
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'] ?? null,
      correlationId: (request.headers['x-correlation-id'] as string) ?? null,
    };

    const { result, newRefreshToken } = await this.deps.refreshTokensUseCase.execute(rawToken, ctx);

    // Refresh the Redis session TTL
    await this.deps.sessionCache.setSessionValid(result.session.id, 'userId', env.JWT_REFRESH_TTL);

    reply.setCookie(REFRESH_TOKEN_COOKIE, newRefreshToken, COOKIE_OPTIONS);
    reply.status(200).send({ success: true, data: result });
  }

  async requestPasswordReset(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const dto = RequestPasswordResetSchema.parse(request.body);
    const ctx = {
      ipAddress: request.ip,
      correlationId: (request.headers['x-correlation-id'] as string) ?? null,
    };
    // Always returns 200 to prevent email enumeration
    await this.deps.requestPasswordResetUseCase.execute(dto.email, ctx);
    reply.status(200).send({ success: true, data: { message: 'If this email is registered, a password reset link has been sent.' } });
  }

  async resetPassword(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const dto = ResetPasswordSchema.parse(request.body);
    const ctx = {
      ipAddress: request.ip,
      correlationId: (request.headers['x-correlation-id'] as string) ?? null,
    };
    await this.deps.resetPasswordUseCase.execute(dto.token, dto.newPassword, ctx);
    reply.status(200).send({ success: true, data: { message: 'Password has been reset successfully. Please log in.' } });
  }

  async verifyEmail(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const dto = VerifyEmailSchema.parse(request.body);
    const ctx = { correlationId: (request.headers['x-correlation-id'] as string) ?? null };
    await this.deps.verifyEmailUseCase.execute(dto.token, ctx);
    reply.status(200).send({ success: true, data: { message: 'Email verified successfully.' } });
  }

  async revokeSession(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    if (!request.user) {
      return reply.status(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated.' } });
    }
    const dto = RevokeSessionSchema.parse(request.body);
    await this.deps.revokeSessionUseCase.execute(dto.sessionId, {
      requestingUserId: request.user.id,
      correlationId: (request.headers['x-correlation-id'] as string) ?? null,
      ipAddress: request.ip,
    });
    await this.deps.sessionCache.invalidateSession(dto.sessionId);
    reply.status(200).send({ success: true, data: null });
  }
}
