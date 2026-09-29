import { z } from 'zod';

export const IncomingMessageSchema = z.object({
  externalMessageId: z.string().min(1, 'externalMessageId is required'),
  chatId: z.string().min(1, 'chatId is required'),
  customerPhone: z.string().optional(),
  customerName: z.string().min(1, 'customerName is required'),
  message: z.string().min(1, 'message body cannot be empty').max(4000, 'message is too long'),
  timestamp: z.number().int().positive('timestamp must be a positive integer'),
  direction: z.enum(['INCOMING', 'OUTGOING']).default('INCOMING'),
});

export type IncomingMessageDto = z.infer<typeof IncomingMessageSchema>;

export const OutgoingMessageSchema = z.object({
  conversationId: z.string().uuid('conversationId must be a valid UUID'),
  chatId: z.string().min(1, 'chatId is required'),
  content: z.string().min(1, 'content cannot be empty').max(4000, 'content is too long'),
  replyToExternalId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type OutgoingMessageDto = z.infer<typeof OutgoingMessageSchema>;
