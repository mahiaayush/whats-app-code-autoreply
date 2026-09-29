import type { RuleMatchResult } from '@property-ai/shared-types';
import type { ShortcutRecord } from './rule.repository.js';

export class RuleEngine {
  private cachedRules: ShortcutRecord[] = [];
  private compiledPatterns: Map<string, RegExp[]> = new Map();

  constructor(initialRules: ShortcutRecord[] = []) {
    if (initialRules.length > 0) {
      this.loadRules(initialRules);
    }
  }

  /**
   * Load and compile rules into memory, ordered by priority ascending
   */
  loadRules(rules: ShortcutRecord[]): void {
    // Sort rules by priority ascending (lower number = higher priority)
    this.cachedRules = [...rules].sort((a, b) => a.priority - b.priority);
    this.compiledPatterns.clear();

    for (const rule of this.cachedRules) {
      const patterns: RegExp[] = [];
      for (const rawPhrase of rule.naturalLanguagePhrases) {
        const phrase = rawPhrase.trim().toLowerCase();
        if (!phrase) continue;

        // Escape regex special chars
        const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // Word boundary regex
        patterns.push(new RegExp(`(^|\\b)${escaped}(\\b|$)`, 'i'));
      }
      this.compiledPatterns.set(rule.id, patterns);
    }
  }

  /**
   * Get currently active rules in memory
   */
  getRules(): ShortcutRecord[] {
    return this.cachedRules;
  }

  /**
   * Evaluate a raw message text against active rules
   */
  match(rawText: string): RuleMatchResult {
    if (!rawText || typeof rawText !== 'string') {
      return {
        matched: false,
        matchType: 'NONE',
        confidence: 0,
      };
    }

    const trimmed = rawText.trim();
    if (trimmed.length === 0) {
      return {
        matched: false,
        matchType: 'NONE',
        confidence: 0,
      };
    }

    // 1. Exact command check (e.g. "/price", "/area", "/price 3bhk")
    if (trimmed.startsWith('/')) {
      const commandPart = trimmed.split(/\s+/)[0].toLowerCase();
      const exactRule = this.cachedRules.find(
        (r) => r.enabled && r.command.toLowerCase() === commandPart,
      );

      if (exactRule) {
        return {
          matched: true,
          rule: exactRule,
          intent: exactRule.targetIntent,
          matchType: 'EXACT_COMMAND',
          confidence: 1.0,
        };
      }
    }

    // 2. Natural language regex & phrase matching
    const normalizedText = trimmed.toLowerCase();

    for (const rule of this.cachedRules) {
      if (!rule.enabled) continue;

      const patterns = this.compiledPatterns.get(rule.id) || [];
      for (const pattern of patterns) {
        if (pattern.test(normalizedText)) {
          return {
            matched: true,
            rule,
            intent: rule.targetIntent,
            matchType: 'PHRASE_MATCH',
            confidence: 0.95,
          };
        }
      }
    }

    // 3. Fallback: No rule matched
    return {
      matched: false,
      matchType: 'NONE',
      confidence: 0,
    };
  }
}
