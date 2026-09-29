import { config, logger } from '../../config/index.js';
import { messageDeduplicator, MessageDeduplicator } from './message.dedup.js';
import { messageRepository, MessageRepository } from './message.repository.js';
import { RuleService } from '../rules/rule.service.js';
import { AiService } from '../ai/ai.service.js';
import { WebSocketManager } from '../../websocket/ws.server.js';
import type { IncomingMessageDto } from '@property-ai/validation';
import type { EscalationReason } from '@property-ai/shared-types';

export interface MessagePipelineResult {
  messageId: string;
  conversationId: string;
  chatId: string;
  status: 'PROCESSED' | 'PENDING_APPROVAL' | 'SENT' | 'IGNORED' | 'FAILED';
  intent?: string;
  language?: string;
  confidence?: number;
  source?: 'SHORTCUT' | 'RULE' | 'FAQ_CACHE' | 'LLM' | 'HUMAN_FALLBACK';
  responseContent?: string;
  outboundMessageId?: string;
  requiresHuman: boolean;
  escalationReason?: string | null;
  mode: string;
  durationMs: number;
}

export class MessagePipelineService {
  constructor(
    private repo: MessageRepository = messageRepository,
    private dedup: MessageDeduplicator = messageDeduplicator,
    private ruleService: RuleService = new RuleService(),
    private aiService: AiService = new AiService(),
    private wsManager: WebSocketManager = WebSocketManager.getInstance(),
  ) {}

  /**
   * Main entrypoint for processing an incoming customer message through the 3-tier pipeline.
   */
  public async processIncomingMessage(dto: IncomingMessageDto): Promise<MessagePipelineResult> {
    const startTime = Date.now();
    logger.info(
      { externalMessageId: dto.externalMessageId, chatId: dto.chatId, sender: dto.customerName },
      'Ingesting inbound message into pipeline',
    );

    // --------------------------------------------------------------------------
    // Step 1: Redis Deduplication Filter
    // --------------------------------------------------------------------------
    const lockAcquired = await this.dedup.acquireLock(dto.externalMessageId);
    if (!lockAcquired) {
      logger.warn(
        { externalMessageId: dto.externalMessageId },
        'Message dropped: Duplicate externalMessageId detected',
      );
      return {
        messageId: '',
        conversationId: '',
        chatId: dto.chatId,
        status: 'IGNORED',
        requiresHuman: false,
        mode: 'UNKNOWN',
        durationMs: Date.now() - startTime,
      };
    }

    // Check DB for idempotency fallback
    const existingMsg = await this.repo.findMessageByExternalId(dto.externalMessageId);
    if (existingMsg) {
      logger.warn(
        { externalMessageId: dto.externalMessageId, id: existingMsg.id },
        'Message already persisted in database, ignoring',
      );
      return {
        messageId: existingMsg.id,
        conversationId: existingMsg.conversationId,
        chatId: dto.chatId,
        status: 'IGNORED',
        requiresHuman: false,
        mode: existingMsg.conversation.mode,
        durationMs: Date.now() - startTime,
      };
    }

    // --------------------------------------------------------------------------
    // Step 2: Customer & Conversation Resolution
    // --------------------------------------------------------------------------
    const phone = dto.customerPhone || dto.chatId;
    const customer = await this.repo.findOrCreateCustomer(phone, dto.customerName);

    // Resolve property for conversation
    let propertyId: string | null = null;
    let propertySlug = dto.propertySlug;

    if (propertySlug) {
      const property = await this.repo.findPropertyBySlug(propertySlug);
      if (property) {
        propertyId = property.id;
      }
    }

    if (!propertyId) {
      const defaultProperty = await this.repo.getDefaultProperty();
      if (defaultProperty) {
        propertyId = defaultProperty.id;
        propertySlug = defaultProperty.slug;
      }
    }

    const conversation = await this.repo.findOrCreateConversation(
      dto.chatId,
      customer.id,
      propertyId,
    );

    // If conversation is already associated with a property, prioritize it
    if (conversation.property && !dto.propertySlug) {
      propertySlug = conversation.property.slug;
    }

    // --------------------------------------------------------------------------
    // Step 3: Handle Human Active / Paused Modes
    // --------------------------------------------------------------------------
    if (conversation.mode === 'HUMAN_ACTIVE' || conversation.mode === 'PAUSED') {
      logger.info(
        { conversationId: conversation.id, mode: conversation.mode },
        'Conversation in manual human mode; skipping automated AI resolution',
      );

      const incomingMsg = await this.repo.createMessage({
        conversationId: conversation.id,
        externalMessageId: dto.externalMessageId,
        sender: 'CUSTOMER',
        direction: 'INCOMING',
        content: dto.message,
        status: 'PROCESSED',
        timestamp: new Date(dto.timestamp),
      });

      await this.repo.touchConversation(conversation.id);

      this.wsManager.broadcast('NEW_CUSTOMER_MESSAGE', {
        conversationId: conversation.id,
        chatId: dto.chatId,
        externalMessageId: dto.externalMessageId,
        customerName: dto.customerName,
        message: dto.message,
        direction: 'INCOMING',
      });

      return {
        messageId: incomingMsg.id,
        conversationId: conversation.id,
        chatId: dto.chatId,
        status: 'PROCESSED',
        requiresHuman: true,
        mode: conversation.mode,
        durationMs: Date.now() - startTime,
      };
    }

    // --------------------------------------------------------------------------
    // Step 4: Persist Incoming Message & Create Processing Record
    // --------------------------------------------------------------------------
    const incomingMsg = await this.repo.createMessage({
      conversationId: conversation.id,
      externalMessageId: dto.externalMessageId,
      sender: 'CUSTOMER',
      direction: 'INCOMING',
      content: dto.message,
      status: 'PROCESSING',
      timestamp: new Date(dto.timestamp),
    });

    await this.repo.createMessageProcessing(incomingMsg.id);
    await this.repo.touchConversation(conversation.id);

    // Notify dashboard of incoming message
    this.wsManager.broadcast('NEW_CUSTOMER_MESSAGE', {
      conversationId: conversation.id,
      chatId: dto.chatId,
      externalMessageId: dto.externalMessageId,
      customerName: dto.customerName,
      message: dto.message,
      direction: 'INCOMING',
    });

    // --------------------------------------------------------------------------
    // Step 5: 3-Tier Resolution Pipeline
    // --------------------------------------------------------------------------
    let resolution: {
      source: 'SHORTCUT' | 'RULE' | 'FAQ_CACHE' | 'LLM' | 'HUMAN_FALLBACK';
      intent: string;
      language: string;
      confidence: number;
      content: string;
      requiresHuman: boolean;
      escalationReason?: string | null;
    };

    // Tier 1: Check Deterministic Rule & Shortcut Engine
    const ruleMatch = await this.ruleService.processMessage(dto.message, {
      propertySlug: propertySlug || undefined,
    });

    if (ruleMatch.matched && ruleMatch.responseText) {
      logger.info(
        { ruleId: ruleMatch.ruleId, command: ruleMatch.command },
        'Tier 1: Rule Engine resolved incoming message deterministically',
      );

      resolution = {
        source: ruleMatch.source,
        intent: ruleMatch.intent || 'SHORTCUT_TRIGGERED',
        language: ruleMatch.language,
        confidence: ruleMatch.confidence,
        content: ruleMatch.responseText,
        requiresHuman: false,
      };
    } else {
      // Tier 2 & Tier 3: Pre-LLM Safety Filter + Intent Classification + Grounded Generation
      logger.info('Tier 1 unmatched: Delegating to Tier 2/3 AI & LLM Chat Pipeline');
      const aiResult = await this.aiService.executeChatPipeline({
        message: dto.message,
        propertySlug: propertySlug || undefined,
      });

      resolution = {
        source: aiResult.source,
        intent: aiResult.intent,
        language: aiResult.language,
        confidence: aiResult.confidence,
        content: aiResult.content,
        requiresHuman: aiResult.requiresHuman,
        escalationReason: aiResult.escalationReason,
      };
    }

    const processingDuration = Date.now() - startTime;

    // --------------------------------------------------------------------------
    // Step 6: Post-Resolution & State Transitions
    // --------------------------------------------------------------------------
    let outboundStatus: 'PENDING_APPROVAL' | 'SENT' = 'PENDING_APPROVAL';

    if (resolution.requiresHuman) {
      // Mandatory escalation
      const escalationReason = (resolution.escalationReason || 'HUMAN_REQUIRED') as EscalationReason;

      await this.repo.createEscalation({
        conversationId: conversation.id,
        messageId: incomingMsg.id,
        reason: escalationReason,
        priority: 'HIGH',
        details: `Auto-escalation triggered by inquiry: "${dto.message}"`,
        confidence: resolution.confidence,
      });

      // Broadcast WebSocket alert to human dashboard
      this.wsManager.broadcast('HUMAN_ATTENTION_REQUIRED', {
        conversationId: conversation.id,
        chatId: dto.chatId,
        customerName: dto.customerName,
        reason: escalationReason,
        priority: 'HIGH',
        messageSnippet: dto.message.slice(0, 100),
      });

      outboundStatus = 'PENDING_APPROVAL';
    } else {
      // Autonomous sending check: Only send if AUTO_SEND enabled both globally and on conversation
      if (conversation.autoSend && config.AUTO_SEND) {
        outboundStatus = 'SENT';
      } else {
        outboundStatus = 'PENDING_APPROVAL';
      }
    }

    // Persist Outbound Message
    const outboundMsg = await this.repo.createMessage({
      conversationId: conversation.id,
      sender: resolution.requiresHuman ? 'SYSTEM' : 'AI',
      direction: 'OUTGOING',
      content: resolution.content,
      status: outboundStatus,
      metadata: {
        intent: resolution.intent,
        language: resolution.language,
        confidence: resolution.confidence,
        source: resolution.source,
        triggerMessageId: incomingMsg.id,
      },
    });

    // Record AI Response
    await this.repo.createAiResponse({
      conversationId: conversation.id,
      triggerMessageId: incomingMsg.id,
      responseMessageId: outboundMsg.id,
      intent: resolution.intent,
      language: resolution.language,
      source: resolution.source,
      content: resolution.content,
      confidence: resolution.confidence,
      requiresHuman: resolution.requiresHuman,
      escalationReason: resolution.escalationReason,
      latencyMs: processingDuration,
    });

    // Update Message Processing Record
    await this.repo.updateMessageProcessing(incomingMsg.id, {
      status: 'COMPLETED',
      intent: resolution.intent,
      language: resolution.language,
      confidence: resolution.confidence,
      requiresHuman: resolution.requiresHuman,
      processingTimeMs: processingDuration,
    });

    // Mark Incoming Message as PROCESSED
    await this.repo.updateMessageStatus(incomingMsg.id, 'PROCESSED');

    // Notify Dashboard of Response Ready
    this.wsManager.broadcast('AI_RESPONSE_READY', {
      conversationId: conversation.id,
      chatId: dto.chatId,
      responseMessageId: outboundMsg.id,
      content: resolution.content,
      confidence: resolution.confidence,
      autoSend: outboundStatus === 'SENT',
      requiresHuman: resolution.requiresHuman,
    });

    logger.info(
      {
        incomingId: incomingMsg.id,
        outboundId: outboundMsg.id,
        source: resolution.source,
        status: outboundStatus,
        requiresHuman: resolution.requiresHuman,
        durationMs: processingDuration,
      },
      'Message pipeline processing completed successfully',
    );

    return {
      messageId: incomingMsg.id,
      conversationId: conversation.id,
      chatId: dto.chatId,
      status: outboundStatus,
      intent: resolution.intent,
      language: resolution.language,
      confidence: resolution.confidence,
      source: resolution.source,
      responseContent: resolution.content,
      outboundMessageId: outboundMsg.id,
      requiresHuman: resolution.requiresHuman,
      escalationReason: resolution.escalationReason,
      mode: resolution.requiresHuman ? 'HUMAN_REQUIRED' : conversation.mode,
      durationMs: processingDuration,
    };
  }

  /**
   * Approves a pending message for delivery to customer.
   */
  public async approveMessage(messageId: string, agentId: string = 'system') {
    const msg = await this.repo.getMessageById(messageId);
    if (!msg) {
      throw new Error(`Message not found: ${messageId}`);
    }

    await this.repo.updateMessageStatus(messageId, 'SENT');
    await this.repo.recordHumanAction({
      conversationId: msg.conversationId,
      agentId,
      action: 'APPROVE_MESSAGE',
      notes: `Approved message: ${msg.content.slice(0, 50)}...`,
    });

    logger.info({ messageId, agentId }, 'Outbound message approved by agent');
    return { success: true, messageId, status: 'SENT' };
  }

  /**
   * Rejects a pending message.
   */
  public async rejectMessage(
    messageId: string,
    agentId: string = 'system',
    reason?: string,
  ) {
    const msg = await this.repo.getMessageById(messageId);
    if (!msg) {
      throw new Error(`Message not found: ${messageId}`);
    }

    await this.repo.updateMessageStatus(messageId, 'FAILED');
    await this.repo.recordHumanAction({
      conversationId: msg.conversationId,
      agentId,
      action: 'REJECT_MESSAGE',
      notes: reason || 'Rejected by agent',
    });

    logger.info({ messageId, agentId, reason }, 'Outbound message rejected by agent');
    return { success: true, messageId, status: 'FAILED' };
  }
}

export const messagePipelineService = new MessagePipelineService();
