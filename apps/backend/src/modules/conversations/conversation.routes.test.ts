import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../app.js';
import { MessageRepository } from '../messages/message.repository.js';
import { closePrismaClient } from '../../database/prisma.client.js';
import { closeRedisClient } from '../../database/redis.client.js';

describe('Conversation Routes (HTTP Integration)', () => {
  let app: FastifyInstance;
  const msgRepo = new MessageRepository();

  beforeAll(async () => {
    app = buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await closePrismaClient();
    await closeRedisClient();
  });

  async function createTestConversation() {
    const chatId = `9198765${Math.floor(10000 + Math.random() * 90000)}@c.us`;
    const customer = await msgRepo.findOrCreateCustomer(chatId, 'HTTP Test Customer');
    const property = await msgRepo.getDefaultProperty();
    return msgRepo.findOrCreateConversation(chatId, customer.id, property?.id);
  }

  it('GET /api/v1/conversations should retrieve paginated conversation list', async () => {
    await createTestConversation();

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/conversations?limit=10',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.status).toBe('SUCCESS');
    expect(body.page).toBe(1);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);
  });

  it('GET /api/v1/conversations/:id should retrieve conversation details', async () => {
    const conv = await createTestConversation();

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/conversations/${conv.id}`,
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.status).toBe('SUCCESS');
    expect(body.data.id).toBe(conv.id);
    expect(body.data.customer).toBeDefined();
  });

  it('POST /api/v1/conversations/:id/takeover should transition to HUMAN_ACTIVE', async () => {
    const conv = await createTestConversation();

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/conversations/${conv.id}/takeover`,
      payload: {
        agentId: 'agent_priya',
        reason: 'Customer requested manual phone call',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.mode).toBe('HUMAN_ACTIVE');
  });

  it('POST /api/v1/conversations/:id/release should transition to AI_ACTIVE', async () => {
    const conv = await createTestConversation();

    // Takeover first
    await app.inject({
      method: 'POST',
      url: `/api/v1/conversations/${conv.id}/takeover`,
      payload: { agentId: 'agent_priya' },
    });

    // Release back
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/conversations/${conv.id}/release`,
      payload: {
        agentId: 'agent_priya',
        reason: 'Finished manual consultation',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.mode).toBe('AI_ACTIVE');
  });

  it('POST /api/v1/conversations/:id/pause and /resume should toggle pause state', async () => {
    const conv = await createTestConversation();

    const pauseRes = await app.inject({
      method: 'POST',
      url: `/api/v1/conversations/${conv.id}/pause`,
      payload: { reason: 'System maintenance' },
    });
    expect(pauseRes.statusCode).toBe(200);
    expect(JSON.parse(pauseRes.body).data.mode).toBe('PAUSED');

    const resumeRes = await app.inject({
      method: 'POST',
      url: `/api/v1/conversations/${conv.id}/resume`,
      payload: { reason: 'Maintenance complete' },
    });
    expect(resumeRes.statusCode).toBe(200);
    expect(JSON.parse(resumeRes.body).data.mode).toBe('AI_ACTIVE');
  });

  it('PATCH /api/v1/conversations/:id should update settings', async () => {
    const conv = await createTestConversation();

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/conversations/${conv.id}`,
      payload: {
        autoSend: true,
        language: 'hi',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.autoSend).toBe(true);
    expect(body.data.language).toBe('hi');
  });

  it('PATCH /api/v1/conversations/:id/customer should update customer profile', async () => {
    const conv = await createTestConversation();

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/conversations/${conv.id}/customer`,
      payload: {
        name: 'Sunita Mehra',
        status: 'PROSPECT',
        tags: ['vip-lead', 'site-visit-scheduled'],
        notes: 'Requested Sunday morning site visit',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.name).toBe('Sunita Mehra');
    expect(body.data.status).toBe('PROSPECT');
    expect(body.data.tags).toContain('vip-lead');
  });

  it('GET /api/v1/conversations/:id/context should return multi-turn dialogue context', async () => {
    const conv = await createTestConversation();

    await msgRepo.createMessage({
      conversationId: conv.id,
      sender: 'CUSTOMER',
      direction: 'INCOMING',
      content: 'Can you send the floor plan?',
    });

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/conversations/${conv.id}/context`,
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.status).toBe('SUCCESS');
    expect(body.data.context).toContain('Customer: Can you send the floor plan?');
  });
});
