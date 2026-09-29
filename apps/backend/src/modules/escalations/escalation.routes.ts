import type { FastifyPluginAsync } from 'fastify';
import { EscalationController } from './escalation.controller.js';

export const escalationRoutes: FastifyPluginAsync = async (fastify) => {
  const controller = new EscalationController();

  fastify.get('/', controller.getEscalations.bind(controller));
  fastify.get('/stats', controller.getStats.bind(controller));
  fastify.get('/:id', controller.getEscalation.bind(controller));
  fastify.post('/evaluate', controller.evaluateMessage.bind(controller));
  fastify.post('/', controller.createEscalation.bind(controller));
  fastify.post('/:id/assign', controller.assignEscalation.bind(controller));
  fastify.post('/:id/resolve', controller.resolveEscalation.bind(controller));
  fastify.post('/:id/dismiss', controller.dismissEscalation.bind(controller));
};
