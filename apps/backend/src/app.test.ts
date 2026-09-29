import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from './app.js';

describe('Backend Fastify Application', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = buildApp();
    await app.listen({ port: 0, host: '127.0.0.1' });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/v1/health', () => {
    it('should return 200 with structured JSON format', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/health',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      expect(body).toMatchObject({
        status: 'ok',
        service: 'backend',
        version: '0.1.0',
      });
      expect(typeof body.uptimeSeconds).toBe('number');
      expect(body.requestId).toBeDefined();
    });

    it('should attach x-request-id header to response', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/health',
      });

      expect(response.headers['x-request-id']).toBeDefined();
    });

    it('should preserve incoming x-request-id if provided', async () => {
      const customId = 'client-req-99999';
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/health',
        headers: {
          'x-request-id': customId,
        },
      });

      expect(response.headers['x-request-id']).toBe(customId);
      const body = JSON.parse(response.body);
      expect(body.requestId).toBe(customId);
    });
  });

  describe('GET /api/v1/ready', () => {
    it('should return structured readiness status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/ready',
      });

      expect([200, 503]).toContain(response.statusCode);
      const body = JSON.parse(response.body);

      expect(body.service).toBe('backend');
      expect(['ok', 'degraded', 'error']).toContain(body.status);
      expect(body.dependencies).toBeDefined();
      expect(body.dependencies.redis).toBeDefined();
      expect(body.dependencies.postgres).toBeDefined();
      expect(body.dependencies.ollama).toBeDefined();
    });
  });

  describe('GET /api/v1/ollama/health', () => {
    it('should return structured Ollama health response', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/ollama/health',
      });

      expect([200, 503]).toContain(response.statusCode);
      const body = JSON.parse(response.body);

      expect(body.service).toBe('ollama');
      expect(body.baseUrl).toBeDefined();
      expect(body.configuredModel).toBeDefined();
      expect(typeof body.modelInstalled).toBe('boolean');
    });
  });

  describe('Error Handling & 404', () => {
    it('should return structured JSON error on 404', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/non-existent-endpoint',
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);

      expect(body.success).toBe(false);
      expect(body.error).toBeDefined();
      expect(body.meta?.requestId).toBeDefined();
    });
  });

  describe('CORS Headers', () => {
    it('should return CORS headers for allowed origins', async () => {
      const response = await app.inject({
        method: 'OPTIONS',
        url: '/api/v1/health',
        headers: {
          origin: 'http://localhost:5173',
          'access-control-request-method': 'GET',
        },
      });

      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    });

    it('should allow chrome-extension:// origins', async () => {
      const response = await app.inject({
        method: 'OPTIONS',
        url: '/api/v1/health',
        headers: {
          origin: 'chrome-extension://abcdefghijklmnop',
          'access-control-request-method': 'GET',
        },
      });

      expect(response.headers['access-control-allow-origin']).toBe(
        'chrome-extension://abcdefghijklmnop',
      );
    });
  });

  describe('WebSocket /api/v1/ws', () => {
    it('should connect to WebSocket and receive initial welcome message', async () => {
      const address = app.server.address();
      if (!address || typeof address !== 'object') {
        throw new Error('Server address not available');
      }

      const { WebSocket } = await import('ws');
      const ws = new WebSocket(`ws://127.0.0.1:${address.port}/api/v1/ws`);

      const messagePromise = new Promise<string>((resolve, reject) => {
        ws.on('message', (data) => resolve(data.toString()));
        ws.on('error', reject);
      });

      const message = await messagePromise;
      ws.close();

      const parsed = JSON.parse(message);
      expect(parsed.event).toBe('CONNECTION_ESTABLISHED');
      expect(parsed.data.status).toBe('connected');
    });
  });
});
