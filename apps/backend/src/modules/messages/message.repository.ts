import type { Prisma as PrismaTypes } from '@prisma/client';
import { getPrismaClient, Prisma } from '../../database/prisma.client.js';
import { logger } from '../../config/index.js';

export interface CreateMessageInput {
  conversationId: string;
  externalMessageId?: string | null;
  sender: 'CUSTOMER' | 'AI' | 'HUMAN' | 'SYSTEM';
  direction: 'INCOMING' | 'OUTGOING';
  content: string;
  status?: 'RECEIVED' | 'PROCESSING' | 'PROCESSED' | 'PENDING_APPROVAL' | 'SENT' | 'FAILED' | 'IGNORED';
  timestamp?: Date;
  metadata?: PrismaTypes.InputJsonValue;
}

export interface UpdateMessageProcessingInput {
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  intent?: string | null;
  language?: string | null;
  confidence?: number | null;
  requiresHuman?: boolean;
  ruleMatchedId?: string | null;
  processingTimeMs?: number | null;
  error?: string | null;
}

export interface CreateAiResponseInput {
  conversationId: string;
  triggerMessageId?: string | null;
  responseMessageId?: string | null;
  intent: string;
  language: string;
  source: 'SHORTCUT' | 'RULE' | 'FAQ_CACHE' | 'LLM' | 'HUMAN_FALLBACK';
  content: string;
  confidence: number;
  requiresHuman?: boolean;
  escalationReason?: string | null;
  latencyMs?: number | null;
  metadata?: PrismaTypes.InputJsonValue;
}

export interface CreateEscalationInput {
  conversationId: string;
  messageId?: string | null;
  reason: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  details?: string | null;
  confidence?: number | null;
}

export class MessageRepository {
  private prisma = getPrismaClient();

  /**
   * Normalizes a WhatsApp chatId (e.g. 919876543210@c.us -> 919876543210)
   */
  public extractPhone(chatId: string): string {
    return chatId.replace(/@.*$/, '').trim();
  }

  /**
   * Finds or creates a customer by phone number.
   */
  public async findOrCreateCustomer(phone: string, name?: string) {
    const normalizedPhone = this.extractPhone(phone);
    return this.prisma.customer.upsert({
      where: { phone: normalizedPhone },
      update: {
        ...(name ? { name } : {}),
      },
      create: {
        phone: normalizedPhone,
        name: name || `Customer ${normalizedPhone.slice(-4)}`,
        status: 'LEAD',
      },
    });
  }

  /**
   * Finds or creates a conversation for a chatId.
   */
  public async findOrCreateConversation(
    chatId: string,
    customerId: string,
    propertyId?: string | null,
  ) {
    const existing = await this.prisma.conversation.findUnique({
      where: { chatId },
      include: {
        customer: true,
        property: true,
      },
    });

    if (existing) {
      if (propertyId && !existing.propertyId) {
        return this.prisma.conversation.update({
          where: { id: existing.id },
          data: { propertyId },
          include: { customer: true, property: true },
        });
      }
      return existing;
    }

    return this.prisma.conversation.create({
      data: {
        chatId,
        customerId,
        propertyId: propertyId || null,
        mode: 'AI_ACTIVE',
        unreadCount: 0,
      },
      include: {
        customer: true,
        property: true,
      },
    });
  }

  /**
   * Finds a property ID by slug.
   */
  public async findPropertyBySlug(slug: string) {
    return this.prisma.property.findUnique({
      where: { slug },
      select: { id: true, slug: true, title: true },
    });
  }

  /**
   * Finds the first active property in the database to use as default.
   */
  public async getDefaultProperty() {
    return this.prisma.property.findFirst({
      where: { status: 'AVAILABLE' },
      select: { id: true, slug: true, title: true },
    });
  }

  /**
   * Finds a message by external WhatsApp ID.
   */
  public async findMessageByExternalId(externalMessageId: string) {
    return this.prisma.message.findUnique({
      where: { externalMessageId },
      include: {
        conversation: true,
        processing: true,
        aiResponse: true,
      },
    });
  }

  /**
   * Creates an incoming or outgoing message record.
   */
  public async createMessage(input: CreateMessageInput) {
    return this.prisma.message.create({
      data: {
        conversationId: input.conversationId,
        externalMessageId: input.externalMessageId || null,
        sender: input.sender,
        direction: input.direction,
        content: input.content,
        status: input.status ?? 'RECEIVED',
        timestamp: input.timestamp ?? new Date(),
        metadata: input.metadata ?? Prisma.JsonNull,
      },
    });
  }

  /**
   * Creates a processing tracker record for an incoming message.
   */
  public async createMessageProcessing(messageId: string) {
    return this.prisma.messageProcessing.create({
      data: {
        messageId,
        status: 'PENDING',
      },
    });
  }

  /**
   * Updates the processing record for a message.
   */
  public async updateMessageProcessing(
    messageId: string,
    updates: UpdateMessageProcessingInput,
  ) {
    return this.prisma.messageProcessing.update({
      where: { messageId },
      data: {
        status: updates.status,
        intent: updates.intent !== undefined ? updates.intent : undefined,
        language: updates.language !== undefined ? updates.language : undefined,
        confidence: updates.confidence !== undefined ? updates.confidence : undefined,
        requiresHuman: updates.requiresHuman !== undefined ? updates.requiresHuman : undefined,
        ruleMatchedId: updates.ruleMatchedId !== undefined ? updates.ruleMatchedId : undefined,
        processingTimeMs: updates.processingTimeMs !== undefined ? updates.processingTimeMs : undefined,
        error: updates.error !== undefined ? updates.error : undefined,
      },
    });
  }

  /**
   * Updates message status (e.g. PROCESSING -> PROCESSED or PENDING_APPROVAL).
   */
  public async updateMessageStatus(
    messageId: string,
    status: 'RECEIVED' | 'PROCESSING' | 'PROCESSED' | 'PENDING_APPROVAL' | 'SENT' | 'FAILED' | 'IGNORED',
  ) {
    return this.prisma.message.update({
      where: { id: messageId },
      data: { status },
    });
  }

  /**
   * Updates conversation metadata (unreadCount, lastMessageAt).
   */
  public async touchConversation(conversationId: string, incrementUnread: boolean = true) {
    return this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessageAt: new Date(),
        ...(incrementUnread ? { unreadCount: { increment: 1 } } : {}),
      },
    });
  }

  /**
   * Updates conversation mode (e.g. AI_ACTIVE, HUMAN_REQUIRED, HUMAN_ACTIVE, PAUSED).
   */
  public async updateConversationMode(conversationId: string, mode: string) {
    return this.prisma.conversation.update({
      where: { id: conversationId },
      data: { mode },
    });
  }

  /**
   * Records an AI response event.
   */
  public async createAiResponse(input: CreateAiResponseInput) {
    return this.prisma.aiResponse.create({
      data: {
        conversationId: input.conversationId,
        triggerMessageId: input.triggerMessageId || null,
        responseMessageId: input.responseMessageId || null,
        intent: input.intent,
        language: input.language,
        source: input.source,
        content: input.content,
        confidence: input.confidence,
        requiresHuman: input.requiresHuman ?? false,
        escalationReason: input.escalationReason || null,
        latencyMs: input.latencyMs || null,
        metadata: input.metadata ?? Prisma.JsonNull,
      },
    });
  }

  /**
   * Creates an escalation record and marks conversation as HUMAN_REQUIRED.
   */
  public async createEscalation(input: CreateEscalationInput) {
    const [escalation] = await this.prisma.$transaction([
      this.prisma.escalation.create({
        data: {
          conversationId: input.conversationId,
          messageId: input.messageId || null,
          reason: input.reason,
          priority: input.priority || 'HIGH',
          status: 'OPEN',
          details: input.details || null,
          confidence: input.confidence || 1.0,
        },
      }),
      this.prisma.conversation.update({
        where: { id: input.conversationId },
        data: { mode: 'HUMAN_REQUIRED' },
      }),
    ]);

    logger.info(
      { escalationId: escalation.id, conversationId: input.conversationId, reason: input.reason },
      'Customer conversation escalated to human team',
    );

    return escalation;
  }

  /**
   * Records a human agent action.
   */
  public async recordHumanAction(input: {
    conversationId: string;
    agentId: string;
    action: string;
    notes?: string;
  }) {
    return this.prisma.humanAction.create({
      data: {
        conversationId: input.conversationId,
        agentId: input.agentId,
        action: input.action,
        notes: input.notes || null,
      },
    });
  }

  /**
   * Retrieves messages for a specific conversation.
   */
  public async getConversationMessages(chatId: string, limit: number = 50) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { chatId },
      select: { id: true },
    });

    if (!conversation) {
      return [];
    }

    return this.prisma.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { timestamp: 'asc' },
      take: limit,
      include: {
        processing: true,
        aiResponse: true,
        escalations: true,
      },
    });
  }

  /**
   * Retrieves a single message by ID with full lifecycle relations.
   */
  public async getMessageById(id: string) {
    return this.prisma.message.findUnique({
      where: { id },
      include: {
        conversation: {
          include: {
            customer: true,
            property: true,
          },
        },
        processing: true,
        aiResponse: true,
        escalations: true,
      },
    });
  }
}

export const messageRepository = new MessageRepository();
