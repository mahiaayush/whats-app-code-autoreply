import type { LanguageCode } from './ai.js';

export type ConversationMode =
  'AI_ACTIVE' | 'HUMAN_REQUIRED' | 'HUMAN_ACTIVE' | 'PAUSED' | 'CLOSED';

export interface Conversation {
  id: string;
  chatId: string;
  customerId: string;
  propertyId?: string | null;
  mode: ConversationMode;
  language: LanguageCode;
  autoSend: boolean;
  unreadCount: number;
  lastMessageAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type ConversationAction = 'TAKEOVER' | 'RELEASE' | 'PAUSE' | 'RESUME' | 'CLOSE';

export interface ConversationStateTransition {
  conversationId: string;
  fromMode: ConversationMode;
  toMode: ConversationMode;
  action: ConversationAction;
  triggeredBy: 'HUMAN' | 'SYSTEM' | 'AI';
  reason?: string;
  timestamp: Date;
}
