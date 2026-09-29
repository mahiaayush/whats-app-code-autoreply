import { describe, it, expect, afterAll } from 'vitest';
import { ConversationService } from './conversation.service.js';
import { ConversationRepository } from './conversation.repository.js';
import { MessageRepository } from '../messages/message.repository.js';
import { closePrismaClient } from '../../database/prisma.client.js';

describe('ConversationService Integration', () => {
  const service = new ConversationService();
  const repo = new ConversationRepository();
  const msgRepo = new MessageRepository();

  afterAll(async () => {
    await closePrismaClient();
  });

  async function createTestConversation(customChatId?: string) {
    const chatId = customChatId || `9198765${Math.floor(10000 + Math.random() * 90000)}@c.us`;
    const customer = await msgRepo.findOrCreateCustomer(chatId, 'State Machine Test Customer');
    const property = await msgRepo.getDefaultProperty();
    const conv = await msgRepo.findOrCreateConversation(chatId, customer.id, property?.id);
    return { chatId, customer, conv };
  }

  describe('Lifecycle State Transitions', () => {
    it('should allow agent takeover and transition mode to HUMAN_ACTIVE', async () => {
      const { conv } = await createTestConversation();
      expect(conv.mode).toBe('AI_ACTIVE');

      const updated = await service.takeover(conv.id, 'agent_rahul', 'Customer wants custom floor plan review');
      expect(updated.mode).toBe('HUMAN_ACTIVE');

      // Verify HumanAction log
      const fullConv = await repo.findById(conv.id);
      expect(fullConv?.humanActions.length).toBeGreaterThan(0);
      expect(fullConv?.humanActions[0].action).toBe('TAKEOVER');
      expect(fullConv?.humanActions[0].agentId).toBe('agent_rahul');
    });

    it('should allow agent release and transition mode back to AI_ACTIVE', async () => {
      const { conv } = await createTestConversation();
      await service.takeover(conv.id, 'agent_rahul');

      const released = await service.release(conv.id, 'agent_rahul', 'Answered question, handback to bot');
      expect(released.mode).toBe('AI_ACTIVE');

      const fullConv = await repo.findById(conv.id);
      expect(fullConv?.humanActions[0].action).toBe('RELEASE');
    });

    it('should pause and resume conversation mode cleanly', async () => {
      const { conv } = await createTestConversation();

      const paused = await service.pause(conv.id, 'supervisor', 'Temporary review pause');
      expect(paused.mode).toBe('PAUSED');

      const resumed = await service.resume(conv.id, 'supervisor', 'Review complete');
      expect(resumed.mode).toBe('AI_ACTIVE');
    });

    it('should close conversation', async () => {
      const { conv } = await createTestConversation();

      const closed = await service.close(conv.id, 'agent_rahul', 'Deal concluded');
      expect(closed.mode).toBe('CLOSED');
    });
  });

  describe('Lead Profile Extraction & Enrichment', () => {
    it('should extract budget, unit configuration, timeline, and tags from customer inquiry', async () => {
      const { conv } = await createTestConversation();

      const inquiry = 'Looking for 4 BHK villa with budget around 2.7 Cr ready to move for investment purpose';
      const extracted = await service.extractAndEnrichLeadProfile(conv.id, inquiry);

      expect(extracted.unitPreference).toBe('4 BHK');
      expect(extracted.budget).toBe('2.7 Cr');
      expect(extracted.timeline).toBe('Immediate');
      expect(extracted.purpose).toBe('INVESTMENT');
      expect(extracted.tags).toContain('4bhk-inquiry');
      expect(extracted.tags).toContain('villa-interest');
      expect(extracted.tags).toContain('budget-specified');
      expect(extracted.tags).toContain('hot-lead');
      expect(extracted.tags).toContain('investor');

      // Verify persistence in customer record
      const updatedCustomer = await repo.findById(conv.id);
      expect(updatedCustomer?.customer.tags).toEqual(expect.arrayContaining(extracted.tags));
      expect(updatedCustomer?.customer.notes).toContain('Budget mentioned: 2.7 Cr');
      expect(updatedCustomer?.customer.status).toBe('PROSPECT');
    });
  });

  describe('Multi-Turn Context Memory', () => {
    it('should format recent message history as multi-turn dialogue context', async () => {
      const { conv } = await createTestConversation();

      await msgRepo.createMessage({
        conversationId: conv.id,
        sender: 'CUSTOMER',
        direction: 'INCOMING',
        content: 'Hi, what is the starting price?',
      });

      await msgRepo.createMessage({
        conversationId: conv.id,
        sender: 'AI',
        direction: 'OUTGOING',
        content: 'Luxzirius Villas starting price is ₹1.75 Cr.',
      });

      await msgRepo.createMessage({
        conversationId: conv.id,
        sender: 'CUSTOMER',
        direction: 'INCOMING',
        content: 'Are 3BHK units available right now?',
      });

      const context = await service.getMultiTurnContext(conv.id, 5);
      expect(context).toContain('Customer: Hi, what is the starting price?');
      expect(context).toContain('Assistant: Luxzirius Villas starting price is ₹1.75 Cr.');
      expect(context).toContain('Customer: Are 3BHK units available right now?');
    });
  });
});
