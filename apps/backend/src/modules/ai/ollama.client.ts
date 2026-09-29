import { config, logger } from '../../config/index.js';
import { AppError, ServiceUnavailableError, ValidationError } from '../../common/errors/app-error.js';
import type { z } from 'zod';

export interface OllamaGenerateOptions {
  model?: string;
  prompt: string;
  system?: string;
  format?: 'json';
  temperature?: number;
  timeoutMs?: number;
}

export interface OllamaGenerateResponse {
  response: string;
  model: string;
  done: boolean;
  totalDurationMs?: number;
}

export interface OllamaHealthStatus {
  status: 'ok' | 'down';
  latencyMs: number;
  models: string[];
}

export class OllamaClient {
  private baseUrl: string;
  private defaultModel: string;
  private timeoutMs: number;
  private cachedModels: string[] | null = null;
  private lastModelFetchTime = 0;

  constructor(options?: {
    baseUrl?: string;
    defaultModel?: string;
    timeoutMs?: number;
  }) {
    this.baseUrl = (options?.baseUrl || config.OLLAMA_BASE_URL).replace(/\/$/, '');
    this.defaultModel = options?.defaultModel || config.OLLAMA_MODEL;
    this.timeoutMs = options?.timeoutMs || config.OLLAMA_TIMEOUT_MS;
  }

  /**
   * Check Ollama connectivity and retrieve loaded models
   */
  async checkHealth(): Promise<OllamaHealthStatus> {
    const start = Date.now();
    try {
      const models = await this.listModels(true);
      return {
        status: 'ok',
        latencyMs: Date.now() - start,
        models,
      };
    } catch {
      return {
        status: 'down',
        latencyMs: Date.now() - start,
        models: [],
      };
    }
  }

  /**
   * List available models in the local Ollama instance
   */
  async listModels(forceRefresh = false): Promise<string[]> {
    const now = Date.now();
    // Cache model list for 30 seconds
    if (!forceRefresh && this.cachedModels && now - this.lastModelFetchTime < 30000) {
      return this.cachedModels;
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(this.timeoutMs),
      });

      if (!response.ok) {
        throw new ServiceUnavailableError(`Ollama server returned HTTP ${response.status}`);
      }

      const data = (await response.json()) as { models?: Array<{ name: string; model: string }> };
      const models = data.models ? data.models.map((m) => m.name || m.model) : [];
      this.cachedModels = models;
      this.lastModelFetchTime = now;
      return models;
    } catch (err) {
      logger.warn({ err }, 'Failed to query Ollama /api/tags');
      throw new ServiceUnavailableError('Ollama service unreachable');
    }
  }

  /**
   * Resolve best matching model, falling back to installed models if configured model is missing
   */
  async resolveModel(requestedModel?: string): Promise<string> {
    if (requestedModel) return requestedModel;

    try {
      const available = await this.listModels();
      if (available.includes(this.defaultModel)) {
        return this.defaultModel;
      }

      // Check if standard fallbacks exist
      const fallbacks = ['qwen2.5:latest', 'qwen2.5:1.5b', 'qwen2.5:7b', 'llama3.2:latest'];
      for (const fb of fallbacks) {
        if (available.includes(fb)) {
          return fb;
        }
      }

      // If available has any models, use the first one
      if (available.length > 0) {
        return available[0];
      }
    } catch {
      // If listing fails, return defaultModel
    }

    return this.defaultModel;
  }

  /**
   * Execute raw generation request against Ollama with retries
   */
  async generate(options: OllamaGenerateOptions): Promise<OllamaGenerateResponse> {
    const model = await this.resolveModel(options.model);
    const timeout = options.timeoutMs || this.timeoutMs;

    const payload: Record<string, unknown> = {
      model,
      prompt: options.prompt,
      stream: false,
      options: {
        temperature: options.temperature ?? 0.2,
      },
    };

    if (options.system) {
      payload.system = options.system;
    }

    if (options.format) {
      payload.format = options.format;
    }

    let lastError: Error | null = null;
    const maxRetries = 2;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(`${this.baseUrl}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(timeout),
        });

        if (!response.ok) {
          const errorText = await response.text().catch(() => '');
          throw new AppError(
            `Ollama generation failed with HTTP ${response.status}: ${errorText}`,
            response.status === 404 ? 404 : 502,
          );
        }

        const data = (await response.json()) as {
          response: string;
          model: string;
          done: boolean;
          total_duration?: number;
        };

        return {
          response: data.response || '',
          model: data.model || model,
          done: data.done,
          totalDurationMs: data.total_duration ? Math.round(data.total_duration / 1000000) : undefined,
        };
      } catch (err: unknown) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempt < maxRetries) {
          logger.warn(
            { attempt, err: lastError.message },
            'Ollama generation call failed; retrying...',
          );
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }
    }

    logger.error({ err: lastError }, 'Ollama generate failed after retries');
    throw new ServiceUnavailableError(
      `Ollama LLM generation failed: ${lastError?.message || 'unknown error'}`,
    );
  }

  /**
   * Execute generation and enforce structured JSON response conforming to a Zod schema
   */
  async generateStructuredJson<T>(options: {
    model?: string;
    prompt: string;
    system?: string;
    schema: z.ZodType<T, z.ZodTypeDef, unknown>;
    temperature?: number;
    timeoutMs?: number;
  }): Promise<T> {
    const rawResult = await this.generate({
      model: options.model,
      prompt: options.prompt,
      system: options.system,
      format: 'json',
      temperature: options.temperature ?? 0.1,
      timeoutMs: options.timeoutMs,
    });

    let rawText = rawResult.response.trim();

    // Strip markdown json fences if model wrapped response in ```json ... ```
    if (rawText.startsWith('```json')) {
      rawText = rawText.replace(/^```json\s*/, '').replace(/```$/, '').trim();
    } else if (rawText.startsWith('```')) {
      rawText = rawText.replace(/^```\s*/, '').replace(/```$/, '').trim();
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      logger.error({ rawResponse: rawText }, 'Failed to parse JSON response from Ollama');
      throw new ValidationError('Ollama returned invalid JSON', { raw: rawText });
    }

    const validationResult = options.schema.safeParse(parsed);
    if (!validationResult.success) {
      logger.error(
        { errors: validationResult.error.errors, parsed },
        'Ollama JSON response failed schema validation',
      );
      throw new ValidationError('Ollama JSON failed schema validation', {
        errors: validationResult.error.errors,
        received: parsed,
      });
    }

    return validationResult.data;
  }
}
