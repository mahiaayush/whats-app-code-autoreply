import net from 'node:net';
import { config } from '../../config/index.js';
import { checkRedisHealth } from '../../database/redis.client.js';

export interface HealthStatus {
  status: 'ok' | 'error' | 'degraded';
  service: string;
  version: string;
  uptimeSeconds: number;
  timestamp: string;
  environment: string;
  memory: {
    heapUsedMb: number;
    heapTotalMb: number;
    rssMb: number;
  };
}

export interface DependencyStatus {
  status: 'ok' | 'error' | 'unreachable';
  latencyMs?: number;
  error?: string;
  details?: Record<string, unknown>;
}

export interface ReadinessStatus {
  status: 'ok' | 'degraded' | 'error';
  service: string;
  timestamp: string;
  dependencies: {
    redis: DependencyStatus;
    postgres: DependencyStatus;
    ollama: DependencyStatus;
  };
}

export interface OllamaHealthStatus {
  status: 'ok' | 'error';
  service: string;
  baseUrl: string;
  configuredModel: string;
  modelInstalled: boolean;
  installedModels: string[];
  latencyMs?: number;
  error?: string;
  timestamp: string;
}

export class HealthService {
  public getHealth(): HealthStatus {
    const memory = process.memoryUsage();

    return {
      status: 'ok',
      service: 'backend',
      version: '0.1.0',
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      environment: config.NODE_ENV,
      memory: {
        heapUsedMb: Math.round(memory.heapUsed / 1024 / 1024),
        heapTotalMb: Math.round(memory.heapTotal / 1024 / 1024),
        rssMb: Math.round(memory.rss / 1024 / 1024),
      },
    };
  }

  public async getReadiness(): Promise<ReadinessStatus> {
    const [redisResult, postgresResult, ollamaResult] = await Promise.all([
      checkRedisHealth(),
      this.checkPostgresTcp(),
      this.checkOllamaHttp(),
    ]);

    const allOk =
      redisResult.status === 'ok' && postgresResult.status === 'ok' && ollamaResult.status === 'ok';

    const anyOk =
      redisResult.status === 'ok' || postgresResult.status === 'ok' || ollamaResult.status === 'ok';

    return {
      status: allOk ? 'ok' : anyOk ? 'degraded' : 'error',
      service: 'backend',
      timestamp: new Date().toISOString(),
      dependencies: {
        redis: redisResult,
        postgres: postgresResult,
        ollama: ollamaResult,
      },
    };
  }

  public async getOllamaHealth(): Promise<OllamaHealthStatus> {
    const startTime = Date.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const res = await fetch(`${config.OLLAMA_BASE_URL}/api/tags`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const latencyMs = Date.now() - startTime;

      if (!res.ok) {
        return {
          status: 'error',
          service: 'ollama',
          baseUrl: config.OLLAMA_BASE_URL,
          configuredModel: config.OLLAMA_MODEL,
          modelInstalled: false,
          installedModels: [],
          latencyMs,
          error: `Ollama returned HTTP ${res.status}: ${res.statusText}`,
          timestamp: new Date().toISOString(),
        };
      }

      const body = (await res.json()) as { models?: Array<{ name: string }> };
      const installedModels = (body.models || []).map((m) => m.name);
      const modelInstalled = installedModels.some(
        (m) => m === config.OLLAMA_MODEL || m.startsWith(`${config.OLLAMA_MODEL}:`),
      );

      return {
        status: 'ok',
        service: 'ollama',
        baseUrl: config.OLLAMA_BASE_URL,
        configuredModel: config.OLLAMA_MODEL,
        modelInstalled,
        installedModels,
        latencyMs,
        timestamp: new Date().toISOString(),
      };
    } catch (err) {
      return {
        status: 'error',
        service: 'ollama',
        baseUrl: config.OLLAMA_BASE_URL,
        configuredModel: config.OLLAMA_MODEL,
        modelInstalled: false,
        installedModels: [],
        latencyMs: Date.now() - startTime,
        error: err instanceof Error ? err.message : 'Failed to connect to Ollama',
        timestamp: new Date().toISOString(),
      };
    }
  }

  private async checkPostgresTcp(): Promise<DependencyStatus> {
    const startTime = Date.now();
    return new Promise((resolve) => {
      try {
        const url = new URL(config.DATABASE_URL);
        const host = url.hostname;
        const port = Number(url.port) || 5432;

        const socket = new net.Socket();
        socket.setTimeout(2500);

        socket.on('connect', () => {
          const latencyMs = Date.now() - startTime;
          socket.destroy();
          resolve({ status: 'ok', latencyMs });
        });

        socket.on('timeout', () => {
          socket.destroy();
          resolve({ status: 'unreachable', error: 'TCP connection timed out' });
        });

        socket.on('error', (err) => {
          socket.destroy();
          resolve({ status: 'error', error: err.message });
        });

        socket.connect(port, host);
      } catch (err) {
        resolve({
          status: 'error',
          error: err instanceof Error ? err.message : 'Invalid database configuration URL',
        });
      }
    });
  }

  private async checkOllamaHttp(): Promise<DependencyStatus> {
    const startTime = Date.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      const res = await fetch(`${config.OLLAMA_BASE_URL}/api/tags`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const latencyMs = Date.now() - startTime;
      if (res.ok) {
        return { status: 'ok', latencyMs };
      }
      return { status: 'error', latencyMs, error: `HTTP ${res.status}` };
    } catch (err) {
      return {
        status: 'unreachable',
        latencyMs: Date.now() - startTime,
        error: err instanceof Error ? err.message : 'Failed to reach Ollama',
      };
    }
  }
}
