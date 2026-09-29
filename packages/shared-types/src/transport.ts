import type { MessageDirection } from './messages.js';

export interface WhatsAppDetectedMessage {
  externalMessageId: string;
  chatId: string;
  customerPhone?: string;
  customerName: string;
  message: string;
  timestamp: number;
  direction: MessageDirection;
}

export interface ActiveChatInfo {
  chatId: string;
  title: string;
  phone?: string;
  isGroup: boolean;
  lastActiveTimestamp: number;
}

export interface SendMessagePayload {
  conversationId: string;
  chatId: string;
  content: string;
  replyToExternalId?: string;
  metadata?: Record<string, unknown>;
}

export interface SendProtectionValidation {
  canSend: boolean;
  reasons: string[];
  checks: {
    activeChatVerified: boolean;
    chatIdMatched: boolean;
    conversationModePermitsSend: boolean;
    responseBelongsToConversation: boolean;
    noDuplicateResponse: boolean;
    aiConfidenceSatisfied: boolean;
    responseContentValidated: boolean;
    autoSendEnabled: boolean;
  };
}

export interface MessageTransport {
  readonly transportName: string;
  receiveMessage(payload: WhatsAppDetectedMessage): Promise<void>;
  sendMessage(chatId: string, text: string, metadata?: Record<string, unknown>): Promise<boolean>;
  verifyChat(expectedChatId: string): Promise<boolean>;
  getActiveChat(): Promise<ActiveChatInfo | null>;
}
