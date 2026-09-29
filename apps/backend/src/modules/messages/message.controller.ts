import type { FastifyRequest, FastifyReply } from 'fastify';
import {
  IncomingMessageSchema,
  ApproveMessageSchema,
  RejectMessageSchema,
} from '@property-ai/validation';
import { messagePipelineService } from './message-pipeline.service.js';
import { messageQueue } from './message.queue.js';
import { messageRepository } from './message.repository.js';
import { NotFoundError } from '../../common/errors/app-error.js';

export class MessageController {
  /**
   * POST /api/v1/messages/inbound
   * Ingests an incoming WhatsApp message.
   * If sync=true, runs pipeline synchronously and returns result.
   * Otherwise enqueues into async worker queue and returns 202.
   */
  public async handleInboundMessage(req: FastifyRequest, reply: FastifyReply) {
    const dto = IncomingMessageSchema.parse(req.body);
    const query = req.query as { sync?: string };
    const isSync = dto.sync === true || query?.sync === 'true';

    if (isSync) {
      const result = await messagePipelineService.processIncomingMessage(dto);
      return reply.status(200).send({
        status: 'SUCCESS',
        data: result,
      });
    }

    const jobId = messageQueue.enqueue(dto);
    return reply.status(202).send({
      status: 'ACCEPTED',
      jobId,
      externalMessageId: dto.externalMessageId,
      chatId: dto.chatId,
    });
  }

  /**
   * GET /api/v1/messages/:id
   * Retrieves message details with processing record, AI response, and escalations.
   */
  public async getMessageById(
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) {
    const message = await messageRepository.getMessageById(req.params.id);
    if (!message) {
      throw new NotFoundError(`Message not found with ID: ${req.params.id}`);
    }

    return reply.status(200).send({
      status: 'SUCCESS',
      data: message,
    });
  }

  /**
   * GET /api/v1/messages/conversation/:chatId
   * Retrieves message history for a given WhatsApp chatId.
   */
  public async getConversationMessages(
    req: FastifyRequest<{ Params: { chatId: string }; Querystring: { limit?: string } }>,
    reply: FastifyReply,
  ) {
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 50;
    const messages = await messageRepository.getConversationMessages(req.params.chatId, limit);

    return reply.status(200).send({
      status: 'SUCCESS',
      data: messages,
      count: messages.length,
    });
  }

  /**
   * POST /api/v1/messages/:id/approve
   * Human agent approves an outbound message in PENDING_APPROVAL status.
   */
  public async approveMessage(
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) {
    const body = ApproveMessageSchema.parse(req.body || {});
    const result = await messagePipelineService.approveMessage(req.params.id, body.agentId);

    return reply.status(200).send({
      status: 'SUCCESS',
      data: result,
    });
  }

  /**
   * POST /api/v1/messages/:id/reject
   * Human agent rejects a proposed message.
   */
  public async rejectMessage(
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) {
    const body = RejectMessageSchema.parse(req.body || {});
    const result = await messagePipelineService.rejectMessage(
      req.params.id,
      body.agentId,
      body.reason,
    );

    return reply.status(200).send({
      status: 'SUCCESS',
      data: result,
    });
  }
}

export const messageController = new MessageController();
