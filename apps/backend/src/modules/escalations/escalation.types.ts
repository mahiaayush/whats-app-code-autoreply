import type {
  EscalationPriority,
  EscalationReason,
  EscalationStatus,
} from '@property-ai/shared-types';

export const SLA_TARGET_MINUTES: Record<EscalationPriority, number> = {
  CRITICAL: 15,
  HIGH: 30,
  MEDIUM: 60,
  LOW: 120,
};

export interface SlaStatus {
  priority: EscalationPriority;
  targetMinutes: number;
  elapsedMinutes: number;
  timeRemainingMinutes: number;
  isBreached: boolean;
  deadlineAt: string;
}

export interface EscalationCustomerSummary {
  id: string;
  name: string | null;
  phone: string;
  tags: string[];
}

export interface EscalationConversationSummary {
  id: string;
  chatId: string;
  mode: string;
  language: string;
  unreadCount: number;
  customer?: EscalationCustomerSummary | null;
  property?: {
    id: string;
    title: string;
    slug: string;
  } | null;
}

export interface EscalationMessageSummary {
  id: string;
  content: string;
  sender: string;
  direction: string;
  timestamp: string;
}

export interface EscalationDetailDto {
  id: string;
  conversationId: string;
  messageId: string | null;
  reason: EscalationReason;
  priority: EscalationPriority;
  status: EscalationStatus;
  details: string | null;
  confidence: number | null;
  assignedAgentId: string | null;
  resolvedAt: string | null;
  createdAt: string;
  sla: SlaStatus;
  conversation?: EscalationConversationSummary | null;
  message?: EscalationMessageSummary | null;
}

export interface EscalationStatsDto {
  totalOpen: number;
  totalInProgress: number;
  totalResolved: number;
  totalDismissed: number;
  breachedCount: number;
  openByPriority: {
    CRITICAL: number;
    HIGH: number;
    MEDIUM: number;
    LOW: number;
  };
  averageResolutionMinutes: number;
}

export interface EscalationEvaluationResult {
  requiresEscalation: boolean;
  reason: EscalationReason | null;
  priority: EscalationPriority;
  confidence: number;
  explanation: string;
}
