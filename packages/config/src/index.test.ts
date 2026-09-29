import { describe, it, expect } from 'vitest';
import { loadEnv, EnvSchema, APP_CONSTANTS } from './index.js';

describe('Config Package', () => {
  it('should load default environment values correctly', () => {
    const config = loadEnv({});
    expect(config.NODE_ENV).toBe('development');
    expect(config.PORT).toBe(3000);
    expect(config.AUTO_SEND).toBe(false);
    expect(config.OLLAMA_MODEL).toBe('qwen2.5:1.5b');
    expect(config.AI_CONFIDENCE_THRESHOLD).toBe(0.85);
  });

  it('should parse AUTO_SEND="true" as boolean true', () => {
    const parsed = EnvSchema.parse({
      AUTO_SEND: 'true',
    });
    expect(parsed.AUTO_SEND).toBe(true);
  });

  it('should reject invalid PORT values', () => {
    const result = EnvSchema.safeParse({
      PORT: 'not-a-number',
    });
    expect(result.success).toBe(false);
  });

  it('should have correct app constants', () => {
    expect(APP_CONSTANTS.SUPPORTED_LANGUAGES).toEqual(['en', 'hi', 'hinglish']);
    expect(APP_CONSTANTS.SAFEGUARDS.AUTO_SEND_DEFAULT).toBe(false);
    expect(APP_CONSTANTS.SAFEGUARDS.FAIL_CLOSED).toBe(true);
  });
});
