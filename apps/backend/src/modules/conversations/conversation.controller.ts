import type { FastifyRequest, FastifyReply } from 'fastify';
import {
  ConversationQuerySchema,
  ConversationTakeoverSchema,
  ConversationReleaseSchema,
  ConversationPauseSchema,
  ConversationResumeSchema,
  ConversationCloseSchema,
  UpdateConversationSettingsSchema,
  UpdateCustomerProfileSchema,
} from '@property-ai/validation';
import { conversationService } from './conversation.service.js';

export class ConversationController {
  /**
   * GET /api/v1/conversations
   */
  public async getConversations(req: FastifyRequest, reply: FastifyReply) {
    const query = ConversationQuerySchema.parse(req.query);
    const result = await conversationService.getConversations(query);

    return reply.status(200).send({
      status: 'SUCCESS',
      ...result,
    });
  }

  /**
   * GET /api/v1/conversations/:id
   */
  public async getConversationById(
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) {
    const conversation = await conversationService.getConversationById(req.params.id);

    return reply.status(200).send({
      status: 'SUCCESS',
      data: conversation,
    });
  }

  /**
   * POST /api/v1/conversations/:id/takeover
   */
  public async takeover(
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) {
    const body = ConversationTakeoverSchema.parse(req.body);
    const result = await conversationService.takeover(req.params.id, body.agentId, body.reason);

    return reply.status(200).send({
      status: 'SUCCESS',
      data: result,
    });
  }

  /**
   * POST /api/v1/conversations/:id/release
   */
  public async release(
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) {
    const body = ConversationReleaseSchema.parse(req.body);
    const result = await conversationService.release(req.params.id, body.agentId, body.reason);

    return reply.status(200).send({
      status: 'SUCCESS',
      data: result,
    });
  }

  /**
   * POST /api/v1/conversations/:id/pause
   */
  public async pause(
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) {
    const body = ConversationPauseSchema.parse(req.body || {});
    const result = await conversationService.pause(req.params.id, 'agent', body.reason);

    return reply.status(200).send({
      status: 'SUCCESS',
      data: result,
    });
  }

  /**
   * POST /api/v1/conversations/:id/resume
   */
  public async resume(
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) {
    const body = ConversationResumeSchema.parse(req.body || {});
    const result = await conversationService.resume(req.params.id, 'agent', body.reason);

    return reply.status(200).send({
      status: 'SUCCESS',
      data: result,
    });
  }

  /**
   * POST /api/v1/conversations/:id/close
   */
  public async close(
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) {
    const body = ConversationCloseSchema.parse(req.body || {});
    const result = await conversationService.close(req.params.id, body.agentId, body.reason);

    return reply.status(200).send({
      status: 'SUCCESS',
      data: result,
    });
  }

  /**
   * PATCH /api/v1/conversations/:id
   */
  public async updateSettings(
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) {
    const body = UpdateConversationSettingsSchema.parse(req.body);
    const result = await conversationService.updateSettings(req.params.id, body);

    return reply.status(200).send({
      status: 'SUCCESS',
      data: result,
    });
  }

  /**
   * PATCH /api/v1/conversations/:id/customer
   */
  public async updateCustomer(
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) {
    const body = UpdateCustomerProfileSchema.parse(req.body);
    const conv = await conversationService.getConversationById(req.params.id);
    const result = await conversationService.updateCustomerProfile(conv.customerId, body);

    return reply.status(200).send({
      status: 'SUCCESS',
      data: result,
    });
  }

  /**
   * GET /api/v1/conversations/:id/context
   */
  public async getContext(
    req: FastifyRequest<{ Params: { id: string }; Querystring: { limit?: string } }>,
    reply: FastifyReply,
  ) {
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 6;
    const context = await conversationService.getMultiTurnContext(req.params.id, limit);

    return reply.status(200).send({
      status: 'SUCCESS',
      data: {
        conversationId: req.params.id,
        context,
      },
    });
  }
}

export const conversationController = new ConversationController();
