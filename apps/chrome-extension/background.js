const BACKEND_BASE_URL = 'http://127.0.0.1:3000';
const WS_URL = 'ws://127.0.0.1:3000/api/v1/ws';
const STORAGE_KEY = 'propertyWhatsappAiState';

let socket = null;
let reconnectTimer = null;
let state = {
  backendOnline: false,
  wsConnected: false,
  activeChatId: null,
  lastEvent: null,
  extensionVersion: '0.1.0',
  lastUpdated: Date.now(),
};

function updateBadge() {
  const online = state.backendOnline || state.wsConnected;
  chrome.action.setBadgeText({ text: online ? 'ON' : 'OFF' });
  chrome.action.setBadgeBackgroundColor({ color: online ? '#22c55e' : '#ef4444' });
}

function setState(patch) {
  state = { ...state, ...patch, lastUpdated: Date.now() };
  chrome.storage.local.set({ [STORAGE_KEY]: state });
  updateBadge();
}

async function checkBackendHealth() {
  try {
    const response = await fetch(`${BACKEND_BASE_URL}/api/v1/health`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}`);
    }

    const data = await response.json();
    setState({ backendOnline: true, lastEvent: data });
    return { ok: true, data };
  } catch (error) {
    setState({ backendOnline: false, lastEvent: { error: error.message } });
    return { ok: false, error: error.message };
  }
}

async function sendReplyToActiveWhatsApp({ text, chatId }) {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const activeTab = tabs.find((tab) => tab.url && tab.url.includes('web.whatsapp.com'));

  if (!activeTab || !activeTab.id) {
    return { ok: false, error: 'No active WhatsApp Web tab found.' };
  }

  const response = await chrome.tabs.sendMessage(activeTab.id, {
    type: 'SEND_TO_WHATSAPP',
    text: text || '',
    chatId: chatId || state.activeChatId || null,
  });

  return {
    ok: Boolean(response?.ok),
    sent: Boolean(response?.sent),
    data: response,
  };
}

function connectWebSocket() {
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return;
  }

  socket = new WebSocket(WS_URL);

  socket.addEventListener('open', () => {
    setState({ wsConnected: true, lastEvent: { type: 'socket-open', timestamp: Date.now() } });
    socket.send(JSON.stringify({ event: 'EXTENSION_REGISTER' }));
  });

  socket.addEventListener('message', (event) => {
    try {
      const payload = JSON.parse(event.data);
      setState({ lastEvent: payload, wsConnected: true });

      if (payload?.event === 'AI_RESPONSE_READY' && payload.data?.autoSend) {
        sendReplyToActiveWhatsApp({
          text: payload.data.content,
          chatId: payload.data.chatId || state.activeChatId,
        }).catch((error) => {
          setState({ lastEvent: { error: error.message } });
        });
      }

      chrome.runtime.sendMessage({ type: 'WS_EVENT', payload });
    } catch (error) {
      setState({ lastEvent: { error: 'Invalid socket payload' } });
    }
  });

  socket.addEventListener('close', () => {
    setState({ wsConnected: false, lastEvent: { type: 'socket-close', timestamp: Date.now() } });
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
    }
    reconnectTimer = setTimeout(() => {
      connectWebSocket();
    }, 2000);
  });

  socket.addEventListener('error', () => {
    setState({ wsConnected: false, lastEvent: { type: 'socket-error', timestamp: Date.now() } });
  });
}

async function sendInboundMessage(messageText, chatId = 'extension-demo-chat', extra = {}) {
  const payload = {
    externalMessageId: extra.externalMessageId || `ext-${Date.now()}`,
    chatId,
    customerPhone: extra.customerPhone || '+919999999999',
    customerName: extra.customerName || 'Chrome Extension User',
    message: messageText,
    timestamp: extra.timestamp || Date.now(),
    direction: 'INCOMING',
    propertySlug: extra.propertySlug || 'luxzirius-villas',
    sync: true,
  };

  const response = await fetch(`${BACKEND_BASE_URL}/api/v1/messages/inbound`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  return { ok: response.ok, status: response.status, data };
}

function normalizeChatId(rawValue) {
  if (!rawValue) return null;
  const trimmed = rawValue.trim();
  if (!trimmed) return null;

  const phoneMatch = trimmed.match(/\+?(\d{10,15})/);
  if (phoneMatch) {
    return `${phoneMatch[1]}@c.us`;
  }

  return trimmed;
}

function getActiveTabInfo() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const [tab] = tabs || [];
      resolve(tab || null);
    });
  });
}

chrome.storage.local.get(STORAGE_KEY, (result) => {
  const savedState = result?.[STORAGE_KEY] || {};
  state = { ...state, ...savedState };
  updateBadge();
  checkBackendHealth();
  connectWebSocket();
});

chrome.runtime.onInstalled.addListener(() => {
  setState({ extensionVersion: '0.1.0' });
  checkBackendHealth();
  connectWebSocket();
});

chrome.runtime.onStartup.addListener(() => {
  checkBackendHealth();
  connectWebSocket();
});

chrome.tabs.onActivated.addListener(() => {
  getActiveTabInfo().then((tab) => {
    if (tab?.url?.includes('web.whatsapp.com')) {
      setState({ activeChatId: 'whatsapp-web-active' });
    }
  });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url?.includes('web.whatsapp.com')) {
    setState({ activeChatId: 'whatsapp-web-active' });
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || !message.type) {
    sendResponse({ ok: false, error: 'Missing message.type' });
    return false;
  }

  switch (message.type) {
    case 'CHECK_STATUS': {
      checkBackendHealth();
      sendResponse({ ok: true, state });
      return true;
    }

    case 'PING_BACKEND': {
      checkBackendHealth().then((result) => sendResponse(result));
      return true;
    }

    case 'SEND_TEST_MESSAGE': {
      sendInboundMessage(message.text || 'Hello from Chrome extension', message.chatId || 'extension-demo-chat')
        .then((result) => sendResponse(result))
        .catch((error) => sendResponse({ ok: false, error: error.message }));
      return true;
    }

    case 'SET_ACTIVE_CHAT': {
      setState({ activeChatId: message.chatId || null });
      sendResponse({ ok: true, activeChatId: state.activeChatId });
      return true;
    }

    case 'SEND_TO_WHATSAPP': {
      getActiveTabInfo().then((tab) => {
        if (!tab || !tab.id) {
          sendResponse({ ok: false, error: 'No active tab found.' });
          return;
        }

        chrome.tabs.sendMessage(
          tab.id,
          { type: 'SEND_TO_WHATSAPP', text: message.text || '' },
          (response) => {
            if (chrome.runtime.lastError) {
              sendResponse({ ok: false, error: chrome.runtime.lastError.message });
              return;
            }
            sendResponse({ ok: Boolean(response?.ok), sent: Boolean(response?.sent), data: response });
          },
        );
      });
      return true;
    }

    case 'FORWARD_INCOMING_MESSAGE': {
      const chatId = normalizeChatId(message.chatId || state.activeChatId || 'extension-demo-chat');
      const body = {
        externalMessageId: message.externalMessageId || `wb-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        chatId,
        customerPhone: message.customerPhone || chatId,
        customerName: message.customerName || 'WhatsApp Web Contact',
        message: message.text || '',
        timestamp: message.timestamp || Date.now(),
      };

      if (!body.message || !body.chatId) {
        sendResponse({ ok: false, error: 'Missing message or chat id.' });
        return false;
      }

      sendInboundMessage(body.message, body.chatId, {
        externalMessageId: body.externalMessageId,
        customerPhone: body.customerPhone,
        customerName: body.customerName,
        timestamp: body.timestamp,
      })
        .then((result) => sendResponse(result))
        .catch((error) => sendResponse({ ok: false, error: error.message }));
      return true;
    }

    default:
      sendResponse({ ok: false, error: `Unknown message type: ${message.type}` });
      return false;
  }
});

checkBackendHealth();
connectWebSocket();
