import type { FastifyReply, FastifyRequest } from 'fastify';
import { EscalationService } from './escalation.service.js';
import {
  AssignEscalationSchema,
  CreateEscalationSchema,
  DismissEscalationSchema,
  EscalationQuerySchema,
  EvaluateEscalationSchema,
  ResolveEscalationSchema,
} from '@property-ai/validation';

export class EscalationController {
  private service: EscalationService;

  constructor(service?: EscalationService) {
    this.service = service || new EscalationService();
  }

  /**
   * GET /api/v1/escalations
   */
  async getEscalations(req: FastifyRequest, reply: FastifyReply) {
    const query = EscalationQuerySchema.parse(req.query);
    const result = await this.service.getEscalations(query);

    return reply.status(200).send({
      success: true,
      data: result.escalations,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    });
  }

  /**
   * GET /api/v1/escalations/stats
   */
  async getStats(_req: FastifyRequest, reply: FastifyReply) {
    const stats = await this.service.getStats();
    return reply.status(200).send({
      success: true,
      data: stats,
    });
  }

  /**
   * GET /api/v1/escalations/:id
   */
  async getEscalation(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const { id } = req.params;
    const escalation = await this.service.getEscalation(id);
    return reply.status(200).send({
      success: true,
      data: escalation,
    });
  }

  /**
   * POST /api/v1/escalations/evaluate
   */
  async evaluateMessage(req: FastifyRequest, reply: FastifyReply) {
    const body = EvaluateEscalationSchema.parse(req.body);
    const result = this.service.evaluateMessage(body.messageText);
    return reply.status(200).send({
      success: true,
      data: result,
    });
  }

  /**
   * POST /api/v1/escalations
   */
  async createEscalation(req: FastifyRequest, reply: FastifyReply) {
    const body = CreateEscalationSchema.parse(req.body);
    const escalation = await this.service.createEscalation(body);
    return reply.status(201).send({
      success: true,
      data: escalation,
    });
  }

  /**
   * POST /api/v1/escalations/:id/assign
   */
  async assignEscalation(
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) {
    const { id } = req.params;
    const body = AssignEscalationSchema.parse(req.body);
    const escalation = await this.service.assignEscalation(id, body);
    return reply.status(200).send({
      success: true,
      data: escalation,
    });
  }

  /**
   * POST /api/v1/escalations/:id/resolve
   */
  async resolveEscalation(
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) {
    const { id } = req.params;
    const body = ResolveEscalationSchema.parse(req.body);
    const escalation = await this.service.resolveEscalation(id, body);
    return reply.status(200).send({
      success: true,
      data: escalation,
    });
  }

  /**
   * POST /api/v1/escalations/:id/dismiss
   */
  async dismissEscalation(
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) {
    const { id } = req.params;
    const body = DismissEscalationSchema.parse(req.body);
    const escalation = await this.service.dismissEscalation(id, body);
    return reply.status(200).send({
      success: true,
      data: escalation,
    });
  }
}
