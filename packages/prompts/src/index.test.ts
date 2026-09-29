import { describe, it, expect } from 'vitest';
import {
  buildLanguageDetectionPrompt,
  buildIntentClassificationPrompt,
  buildPropertyExtractionPrompt,
  buildResponseGenerationPrompt,
  buildEscalationDetectionPrompt,
} from './index.js';

describe('Prompts Package', () => {
  it('should build a valid language detection prompt', () => {
    const { systemPrompt, userPrompt } = buildLanguageDetectionPrompt({
      messageText: 'villa ka price kitna hai bhai?',
    });
    expect(systemPrompt).toContain('hinglish');
    expect(userPrompt).toContain('villa ka price kitna hai bhai?');
  });

  it('should build intent classification prompt with property slug and recent context', () => {
    const { systemPrompt, userPrompt } = buildIntentClassificationPrompt({
      messageText: 'price kya hai?',
      activePropertySlug: 'luxzirius-villas',
      recentMessagesSnippet: 'Customer: Hello\nAI: Namaste! How can I help?',
    });
    expect(systemPrompt).toContain('PROPERTY_PRICE');
    expect(systemPrompt).toContain('HUMAN_REQUIRED');
    expect(userPrompt).toContain('luxzirius-villas');
  });

  it('should build property extraction prompt with known properties catalog', () => {
    const { systemPrompt, userPrompt } = buildPropertyExtractionPrompt({
      messageText: 'Tell me about Luxzirius project',
      knownProperties: [
        { slug: 'luxzirius-villas', title: 'Luxzirius Villas' },
        { slug: 'skyline-heights', title: 'Skyline Heights' },
      ],
    });
    expect(systemPrompt).toContain('Luxzirius Villas');
    expect(systemPrompt).toContain('skyline-heights');
    expect(userPrompt).toContain('Tell me about Luxzirius project');
  });

  it('should build response generation prompt enforcing grounded facts and no hallucination', () => {
    const { systemPrompt, userPrompt } = buildResponseGenerationPrompt({
      language: 'hinglish',
      intent: 'PROPERTY_PRICE',
      customerQuery: 'villa kitne ka hai?',
      verifiedPropertyFacts: {
        title: 'Luxzirius Villas',
        startingPrice: '₹1.50 Cr',
      },
    });
    expect(systemPrompt).toContain('GROUND TRUTH ONLY');
    expect(systemPrompt).toContain('Hinglish');
    expect(userPrompt).toContain('₹1.50 Cr');
  });

  it('should build escalation detection prompt highlighting negotiation and legal conditions', () => {
    const { systemPrompt, userPrompt } = buildEscalationDetectionPrompt({
      messageText: 'Bhai discount kitna doge final price batao?',
    });
    expect(systemPrompt).toContain('NEGOTIATION / DISCOUNT');
    expect(systemPrompt).toContain('LEGAL / REGISTRY');
    expect(userPrompt).toContain('discount kitna doge');
  });
});
