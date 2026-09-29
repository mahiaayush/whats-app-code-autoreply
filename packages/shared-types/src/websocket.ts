import type { ConversationMode } from './conversations.js';
import type { EscalationPriority, EscalationReason } from './escalations.js';
import type { MessageDirection } from './messages.js';

export type WebSocketEventType =
  | 'HUMAN_ATTENTION_REQUIRED'
  | 'NEW_CUSTOMER_MESSAGE'
  | 'AI_RESPONSE_READY'
  | 'MESSAGE_SEND_FAILED'
  | 'OLLAMA_UNAVAILABLE'
  | 'EXTENSION_OFFLINE'
  | 'HUMAN_TAKEOVER'
  | 'PAUSE_AI'
  | 'RESUME_AI'
  | 'CONVERSATION_UPDATED'
  | 'SHOW_NOTIFICATION'
  | 'EXTENSION_REGISTER'
  | 'EXTENSION_HEARTBEAT'
  | 'DASHBOARD_SUBSCRIBE';

export interface WebSocketMessage<T = unknown> {
  event: WebSocketEventType;
  timestamp: string;
  data: T;
}

export interface WsHumanAttentionPayload {
  conversationId: string;
  chatId: string;
  customerName?: string;
  reason: EscalationReason;
  priority: EscalationPriority;
  messageSnippet: string;
}

export interface WsNewMessagePayload {
  conversationId: string;
  chatId: string;
  externalMessageId?: string;
  customerName: string;
  message: string;
  direction: MessageDirection;
}

export interface WsAiResponseReadyPayload {
  conversationId: string;
  chatId: string;
  responseMessageId: string;
  content: string;
  confidence: number;
  autoSend: boolean;
  requiresHuman: boolean;
}

export interface WsHumanTakeoverPayload {
  conversationId: string;
  chatId: string;
  agentId: string;
  mode: ConversationMode;
}

export interface WsExtensionHeartbeatPayload {
  extensionVersion: string;
  activeChatId?: string | null;
  timestamp: number;
}
