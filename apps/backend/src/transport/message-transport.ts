import type {
  ActiveChatInfo,
  MessageTransport,
  WhatsAppDetectedMessage,
} from '@property-ai/shared-types';

export interface BrowserWhatsAppTransportOptions {
  baseUrl?: string;
  defaultPropertySlug?: string;
  fetchImpl?: typeof fetch;
}

function normalizeChatId(chatId?: string | null): string | null {
  if (!chatId) return null;
  const trimmed = chatId.trim();
  if (!trimmed) return null;
  return trimmed.replace(/@.*$/, '');
}

export class BrowserWhatsAppTransport implements MessageTransport {
  public readonly transportName = 'browser-whatsapp-web';

  private activeChat: ActiveChatInfo | null = null;
  private readonly baseUrl: string;
  private readonly defaultPropertySlug: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: BrowserWhatsAppTransportOptions = {}) {
    this.baseUrl = options.baseUrl ?? 'http://127.0.0.1:3000';
    this.defaultPropertySlug = options.defaultPropertySlug ?? 'luxzirius-villas';
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  public async setActiveChat(chat: ActiveChatInfo): Promise<void> {
    this.activeChat = chat;
  }

  public async receiveMessage(payload: WhatsAppDetectedMessage): Promise<void> {
    const normalizedChatId = payload.chatId?.trim() || 'active-chat';
    const phone = payload.customerPhone || normalizeChatId(payload.chatId) || payload.chatId;

    this.activeChat = {
      chatId: normalizedChatId,
      title: payload.customerName,
      phone,
      isGroup: false,
      lastActiveTimestamp: payload.timestamp,
    };

    const response = await this.fetchImpl(`${this.baseUrl}/api/v1/messages/inbound`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        externalMessageId: payload.externalMessageId,
        chatId: normalizedChatId,
        customerPhone: phone,
        customerName: payload.customerName,
        message: payload.message,
        timestamp: payload.timestamp,
        direction: payload.direction,
        propertySlug: this.defaultPropertySlug,
        sync: true,
      }),
    });

    if (!response.ok) {
      const details = await response.text().catch(() => '');
      throw new Error(`Transport receive failed: ${response.status} ${details}`);
    }
  }

  public async sendMessage(
    chatId: string,
    text: string,
    metadata?: Record<string, unknown>,
  ): Promise<boolean> {
    const normalizedExpected = normalizeChatId(chatId);
    const normalizedActive = normalizeChatId(this.activeChat?.chatId ?? null);

    if (!normalizedExpected || !normalizedActive) {
      return false;
    }

    if (normalizedExpected !== normalizedActive) {
      return false;
    }

    const payload = {
      chatId,
      content: text,
      metadata: metadata ?? {},
      sentAt: Date.now(),
    };

    if (typeof console !== 'undefined') {
      console.info('DEBUG: outbound transport message ready', payload);
    }

    return true;
  }

  public async verifyChat(expectedChatId: string): Promise<boolean> {
    if (!this.activeChat) {
      return false;
    }

    return normalizeChatId(expectedChatId) === normalizeChatId(this.activeChat.chatId);
  }

  public async getActiveChat(): Promise<ActiveChatInfo | null> {
    return this.activeChat;
  }
}

export const browserWhatsAppTransport = new BrowserWhatsAppTransport();
