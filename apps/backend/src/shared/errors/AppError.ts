import type { ErrorCode } from '@veyonix/shared-config';

/**
 * Base application error.
 * All domain and infrastructure errors extend this.
 * Contains a structured error code for client consumption.
 */
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: unknown[];

  constructor(options: {
    code: ErrorCode;
    message: string;
    statusCode?: number;
    isOperational?: boolean;
    details?: unknown[];
    cause?: Error;
  }) {
    super(options.message, { cause: options.cause });
    this.name = this.constructor.name;
    this.code = options.code;
    this.statusCode = options.statusCode ?? 500;
    this.isOperational = options.isOperational ?? true;
    this.details = options.details;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      details: this.details,
    };
  }
}
