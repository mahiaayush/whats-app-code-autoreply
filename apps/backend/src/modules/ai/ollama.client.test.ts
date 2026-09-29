import { describe, it, expect } from 'vitest';
import { OllamaClient } from './ollama.client.js';
import { z } from 'zod';

describe('OllamaClient Integration & Unit Tests', () => {
  const client = new OllamaClient();

  it('should check Ollama health and report status', async () => {
    const health = await client.checkHealth();
    expect(health.status).toBe('ok');
    expect(typeof health.latencyMs).toBe('number');
    expect(Array.isArray(health.models)).toBe(true);
  });

  it('should list available local models', async () => {
    const models = await client.listModels();
    expect(Array.isArray(models)).toBe(true);
    expect(models.length).toBeGreaterThanOrEqual(1);
  });

  it('should resolve best matching model with fallback', async () => {
    const resolved = await client.resolveModel();
    expect(typeof resolved).toBe('string');
    expect(resolved.length).toBeGreaterThan(0);

    const explicit = await client.resolveModel('custom-model-test');
    expect(explicit).toBe('custom-model-test');
  });

  it('should execute raw generation against local Ollama model', async () => {
    const result = await client.generate({
      prompt: 'Reply with the single word "VERIFIED".',
      temperature: 0.1,
    });

    expect(result.done).toBe(true);
    expect(typeof result.response).toBe('string');
    expect(result.response.trim().length).toBeGreaterThan(0);
  });

  it('should generate and validate structured JSON output with Zod schema', async () => {
    const TestSchema = z.object({
      greeting: z.string(),
      code: z.number(),
    });

    const result = await client.generateStructuredJson({
      prompt: 'Output JSON with greeting="Hello" and code=100.',
      system: 'Respond strictly in JSON: {"greeting": string, "code": number}',
      schema: TestSchema,
    });

    expect(result.greeting).toBeDefined();
    expect(typeof result.code).toBe('number');
  }, 60000);
});
