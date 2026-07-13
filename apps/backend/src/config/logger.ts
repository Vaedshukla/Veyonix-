/**
 * Veyonix Backend — Pino Logger Configuration
 */
import type { LoggerOptions } from 'pino';

const isDev = process.env['NODE_ENV'] === 'development';

export const loggerConfig: LoggerOptions = {
  level: isDev ? 'debug' : 'info',
  ...(isDev && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    },
  }),
  serializers: {
    req(req) {
      return {
        id: req.id,
        method: req.method,
        url: req.url,
        remoteAddress: req.socket?.remoteAddress,
      };
    },
    res(res) {
      return {
        statusCode: res.statusCode,
      };
    },
    err(err: Error) {
      return {
        type: err.constructor.name,
        message: err.message,
        stack: err.stack,
      };
    },
  },
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'body.password',
      'body.passwordHash',
      'body.token',
      'body.refreshToken',
      '*.passwordHash',
      '*.token',
    ],
    censor: '[REDACTED]',
  },
};
