import { EscalationRepository } from './escalation.repository.js';
import { EscalationDetector } from './escalation.detector.js';
import {
  SLA_TARGET_MINUTES,
  type EscalationDetailDto,
  type EscalationEvaluationResult,
  type EscalationStatsDto,
  type SlaStatus,
} from './escalation.types.js';
import { WebSocketManager } from '../../websocket/ws.server.js';
import { getPrismaClient } from '../../database/prisma.client.js';
import { NotFoundError, ValidationError } from '../../common/errors/app-error.js';
import { logger } from '../../config/index.js';
import type {
  AssignEscalationDto,
  CreateEscalationDto,
  DismissEscalationDto,
  EscalationQueryDto,
  ResolveEscalationDto,
} from '@property-ai/validation';
import type { EscalationPriority, EscalationReason, EscalationStatus } from '@property-ai/shared-types';

export class EscalationService {
  private repo: EscalationRepository;
  private wsManager: WebSocketManager;
  private prisma = getPrismaClient();

  constructor(repo?: EscalationRepository, wsManager?: WebSocketManager) {
    this.repo = repo || new EscalationRepository();
    this.wsManager = wsManager || WebSocketManager.getInstance();
  }

  /**
   * Evaluate a customer message against escalation triggers
   */
  evaluateMessage(messageText: string): EscalationEvaluationResult {
    return EscalationDetector.evaluate(messageText);
  }

  /**
   * Dynamically calculate SLA status for an escalation
   */
  computeSla(escalation: {
    priority: string;
    createdAt: Date;
    resolvedAt?: Date | null;
  }): SlaStatus {
    const priority = (escalation.priority as EscalationPriority) || 'MEDIUM';
    const targetMinutes = SLA_TARGET_MINUTES[priority] ?? 60;

    const referenceTime = escalation.resolvedAt
      ? escalation.resolvedAt.getTime()
      : Date.now();
    const elapsedMinutes = Math.floor(
      (referenceTime - escalation.createdAt.getTime()) / (1000 * 60),
    );
    const timeRemainingMinutes = Math.max(0, targetMinutes - elapsedMinutes);
    const isBreached = elapsedMinutes > targetMinutes;
    const deadlineAt = new Date(
      escalation.createdAt.getTime() + targetMinutes * 60 * 1000,
    ).toISOString();

    return {
      priority,
      targetMinutes,
      elapsedMinutes,
      timeRemainingMinutes,
      isBreached,
      deadlineAt,
    };
  }

  /**
   * Create an escalation, update conversation mode to HUMAN_REQUIRED, and alert dashboard
   */
  async createEscalation(dto: CreateEscalationDto): Promise<EscalationDetailDto> {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: dto.conversationId },
      include: { customer: true, property: true },
    });

    if (!conversation) {
      throw new NotFoundError(`Conversation not found: ${dto.conversationId}`);
    }

    // Determine priority from detector if not explicitly provided or defaulted
    const priority = dto.priority || 'MEDIUM';

    const escalation = await this.repo.create({
      conversationId: dto.conversationId,
      messageId: dto.messageId,
      reason: dto.reason,
      priority,
      details: dto.details,
      confidence: dto.confidence,
    });

    // Automatically transition conversation to HUMAN_REQUIRED if currently in AI_ACTIVE
    if (conversation.mode === 'AI_ACTIVE') {
      await this.prisma.conversation.update({
        where: { id: conversation.id },
        data: { mode: 'HUMAN_REQUIRED' },
      });
      logger.info(
        { conversationId: conversation.id, mode: 'HUMAN_REQUIRED' },
        'Conversation mode set to HUMAN_REQUIRED upon escalation creation',
      );
    }

    // Broadcast WebSocket alert to human dashboard
    this.wsManager.broadcast('HUMAN_ATTENTION_REQUIRED', {
      conversationId: conversation.id,
      chatId: conversation.chatId,
      customerName: conversation.customer.name || undefined,
      reason: dto.reason,
      priority,
      messageSnippet: dto.details?.slice(0, 100) || `Escalation triggered (${dto.reason})`,
    });

    return this.mapToDetailDto(escalation);
  }

  /**
   * Assign escalation to an agent, transitioning conversation to HUMAN_ACTIVE
   */
  async assignEscalation(id: string, dto: AssignEscalationDto): Promise<EscalationDetailDto> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundError(`Escalation not found: ${id}`);
    }

    if (existing.status === 'RESOLVED' || existing.status === 'DISMISSED') {
      throw new ValidationError(
        `Cannot assign escalation with status ${existing.status}`,
      );
    }

    const updated = await this.repo.assign(id, dto.agentId);

    // Transition conversation to HUMAN_ACTIVE so human takes over
    await this.prisma.conversation.update({
      where: { id: existing.conversationId },
      data: {
        mode: 'HUMAN_ACTIVE',
      },
    });

    // Record human takeover action
    await this.prisma.humanAction.create({
      data: {
        conversationId: existing.conversationId,
        agentId: dto.agentId,
        action: 'TAKEOVER',
        notes: `Agent ${dto.agentId} assigned to escalation ${id}`,
      },
    });

    // Broadcast takeover to dashboard
    this.wsManager.broadcast('HUMAN_TAKEOVER', {
      conversationId: existing.conversationId,
      chatId: existing.conversation.chatId,
      agentId: dto.agentId,
      mode: 'HUMAN_ACTIVE',
    });

    logger.info(
      { escalationId: id, agentId: dto.agentId, conversationId: existing.conversationId },
      'Escalation assigned to agent; conversation transitioned to HUMAN_ACTIVE',
    );

    return this.mapToDetailDto(updated);
  }

  /**
   * Resolve an escalation, audit action
   */
  async resolveEscalation(id: string, dto: ResolveEscalationDto): Promise<EscalationDetailDto> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundError(`Escalation not found: ${id}`);
    }

    if (existing.status === 'RESOLVED') {
      throw new ValidationError('Escalation is already resolved');
    }

    const resolved = await this.repo.resolve(id, dto.agentId, dto.notes);
    logger.info({ escalationId: id, agentId: dto.agentId }, 'Escalation resolved');

    return this.mapToDetailDto(resolved);
  }

  /**
   * Dismiss an escalation, audit action
   */
  async dismissEscalation(id: string, dto: DismissEscalationDto): Promise<EscalationDetailDto> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundError(`Escalation not found: ${id}`);
    }

    if (existing.status === 'DISMISSED' || existing.status === 'RESOLVED') {
      throw new ValidationError(
        `Cannot dismiss escalation with status ${existing.status}`,
      );
    }

    const dismissed = await this.repo.dismiss(id, dto.agentId, dto.notes);
    logger.info({ escalationId: id, agentId: dto.agentId }, 'Escalation dismissed');

    return this.mapToDetailDto(dismissed);
  }

  /**
   * Get single escalation with full details & SLA
   */
  async getEscalation(id: string): Promise<EscalationDetailDto> {
    const escalation = await this.repo.findById(id);
    if (!escalation) {
      throw new NotFoundError(`Escalation not found: ${id}`);
    }
    return this.mapToDetailDto(escalation);
  }

  /**
   * Query escalations with live SLA metadata & pagination
   */
  async getEscalations(query: EscalationQueryDto): Promise<{
    escalations: EscalationDetailDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const result = await this.repo.findMany(query);

    let mapped = result.escalations.map((e) => this.mapToDetailDto(e));

    // Filter by SLA breached if requested
    if (query.isBreached !== undefined) {
      mapped = mapped.filter((e) => e.sla.isBreached === query.isBreached);
    }

    return {
      escalations: mapped,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }

  /**
   * Get escalation dashboard metrics including SLA breach count
   */
  async getStats(): Promise<EscalationStatsDto> {
    const stats = await this.repo.getStats();
    const activeEscalations = await this.repo.findActiveEscalations();

    let breachedCount = 0;
    for (const esc of activeEscalations) {
      const sla = this.computeSla(esc);
      if (sla.isBreached) {
        breachedCount++;
      }
    }

    return {
      ...stats,
      breachedCount,
    };
  }

  /**
   * Helper: map Prisma Escalation record to EscalationDetailDto with computed SLA
   */
  private mapToDetailDto(escalation: {
    id: string;
    conversationId: string;
    messageId: string | null;
    reason: string;
    priority: string;
    status: string;
    details: string | null;
    confidence: number | null;
    assignedAgentId: string | null;
    resolvedAt: Date | null;
    createdAt: Date;
    conversation?: {
      id: string;
      chatId: string;
      mode: string;
      language: string;
      unreadCount: number;
      customer?: {
        id: string;
        name: string | null;
        phone: string;
        tags: string[];
      } | null;
      property?: {
        id: string;
        title: string;
        slug: string;
      } | null;
    } | null;
    message?: {
      id: string;
      content: string;
      sender: string;
      direction: string;
      timestamp: Date;
    } | null;
  }): EscalationDetailDto {
    const sla = this.computeSla(escalation);

    return {
      id: escalation.id,
      conversationId: escalation.conversationId,
      messageId: escalation.messageId,
      reason: escalation.reason as EscalationReason,
      priority: escalation.priority as EscalationPriority,
      status: escalation.status as EscalationStatus,
      details: escalation.details,
      confidence: escalation.confidence,
      assignedAgentId: escalation.assignedAgentId,
      resolvedAt: escalation.resolvedAt ? escalation.resolvedAt.toISOString() : null,
      createdAt: escalation.createdAt.toISOString(),
      sla,
      conversation: escalation.conversation
        ? {
            id: escalation.conversation.id,
            chatId: escalation.conversation.chatId,
            mode: escalation.conversation.mode,
            language: escalation.conversation.language,
            unreadCount: escalation.conversation.unreadCount,
            customer: escalation.conversation.customer
              ? {
                  id: escalation.conversation.customer.id,
                  name: escalation.conversation.customer.name,
                  phone: escalation.conversation.customer.phone,
                  tags: escalation.conversation.customer.tags,
                }
              : null,
            property: escalation.conversation.property
              ? {
                  id: escalation.conversation.property.id,
                  title: escalation.conversation.property.title,
                  slug: escalation.conversation.property.slug,
                }
              : null,
          }
        : null,
      message: escalation.message
        ? {
            id: escalation.message.id,
            content: escalation.message.content,
            sender: escalation.message.sender,
            direction: escalation.message.direction,
            timestamp: escalation.message.timestamp.toISOString(),
          }
        : null,
    };
  }
}
