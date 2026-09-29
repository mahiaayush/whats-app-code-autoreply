import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { AppError } from './app-error.js';

export function errorHandler(
  error: FastifyError | AppError | Error,
  request: FastifyRequest,
  reply: FastifyReply,
): void {
  const requestId = request.id;

  // Zod schema validation errors
  if (error instanceof ZodError) {
    request.log.warn({ requestId, err: error }, 'Request validation failed');
    reply.status(400).send({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request payload validation failed',
        details: error.errors.map((e: { path: (string | number)[]; message: string }) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      },
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }

  // Known application errors
  if (error instanceof AppError) {
    if (error.statusCode >= 500) {
      request.log.error({ requestId, err: error }, error.message);
    } else {
      request.log.warn({ requestId, err: error }, error.message);
    }

    reply.status(error.statusCode).send({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }

  // Fastify native errors
  if ('statusCode' in error && typeof error.statusCode === 'number') {
    reply.status(error.statusCode).send({
      success: false,
      error: {
        code: error.code || 'HTTP_ERROR',
        message: error.message,
      },
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }

  // Unhandled internal server errors
  request.log.error({ requestId, err: error }, 'Unhandled server error');
  reply.status(500).send({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected internal server error occurred',
    },
    meta: {
      requestId,
      timestamp: new Date().toISOString(),
    },
  });
}
