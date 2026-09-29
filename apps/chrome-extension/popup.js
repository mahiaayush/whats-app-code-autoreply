const statusPill = document.getElementById('status-pill');
const backendStatus = document.getElementById('backend-status');
const wsStatus = document.getElementById('ws-status');
const chatStatus = document.getElementById('chat-status');
const resultBox = document.getElementById('resultBox');
const messageText = document.getElementById('messageText');
const refreshBtn = document.getElementById('refreshBtn');
const sendBtn = document.getElementById('sendBtn');

function setStatusPill(online) {
  statusPill.textContent = online ? 'Online' : 'Offline';
  statusPill.classList.toggle('online', online);
  statusPill.classList.toggle('offline', !online);
}

function renderState(state) {
  const backendOnline = Boolean(state?.backendOnline);
  const wsConnected = Boolean(state?.wsConnected);
  setStatusPill(backendOnline || wsConnected);
  backendStatus.textContent = backendOnline ? 'Connected' : 'Disconnected';
  wsStatus.textContent = wsConnected ? 'Connected' : 'Disconnected';
  chatStatus.textContent = state?.activeChatId || 'None';
}

function restoreStateFromStorage() {
  chrome.storage.local.get('propertyWhatsappAiState', (result) => {
    const state = result.propertyWhatsappAiState || {};
    renderState(state);
  });
}

function updateMessage(text) {
  resultBox.textContent = text;
  resultBox.classList.add('visible');
}

function refreshState() {
  chrome.runtime.sendMessage({ type: 'CHECK_STATUS' }, (response) => {
    if (chrome.runtime.lastError) {
      updateMessage(chrome.runtime.lastError.message);
      return;
    }

    if (response?.state) {
      renderState(response.state);
      updateMessage('Status refreshed.');
    } else {
      updateMessage('No state received from background worker.');
    }
  });
}

function pushToWhatsApp(text) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const [tab] = tabs || [];

    if (!tab || !tab.id) {
      updateMessage('Open WhatsApp Web to send a message.');
      return;
    }

    chrome.tabs.sendMessage(
      tab.id,
      { type: 'SEND_TO_WHATSAPP', text },
      (response) => {
        if (chrome.runtime.lastError) {
          updateMessage(chrome.runtime.lastError.message);
          return;
        }

        if (response?.ok) {
          updateMessage('Message sent to the active WhatsApp chat.');
          messageText.value = '';
        } else {
          updateMessage(response?.error || 'Could not send the message to WhatsApp Web.');
        }
      },
    );
  });
}

restoreStateFromStorage();
refreshBtn.addEventListener('click', refreshState);

sendBtn.addEventListener('click', () => {
  const text = messageText.value.trim();
  if (!text) {
    updateMessage('Please enter a test message first.');
    return;
  }

  chrome.runtime.sendMessage({ type: 'SEND_TEST_MESSAGE', text }, (backendResponse) => {
    if (chrome.runtime.lastError) {
      updateMessage(chrome.runtime.lastError.message);
      return;
    }

    if (backendResponse?.ok) {
      updateMessage('Backend accepted the message; sending to active WhatsApp chat now.');
      pushToWhatsApp(text);
      messageText.value = '';
    } else {
      updateMessage(backendResponse?.error || 'Message could not be sent to backend.');
      pushToWhatsApp(text);
    }
  });
});

refreshState();
