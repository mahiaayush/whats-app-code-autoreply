import { z } from 'zod';
import { IntentTypeSchema } from './ai.schema.js';

export const CreateShortcutSchema = z.object({
  command: z
    .string()
    .min(2)
    .regex(/^\/[a-z0-9-]+$/, 'Command must start with / followed by lowercase alphanumeric/hyphen'),
  name: z.string().min(2),
  description: z.string().min(3),
  targetIntent: IntentTypeSchema,
  naturalLanguagePhrases: z.array(z.string().min(1)).default([]),
  enabled: z.boolean().default(true),
  priority: z.number().int().default(100),
});

export type CreateShortcutDto = z.infer<typeof CreateShortcutSchema>;
