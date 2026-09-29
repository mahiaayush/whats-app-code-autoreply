import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../app.js';
import { closePrismaClient } from '../../database/prisma.client.js';

describe('Shortcuts & Rules REST API Endpoints', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await closePrismaClient();
  });

  it('GET /api/v1/shortcuts - should return list of seeded shortcuts', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/shortcuts',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThanOrEqual(9);

    const commands = body.data.map((s: { command: string }) => s.command);
    expect(commands).toContain('/price');
    expect(commands).toContain('/area');
    expect(commands).toContain('/brochure');
  });

  it('GET /api/v1/shortcuts/:command - should return shortcut details', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/shortcuts/price',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data.command).toBe('/price');
    expect(body.data.targetIntent).toBe('PROPERTY_PRICE');
  });

  it('POST /api/v1/rules/match - should match exact command /price', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/rules/match',
      payload: {
        text: '/price',
        propertySlug: 'luxzirius-villas',
        language: 'en',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data.matched).toBe(true);
    expect(body.data.matchType).toBe('EXACT_COMMAND');
    expect(body.data.command).toBe('/price');
    expect(body.data.intent).toBe('PROPERTY_PRICE');
    expect(body.data.responseText).toContain('Luxzirius Villas');
    expect(body.data.responseText).toContain('₹1.75 Cr');
  });

  it('POST /api/v1/rules/match - should match natural language Hinglish query', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/rules/match',
      payload: {
        text: 'bhai villa kitne ka hai?',
        propertySlug: 'luxzirius-villas',
        language: 'hinglish',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data.matched).toBe(true);
    expect(body.data.matchType).toBe('PHRASE_MATCH');
    expect(body.data.intent).toBe('PROPERTY_PRICE');
    expect(body.data.language).toBe('hinglish');
    expect(body.data.responseText).toContain('Namaste! Luxzirius Villas');
  });

  it('POST /api/v1/rules/match - should return matched: false for unmatched query', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/rules/match',
      payload: {
        text: 'can you write a poem about butterflies?',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data.matched).toBe(false);
    expect(body.data.matchType).toBe('NONE');
  });

  it('POST /api/v1/shortcuts - should create a new shortcut with Zod validation', async () => {
    const uniqueCommand = `/test-${Date.now()}`;
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/shortcuts',
      payload: {
        command: uniqueCommand,
        name: 'API Test Shortcut',
        description: 'Test shortcut created via REST API',
        targetIntent: 'PROPERTY_PRICE',
        naturalLanguagePhrases: ['test phrase alpha', 'test phrase beta'],
        enabled: true,
        priority: 50,
      },
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data.command).toBe(uniqueCommand);

    const shortcutId = body.data.id;

    // PATCH update
    const patchRes = await app.inject({
      method: 'PATCH',
      url: `/api/v1/shortcuts/${shortcutId}`,
      payload: {
        priority: 5,
      },
    });
    expect(patchRes.statusCode).toBe(200);
    const patchBody = JSON.parse(patchRes.body);
    expect(patchBody.data.priority).toBe(5);

    // DELETE cleanup
    const delRes = await app.inject({
      method: 'DELETE',
      url: `/api/v1/shortcuts/${shortcutId}`,
    });
    expect(delRes.statusCode).toBe(200);
  });

  it('POST /api/v1/rules/reload - should reload rules into memory cache', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/rules/reload',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data.reloadedCount).toBeGreaterThanOrEqual(9);
  });
});
