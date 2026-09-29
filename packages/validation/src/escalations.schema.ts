import { z } from 'zod';

export const EscalationQuerySchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'DISMISSED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type EscalationQueryDto = z.infer<typeof EscalationQuerySchema>;

export const ResolveEscalationSchema = z.object({
  agentId: z.string().min(1, 'Agent ID is required'),
  notes: z.string().optional(),
});

export type ResolveEscalationDto = z.infer<typeof ResolveEscalationSchema>;
