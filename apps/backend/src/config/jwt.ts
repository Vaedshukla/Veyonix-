import { env } from './index';

export const jwtConfig = {
  access: {
    secret: env.JWT_ACCESS_SECRET,
    ttl: env.JWT_ACCESS_TTL,
    expiresIn: `${env.JWT_ACCESS_TTL}s`,
  },
  refresh: {
    secret: env.JWT_REFRESH_SECRET,
    ttl: env.JWT_REFRESH_TTL,
    expiresIn: `${env.JWT_REFRESH_TTL}s`,
  },
  agent: {
    secret: env.JWT_AGENT_SECRET,
    ttl: env.JWT_AGENT_TTL,
    expiresIn: `${env.JWT_AGENT_TTL}s`,
  },
} as const;
