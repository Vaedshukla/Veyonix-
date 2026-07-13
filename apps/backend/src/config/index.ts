import { z } from 'zod';

const envSchema = z.object({
  // Application
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
  APP_NAME: z.string().default('Veyonix'),
  APP_VERSION: z.string().default('0.1.0'),
  APP_PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  APP_HOST: z.string().default('0.0.0.0'),
  APP_BASE_URL: z.string().url().default('http://localhost:3000'),

  // Database
  DATABASE_URL: z.string().min(1),
  DATABASE_POOL_MIN: z.coerce.number().int().default(2),
  DATABASE_POOL_MAX: z.coerce.number().int().default(20),

  // Redis
  REDIS_URL: z.string().min(1).default('redis://localhost:6379'),
  REDIS_KEY_PREFIX: z.string().default('veyonix:'),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.coerce.number().int().default(0),

  // JWT
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_AGENT_SECRET: z.string().min(32),
  JWT_ACCESS_TTL: z.coerce.number().int().default(900),
  JWT_REFRESH_TTL: z.coerce.number().int().default(2592000),
  JWT_AGENT_TTL: z.coerce.number().int().default(3600),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // CORS
  CORS_ORIGINS: z.string().default('http://localhost:5173'),

  // Rate Limiting
  RATE_LIMIT_MAX: z.coerce.number().int().default(100),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().default(60000),
  RATE_LIMIT_AUTH_MAX: z.coerce.number().int().default(10),
  RATE_LIMIT_AUTH_WINDOW_MS: z.coerce.number().int().default(900000),

  // Storage
  STORAGE_PROVIDER: z.enum(['LOCAL', 'S3', 'CLOUDFLARE_R2', 'AZURE_BLOB']).default('LOCAL'),
  STORAGE_LOCAL_PATH: z.string().default('./uploads'),
  S3_BUCKET: z.string().optional(),
  S3_REGION: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_ENDPOINT: z.string().optional(),

  // Mail
  MAIL_PROVIDER: z.enum(['RESEND', 'SES', 'SMTP', 'SENDGRID']).default('SMTP'),
  MAIL_FROM_NAME: z.string().default('Veyonix'),
  MAIL_FROM_ADDRESS: z.string().email().default('noreply@veyonix.com'),
  RESEND_API_KEY: z.string().optional(),
  SMTP_HOST: z.string().default('localhost'),
  SMTP_PORT: z.coerce.number().int().default(1025),
  SMTP_SECURE: z.coerce.boolean().default(false),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),

  // Agent
  AGENT_HEARTBEAT_INTERVAL_MS: z.coerce.number().int().default(30000),
  AGENT_OFFLINE_THRESHOLD_MS: z.coerce.number().int().default(120000),
  AGENT_MAX_CONNECTIONS: z.coerce.number().int().default(10000),
  AGENT_JWT_CERTIFICATE_TTL_DAYS: z.coerce.number().int().default(365),

  // Logging
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  LOG_PRETTY: z.coerce.boolean().default(false),

  // Swagger
  SWAGGER_ENABLED: z.coerce.boolean().default(true),
  SWAGGER_HOST: z.string().default('localhost:3000'),

  // Feature Flags
  FEATURE_FLAG_CACHE_TTL_MS: z.coerce.number().int().default(60000),
});

function parseEnv() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const formatted = result.error.format();
    console.error('\n❌ Invalid environment configuration:');
    console.error(JSON.stringify(formatted, null, 2));
    console.error('\nPlease check your .env file against .env.example\n');
    process.exit(1);
  }

  return result.data;
}

export const env = parseEnv();
export type Env = typeof env;
