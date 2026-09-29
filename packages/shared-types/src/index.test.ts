import { describe, it, expect } from 'vitest';
import type { ConversationMode, IntentType, LanguageCode, EscalationReason } from './index.js';

describe('Shared Types Package', () => {
  it('should support valid conversation modes', () => {
    const modes: ConversationMode[] = [
      'AI_ACTIVE',
      'HUMAN_REQUIRED',
      'HUMAN_ACTIVE',
      'PAUSED',
      'CLOSED',
    ];
    expect(modes).toHaveLength(5);
  });

  it('should support primary real estate intents', () => {
    const intents: IntentType[] = [
      'PROPERTY_PRICE',
      'PROPERTY_AREA',
      'PROPERTY_LOCATION',
      'PROPERTY_AMENITIES',
      'PROPERTY_MEDIA',
      'PROPERTY_BROCHURE',
      'PROPERTY_SITE_VISIT',
      'PROPERTY_CONTACT',
      'PROPERTY_LOAN',
      'PROPERTY_AVAILABILITY',
      'GENERAL_GREETING',
      'HUMAN_REQUIRED',
      'UNKNOWN',
    ];
    expect(intents).toContain('PROPERTY_PRICE');
    expect(intents).toContain('PROPERTY_LOCATION');
    expect(intents).toHaveLength(13);
  });

  it('should support English, Hindi, and Hinglish languages', () => {
    const languages: LanguageCode[] = ['en', 'hi', 'hinglish'];
    expect(languages).toHaveLength(3);
  });

  it('should support escalation reasons', () => {
    const reasons: EscalationReason[] = [
      'NEGOTIATION',
      'DISCOUNT',
      'LEGAL',
      'REGISTRY',
      'POSSESSION',
      'COMPLEX_PAYMENT',
      'COMPLAINTS',
      'MANAGER_REQUEST',
      'HUMAN_REQUEST',
      'LOW_CONFIDENCE',
      'UNKNOWN_QUESTION',
    ];
    expect(reasons).toContain('NEGOTIATION');
    expect(reasons).toContain('DISCOUNT');
  });
});
