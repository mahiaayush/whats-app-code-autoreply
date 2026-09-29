import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { EscalationService } from './escalation.service.js';
import { getPrismaClient, closePrismaClient } from '../../database/prisma.client.js';

describe('EscalationService Integration Tests', () => {
  const service = new EscalationService();
  const prisma = getPrismaClient();

  let testConversationId: string;
  let testCustomerId: string;

  beforeAll(async () => {
    // Create customer and conversation for testing
    const customer = await prisma.customer.create({
      data: {
        phone: `+919999${Date.now().toString().slice(-6)}`,
        name: 'Escalation Test Lead',
      },
    });
    testCustomerId = customer.id;

    const conversation = await prisma.conversation.create({
      data: {
        chatId: `test_esc_${Date.now()}@c.us`,
        customerId: customer.id,
        mode: 'AI_ACTIVE',
        language: 'en',
      },
    });
    testConversationId = conversation.id;
  });

  afterAll(async () => {
    // Clean up created test data
    if (testConversationId) {
      await prisma.humanAction.deleteMany({ where: { conversationId: testConversationId } });
      await prisma.escalation.deleteMany({ where: { conversationId: testConversationId } });
      await prisma.conversation.deleteMany({ where: { id: testConversationId } });
    }
    if (testCustomerId) {
      await prisma.customer.deleteMany({ where: { id: testCustomerId } });
    }
    await closePrismaClient();
  });

  describe('SLA Calculations', () => {
    it('should compute valid SLA status for fresh critical escalation', () => {
      const now = new Date();
      const sla = service.computeSla({
        priority: 'CRITICAL',
        createdAt: now,
      });

      expect(sla.priority).toBe('CRITICAL');
      expect(sla.targetMinutes).toBe(15);
      expect(sla.elapsedMinutes).toBe(0);
      expect(sla.timeRemainingMinutes).toBe(15);
      expect(sla.isBreached).toBe(false);
      expect(new Date(sla.deadlineAt).getTime()).toBeGreaterThan(now.getTime());
    });

    it('should flag breached SLA for past deadline escalation', () => {
      // 25 minutes ago
      const pastTime = new Date(Date.now() - 25 * 60 * 1000);
      const sla = service.computeSla({
        priority: 'CRITICAL',
        createdAt: pastTime,
      });

      expect(sla.targetMinutes).toBe(15);
      expect(sla.elapsedMinutes).toBeGreaterThanOrEqual(24);
      expect(sla.timeRemainingMinutes).toBe(0);
      expect(sla.isBreached).toBe(true);
    });

    it('should freeze SLA calculations using resolvedAt timestamp', () => {
      const created = new Date(Date.now() - 60 * 60 * 1000);
      const resolved = new Date(created.getTime() + 10 * 60 * 1000); // resolved in 10 mins

      const sla = service.computeSla({
        priority: 'CRITICAL',
        createdAt: created,
        resolvedAt: resolved,
      });

      expect(sla.targetMinutes).toBe(15);
      expect(sla.elapsedMinutes).toBe(10);
      expect(sla.isBreached).toBe(false);
    });
  });

  describe('Escalation Lifecycle & State Transitions', () => {
    let createdEscalationId: string;

    it('should create escalation and transition conversation to HUMAN_REQUIRED', async () => {
      const result = await service.createEscalation({
        conversationId: testConversationId,
        reason: 'LEGAL',
        priority: 'CRITICAL',
        details: 'Customer inquiry regarding dispute',
        confidence: 1.0,
      });

      expect(result.id).toBeDefined();
      expect(result.status).toBe('OPEN');
      expect(result.priority).toBe('CRITICAL');
      expect(result.reason).toBe('LEGAL');
      expect(result.sla.isBreached).toBe(false);
      createdEscalationId = result.id;

      // Verify conversation mode transitioned to HUMAN_REQUIRED
      const conv = await prisma.conversation.findUnique({
        where: { id: testConversationId },
      });
      expect(conv?.mode).toBe('HUMAN_REQUIRED');
    });

    it('should assign escalation to an agent and transition conversation to HUMAN_ACTIVE', async () => {
      const assigned = await service.assignEscalation(createdEscalationId, {
        agentId: 'agent_priya',
      });

      expect(assigned.status).toBe('IN_PROGRESS');
      expect(assigned.assignedAgentId).toBe('agent_priya');

      // Verify conversation mode updated to HUMAN_ACTIVE
      const conv = await prisma.conversation.findUnique({
        where: { id: testConversationId },
      });
      expect(conv?.mode).toBe('HUMAN_ACTIVE');

      // Verify HumanAction audit record
      const action = await prisma.humanAction.findFirst({
        where: {
          conversationId: testConversationId,
          agentId: 'agent_priya',
          action: 'TAKEOVER',
        },
      });
      expect(action).toBeDefined();
    });

    it('should resolve escalation and create ESCALATION_RESOLVED audit action', async () => {
      const resolved = await service.resolveEscalation(createdEscalationId, {
        agentId: 'agent_priya',
        notes: 'Explained RERA registration facts clearly to customer.',
      });

      expect(resolved.status).toBe('RESOLVED');
      expect(resolved.resolvedAt).toBeDefined();

      const auditAction = await prisma.humanAction.findFirst({
        where: {
          conversationId: testConversationId,
          action: 'ESCALATION_RESOLVED',
        },
      });
      expect(auditAction).toBeDefined();
      expect(auditAction?.notes).toContain('Explained RERA');
    });

    it('should reject assigning an already resolved escalation', async () => {
      await expect(
        service.assignEscalation(createdEscalationId, { agentId: 'agent_other' }),
      ).rejects.toThrow('Cannot assign escalation with status RESOLVED');
    });
  });

  describe('Dismissal & Query Metrics', () => {
    it('should dismiss an open escalation with notes', async () => {
      const esc = await service.createEscalation({
        conversationId: testConversationId,
        reason: 'DISCOUNT',
        priority: 'HIGH',
        details: 'Discount request testing dismissal',
      });

      const dismissed = await service.dismissEscalation(esc.id, {
        agentId: 'agent_manager',
        notes: 'Duplicate lead, already handled',
      });

      expect(dismissed.status).toBe('DISMISSED');
      expect(dismissed.resolvedAt).toBeDefined();
    });

    it('should return aggregated stats including active priority counts', async () => {
      const stats = await service.getStats();

      expect(typeof stats.totalOpen).toBe('number');
      expect(typeof stats.totalResolved).toBe('number');
      expect(typeof stats.breachedCount).toBe('number');
      expect(stats.openByPriority).toBeDefined();
      expect(typeof stats.openByPriority.CRITICAL).toBe('number');
      expect(typeof stats.openByPriority.HIGH).toBe('number');
    });
  });
});
