import { z } from 'zod';

export const ConversationTakeoverSchema = z.object({
  agentId: z.string().min(1, 'Agent ID is required'),
  reason: z.string().optional(),
});

export type ConversationTakeoverDto = z.infer<typeof ConversationTakeoverSchema>;

export const ConversationReleaseSchema = z.object({
  agentId: z.string().min(1, 'Agent ID is required'),
  reason: z.string().optional(),
});

export type ConversationReleaseDto = z.infer<typeof ConversationReleaseSchema>;

export const ConversationPauseSchema = z.object({
  reason: z.string().optional(),
});

export type ConversationPauseDto = z.infer<typeof ConversationPauseSchema>;

export const ConversationResumeSchema = z.object({
  reason: z.string().optional(),
});

export type ConversationResumeDto = z.infer<typeof ConversationResumeSchema>;

export const ConversationQuerySchema = z.object({
  mode: z.enum(['AI_ACTIVE', 'HUMAN_REQUIRED', 'HUMAN_ACTIVE', 'PAUSED', 'CLOSED']).optional(),
  language: z.enum(['en', 'hi', 'hinglish']).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type ConversationQueryDto = z.infer<typeof ConversationQuerySchema>;
