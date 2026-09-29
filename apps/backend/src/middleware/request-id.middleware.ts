import crypto from 'node:crypto';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

export function generateRequestId(): string {
  return crypto.randomUUID();
}

export function registerRequestIdMiddleware(app: FastifyInstance): void {
  // Ensure every incoming request attaches request-id to response headers
  app.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    const incomingId = request.headers['x-request-id'];
    const requestId =
      typeof incomingId === 'string' && incomingId.trim().length > 0
        ? incomingId.trim()
        : generateRequestId();

    // Fastify request id
    request.id = requestId;
    reply.header('x-request-id', requestId);
  });
}
