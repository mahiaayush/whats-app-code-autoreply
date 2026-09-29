import { describe, it, expect, afterAll } from 'vitest';
import { MessagePipelineService } from './message-pipeline.service.js';
import { MessageRepository } from './message.repository.js';
import { closePrismaClient } from '../../database/prisma.client.js';
import { closeRedisClient } from '../../database/redis.client.js';

describe('MessagePipelineService Integration', () => {
  const service = new MessagePipelineService();
  const repo = new MessageRepository();

  afterAll(async () => {
    await closePrismaClient();
    await closeRedisClient();
  });

  describe('Tier 1: Deterministic Shortcut & Rule Execution', () => {
    it('should resolve /price shortcut instantly with PostgreSQL ground truth', async () => {
      const externalMessageId = `wam_${Date.now()}_price`;
      const chatId = `91987654${Math.floor(1000 + Math.random() * 9000)}@c.us`;

      const result = await service.processIncomingMessage({
        externalMessageId,
        chatId,
        customerName: 'Aarav Sharma',
        message: '/price',
        timestamp: Date.now(),
        direction: 'INCOMING',
        propertySlug: 'luxzirius-villas',
        sync: true,
      });

      expect(result.status).toBe('PENDING_APPROVAL');
      expect(result.source).toBe('SHORTCUT');
      expect(result.requiresHuman).toBe(false);
      expect(result.confidence).toBe(1.0);
      expect(result.responseContent).toContain('₹1.75 Cr');
      expect(result.outboundMessageId).toBeDefined();

      // Verify DB persistence
      const savedMsg = await repo.getMessageById(result.messageId);
      expect(savedMsg).toBeDefined();
      expect(savedMsg?.status).toBe('PROCESSED');
      expect(savedMsg?.processing?.status).toBe('COMPLETED');
      expect(savedMsg?.aiResponse?.source).toBe('SHORTCUT');
    });
  });

  describe('Tier 2: Pre-LLM Safety Escalation', () => {
    it('should force HUMAN_REQUIRED escalation on discount negotiations', async () => {
      const externalMessageId = `wam_${Date.now()}_discount`;
      const chatId = `91987654${Math.floor(1000 + Math.random() * 9000)}@c.us`;

      const result = await service.processIncomingMessage({
        externalMessageId,
        chatId,
        customerName: 'Rohit Verma',
        message: 'Can I get 15% discount on 4 BHK villa?',
        timestamp: Date.now(),
        direction: 'INCOMING',
        propertySlug: 'luxzirius-villas',
        sync: true,
      });

      expect(result.requiresHuman).toBe(true);
      expect(result.source).toBe('HUMAN_FALLBACK');
      expect(result.escalationReason).toMatch(/discount/i);
      expect(result.mode).toBe('HUMAN_REQUIRED');
      expect(result.status).toBe('PENDING_APPROVAL');

      // Verify Escalation record created in database
      const incomingMsg = await repo.getMessageById(result.messageId);
      expect(incomingMsg?.escalations.length).toBeGreaterThan(0);
      expect(incomingMsg?.escalations[0].status).toBe('OPEN');
    });
  });

  describe('Deduplication & Idempotency Filter', () => {
    it('should drop duplicate messages with status IGNORED', async () => {
      const externalMessageId = `wam_dup_${Date.now()}`;
      const chatId = `91987654${Math.floor(1000 + Math.random() * 9000)}@c.us`;

      const firstAttempt = await service.processIncomingMessage({
        externalMessageId,
        chatId,
        customerName: 'Pooja Nair',
        message: '/area',
        timestamp: Date.now(),
        direction: 'INCOMING',
        propertySlug: 'luxzirius-villas',
        sync: true,
      });

      expect(firstAttempt.status).toBe('PENDING_APPROVAL');

      // Second immediate ingestion with same externalMessageId
      const secondAttempt = await service.processIncomingMessage({
        externalMessageId,
        chatId,
        customerName: 'Pooja Nair',
        message: '/area',
        timestamp: Date.now(),
        direction: 'INCOMING',
        propertySlug: 'luxzirius-villas',
        sync: true,
      });

      expect(secondAttempt.status).toBe('IGNORED');
    });
  });

  describe('Conversation Mode Overrides', () => {
    it('should skip AI response when conversation mode is HUMAN_ACTIVE', async () => {
      const chatId = `91987654${Math.floor(1000 + Math.random() * 9000)}@c.us`;
      const customer = await repo.findOrCreateCustomer(chatId, 'Human Mode Customer');
      const conv = await repo.findOrCreateConversation(chatId, customer.id);
      await repo.updateConversationMode(conv.id, 'HUMAN_ACTIVE');

      const externalMessageId = `wam_human_${Date.now()}`;
      const result = await service.processIncomingMessage({
        externalMessageId,
        chatId,
        customerName: 'Human Mode Customer',
        message: '/price',
        timestamp: Date.now(),
        direction: 'INCOMING',
        sync: true,
      });

      expect(result.mode).toBe('HUMAN_ACTIVE');
      expect(result.status).toBe('PROCESSED');
      expect(result.responseContent).toBeUndefined();
    });
  });

  describe('Agent Approval & Rejection Flow', () => {
    it('should approve a pending message and mark as SENT', async () => {
      const externalMessageId = `wam_approve_${Date.now()}`;
      const chatId = `91987654${Math.floor(1000 + Math.random() * 9000)}@c.us`;

      const result = await service.processIncomingMessage({
        externalMessageId,
        chatId,
        customerName: 'Vikram Singh',
        message: '/brochure',
        timestamp: Date.now(),
        direction: 'INCOMING',
        propertySlug: 'luxzirius-villas',
        sync: true,
      });

      expect(result.outboundMessageId).toBeDefined();

      const approval = await service.approveMessage(result.outboundMessageId!, 'agent_007');
      expect(approval.success).toBe(true);
      expect(approval.status).toBe('SENT');

      const updated = await repo.getMessageById(result.outboundMessageId!);
      expect(updated?.status).toBe('SENT');
    });

    it('should reject a pending message and mark as FAILED', async () => {
      const externalMessageId = `wam_reject_${Date.now()}`;
      const chatId = `91987654${Math.floor(1000 + Math.random() * 9000)}@c.us`;

      const result = await service.processIncomingMessage({
        externalMessageId,
        chatId,
        customerName: 'Vikram Singh',
        message: '/location',
        timestamp: Date.now(),
        direction: 'INCOMING',
        propertySlug: 'luxzirius-villas',
        sync: true,
      });

      expect(result.outboundMessageId).toBeDefined();

      const rejection = await service.rejectMessage(
        result.outboundMessageId!,
        'agent_007',
        'Customer asked for callback instead',
      );
      expect(rejection.success).toBe(true);
      expect(rejection.status).toBe('FAILED');

      const updated = await repo.getMessageById(result.outboundMessageId!);
      expect(updated?.status).toBe('FAILED');
    });
  });
});
