(() => {
  const WA_DOMAIN = 'https://web.whatsapp.com';
  const processedMessages = new Set();

  function isVisibleElement(element) {
    if (!element || !(element instanceof Element)) return false;

    const style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden') {
      return false;
    }

    const rect = element.getBoundingClientRect();
    return rect.width > 0 || rect.height > 0 || !!(element.textContent || '').trim();
  }

  function normalizeChatId(rawValue) {
    if (!rawValue) return null;

    const trimmed = String(rawValue).trim();
    if (!trimmed) return null;

    const phoneMatch = trimmed.match(/\+?(\d{10,15})/);
    if (phoneMatch) {
      return `${phoneMatch[1]}@c.us`;
    }

    return trimmed;
  }

  function isWhatsAppPage() {
    return window.location.origin === WA_DOMAIN;
  }

  function findChatInput() {
    const selectors = [
      'div[data-testid="conversation-compose-box"] div[contenteditable="true"]',
      'div[contenteditable="true"][data-tab="10"]',
      'div[role="textbox"][contenteditable="true"]',
      'div[contenteditable="true"]',
      'div[contenteditable="plaintext-only"]',
    ];

    for (const selector of selectors) {
      const node = Array.from(document.querySelectorAll(selector)).find((candidate) => {
        if (!isVisibleElement(candidate)) return false;
        const ariaLabel = (candidate.getAttribute('aria-label') || '').toLowerCase();
        return !ariaLabel.includes('search') && !candidate.closest('[data-testid="search"]');
      });

      if (node) return node;
    }

    return null;
  }

  function getActiveChatInfo() {
    const headerTitle = document.querySelector('header [title]')?.getAttribute('title');
    if (headerTitle && headerTitle.trim()) {
      const normalized = normalizeChatId(headerTitle);
      return {
        chatId: normalized || headerTitle.trim(),
        customerName: headerTitle.trim(),
      };
    }

    const selectedChat = document.querySelector('[data-testid="chat-list-panel"] [aria-selected="true"]');
    if (selectedChat) {
      const label = selectedChat.textContent || selectedChat.getAttribute('aria-label');
      if (label && label.trim()) {
        const normalized = normalizeChatId(label);
        return {
          chatId: normalized || label.trim(),
          customerName: label.trim(),
        };
      }
    }

    return {
      chatId: window.location.pathname.includes('/chat/') ? window.location.pathname : 'active-chat',
      customerName: 'WhatsApp Chat',
    };
  }

  function normalizeMessageText(rawText) {
    return (rawText || '')
      .replace(/\s+/g, ' ')
      .replace(/\u200e/g, '')
      .trim();
  }

  function getMessageCandidate(node) {
    if (!node || !(node instanceof Element)) return null;
    if (node.closest('[data-testid="conversation-compose-box"]')) return null;
    if (node.closest('[role="textbox"], [contenteditable="true"], [contenteditable="plaintext-only"]')) return null;

    const text = normalizeMessageText(node.innerText || node.textContent || '');
    if (!text || text.length < 3) return null;
    if (text.includes('Type a message') || text.includes('search')) return null;

    const isIncoming = !!node.closest('[data-testid="incoming-message"], .message-in, .incoming, [data-pre-plain-text]');
    const isOutgoing = !!node.closest('[data-testid="outgoing-message"], .message-out, .outgoing');
    if (!isIncoming && !isOutgoing) {
      return null;
    }

    const messageId = node.getAttribute('data-id') || node.getAttribute('data-msg-id') || `${text}-${Date.now()}`;
    const key = `${messageId}-${text}`;
    if (processedMessages.has(key)) {
      return null;
    }

    processedMessages.add(key);

    const { chatId, customerName } = getActiveChatInfo();
    return {
      externalMessageId: `wa-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      chatId,
      customerName,
      customerPhone: chatId,
      text,
      timestamp: Date.now(),
      isIncoming,
      isOutgoing,
    };
  }

  function detectIncomingMessages() {
    const selectors = [
      '[data-testid="incoming-message"]',
      '.message-in',
      '.incoming',
      'div[role="listitem"]',
      'div[data-id]',
      '[data-pre-plain-text]',
    ];

    for (const selector of selectors) {
      document.querySelectorAll(selector).forEach((node) => {
        const candidate = getMessageCandidate(node);
        if (!candidate) return;

        if (candidate.isIncoming) {
          chrome.runtime.sendMessage({
            type: 'FORWARD_INCOMING_MESSAGE',
            text: candidate.text,
            chatId: candidate.chatId,
            customerName: candidate.customerName,
            customerPhone: candidate.customerPhone,
            externalMessageId: candidate.externalMessageId,
            timestamp: candidate.timestamp,
          });
        }
      });
    }
  }

  function detectWhatsAppMeta() {
    const chatInfo = getActiveChatInfo();
    chrome.runtime.sendMessage({ type: 'SET_ACTIVE_CHAT', chatId: chatInfo.chatId });

    const input = findChatInput();
    if (!input) {
      return;
    }

    const payload = {
      type: 'WHATSAPP_READY',
      chatId: chatInfo.chatId,
      inputPresent: true,
      timestamp: Date.now(),
    };
    window.postMessage({ source: 'property-whatsapp-ai', payload }, window.location.origin);
  }

  function sendTextToWhatsApp(text) {
    const input = findChatInput();
    if (!input) {
      return false;
    }

    const value = (text || '').trim();
    if (!value) {
      return false;
    }

    try {
      input.focus();
      input.textContent = value;

      input.dispatchEvent(new InputEvent('beforeinput', {
        bubbles: true,
        cancelable: true,
        inputType: 'insertText',
        data: value,
      }));

      input.dispatchEvent(new InputEvent('input', {
        bubbles: true,
        cancelable: true,
        inputType: 'insertText',
        data: value,
      }));

      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true }));
      input.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', bubbles: true }));

      return true;
    } catch (error) {
      return false;
    }
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message || !message.type) {
      sendResponse({ ok: false, error: 'Missing message.type' });
      return false;
    }

    if (message.type === 'SEND_TO_WHATSAPP') {
      const sent = sendTextToWhatsApp(message.text || '');
      sendResponse({ ok: sent, sent });
      return true;
    }

    if (message.type === 'GET_ACTIVE_CHAT') {
      sendResponse({ ok: true, chatId: getActiveChatInfo().chatId });
      return true;
    }

    return false;
  });

  if (!isWhatsAppPage()) {
    return;
  }

  detectWhatsAppMeta();
  detectIncomingMessages();

  const syncObserver = new MutationObserver(() => {
    detectWhatsAppMeta();
    detectIncomingMessages();
  });

  syncObserver.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
  });
})();
