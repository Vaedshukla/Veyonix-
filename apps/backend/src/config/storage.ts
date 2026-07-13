import { env } from './index';

export const storageConfig = {
  provider: env.STORAGE_PROVIDER,
  local: {
    path: env.STORAGE_LOCAL_PATH,
  },
  s3: {
    bucket: env.S3_BUCKET,
    region: env.S3_REGION,
    accessKeyId: env.S3_ACCESS_KEY_ID,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    endpoint: env.S3_ENDPOINT, // For Cloudflare R2
  },
} as const;
