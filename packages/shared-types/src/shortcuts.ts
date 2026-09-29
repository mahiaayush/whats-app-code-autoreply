import type { IntentType } from './ai.js';

export interface ShortcutRule {
  id: string;
  command: string; // e.g. "/price", "/area"
  name: string;
  description: string;
  targetIntent: IntentType;
  naturalLanguagePhrases: string[];
  responseTemplate?: string | null;
  enabled: boolean;
  priority: number;
}

export interface RuleMatchResult {
  matched: boolean;
  rule?: ShortcutRule;
  intent?: IntentType;
  matchType: 'EXACT_COMMAND' | 'PHRASE_MATCH' | 'REGEX_MATCH' | 'NONE';
  confidence: number;
  extractedPropertySlug?: string;
}
