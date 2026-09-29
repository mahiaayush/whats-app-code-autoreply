import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserWhatsAppTransport } from './message-transport.js';

describe('BrowserWhatsAppTransport', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('posts inbound WhatsApp payloads to the backend transport endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ status: 'SUCCESS' }),
    });

    vi.stubGlobal('fetch', fetchMock);

    const transport = new BrowserWhatsAppTransport({
      baseUrl: 'http://127.0.0.1:3000',
    });

    await transport.receiveMessage({
      externalMessageId: 'ext-1',
      chatId: '919900000001@c.us',
      customerName: 'John',
      message: 'Hello there',
      timestamp: 1710000000000,
      direction: 'INCOMING',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:3000/api/v1/messages/inbound',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
      }),
    );

    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(init.body);
    expect(body.chatId).toBe('919900000001@c.us');
    expect(body.message).toBe('Hello there');
  });

  it('returns true when sending a message to a verified chat', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ status: 'SUCCESS' }),
    });

    vi.stubGlobal('fetch', fetchMock);

    const transport = new BrowserWhatsAppTransport({
      baseUrl: 'http://127.0.0.1:3000',
    });

    await transport.setActiveChat({
      chatId: '919900000001@c.us',
      title: 'John',
      isGroup: false,
      lastActiveTimestamp: Date.now(),
    });

    const result = await transport.sendMessage('919900000001@c.us', 'Hi John');
    expect(result).toBe(true);
  });
});
