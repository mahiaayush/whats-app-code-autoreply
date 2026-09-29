import { getPrismaClient } from '../../database/prisma.client.js';
import type { Prisma } from '@prisma/client';
import type {
  EscalationPriority,
  EscalationReason,
} from '@property-ai/shared-types';
import type { EscalationQueryDto } from '@property-ai/validation';

export class EscalationRepository {
  private prisma = getPrismaClient();

  /**
   * Create a new escalation record
   */
  async create(data: {
    conversationId: string;
    messageId?: string | null;
    reason: EscalationReason;
    priority?: EscalationPriority;
    details?: string | null;
    confidence?: number | null;
  }) {
    return this.prisma.escalation.create({
      data: {
        conversationId: data.conversationId,
        messageId: data.messageId || null,
        reason: data.reason,
        priority: data.priority || 'MEDIUM',
        status: 'OPEN',
        details: data.details || null,
        confidence: data.confidence !== undefined ? data.confidence : null,
      },
      include: {
        conversation: {
          include: {
            customer: true,
            property: {
              select: {
                id: true,
                title: true,
                slug: true,
              },
            },
          },
        },
        message: {
          select: {
            id: true,
            content: true,
            sender: true,
            direction: true,
            timestamp: true,
          },
        },
      },
    });
  }

  /**
   * Find escalation by ID with conversation, customer, and trigger message
   */
  async findById(id: string) {
    return this.prisma.escalation.findUnique({
      where: { id },
      include: {
        conversation: {
          include: {
            customer: true,
            property: {
              select: {
                id: true,
                title: true,
                slug: true,
              },
            },
          },
        },
        message: {
          select: {
            id: true,
            content: true,
            sender: true,
            direction: true,
            timestamp: true,
          },
        },
      },
    });
  }

  /**
   * Query escalations with filtering and pagination
   */
  async findMany(query: EscalationQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.EscalationWhereInput = {};

    if (query.status) {
      where.status = query.status;
    }
    if (query.priority) {
      where.priority = query.priority;
    }
    if (query.reason) {
      where.reason = query.reason;
    }
    if (query.assignedAgentId) {
      where.assignedAgentId = query.assignedAgentId;
    }

    const [total, escalations] = await Promise.all([
      this.prisma.escalation.count({ where }),
      this.prisma.escalation.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ createdAt: 'desc' }],
        include: {
          conversation: {
            include: {
              customer: true,
              property: {
                select: {
                  id: true,
                  title: true,
                  slug: true,
                },
              },
            },
          },
          message: {
            select: {
              id: true,
              content: true,
              sender: true,
              direction: true,
              timestamp: true,
            },
          },
        },
      }),
    ]);

    return {
      escalations,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Assign an escalation to a human agent and set status to IN_PROGRESS
   */
  async assign(id: string, agentId: string) {
    return this.prisma.escalation.update({
      where: { id },
      data: {
        assignedAgentId: agentId,
        status: 'IN_PROGRESS',
      },
      include: {
        conversation: {
          include: {
            customer: true,
            property: {
              select: {
                id: true,
                title: true,
                slug: true,
              },
            },
          },
        },
        message: {
          select: {
            id: true,
            content: true,
            sender: true,
            direction: true,
            timestamp: true,
          },
        },
      },
    });
  }

  /**
   * Resolve an escalation, mark resolvedAt, and record human audit action
   */
  async resolve(id: string, agentId: string, notes?: string) {
    const escalation = await this.prisma.escalation.update({
      where: { id },
      data: {
        status: 'RESOLVED',
        resolvedAt: new Date(),
        assignedAgentId: agentId,
      },
      include: {
        conversation: {
          include: {
            customer: true,
            property: true,
          },
        },
      },
    });

    await this.prisma.humanAction.create({
      data: {
        conversationId: escalation.conversationId,
        agentId,
        action: 'ESCALATION_RESOLVED',
        notes: notes || 'Escalation marked as resolved',
      },
    });

    return escalation;
  }

  /**
   * Dismiss an escalation and record audit action
   */
  async dismiss(id: string, agentId: string, notes?: string) {
    const escalation = await this.prisma.escalation.update({
      where: { id },
      data: {
        status: 'DISMISSED',
        resolvedAt: new Date(),
        assignedAgentId: agentId,
      },
      include: {
        conversation: {
          include: {
            customer: true,
            property: true,
          },
        },
      },
    });

    await this.prisma.humanAction.create({
      data: {
        conversationId: escalation.conversationId,
        agentId,
        action: 'ESCALATION_RESOLVED',
        notes: notes ? `Dismissed: ${notes}` : 'Escalation dismissed',
      },
    });

    return escalation;
  }

  /**
   * Query all open/in-progress escalations (for SLA monitoring and alerts)
   */
  async findActiveEscalations() {
    return this.prisma.escalation.findMany({
      where: {
        status: { in: ['OPEN', 'IN_PROGRESS'] },
      },
      orderBy: { createdAt: 'asc' },
      include: {
        conversation: {
          include: { customer: true },
        },
      },
    });
  }

  /**
   * Get escalation aggregation metrics
   */
  async getStats() {
    const [totalOpen, totalInProgress, totalResolved, totalDismissed, priorityCounts, resolvedItems] =
      await Promise.all([
        this.prisma.escalation.count({ where: { status: 'OPEN' } }),
        this.prisma.escalation.count({ where: { status: 'IN_PROGRESS' } }),
        this.prisma.escalation.count({ where: { status: 'RESOLVED' } }),
        this.prisma.escalation.count({ where: { status: 'DISMISSED' } }),
        this.prisma.escalation.groupBy({
          by: ['priority'],
          where: { status: { in: ['OPEN', 'IN_PROGRESS'] } },
          _count: { priority: true },
        }),
        this.prisma.escalation.findMany({
          where: {
            status: 'RESOLVED',
            resolvedAt: { not: null },
          },
          select: {
            createdAt: true,
            resolvedAt: true,
          },
          take: 100,
          orderBy: { resolvedAt: 'desc' },
        }),
      ]);

    const openByPriority: Record<EscalationPriority, number> = {
      CRITICAL: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0,
    };

    for (const group of priorityCounts) {
      if (group.priority in openByPriority) {
        openByPriority[group.priority as EscalationPriority] = group._count.priority;
      }
    }

    // Compute average resolution time in minutes
    let averageResolutionMinutes = 0;
    if (resolvedItems.length > 0) {
      const totalMinutes = resolvedItems.reduce(
        (acc: number, item: { createdAt: Date; resolvedAt: Date | null }) => {
          if (!item.resolvedAt) return acc;
          const duration = (item.resolvedAt.getTime() - item.createdAt.getTime()) / (1000 * 60);
          return acc + Math.max(0, duration);
        },
        0,
      );
      averageResolutionMinutes = Math.round(totalMinutes / resolvedItems.length);
    }

    return {
      totalOpen,
      totalInProgress,
      totalResolved,
      totalDismissed,
      openByPriority,
      averageResolutionMinutes,
    };
  }
}
