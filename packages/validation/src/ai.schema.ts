import { z } from 'zod';

export const LanguageCodeSchema = z.enum(['en', 'hi', 'hinglish']);

export const IntentTypeSchema = z.enum([
  'PROPERTY_PRICE',
  'PROPERTY_AREA',
  'PROPERTY_LOCATION',
  'PROPERTY_AMENITIES',
  'PROPERTY_MEDIA',
  'PROPERTY_BROCHURE',
  'PROPERTY_SITE_VISIT',
  'PROPERTY_CONTACT',
  'PROPERTY_LOAN',
  'PROPERTY_AVAILABILITY',
  'GENERAL_GREETING',
  'HUMAN_REQUIRED',
  'UNKNOWN',
]);

export const AiClassificationSchema = z.object({
  intent: IntentTypeSchema,
  language: LanguageCodeSchema,
  propertySlug: z.string().nullable().optional(),
  confidence: z.number().min(0).max(1),
  requiresHuman: z.boolean(),
  detectedEntities: z
    .object({
      unitType: z.string().optional(),
      budget: z.string().optional(),
      locationQuery: z.string().optional(),
      requestType: z.string().optional(),
    })
    .optional(),
  reasoning: z.string().optional(),
});

export type AiClassificationDto = z.infer<typeof AiClassificationSchema>;

export const LanguageDetectionSchema = z.object({
  language: LanguageCodeSchema,
  confidence: z.number().min(0).max(1),
});

export type LanguageDetectionDto = z.infer<typeof LanguageDetectionSchema>;

export const EscalationDetectionSchema = z.object({
  requiresHuman: z.boolean(),
  reason: z
    .enum([
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
    ])
    .nullable()
    .optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
  confidence: z.number().min(0).max(1),
  explanation: z.string().optional(),
});

export type EscalationDetectionDto = z.infer<typeof EscalationDetectionSchema>;

export const GeneratedResponseSchema = z.object({
  response: z.string().min(1, 'Generated response cannot be empty'),
  language: LanguageCodeSchema,
  groundedFactsUsed: z.array(z.string()).default([]),
  confidence: z.number().min(0).max(1),
  suggestedFollowUps: z.array(z.string()).optional(),
});

export type GeneratedResponseDto = z.infer<typeof GeneratedResponseSchema>;
