import type { FastifyInstance } from 'fastify';
import { RuleController } from './rule.controller.js';

export async function shortcutRoutes(fastify: FastifyInstance) {
  const controller = new RuleController();

  fastify.get('/', controller.listShortcuts);
  fastify.get('/:command', controller.getShortcutByCommand);
  fastify.post('/', controller.createShortcut);
  fastify.patch('/:id', controller.updateShortcut);
  fastify.delete('/:id', controller.deleteShortcut);
}

export async function ruleRoutes(fastify: FastifyInstance) {
  const controller = new RuleController();

  fastify.post('/match', controller.matchMessage);
  fastify.post('/reload', controller.reloadRules);
}
