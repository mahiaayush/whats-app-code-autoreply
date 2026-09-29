import { conversationRepository, ConversationRepository } from './conversation.repository.js';
import { ConversationStateMachine } from './conversation.state-machine.js';
import { WebSocketManager } from '../../websocket/ws.server.js';
import { NotFoundError } from '../../common/errors/app-error.js';
import { logger } from '../../config/index.js';
import type { ConversationMode } from '@property-ai/shared-types';
import type {
  ConversationQueryDto,
  UpdateConversationSettingsDto,
  UpdateCustomerProfileDto,
} from '@property-ai/validation';

export interface ExtractedLeadProfile {
  budget?: string;
  unitPreference?: string;
  timeline?: string;
  purpose?: 'INVESTMENT' | 'SELF_USE';
  tags: string[];
}

export class ConversationService {
  constructor(
    private repo: ConversationRepository = conversationRepository,
    private wsManager: WebSocketManager = WebSocketManager.getInstance(),
  ) {}

  /**
   * Retrieves paginated conversations list.
   */
  public async getConversations(query: ConversationQueryDto) {
    return this.repo.findConversations(query);
  }

  /**
   * Retrieves conversation details with full relations.
   */
  public async getConversationById(id: string) {
    const conv = await this.repo.findById(id);
    if (!conv) {
      throw new NotFoundError(`Conversation not found with ID: ${id}`);
    }
    return conv;
  }

  /**
   * Agent takes over conversation -> transitions to HUMAN_ACTIVE.
   */
  public async takeover(conversationId: string, agentId: string, reason?: string) {
    const conv = await this.getConversationById(conversationId);
    ConversationStateMachine.validateTransition(conv.mode as ConversationMode, 'HUMAN_ACTIVE', 'HUMAN');

    const updated = await this.repo.updateMode(conversationId, 'HUMAN_ACTIVE');
    await this.repo.recordHumanAction({
      conversationId,
      agentId,
      action: 'TAKEOVER',
      notes: reason || 'Agent took over active conversation',
    });

    this.wsManager.broadcast('HUMAN_TAKEOVER', {
      conversationId,
      chatId: conv.chatId,
      agentId,
      mode: 'HUMAN_ACTIVE',
    });

    this.wsManager.broadcast('CONVERSATION_UPDATED', {
      conversationId,
      chatId: conv.chatId,
      mode: 'HUMAN_ACTIVE',
    });

    logger.info({ conversationId, agentId }, 'Agent takeover completed');
    return updated;
  }

  /**
   * Agent releases conversation back to automated AI -> transitions to AI_ACTIVE.
   */
  public async release(conversationId: string, agentId: string, reason?: string) {
    const conv = await this.getConversationById(conversationId);
    ConversationStateMachine.validateTransition(conv.mode as ConversationMode, 'AI_ACTIVE', 'HUMAN');

    const updated = await this.repo.updateMode(conversationId, 'AI_ACTIVE');
    await this.repo.recordHumanAction({
      conversationId,
      agentId,
      action: 'RELEASE',
      notes: reason || 'Agent released conversation back to AI automation',
    });

    this.wsManager.broadcast('RESUME_AI', {
      conversationId,
      chatId: conv.chatId,
    });

    this.wsManager.broadcast('CONVERSATION_UPDATED', {
      conversationId,
      chatId: conv.chatId,
      mode: 'AI_ACTIVE',
    });

    logger.info({ conversationId, agentId }, 'Conversation released to AI');
    return updated;
  }

  /**
   * Pauses automated processing for a conversation -> transitions to PAUSED.
   */
  public async pause(conversationId: string, agentId: string = 'system', reason?: string) {
    const conv = await this.getConversationById(conversationId);
    ConversationStateMachine.validateTransition(conv.mode as ConversationMode, 'PAUSED', 'HUMAN');

    const updated = await this.repo.updateMode(conversationId, 'PAUSED');
    await this.repo.recordHumanAction({
      conversationId,
      agentId,
      action: 'PAUSE',
      notes: reason || 'Automation paused',
    });

    this.wsManager.broadcast('PAUSE_AI', {
      conversationId,
      chatId: conv.chatId,
    });

    this.wsManager.broadcast('CONVERSATION_UPDATED', {
      conversationId,
      chatId: conv.chatId,
      mode: 'PAUSED',
    });

    return updated;
  }

  /**
   * Resumes automated AI processing from PAUSED state -> transitions to AI_ACTIVE.
   */
  public async resume(conversationId: string, agentId: string = 'system', reason?: string) {
    const conv = await this.getConversationById(conversationId);
    ConversationStateMachine.validateTransition(conv.mode as ConversationMode, 'AI_ACTIVE', 'HUMAN');

    const updated = await this.repo.updateMode(conversationId, 'AI_ACTIVE');
    await this.repo.recordHumanAction({
      conversationId,
      agentId,
      action: 'RESUME',
      notes: reason || 'Automation resumed',
    });

    this.wsManager.broadcast('RESUME_AI', {
      conversationId,
      chatId: conv.chatId,
    });

    this.wsManager.broadcast('CONVERSATION_UPDATED', {
      conversationId,
      chatId: conv.chatId,
      mode: 'AI_ACTIVE',
    });

    return updated;
  }

  /**
   * Closes conversation -> transitions to CLOSED.
   */
  public async close(conversationId: string, agentId: string = 'system', reason?: string) {
    const conv = await this.getConversationById(conversationId);
    ConversationStateMachine.validateTransition(conv.mode as ConversationMode, 'CLOSED', 'HUMAN');

    const updated = await this.repo.updateMode(conversationId, 'CLOSED');
    await this.repo.recordHumanAction({
      conversationId,
      agentId,
      action: 'CLOSE',
      notes: reason || 'Conversation closed',
    });

    this.wsManager.broadcast('CONVERSATION_UPDATED', {
      conversationId,
      chatId: conv.chatId,
      mode: 'CLOSED',
    });

    return updated;
  }

  /**
   * Updates conversation settings (autoSend, property, language).
   */
  public async updateSettings(id: string, settings: UpdateConversationSettingsDto) {
    let propertyId: string | null | undefined = undefined;

    if (settings.propertySlug) {
      const property = await this.repo.findByChatId(settings.propertySlug);
      if (property?.propertyId) {
        propertyId = property.propertyId;
      }
    }

    return this.repo.updateSettings(id, {
      propertyId,
      language: settings.language,
      autoSend: settings.autoSend,
    });
  }

  /**
   * Updates customer profile data.
   */
  public async updateCustomerProfile(customerId: string, profile: UpdateCustomerProfileDto) {
    return this.repo.updateCustomerProfile(customerId, profile);
  }

  /**
   * Extracts lead parameters (budget, unit configuration, timeline) and enriches the customer record.
   */
  public async extractAndEnrichLeadProfile(
    conversationId: string,
    messageText: string,
  ): Promise<ExtractedLeadProfile> {
    const conv = await this.getConversationById(conversationId);
    const newTags: string[] = [];
    const notesSnippets: string[] = [];

    // Extract Unit Preference (3BHK, 4BHK, Villa)
    let unitPreference: string | undefined;
    if (/\b3\s*bhk\b/i.test(messageText)) {
      unitPreference = '3 BHK';
      newTags.push('3bhk-inquiry');
    } else if (/\b4\s*bhk\b/i.test(messageText)) {
      unitPreference = '4 BHK';
      newTags.push('4bhk-inquiry');
    }

    if (/\b(villa|grand villa|duplex)\b/i.test(messageText)) {
      newTags.push('villa-interest');
    }

    // Extract Budget
    let budget: string | undefined;
    const budgetMatch = messageText.match(/(?:budget|price|range)?\s*(?:around|under|upto|about)?\s*(\d+(?:\.\d+)?\s*(?:cr|crore|lakh|lac))\b/i);
    if (budgetMatch) {
      budget = budgetMatch[1].trim();
      newTags.push('budget-specified');
      notesSnippets.push(`Budget mentioned: ${budget}`);
    }

    // Extract Timeline
    let timeline: string | undefined;
    if (/\b(immediate|ready to move|urgent|asap|this month)\b/i.test(messageText)) {
      timeline = 'Immediate';
      newTags.push('hot-lead');
      notesSnippets.push('Timeline: Immediate / Ready to move');
    } else if (/\b(next year|6 months|within a year|possession)\b/i.test(messageText)) {
      timeline = 'Mid-term';
      newTags.push('warm-lead');
    }

    // Extract Purpose
    let purpose: 'INVESTMENT' | 'SELF_USE' | undefined;
    if (/\b(invest|investment|rental|returns|roi)\b/i.test(messageText)) {
      purpose = 'INVESTMENT';
      newTags.push('investor');
    } else if (/\b(family|living|stay|settle|personal)\b/i.test(messageText)) {
      purpose = 'SELF_USE';
      newTags.push('end-user');
    }

    // Enrich Customer record if new tags or notes extracted
    const existingTags = conv.customer.tags || [];
    const combinedTags = Array.from(new Set([...existingTags, ...newTags]));

    let updatedNotes = conv.customer.notes || '';
    if (notesSnippets.length > 0) {
      const timestamp = new Date().toISOString().split('T')[0];
      const addition = `[${timestamp}] ${notesSnippets.join(', ')}`;
      updatedNotes = updatedNotes ? `${updatedNotes}\n${addition}` : addition;
    }

    if (combinedTags.length !== existingTags.length || updatedNotes !== (conv.customer.notes || '')) {
      await this.repo.updateCustomerProfile(conv.customerId, {
        tags: combinedTags,
        notes: updatedNotes,
        status: newTags.includes('hot-lead') ? 'PROSPECT' : undefined,
      });

      logger.info(
        { customerId: conv.customerId, newTags, unitPreference, budget },
        'Customer lead profile enriched with conversation insights',
      );
    }

    return {
      budget,
      unitPreference,
      timeline,
      purpose,
      tags: combinedTags,
    };
  }

  /**
   * Retrieves multi-turn conversation context formatted as a dialogue string for LLM injection.
   */
  public async getMultiTurnContext(conversationId: string, limit: number = 6): Promise<string> {
    const history = await this.repo.getRecentConversationHistory(conversationId, limit);
    if (!history || history.length === 0) {
      return '';
    }

    return history
      .map((msg) => {
        const speaker = msg.direction === 'INCOMING' ? 'Customer' : 'Assistant';
        return `${speaker}: ${msg.content.trim()}`;
      })
      .join('\n');
  }
}

export const conversationService = new ConversationService();
