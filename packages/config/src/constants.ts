export const APP_CONSTANTS = {
  APP_NAME: 'Property WhatsApp AI',
  API_VERSION: 'v1',
  API_PREFIX: '/api/v1',
  DEFAULT_LANGUAGE: 'en' as const,
  SUPPORTED_LANGUAGES: ['en', 'hi', 'hinglish'] as const,
  DEFAULT_CONFIDENCE_THRESHOLD: 0.85,
  MAX_MESSAGE_LENGTH: 4000,
  MAX_CONTEXT_MESSAGES: 10,
  DEFAULT_PROPERTY_SLUG: 'luxzirius-villas',
  SAFEGUARDS: {
    AUTO_SEND_DEFAULT: false,
    REQUIRE_VERIFIED_CHAT: true,
    FAIL_CLOSED: true,
  },
} as const;
