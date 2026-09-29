import { getPrismaClient } from '../../database/prisma.client.js';
import type { Prisma } from '@prisma/client';
import type { ConversationMode } from '@property-ai/shared-types';
import type { ConversationQueryDto } from '@property-ai/validation';

export class ConversationRepository {
  private prisma = getPrismaClient();

  /**
   * Retrieves paginated list of conversations with search and filter capabilities.
   */
  public async findConversations(query: ConversationQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ConversationWhereInput = {};

    if (query.mode) {
      where.mode = query.mode;
    }

    if (query.language) {
      where.language = query.language;
    }

    if (query.search && query.search.trim().length > 0) {
      const searchTerm = query.search.trim();
      where.OR = [
        { chatId: { contains: searchTerm, mode: 'insensitive' } },
        { customer: { name: { contains: searchTerm, mode: 'insensitive' } } },
        { customer: { phone: { contains: searchTerm, mode: 'insensitive' } } },
      ];
    }

    const [total, conversations] = await Promise.all([
      this.prisma.conversation.count({ where }),
      this.prisma.conversation.findMany({
        where,
        orderBy: { lastMessageAt: 'desc' },
        skip,
        take: limit,
        include: {
          customer: true,
          property: {
            select: { id: true, slug: true, title: true },
          },
          escalations: {
            where: { status: 'OPEN' },
            select: { id: true, reason: true, priority: true, createdAt: true },
          },
          messages: {
            orderBy: { timestamp: 'desc' },
            take: 1,
            select: {
              id: true,
              content: true,
              sender: true,
              direction: true,
              timestamp: true,
              status: true,
            },
          },
        },
      }),
    ]);

    const formatted = conversations.map((conv) => ({
      id: conv.id,
      chatId: conv.chatId,
      mode: conv.mode,
      language: conv.language,
      autoSend: conv.autoSend,
      unreadCount: conv.unreadCount,
      lastMessageAt: conv.lastMessageAt,
      createdAt: conv.createdAt,
      customer: conv.customer,
      property: conv.property,
      openEscalationsCount: conv.escalations.length,
      latestMessage: conv.messages[0] || null,
    }));

    return {
      data: formatted,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Retrieves single conversation by ID with complete relations.
   */
  public async findById(id: string) {
    return this.prisma.conversation.findUnique({
      where: { id },
      include: {
        customer: true,
        property: true,
        escalations: {
          orderBy: { createdAt: 'desc' },
        },
        humanActions: {
          orderBy: { timestamp: 'desc' },
          take: 10,
        },
        messages: {
          orderBy: { timestamp: 'desc' },
          take: 20,
        },
      },
    });
  }

  /**
   * Retrieves conversation by WhatsApp chatId.
   */
  public async findByChatId(chatId: string) {
    return this.prisma.conversation.findUnique({
      where: { chatId },
      include: {
        customer: true,
        property: true,
      },
    });
  }

  /**
   * Updates conversation mode.
   */
  public async updateMode(id: string, mode: ConversationMode) {
    return this.prisma.conversation.update({
      where: { id },
      data: { mode },
      include: {
        customer: true,
        property: true,
      },
    });
  }

  /**
   * Updates conversation settings (property, language, autoSend).
   */
  public async updateSettings(
    id: string,
    data: {
      propertyId?: string | null;
      language?: string;
      autoSend?: boolean;
    },
  ) {
    return this.prisma.conversation.update({
      where: { id },
      data: {
        ...(data.propertyId !== undefined ? { propertyId: data.propertyId } : {}),
        ...(data.language ? { language: data.language } : {}),
        ...(data.autoSend !== undefined ? { autoSend: data.autoSend } : {}),
      },
      include: {
        customer: true,
        property: true,
      },
    });
  }

  /**
   * Records human action log.
   */
  public async recordHumanAction(data: {
    conversationId: string;
    agentId: string;
    action: string;
    notes?: string;
  }) {
    return this.prisma.humanAction.create({
      data: {
        conversationId: data.conversationId,
        agentId: data.agentId,
        action: data.action,
        notes: data.notes || null,
      },
    });
  }

  /**
   * Updates customer lead profile.
   */
  public async updateCustomerProfile(
    customerId: string,
    data: {
      name?: string;
      preferredLanguage?: string;
      status?: string;
      tags?: string[];
      notes?: string;
    },
  ) {
    return this.prisma.customer.update({
      where: { id: customerId },
      data: {
        ...(data.name ? { name: data.name } : {}),
        ...(data.preferredLanguage ? { preferredLanguage: data.preferredLanguage } : {}),
        ...(data.status ? { status: data.status } : {}),
        ...(data.tags ? { tags: data.tags } : {}),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
      },
    });
  }

  /**
   * Resets unread counter for a conversation.
   */
  public async resetUnreadCount(id: string) {
    return this.prisma.conversation.update({
      where: { id },
      data: { unreadCount: 0 },
    });
  }

  /**
   * Retrieves recent conversation message history for multi-turn prompt context.
   */
  public async getRecentConversationHistory(conversationId: string, limit: number = 10) {
    const messages = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { timestamp: 'desc' },
      take: limit,
      select: {
        sender: true,
        direction: true,
        content: true,
        timestamp: true,
      },
    });

    // Return in chronological order
    return messages.reverse();
  }
}

export const conversationRepository = new ConversationRepository();
