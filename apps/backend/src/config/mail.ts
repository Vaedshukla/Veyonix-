import { env } from './index';

export const mailConfig = {
  provider: env.MAIL_PROVIDER,
  from: {
    name: env.MAIL_FROM_NAME,
    address: env.MAIL_FROM_ADDRESS,
  },
  resend: {
    apiKey: env.RESEND_API_KEY,
  },
  smtp: {
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth:
      env.SMTP_USER && env.SMTP_PASS
        ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
        : undefined,
  },
} as const;
