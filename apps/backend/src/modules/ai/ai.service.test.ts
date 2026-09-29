import { describe, it, expect, afterAll } from 'vitest';
import { AiService } from './ai.service.js';
import { closePrismaClient } from '../../database/prisma.client.js';

describe('AiService Integration & Safety Guardrails', () => {
  const service = new AiService();

  afterAll(async () => {
    await closePrismaClient();
  });

  describe('Language Detection', () => {
    it('should detect Hindi from Devanagari script', async () => {
      const lang = await service.detectLanguage('नमस्ते विला की क्या कीमत है?');
      expect(lang).toBe('hi');
    });

    it('should detect Hinglish from common marker vocabulary', async () => {
      const lang = await service.detectLanguage('price kitna hai bhai villa ka');
      expect(lang).toBe('hinglish');
    });

    it('should detect English for standard Latin inquiries', async () => {
      const lang = await service.detectLanguage('What is the starting price for Luxzirius Villas?');
      expect(lang).toBe('en');
    });
  });

  describe('Pre-LLM Safety Guardrails & Mandatory Escalations', () => {
    it('should immediately force HUMAN_REQUIRED on price negotiation or discount requests', async () => {
      const result = await service.classifyMessage('bhai final price batao discount kitna doge');
      expect(result.intent).toBe('HUMAN_REQUIRED');
      expect(result.requiresHuman).toBe(true);
      expect(result.confidence).toBe(1.0);
      expect(result.reasoning).toContain('negotiation');
    });

    it('should immediately force HUMAN_REQUIRED on legal or dispute inquiries', async () => {
      const result = await service.classifyMessage('is there any rera case or court litigation on this property?');
      expect(result.intent).toBe('HUMAN_REQUIRED');
      expect(result.requiresHuman).toBe(true);
      expect(result.confidence).toBe(1.0);
      expect(result.reasoning).toContain('Legal');
    });

    it('should immediately force HUMAN_REQUIRED on explicit human manager requests', async () => {
      const result = await service.classifyMessage('real person ya manager se baat karao');
      expect(result.intent).toBe('HUMAN_REQUIRED');
      expect(result.requiresHuman).toBe(true);
      expect(result.confidence).toBe(1.0);
    });
  });

  describe('Grounded Response Generation', () => {
    it('should generate grounded response using PostgreSQL facts', async () => {
      const result = await service.generateResponse({
        customerQuery: 'What is the starting price for Luxzirius Villas?',
        intent: 'PROPERTY_PRICE',
        language: 'en',
        propertySlug: 'luxzirius-villas',
      });

      expect(typeof result.response).toBe('string');
      expect(result.response.length).toBeGreaterThan(0);
      expect(result.language).toBe('en');
      expect(Array.isArray(result.groundedFactsUsed)).toBe(true);
    });
  });

  describe('Full Chat Pipeline', () => {
    it('should escalate negotiation inquiries without calling LLM response generator', async () => {
      const result = await service.executeChatPipeline({
        message: 'best offer do discount chahiye',
        propertySlug: 'luxzirius-villas',
        language: 'hinglish',
      });

      expect(result.requiresHuman).toBe(true);
      expect(result.source).toBe('HUMAN_FALLBACK');
      expect(result.intent).toBe('HUMAN_REQUIRED');
      expect(result.content).toContain('senior property advisor');
    });

    it('should return grounded response for standard property price inquiry', async () => {
      const result = await service.executeChatPipeline({
        message: 'Luxzirius Villas starting price kya hai?',
        propertySlug: 'luxzirius-villas',
      });

      expect(result.requiresHuman).toBe(false);
      expect(result.intent).toBe('PROPERTY_PRICE');
      expect(typeof result.content).toBe('string');
    }, 120000);
  });
});
