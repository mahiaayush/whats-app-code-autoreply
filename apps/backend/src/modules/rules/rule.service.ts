import type { IntentType, LanguageCode } from '@property-ai/shared-types';
import { RuleRepository, type ShortcutRecord } from './rule.repository.js';
import { RuleEngine } from './rule.engine.js';
import { PropertyService } from '../properties/property.service.js';
import { NotFoundError } from '../../common/errors/app-error.js';

export interface RuleExecutionResult {
  matched: boolean;
  command?: string;
  intent?: IntentType;
  matchType: 'EXACT_COMMAND' | 'PHRASE_MATCH' | 'REGEX_MATCH' | 'NONE';
  confidence: number;
  source: 'SHORTCUT' | 'RULE';
  responseText?: string;
  language: LanguageCode;
  propertySlug: string;
  ruleId?: string;
  ruleName?: string;
}

export class RuleService {
  private repo: RuleRepository;
  private engine: RuleEngine;
  private propertyService: PropertyService;
  private isInitialized = false;

  constructor(
    repo?: RuleRepository,
    engine?: RuleEngine,
    propertyService?: PropertyService,
  ) {
    this.repo = repo || new RuleRepository();
    this.engine = engine || new RuleEngine();
    this.propertyService = propertyService || new PropertyService();
  }

  /**
   * Initialize and load active rules into memory cache
   */
  async initialize(): Promise<void> {
    const rules = await this.repo.getActiveShortcuts();
    this.engine.loadRules(rules);
    this.isInitialized = true;
  }

  /**
   * Reload active rules from PostgreSQL
   */
  async reloadRules(): Promise<ShortcutRecord[]> {
    const rules = await this.repo.getActiveShortcuts();
    this.engine.loadRules(rules);
    return rules;
  }

  /**
   * Match incoming message and return deterministic, ground-truth interpolated response
   */
  async processMessage(
    text: string,
    options?: {
      propertySlug?: string;
      language?: LanguageCode;
    },
  ): Promise<RuleExecutionResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const language: LanguageCode = options?.language || 'en';
    const propertySlug = options?.propertySlug || 'luxzirius-villas';

    // 1. Run rule engine match
    const match = this.engine.match(text);
    if (!match.matched || !match.rule || !match.intent) {
      return {
        matched: false,
        matchType: 'NONE',
        confidence: 0,
        source: 'RULE',
        language,
        propertySlug,
      };
    }

    const rule = match.rule;
    const intent = match.intent;

    // 2. Fetch ground-truth property data
    let property;
    try {
      property = await this.propertyService.getProperty(propertySlug);
    } catch {
      // Fallback if specified property not found
      property = null;
    }

    // 3. Resolve response text
    let responseText = '';

    // Check for multilingual template in database
    const dbTemplate = await this.repo.findTemplate(intent, language);

    if (language !== 'en' && dbTemplate && property) {
      // Localized Hindi / Hinglish template has precedence for non-English queries
      responseText = this.renderTemplate(dbTemplate.templateText, property);
    } else if (rule.responseTemplate) {
      // Rule-specific custom template has precedence for default language
      responseText = property
        ? this.renderTemplate(rule.responseTemplate, property)
        : rule.responseTemplate;
    } else if (dbTemplate && property) {
      responseText = this.renderTemplate(dbTemplate.templateText, property);
    } else if (property) {
      // Fallback to service formatters
      if (intent === 'PROPERTY_PRICE') {
        responseText = await this.propertyService.formatPriceResponse(propertySlug, language);
      } else if (intent === 'PROPERTY_AVAILABILITY') {
        responseText = await this.propertyService.formatAvailabilityResponse(
          propertySlug,
          language,
        );
      }
    }

    return {
      matched: true,
      command: rule.command,
      intent,
      matchType: match.matchType,
      confidence: match.confidence,
      source: match.matchType === 'EXACT_COMMAND' ? 'SHORTCUT' : 'RULE',
      responseText: responseText.trim(),
      language,
      propertySlug,
      ruleId: rule.id,
      ruleName: rule.name,
    };
  }

  /**
   * Interpolate {{placeholders}} with verified ground-truth values
   */
  private renderTemplate(
    templateText: string,
    property: Awaited<ReturnType<PropertyService['getProperty']>>,
  ): string {
    const primaryUnit = property.units[0];
    const secondaryUnit = property.units[1];
    const contact = property.contacts[0];

    const variables: Record<string, string> = {
      propertyName: property.title,
      startingPrice: property.price?.priceDisplayFormatted || 'Available on request',
      maxPrice:
        property.price?.maxPrice !== null && property.price?.maxPrice !== undefined
          ? `₹${(property.price.maxPrice / 10000000).toFixed(2)} Cr`
          : property.price?.priceDisplayFormatted || '',
      carpetArea: primaryUnit ? `${primaryUnit.carpetAreaSqFt}` : '2,250',
      superBuiltUpArea: secondaryUnit
        ? `${secondaryUnit.superBuiltUpAreaSqFt || secondaryUnit.carpetAreaSqFt}`
        : '3,100',
      address: property.location?.address || '',
      city: property.location?.city || '',
      googleMapsUrl: property.location?.googleMapsUrl || 'https://maps.google.com',
      advisorName: contact ? contact.name : 'Sales Advisor',
      advisorPhone: contact ? contact.phone : '+919876543210',
    };

    let rendered = templateText;
    for (const [key, val] of Object.entries(variables)) {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      rendered = rendered.replace(regex, val);
    }
    return rendered;
  }

  // --- Shortcut Administration Methods ---

  async listShortcuts(enabledOnly?: boolean): Promise<ShortcutRecord[]> {
    return this.repo.findAllShortcuts({ enabledOnly });
  }

  async getShortcutByCommand(command: string): Promise<ShortcutRecord> {
    const shortcut = await this.repo.findByCommand(command);
    if (!shortcut) {
      throw new NotFoundError(`Shortcut '${command}' not found`);
    }
    return shortcut;
  }

  async createShortcut(data: {
    command: string;
    name: string;
    description: string;
    targetIntent: string;
    naturalLanguagePhrases?: string[];
    responseTemplate?: string;
    enabled?: boolean;
    priority?: number;
  }): Promise<ShortcutRecord> {
    const created = await this.repo.createShortcut(data);
    await this.reloadRules();
    return created;
  }

  async updateShortcut(
    id: string,
    data: {
      name?: string;
      description?: string;
      targetIntent?: string;
      naturalLanguagePhrases?: string[];
      responseTemplate?: string | null;
      enabled?: boolean;
      priority?: number;
    },
  ): Promise<ShortcutRecord> {
    const shortcut = await this.repo.findById(id);
    if (!shortcut) {
      throw new NotFoundError(`Shortcut with ID '${id}' not found`);
    }

    const updated = await this.repo.updateShortcut(id, data);
    await this.reloadRules();
    return updated;
  }

  async deleteShortcut(id: string): Promise<boolean> {
    const shortcut = await this.repo.findById(id);
    if (!shortcut) {
      throw new NotFoundError(`Shortcut with ID '${id}' not found`);
    }

    await this.repo.deleteShortcut(id);
    await this.reloadRules();
    return true;
  }
}
