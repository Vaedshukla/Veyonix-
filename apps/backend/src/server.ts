/**
 * Veyonix Backend — Server Entry Point
 *
 * This file boots the Fastify application and starts listening.
 * It handles graceful shutdown on SIGTERM/SIGINT.
 */
import 'dotenv/config'; // Load .env before any config is parsed
import pino from 'pino';

import { env } from '@config/index';
import { loggerConfig } from '@config/logger';
import { createApp } from './app';

const logger = pino(loggerConfig);

async function bootstrap(): Promise<void> {
  const app = await createApp();

  try {
    await app.listen({ port: env.APP_PORT, host: env.APP_HOST });
    logger.info(
      { port: env.APP_PORT, host: env.APP_HOST, env: env.NODE_ENV },
      `🚀 Veyonix API is running`,
    );
    logger.info(`📡 API: ${env.APP_BASE_URL}/api/v1`);
    if (env.SWAGGER_ENABLED) {
      logger.info(`📚 Swagger: ${env.APP_BASE_URL}/docs`);
    }
  } catch (error) {
    logger.fatal(error, 'Failed to start server');
    process.exit(1);
  }
}

function setupGracefulShutdown(stopFn: () => Promise<void>): void {
  const signals: NodeJS.Signals[] = ['SIGTERM', 'SIGINT'];

  signals.forEach((signal) => {
    process.once(signal, () => {
      logger.info({ signal }, 'Shutdown signal received');
      void stopFn()
        .then(() => {
          logger.info('Server stopped gracefully');
          process.exit(0);
        })
        .catch((err) => {
          logger.error(err, 'Error during graceful shutdown');
          process.exit(1);
        });
    });
  });
}

void bootstrap().then(() => {
  // setupGracefulShutdown is called from app.ts via fastify's addHook
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: unknown) => {
  console.error('Unhandled Promise Rejection:', reason);
  if (reason instanceof Error) {
    logger.fatal({ err: reason }, `Unhandled Promise Rejection: ${reason.message} — shutting down`);
  } else {
    logger.fatal({ reason }, 'Unhandled Promise Rejection — shutting down');
  }
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.fatal(error, 'Uncaught Exception — shutting down');
  process.exit(1);
});
