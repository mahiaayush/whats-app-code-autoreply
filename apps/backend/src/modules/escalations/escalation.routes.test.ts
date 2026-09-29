import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../app.js';
import { MessageRepository } from '../messages/message.repository.js';
import { closePrismaClient } from '../../database/prisma.client.js';
import { closeRedisClient } from '../../database/redis.client.js';

describe('Escalation Routes (HTTP Integration)', () => {
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
    const customer = await msgRepo.findOrCreateCustomer(chatId, 'Escalation Route Test');
    const property = await msgRepo.getDefaultProperty();
    return msgRepo.findOrCreateConversation(chatId, customer.id, property?.id);
  }

  it('POST /api/v1/escalations/evaluate should test message against escalation triggers', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/escalations/evaluate',
      payload: {
        messageText: 'RERA case status kya hai dispute hai kya?',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.requiresEscalation).toBe(true);
    expect(body.data.reason).toBe('LEGAL');
    expect(body.data.priority).toBe('CRITICAL');
  });

  it('POST /api/v1/escalations should manually create an escalation', async () => {
    const conv = await createTestConversation();

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/escalations',
      payload: {
        conversationId: conv.id,
        reason: 'NEGOTIATION',
        priority: 'HIGH',
        details: 'Customer insisting on 10% discount',
        confidence: 0.95,
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.id).toBeDefined();
    expect(body.data.reason).toBe('NEGOTIATION');
    expect(body.data.priority).toBe('HIGH');
    expect(body.data.status).toBe('OPEN');
    expect(body.data.sla).toBeDefined();
    expect(body.data.sla.targetMinutes).toBe(30);
  });

  it('GET /api/v1/escalations should retrieve paginated escalations with SLA data', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/escalations?limit=10',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.pagination).toBeDefined();
    expect(body.pagination.page).toBe(1);

    if (body.data.length > 0) {
      const item = body.data[0];
      expect(item.sla).toBeDefined();
      expect(typeof item.sla.isBreached).toBe('boolean');
      expect(typeof item.sla.targetMinutes).toBe('number');
    }
  });

  it('GET /api/v1/escalations/stats should return escalation statistics', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/escalations/stats',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(typeof body.data.totalOpen).toBe('number');
    expect(typeof body.data.breachedCount).toBe('number');
    expect(body.data.openByPriority).toBeDefined();
  });

  it('POST /api/v1/escalations/:id/assign should assign an escalation to an agent', async () => {
    const conv = await createTestConversation();
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/escalations',
      payload: {
        conversationId: conv.id,
        reason: 'HUMAN_REQUEST',
        priority: 'HIGH',
        details: 'Customer wants a callback from senior sales',
      },
    });
    const created = JSON.parse(createRes.body).data;

    const assignRes = await app.inject({
      method: 'POST',
      url: `/api/v1/escalations/${created.id}/assign`,
      payload: {
        agentId: 'agent_vikram',
      },
    });

    expect(assignRes.statusCode).toBe(200);
    const body = JSON.parse(assignRes.body);
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('IN_PROGRESS');
    expect(body.data.assignedAgentId).toBe('agent_vikram');
  });

  it('POST /api/v1/escalations/:id/resolve should resolve an escalation', async () => {
    const conv = await createTestConversation();
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/escalations',
      payload: {
        conversationId: conv.id,
        reason: 'COMPLEX_PAYMENT',
        priority: 'HIGH',
      },
    });
    const created = JSON.parse(createRes.body).data;

    const resolveRes = await app.inject({
      method: 'POST',
      url: `/api/v1/escalations/${created.id}/resolve`,
      payload: {
        agentId: 'agent_vikram',
        notes: 'Explained official bank payment plan',
      },
    });

    expect(resolveRes.statusCode).toBe(200);
    const body = JSON.parse(resolveRes.body);
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('RESOLVED');
    expect(body.data.resolvedAt).toBeDefined();
  });

  it('POST /api/v1/escalations/:id/dismiss should dismiss an escalation', async () => {
    const conv = await createTestConversation();
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/escalations',
      payload: {
        conversationId: conv.id,
        reason: 'UNKNOWN_QUESTION',
        priority: 'LOW',
      },
    });
    const created = JSON.parse(createRes.body).data;

    const dismissRes = await app.inject({
      method: 'POST',
      url: `/api/v1/escalations/${created.id}/dismiss`,
      payload: {
        agentId: 'agent_supervisor',
        notes: 'Spam / irrelevant message',
      },
    });

    expect(dismissRes.statusCode).toBe(200);
    const body = JSON.parse(dismissRes.body);
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('DISMISSED');
  });

  it('GET /api/v1/escalations/:id should return 404 for non-existent ID', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/escalations/00000000-0000-0000-0000-000000000000',
    });

    expect(res.statusCode).toBe(404);
  });
});
