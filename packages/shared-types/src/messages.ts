export type MessageDirection = 'INCOMING' | 'OUTGOING';

export type MessageSender = 'CUSTOMER' | 'AI' | 'HUMAN' | 'SYSTEM';

export type MessageStatus =
  'RECEIVED' | 'PROCESSING' | 'PROCESSED' | 'PENDING_APPROVAL' | 'SENT' | 'FAILED' | 'IGNORED';

export interface Message {
  id: string;
  conversationId: string;
  externalMessageId?: string | null;
  sender: MessageSender;
  direction: MessageDirection;
  content: string;
  timestamp: Date;
  status: MessageStatus;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
}

export interface MessageProcessingRecord {
  id: string;
  messageId: string;
  conversationId: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  intent?: string | null;
  language?: string | null;
  confidence?: number | null;
  requiresHuman: boolean;
  processingTimeMs?: number | null;
  error?: string | null;
  createdAt: Date;
  updatedAt: Date;
}
