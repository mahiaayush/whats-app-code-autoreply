import type { FastifyPluginAsync } from 'fastify';
import { messageController } from './message.controller.js';

export const messageRoutes: FastifyPluginAsync = async (app) => {
  // Ingest incoming message (async by default, sync=true supported)
  app.post('/inbound', messageController.handleInboundMessage.bind(messageController));

  // Get message details by ID with processing lifecycle
  app.get('/:id', messageController.getMessageById.bind(messageController));

  // Get conversation message history
  app.get(
    '/conversation/:chatId',
    messageController.getConversationMessages.bind(messageController),
  );

  // Approve a pending outbound message
  app.post('/:id/approve', messageController.approveMessage.bind(messageController));

  // Reject a pending outbound message
  app.post('/:id/reject', messageController.rejectMessage.bind(messageController));
};
