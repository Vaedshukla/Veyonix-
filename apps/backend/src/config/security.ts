/**
 * Veyonix Backend — Security Configuration
 *
 * Centralizes CORS origins, rate limits, and Helmet options.
 */
import { env } from './index';

export const securityConfig = {
  cors: {
    origins: env.CORS_ORIGINS.split(',').map((o) => o.trim()),
    credentials: true,
  },

  rateLimit: {
    global: {
      max: env.RATE_LIMIT_MAX,
      timeWindow: env.RATE_LIMIT_WINDOW_MS,
    },
    auth: {
      max: 10,
      timeWindow: 60 * 1000, // 10 attempts per minute on auth endpoints
    },
    agentEnroll: {
      max: 5,
      timeWindow: 60 * 1000, // 5 enrollment attempts per minute
    },
  },

  helmet: {
    contentSecurityPolicy: env.NODE_ENV === 'production',
    crossOriginEmbedderPolicy: false, // Required for Swagger UI in some browsers
  },

  cookie: {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  },

  bcrypt: {
    saltRounds: 12,
  },

  token: {
    accessExpiresIn: env.JWT_ACCESS_EXPIRES_IN,
    refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
  },
} as const;
