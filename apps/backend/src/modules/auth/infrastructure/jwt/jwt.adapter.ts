import jwt from 'jsonwebtoken';

import { jwtConfig } from '@config/jwt';
import { TokenExpiredError, InvalidCredentialsError } from '../../domain/errors/AuthErrors';
import type { JwtPayload, AgentJwtPayload } from '@veyonix/shared-types';

export interface TokenProvider {
  signAccess(payload: Omit<JwtPayload, 'type' | 'iat' | 'exp'>): string;
  signRefresh(payload: Omit<JwtPayload, 'type' | 'iat' | 'exp'>): string;
  signAgent(payload: Omit<AgentJwtPayload, 'type' | 'iat' | 'exp'>): string;
  verifyAccess(token: string): JwtPayload;
  verifyRefresh(token: string): JwtPayload;
  verifyAgent(token: string): AgentJwtPayload;
}

/**
 * Token Provider implemented using jsonwebtoken.
 * Signs and verifies Access, Refresh, and Agent JWT tokens.
 */
export class JwtTokenProvider implements TokenProvider {
  signAccess(payload: Omit<JwtPayload, 'type' | 'iat' | 'exp'>): string {
    return jwt.sign(
      { ...payload, type: 'access' },
      jwtConfig.access.secret,
      { expiresIn: jwtConfig.access.expiresIn }
    );
  }

  signRefresh(payload: Omit<JwtPayload, 'type' | 'iat' | 'exp'>): string {
    return jwt.sign(
      { ...payload, type: 'refresh' },
      jwtConfig.refresh.secret,
      { expiresIn: jwtConfig.refresh.expiresIn }
    );
  }

  signAgent(payload: Omit<AgentJwtPayload, 'type' | 'iat' | 'exp'>): string {
    return jwt.sign(
      { ...payload, type: 'agent' },
      jwtConfig.agent.secret,
      { expiresIn: jwtConfig.agent.expiresIn }
    );
  }

  verifyAccess(token: string): JwtPayload {
    try {
      return jwt.verify(token, jwtConfig.access.secret) as JwtPayload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new TokenExpiredError();
      }
      throw new InvalidCredentialsError();
    }
  }

  verifyRefresh(token: string): JwtPayload {
    try {
      return jwt.verify(token, jwtConfig.refresh.secret) as JwtPayload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new TokenExpiredError();
      }
      throw new InvalidCredentialsError();
    }
  }

  verifyAgent(token: string): AgentJwtPayload {
    try {
      return jwt.verify(token, jwtConfig.agent.secret) as AgentJwtPayload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new TokenExpiredError();
      }
      throw new InvalidCredentialsError();
    }
  }
}
