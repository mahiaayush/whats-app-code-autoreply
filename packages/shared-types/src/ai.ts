export type LanguageCode = 'en' | 'hi' | 'hinglish';

export type IntentType =
  | 'PROPERTY_PRICE'
  | 'PROPERTY_AREA'
  | 'PROPERTY_LOCATION'
  | 'PROPERTY_AMENITIES'
  | 'PROPERTY_MEDIA'
  | 'PROPERTY_BROCHURE'
  | 'PROPERTY_SITE_VISIT'
  | 'PROPERTY_CONTACT'
  | 'PROPERTY_LOAN'
  | 'PROPERTY_AVAILABILITY'
  | 'GENERAL_GREETING'
  | 'HUMAN_REQUIRED'
  | 'UNKNOWN';

export interface AIClassificationResult {
  intent: IntentType;
  language: LanguageCode;
  propertySlug?: string | null;
  confidence: number;
  requiresHuman: boolean;
  detectedEntities?: {
    unitType?: string;
    budget?: string;
    locationQuery?: string;
    requestType?: string;
  };
  reasoning?: string;
}

export type ResponseSource = 'SHORTCUT' | 'RULE' | 'FAQ_CACHE' | 'LLM' | 'HUMAN_FALLBACK';

export interface AIResponsePayload {
  content: string;
  language: LanguageCode;
  intent: IntentType;
  confidence: number;
  source: ResponseSource;
  requiresHuman: boolean;
  escalationReason?: string | null;
  metadata?: Record<string, unknown>;
}
