import { z } from 'zod';
import { IntentTypeSchema, LanguageCodeSchema } from './ai.schema.js';

export const CreateTemplateSchema = z.object({
  slug: z
    .string()
    .min(2)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  name: z.string().min(2),
  intent: IntentTypeSchema,
  language: LanguageCodeSchema,
  templateText: z.string().min(5, 'Template text must have at least 5 characters'),
  requiredPlaceholders: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
});

export type CreateTemplateDto = z.infer<typeof CreateTemplateSchema>;
