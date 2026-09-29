import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../app.js';
import { closePrismaClient } from '../../database/prisma.client.js';
import { closeRedisClient } from '../../database/redis.client.js';

describe('Message Routes (HTTP Integration)', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await closePrismaClient();
    await closeRedisClient();
  });

  it('POST /api/v1/messages/inbound (sync=true) should process message synchronously', async () => {
    const externalMessageId = `wam_http_sync_${Date.now()}`;
    const chatId = `91987654${Math.floor(1000 + Math.random() * 9000)}@c.us`;

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/messages/inbound',
      payload: {
        externalMessageId,
        chatId,
        customerName: 'Ananya Roy',
        message: '/amenities',
        timestamp: Date.now(),
        direction: 'INCOMING',
        propertySlug: 'luxzirius-villas',
        sync: true,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.status).toBe('SUCCESS');
    expect(body.data.source).toBe('SHORTCUT');
    expect(body.data.responseContent).toContain('Swimming Pool');
    expect(body.data.outboundMessageId).toBeDefined();
  });

  it('POST /api/v1/messages/inbound (async) should enqueue message and return 202', async () => {
    const externalMessageId = `wam_http_async_${Date.now()}`;
    const chatId = `91987654${Math.floor(1000 + Math.random() * 9000)}@c.us`;

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/messages/inbound',
      payload: {
        externalMessageId,
        chatId,
        customerName: 'Devansh Patel',
        message: '/contact',
        timestamp: Date.now(),
        direction: 'INCOMING',
        propertySlug: 'luxzirius-villas',
      },
    });

    expect(res.statusCode).toBe(202);
    const body = JSON.parse(res.body);
    expect(body.status).toBe('ACCEPTED');
    expect(body.jobId).toBeDefined();
    expect(body.externalMessageId).toBe(externalMessageId);
  });

  it('POST /api/v1/messages/inbound should return 400 on invalid payload', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/messages/inbound',
      payload: {
        // Missing externalMessageId, chatId, etc.
        message: 'hello',
      },
    });

    expect(res.statusCode).toBe(400);
  });

  it('GET /api/v1/messages/:id should retrieve message with full relations', async () => {
    // Ingest a message first
    const externalMessageId = `wam_http_get_${Date.now()}`;
    const chatId = `91987654${Math.floor(1000 + Math.random() * 9000)}@c.us`;

    const ingestRes = await app.inject({
      method: 'POST',
      url: '/api/v1/messages/inbound?sync=true',
      payload: {
        externalMessageId,
        chatId,
        customerName: 'Kavita Joshi',
        message: '/price',
        timestamp: Date.now(),
        direction: 'INCOMING',
        propertySlug: 'luxzirius-villas',
      },
    });

    const ingestBody = JSON.parse(ingestRes.body);
    const messageId = ingestBody.data.messageId;

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/messages/${messageId}`,
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.status).toBe('SUCCESS');
    expect(body.data.id).toBe(messageId);
    expect(body.data.processing).toBeDefined();
    expect(body.data.conversation).toBeDefined();
  });

  it('GET /api/v1/messages/conversation/:chatId should retrieve conversation history', async () => {
    const chatId = `91987654${Math.floor(1000 + Math.random() * 9000)}@c.us`;

    await app.inject({
      method: 'POST',
      url: '/api/v1/messages/inbound?sync=true',
      payload: {
        externalMessageId: `wam_hist_1_${Date.now()}`,
        chatId,
        customerName: 'History Customer',
        message: '/price',
        timestamp: Date.now(),
        direction: 'INCOMING',
        propertySlug: 'luxzirius-villas',
      },
    });

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/messages/conversation/${chatId}`,
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.status).toBe('SUCCESS');
    expect(body.count).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(body.data)).toBe(true);
  });

  it('POST /api/v1/messages/:id/approve should approve outbound message', async () => {
    const externalMessageId = `wam_appr_http_${Date.now()}`;
    const chatId = `91987654${Math.floor(1000 + Math.random() * 9000)}@c.us`;

    const ingestRes = await app.inject({
      method: 'POST',
      url: '/api/v1/messages/inbound?sync=true',
      payload: {
        externalMessageId,
        chatId,
        customerName: 'Approval Test',
        message: '/brochure',
        timestamp: Date.now(),
        direction: 'INCOMING',
        propertySlug: 'luxzirius-villas',
      },
    });

    const outboundMessageId = JSON.parse(ingestRes.body).data.outboundMessageId;

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/messages/${outboundMessageId}/approve`,
      payload: {
        agentId: 'sales_rep_12',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.status).toBe('SENT');
  });

  it('POST /api/v1/messages/:id/reject should reject outbound message', async () => {
    const externalMessageId = `wam_rej_http_${Date.now()}`;
    const chatId = `91987654${Math.floor(1000 + Math.random() * 9000)}@c.us`;

    const ingestRes = await app.inject({
      method: 'POST',
      url: '/api/v1/messages/inbound?sync=true',
      payload: {
        externalMessageId,
        chatId,
        customerName: 'Reject Test',
        message: '/location',
        timestamp: Date.now(),
        direction: 'INCOMING',
        propertySlug: 'luxzirius-villas',
      },
    });

    const outboundMessageId = JSON.parse(ingestRes.body).data.outboundMessageId;

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/messages/${outboundMessageId}/reject`,
      payload: {
        agentId: 'sales_rep_12',
        reason: 'Customer wants a live site visit instead',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.status).toBe('FAILED');
  });
});
