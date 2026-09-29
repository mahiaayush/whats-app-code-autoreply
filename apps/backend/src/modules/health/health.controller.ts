import type { FastifyReply, FastifyRequest } from 'fastify';
import { HealthService } from './health.service.js';

export class HealthController {
  private healthService: HealthService;

  constructor(healthService = new HealthService()) {
    this.healthService = healthService;
  }

  public getHealth = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const health = this.healthService.getHealth();
    reply.status(200).send({
      status: health.status,
      service: health.service,
      version: health.version,
      uptimeSeconds: health.uptimeSeconds,
      timestamp: health.timestamp,
      environment: health.environment,
      memory: health.memory,
      requestId: request.id,
    });
  };

  public getReady = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const readiness = await this.healthService.getReadiness();
    const httpStatus = readiness.status === 'error' ? 503 : 200;

    reply.status(httpStatus).send({
      status: readiness.status,
      service: readiness.service,
      timestamp: readiness.timestamp,
      dependencies: readiness.dependencies,
      requestId: request.id,
    });
  };

  public getOllamaHealth = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const ollama = await this.healthService.getOllamaHealth();
    const httpStatus = ollama.status === 'ok' ? 200 : 503;

    reply.status(httpStatus).send({
      status: ollama.status,
      service: ollama.service,
      baseUrl: ollama.baseUrl,
      configuredModel: ollama.configuredModel,
      modelInstalled: ollama.modelInstalled,
      installedModels: ollama.installedModels,
      latencyMs: ollama.latencyMs,
      error: ollama.error,
      timestamp: ollama.timestamp,
      requestId: request.id,
    });
  };
}
