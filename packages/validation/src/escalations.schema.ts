import { z } from 'zod';

export const EscalationReasonEnum = z.enum([
  'NEGOTIATION',
  'DISCOUNT',
  'LEGAL',
  'REGISTRY',
  'POSSESSION',
  'COMPLEX_PAYMENT',
  'COMPLAINTS',
  'MANAGER_REQUEST',
  'HUMAN_REQUEST',
  'LOW_CONFIDENCE',
  'UNKNOWN_QUESTION',
]);

export const EscalationPriorityEnum = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);

export const EscalationStatusEnum = z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'DISMISSED']);

export const EscalationQuerySchema = z.object({
  status: EscalationStatusEnum.optional(),
  priority: EscalationPriorityEnum.optional(),
  reason: EscalationReasonEnum.optional(),
  assignedAgentId: z.string().optional(),
  isBreached: z
    .string()
    .transform((val) => val === 'true')
    .or(z.boolean())
    .optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type EscalationQueryDto = z.infer<typeof EscalationQuerySchema>;

export const CreateEscalationSchema = z.object({
  conversationId: z.string().uuid('conversationId must be a valid UUID'),
  messageId: z.string().uuid('messageId must be a valid UUID').optional(),
  reason: EscalationReasonEnum,
  priority: EscalationPriorityEnum.default('MEDIUM'),
  details: z.string().max(2000).optional(),
  confidence: z.number().min(0).max(1).optional(),
});

export type CreateEscalationDto = z.infer<typeof CreateEscalationSchema>;

export const AssignEscalationSchema = z.object({
  agentId: z.string().min(1, 'Agent ID is required'),
});

export type AssignEscalationDto = z.infer<typeof AssignEscalationSchema>;

export const ResolveEscalationSchema = z.object({
  agentId: z.string().min(1, 'Agent ID is required'),
  notes: z.string().max(2000).optional(),
});

export type ResolveEscalationDto = z.infer<typeof ResolveEscalationSchema>;

export const DismissEscalationSchema = z.object({
  agentId: z.string().min(1, 'Agent ID is required'),
  notes: z.string().max(2000).optional(),
});

export type DismissEscalationDto = z.infer<typeof DismissEscalationSchema>;

export const EvaluateEscalationSchema = z.object({
  messageText: z.string().min(1, 'Message text is required'),
  recentSnippet: z.string().optional(),
});

export type EvaluateEscalationDto = z.infer<typeof EvaluateEscalationSchema>;
