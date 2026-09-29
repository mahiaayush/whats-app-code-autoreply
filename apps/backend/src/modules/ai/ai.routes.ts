import type { FastifyInstance } from 'fastify';
import { AiController } from './ai.controller.js';

export async function aiRoutes(fastify: FastifyInstance) {
  const controller = new AiController();

  fastify.post('/classify', controller.classify);
  fastify.post('/generate', controller.generate);
  fastify.post('/chat', controller.chat);
  fastify.get('/models', controller.listModels);
  fastify.get('/health', controller.health);
}
