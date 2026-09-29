import { describe, it, expect } from 'vitest';
import { RuleEngine } from './rule.engine.js';
import type { ShortcutRecord } from './rule.repository.js';

describe('RuleEngine', () => {
  const sampleRules: ShortcutRecord[] = [
    {
      id: 'rule-price',
      command: '/price',
      name: 'Property Pricing',
      description: 'Provides starting price and breakdown',
      targetIntent: 'PROPERTY_PRICE',
      naturalLanguagePhrases: [
        'price kya hai',
        'villa kitne ka hai',
        'what is the price',
        'cost of villa',
        'kitna rate hai',
      ],
      responseTemplate: 'Luxzirius Villas starting price is ₹1.75 Cr.',
      enabled: true,
      priority: 10,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'rule-area',
      command: '/area',
      name: 'Property Area',
      description: 'Provides carpet area and built-up area',
      targetIntent: 'PROPERTY_AREA',
      naturalLanguagePhrases: [
        'villa ka area kitna hai',
        'area kitna hai',
        'carpet area kya hai',
        'what is the area',
      ],
      responseTemplate: 'Luxzirius Villas 3BHK: 2,250 sq.ft carpet.',
      enabled: true,
      priority: 20,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'rule-location',
      command: '/location',
      name: 'Project Location',
      description: 'Provides address and connectivity',
      targetIntent: 'PROPERTY_LOCATION',
      naturalLanguagePhrases: [
        'where is the project located',
        'location kaha hai',
        'project location',
        'address kya hai',
      ],
      responseTemplate: 'Located at Lakeview Road, Tech Corridor, Bengaluru.',
      enabled: true,
      priority: 30,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'rule-disabled',
      command: '/disabled',
      name: 'Disabled Rule',
      description: 'Should never match',
      targetIntent: 'UNKNOWN',
      naturalLanguagePhrases: ['disabled phrase'],
      responseTemplate: null,
      enabled: false,
      priority: 5,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const engine = new RuleEngine(sampleRules);

  it('should match exact command /price with 1.0 confidence', () => {
    const result = engine.match('/price');
    expect(result.matched).toBe(true);
    expect(result.matchType).toBe('EXACT_COMMAND');
    expect(result.intent).toBe('PROPERTY_PRICE');
    expect(result.confidence).toBe(1.0);
    expect(result.rule?.id).toBe('rule-price');
  });

  it('should match command case-insensitively with arguments', () => {
    const result = engine.match('/PRICE 3bhk luxury');
    expect(result.matched).toBe(true);
    expect(result.matchType).toBe('EXACT_COMMAND');
    expect(result.intent).toBe('PROPERTY_PRICE');
  });

  it('should match natural language phrases with 0.95 confidence', () => {
    const match1 = engine.match('hello, villa kitne ka hai?');
    expect(match1.matched).toBe(true);
    expect(match1.matchType).toBe('PHRASE_MATCH');
    expect(match1.intent).toBe('PROPERTY_PRICE');
    expect(match1.confidence).toBe(0.95);

    const match2 = engine.match('carpet area kya hai please batao');
    expect(match2.matched).toBe(true);
    expect(match2.matchType).toBe('PHRASE_MATCH');
    expect(match2.intent).toBe('PROPERTY_AREA');

    const match3 = engine.match('can you tell me where is the project located near metro?');
    expect(match3.matched).toBe(true);
    expect(match3.matchType).toBe('PHRASE_MATCH');
    expect(match3.intent).toBe('PROPERTY_LOCATION');
  });

  it('should NOT match disabled rules', () => {
    const cmdResult = engine.match('/disabled');
    expect(cmdResult.matched).toBe(false);

    const phraseResult = engine.match('disabled phrase here');
    expect(phraseResult.matched).toBe(false);
  });

  it('should return matched: false for unmatched text or blank input', () => {
    expect(engine.match('what is the weather today in Bengaluru?').matched).toBe(false);
    expect(engine.match('').matched).toBe(false);
    expect(engine.match('   ').matched).toBe(false);
    expect(engine.match('/nonexistent').matched).toBe(false);
  });

  it('should respect priority ordering when multiple phrases could overlap', () => {
    const competingRules: ShortcutRecord[] = [
      {
        id: 'low-priority',
        command: '/low',
        name: 'Low Priority',
        description: 'Lower priority',
        targetIntent: 'PROPERTY_AREA',
        naturalLanguagePhrases: ['pricing and area details'],
        responseTemplate: 'Area details',
        enabled: true,
        priority: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'high-priority',
        command: '/high',
        name: 'High Priority',
        description: 'Higher priority',
        targetIntent: 'PROPERTY_PRICE',
        naturalLanguagePhrases: ['pricing and area details'],
        responseTemplate: 'Price details',
        enabled: true,
        priority: 10,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const orderedEngine = new RuleEngine(competingRules);
    const result = orderedEngine.match('pricing and area details');
    expect(result.matched).toBe(true);
    expect(result.rule?.id).toBe('high-priority');
    expect(result.intent).toBe('PROPERTY_PRICE');
  });
});
