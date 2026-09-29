import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../app.js';
import { closePrismaClient } from '../../database/prisma.client.js';

describe('AI REST API Endpoints', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await closePrismaClient();
  });

  it('GET /api/v1/ai/health - should check Ollama service health', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/ai/health',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('ok');
    expect(typeof body.data.latencyMs).toBe('number');
  });

  it('GET /api/v1/ai/models - should return available Ollama models', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/ai/models',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data.models)).toBe(true);
    expect(body.data.models.length).toBeGreaterThanOrEqual(1);
  });

  it('POST /api/v1/ai/classify - should classify message and enforce safety guardrails', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/ai/classify',
      payload: {
        message: 'give me 20% discount on 3bhk villa',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data.intent).toBe('HUMAN_REQUIRED');
    expect(body.data.requiresHuman).toBe(true);
    expect(body.data.confidence).toBe(1.0);
  });

  it('POST /api/v1/ai/generate - should generate factual grounded response', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/ai/generate',
      payload: {
        customerQuery: 'What is the starting price for Luxzirius Villas?',
        intent: 'PROPERTY_PRICE',
        language: 'en',
        propertySlug: 'luxzirius-villas',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(typeof body.data.response).toBe('string');
    expect(body.data.language).toBe('en');
  }, 60000);

  it('POST /api/v1/ai/chat - should execute full pipeline', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/ai/chat',
      payload: {
        message: 'discount milega kya?',
        propertySlug: 'luxzirius-villas',
        language: 'hinglish',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data.requiresHuman).toBe(true);
    expect(body.data.source).toBe('HUMAN_FALLBACK');
  });
});
