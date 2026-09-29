# Chrome Extension MVP

This directory contains a minimal Manifest V3 extension scaffold for the WhatsApp AI automation flow.

## Included

- `manifest.json`: extension declaration for Manifest V3
- `background.js`: service worker that keeps the backend WebSocket connection and health checks
- `content.js`: content script that activates on WhatsApp Web pages and detects the active chat input
- `popup.html` and `popup.js`: popup UI for connection status and test message sending
- `styles.css`: popup styling

## Notes

- The extension is intended to run on `https://web.whatsapp.com/*`.
- It talks to the local backend at `http://127.0.0.1:3000`.
- The current implementation is a working MVP and is designed to be extended with more robust WhatsApp DOM selectors and transport logic.

## Load in Chrome

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Click `Load unpacked`.
4. Select this directory: `apps/chrome-extension`.

## Verify backend

The backend must already be running locally on port `3000`.

```bash
curl http://127.0.0.1:3000/api/v1/health
```
