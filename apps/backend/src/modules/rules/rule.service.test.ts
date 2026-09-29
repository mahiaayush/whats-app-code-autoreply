import { describe, it, expect, afterAll, beforeAll } from 'vitest';
import { RuleService } from './rule.service.js';
import { closePrismaClient, getPrismaClient } from '../../database/prisma.client.js';

describe('RuleService Integration', () => {
  const service = new RuleService();
  const prisma = getPrismaClient();

  beforeAll(async () => {
    await prisma.shortcut.deleteMany({
      where: { command: { startsWith: '/promo-' } },
    });
    await service.initialize();
  });

  afterAll(async () => {
    await prisma.shortcut.deleteMany({
      where: { command: { startsWith: '/promo-' } },
    });
    await closePrismaClient();
  });

  it('should process exact /price command with ground truth interpolation', async () => {
    const result = await service.processMessage('/price', {
      propertySlug: 'luxzirius-villas',
      language: 'en',
    });

    expect(result.matched).toBe(true);
    expect(result.matchType).toBe('EXACT_COMMAND');
    expect(result.intent).toBe('PROPERTY_PRICE');
    expect(result.confidence).toBe(1.0);
    expect(result.source).toBe('SHORTCUT');
    expect(result.responseText).toContain('Luxzirius Villas');
    expect(result.responseText).toContain('₹1.75 Cr');
  });

  it('should process natural language query in Hinglish with template interpolation', async () => {
    const result = await service.processMessage('villa kitne ka hai', {
      propertySlug: 'luxzirius-villas',
      language: 'hinglish',
    });

    expect(result.matched).toBe(true);
    expect(result.matchType).toBe('PHRASE_MATCH');
    expect(result.intent).toBe('PROPERTY_PRICE');
    expect(result.confidence).toBe(0.95);
    expect(result.source).toBe('RULE');
    expect(result.language).toBe('hinglish');
    expect(result.responseText).toContain('Namaste! Luxzirius Villas ki starting price ₹1.75 Cr');
  });

  it('should process natural language query in Hindi with template interpolation', async () => {
    const result = await service.processMessage('price kya hai', {
      propertySlug: 'luxzirius-villas',
      language: 'hi',
    });

    expect(result.matched).toBe(true);
    expect(result.language).toBe('hi');
    expect(result.responseText).toContain('Luxzirius Villas में 3BHK विला की शुरुआती कीमत ₹1.75 Cr');
  });

  it('should process /location command with address and landmarks', async () => {
    const result = await service.processMessage('/location', {
      propertySlug: 'luxzirius-villas',
      language: 'en',
    });

    expect(result.matched).toBe(true);
    expect(result.intent).toBe('PROPERTY_LOCATION');
    expect(result.responseText).toContain('Lakeview Road');
  });

  it('should process /area command with unit sizes', async () => {
    const result = await service.processMessage('/area', {
      propertySlug: 'luxzirius-villas',
      language: 'en',
    });

    expect(result.matched).toBe(true);
    expect(result.intent).toBe('PROPERTY_AREA');
    expect(result.responseText).toContain('2,250 sq.ft');
  });

  it('should return matched: false for unrelated queries', async () => {
    const result = await service.processMessage('what is the capital of France?');
    expect(result.matched).toBe(false);
    expect(result.matchType).toBe('NONE');
    expect(result.confidence).toBe(0);
  });

  it('should support dynamic shortcut creation, matching, update, and deletion', async () => {
    const customCommand = `/promo-${Date.now()}`;
    const uniquePhrase = `festive-promo-offer-${Date.now()}`;
    const created = await service.createShortcut({
      command: customCommand,
      name: 'Festive Promo',
      description: 'Special festive promotion response',
      targetIntent: 'PROPERTY_PRICE',
      naturalLanguagePhrases: [uniquePhrase],
      responseTemplate: 'Exclusive festive package available for {{propertyName}}!',
      enabled: true,
      priority: 5,
    });

    expect(created.id).toBeDefined();
    expect(created.command).toBe(customCommand);

    // Verify dynamic matching in engine
    const testMatch = await service.processMessage(`hey ${uniquePhrase} please`, {
      propertySlug: 'luxzirius-villas',
    });
    expect(testMatch.matched).toBe(true);
    expect(testMatch.ruleId).toBe(created.id);
    expect(testMatch.responseText).toContain('Exclusive festive package');

    // Update shortcut
    const updated = await service.updateShortcut(created.id, {
      enabled: false,
    });
    expect(updated.enabled).toBe(false);

    // Verify it no longer matches
    const disabledMatch = await service.processMessage(customCommand);
    expect(disabledMatch.matched).toBe(false);

    // Clean up
    const deleted = await service.deleteShortcut(created.id);
    expect(deleted).toBe(true);
  });
});
