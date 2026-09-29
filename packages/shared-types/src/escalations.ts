export type EscalationReason =
  | 'NEGOTIATION'
  | 'DISCOUNT'
  | 'LEGAL'
  | 'REGISTRY'
  | 'POSSESSION'
  | 'COMPLEX_PAYMENT'
  | 'COMPLAINTS'
  | 'MANAGER_REQUEST'
  | 'HUMAN_REQUEST'
  | 'LOW_CONFIDENCE'
  | 'UNKNOWN_QUESTION';

export type EscalationPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type EscalationStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'DISMISSED';

export interface Escalation {
  id: string;
  conversationId: string;
  messageId?: string | null;
  reason: EscalationReason;
  priority: EscalationPriority;
  status: EscalationStatus;
  details?: string | null;
  confidence?: number | null;
  assignedAgentId?: string | null;
  createdAt: Date;
  resolvedAt?: Date | null;
}

export type HumanActionType =
  'TAKEOVER' | 'RELEASE' | 'PAUSE' | 'RESUME' | 'MANUAL_MESSAGE' | 'ESCALATION_RESOLVED';

export interface HumanAction {
  id: string;
  conversationId: string;
  agentId: string;
  action: HumanActionType;
  notes?: string | null;
  timestamp: Date;
}
