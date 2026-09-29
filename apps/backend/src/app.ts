import fastify from 'fastify';
import cors from '@fastify/cors';
import sensible from '@fastify/sensible';
import websocket from '@fastify/websocket';
import crypto from 'node:crypto';
import { config, logger } from './config/index.js';
import { errorHandler } from './common/errors/error-handler.js';
import { healthRoutes } from './modules/health/health.routes.js';
import { propertyRoutes } from './modules/properties/property.routes.js';
import { registerWebSocketRoutes } from './websocket/ws.server.js';

export function buildApp() {
  const app = fastify({
    logger,
    requestIdHeader: 'x-request-id',
    genReqId: (req) => {
      const customId = req.headers['x-request-id'];
      if (typeof customId === 'string' && customId.trim().length > 0) {
        return customId.trim();
      }
      return crypto.randomUUID();
    },
  });

  // Attach x-request-id to all response headers
  app.addHook('onSend', async (request, reply) => {
    reply.header('x-request-id', request.id);
  });

  // Centralized Error Handling
  app.setErrorHandler(errorHandler);

  // Custom 404 Not Found Handler
  app.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Route ${request.method}:${request.url} not found`,
      },
      meta: {
        requestId: request.id,
        timestamp: new Date().toISOString(),
      },
    });
  });

  // CORS Configuration
  const allowedOrigins = config.CORS_ORIGIN.split(',').map((o) => o.trim());
  app.register(cors, {
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (origin.startsWith('chrome-extension://')) {
        return cb(null, true);
      }
      if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        return cb(null, true);
      }
      cb(new Error(`Origin '${origin}' not allowed by CORS`), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // Fastify Sensible utilities
  app.register(sensible);

  // WebSocket Plugin
  app.register(websocket, {
    options: {
      maxPayload: 1048576, // 1MB
    },
  });

  // Register Routes
  app.register(healthRoutes);
  app.register(propertyRoutes, { prefix: '/api/v1/properties' });
  app.register(registerWebSocketRoutes);

  return app;
}
