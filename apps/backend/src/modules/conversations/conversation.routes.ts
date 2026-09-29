import type { FastifyPluginAsync } from 'fastify';
import { conversationController } from './conversation.controller.js';

export const conversationRoutes: FastifyPluginAsync = async (app) => {
  // Query conversations
  app.get('/', conversationController.getConversations.bind(conversationController));

  // Get conversation by ID
  app.get('/:id', conversationController.getConversationById.bind(conversationController));

  // State transitions
  app.post('/:id/takeover', conversationController.takeover.bind(conversationController));
  app.post('/:id/release', conversationController.release.bind(conversationController));
  app.post('/:id/pause', conversationController.pause.bind(conversationController));
  app.post('/:id/resume', conversationController.resume.bind(conversationController));
  app.post('/:id/close', conversationController.close.bind(conversationController));

  // Settings & Customer Profile
  app.patch('/:id', conversationController.updateSettings.bind(conversationController));
  app.patch('/:id/customer', conversationController.updateCustomer.bind(conversationController));

  // Multi-turn context
  app.get('/:id/context', conversationController.getContext.bind(conversationController));
};
