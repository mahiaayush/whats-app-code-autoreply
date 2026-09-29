import type { IntentType, LanguageCode } from './ai.js';

export interface ResponseTemplate {
  id: string;
  slug: string;
  name: string;
  intent: IntentType;
  language: LanguageCode;
  templateText: string;
  requiredPlaceholders: string[];
  isActive: boolean;
  version: number;
}

export interface RenderTemplateOptions {
  template: ResponseTemplate;
  variables: Record<string, string | number>;
}
