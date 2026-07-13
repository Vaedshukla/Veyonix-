import type { FastifyRequest, FastifyReply } from 'fastify';

import { RegisterUserHandler } from '../../application/commands/RegisterUser.handler';
import { LoginUserHandler } from '../../application/commands/LoginUser.handler';
import { RefreshTokenHandler } from '../../application/commands/RefreshToken.handler';
import { LogoutUserHandler } from '../../application/commands/LogoutUser.handler';
import { registerUserSchema } from '../../application/commands/RegisterUser.command';
import { loginUserSchema } from '../../application/commands/LoginUser.command';
import { refreshTokenSchema } from '../../application/commands/RefreshToken.command';
import { ok, noContent } from '@shared/response/envelope';
import { securityConfig } from '@config/security';

export class AuthController {
  private readonly registerUserHandler: RegisterUserHandler;
  private readonly loginUserHandler: LoginUserHandler;
  private readonly refreshTokenHandler: RefreshTokenHandler;
  private readonly logoutUserHandler: LogoutUserHandler;

  constructor(dependencies: {
    registerUserHandler: RegisterUserHandler;
    loginUserHandler: LoginUserHandler;
    refreshTokenHandler: RefreshTokenHandler;
    logoutUserHandler: LogoutUserHandler;
  }) {
    this.registerUserHandler = dependencies.registerUserHandler;
    this.loginUserHandler = dependencies.loginUserHandler;
    this.refreshTokenHandler = dependencies.refreshTokenHandler;
    this.logoutUserHandler = dependencies.logoutUserHandler;
  }

  async register(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const command = registerUserSchema.parse(request.body);
    const ipAddress = request.ip;
    const userAgent = request.headers['user-agent'];

    const result = await this.registerUserHandler.handle(command, ipAddress, userAgent);

    // Set refresh token in httpOnly cookie for extra security
    void reply.setCookie('refreshToken', result.tokens.refreshToken, {
      httpOnly: securityConfig.cookie.httpOnly,
      secure: securityConfig.cookie.secure,
      sameSite: securityConfig.cookie.sameSite,
      maxAge: securityConfig.cookie.maxAge,
      path: '/api/v1/auth',
    });

    void reply.status(201).send(ok(result));
  }

  async login(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const command = loginUserSchema.parse(request.body);
    const ipAddress = request.ip;
    const userAgent = request.headers['user-agent'];

    const result = await this.loginUserHandler.handle(command, ipAddress, userAgent);

    void reply.setCookie('refreshToken', result.tokens.refreshToken, {
      httpOnly: securityConfig.cookie.httpOnly,
      secure: securityConfig.cookie.secure,
      sameSite: securityConfig.cookie.sameSite,
      maxAge: securityConfig.cookie.maxAge,
      path: '/api/v1/auth',
    });

    void reply.status(200).send(ok(result));
  }

  async refresh(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    // Read from body or cookie fallback
    const bodyResult = refreshTokenSchema.safeParse(request.body);
    const token = bodyResult.success 
      ? bodyResult.data.refreshToken 
      : request.cookies['refreshToken'];

    if (!token) {
      void reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Refresh token is required.',
        },
      });
      return;
    }

    const ipAddress = request.ip;
    const userAgent = request.headers['user-agent'];

    const result = await this.refreshTokenHandler.handle({ refreshToken: token }, ipAddress, userAgent);

    void reply.setCookie('refreshToken', result.tokens.refreshToken, {
      httpOnly: securityConfig.cookie.httpOnly,
      secure: securityConfig.cookie.secure,
      sameSite: securityConfig.cookie.sameSite,
      maxAge: securityConfig.cookie.maxAge,
      path: '/api/v1/auth',
    });

    void reply.status(200).send(ok(result));
  }

  async logout(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const user = request.user;
    if (user?.sessionId) {
      await this.logoutUserHandler.handle(user.sessionId);
    }
    
    void reply.clearCookie('refreshToken', { path: '/api/v1/auth' });
    void reply.status(200).send(noContent());
  }
}
