import { beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app';

let app: FastifyInstance;

export function getApp(): FastifyInstance {
  return app;
}

beforeAll(async () => {
  process.env['DATABASE_URL'] = process.env['TEST_DATABASE_URL'] ?? process.env['DATABASE_URL'];
  app = await buildApp();
  await app.ready();
});

afterAll(async () => {
  await app.close();
});
