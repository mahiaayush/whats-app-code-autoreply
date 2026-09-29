import { z } from 'zod';

export const EnvSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().default('0.0.0.0'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  // Database
  DATABASE_URL: z
    .string()
    .url()
    .default('postgresql://postgres:postgres@localhost:5432/whatsapp_ai?schema=public'),
  POSTGRES_MAX_CONNECTIONS: z.coerce.number().int().positive().default(20),

  // Redis
  REDIS_URL: z.string().url().default('redis://localhost:6379'),
  REDIS_MAX_MEMORY: z.string().default('256mb'),

  // Ollama
  OLLAMA_BASE_URL: z.string().url().default('http://localhost:11434'),
  OLLAMA_MODEL: z.string().default('qwen2.5:1.5b'),
  OLLAMA_TIMEOUT_MS: z.coerce.number().int().positive().default(45000),

  // Authentication & Security
  JWT_SECRET: z
    .string()
    .min(16, 'JWT secret must be at least 16 characters')
    .default('dev-jwt-super-secret-key-32-characters-long!'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  EXTENSION_API_KEY: z.string().min(8).default('ext_dev_secret_key_12345'),
  ADMIN_API_KEY: z.string().min(8).default('admin_dev_secret_key_67890'),

  // Operational Safeguards
  AUTO_SEND: z
    .string()
    .transform((val) => val === 'true')
    .or(z.boolean())
    .default(false),
  AI_CONFIDENCE_THRESHOLD: z.coerce.number().min(0).max(1).default(0.85),

  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:5173,chrome-extension://*'),
});

export type EnvConfig = z.infer<typeof EnvSchema>;

export function loadEnv(envInput: Record<string, string | undefined> = process.env): EnvConfig {
  const result = EnvSchema.safeParse(envInput);
  if (!result.success) {
    const errorDetails = result.error.errors
      .map((err) => `  - ${err.path.join('.')}: ${err.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${errorDetails}`);
  }
  return result.data;
}
