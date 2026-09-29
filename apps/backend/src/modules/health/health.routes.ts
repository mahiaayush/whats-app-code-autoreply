import type { FastifyInstance } from 'fastify';
import { HealthController } from './health.controller.js';

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  const controller = new HealthController();

  // Primary API endpoints
  app.get('/api/v1/health', controller.getHealth);
  app.get('/api/v1/ready', controller.getReady);
  app.get('/api/v1/ollama/health', controller.getOllamaHealth);

  // Short root aliases for docker container health checks
  app.get('/health', controller.getHealth);
  app.get('/ready', controller.getReady);
}
