import { env } from './index';

export const databaseConfig = {
  url: env.DATABASE_URL,
  pool: {
    min: env.DATABASE_POOL_MIN,
    max: env.DATABASE_POOL_MAX,
  },
} as const;
