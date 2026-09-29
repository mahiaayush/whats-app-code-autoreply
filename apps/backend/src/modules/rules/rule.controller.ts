import type { FastifyReply, FastifyRequest } from 'fastify';
import { RuleService } from './rule.service.js';
import { CreateShortcutSchema } from '@property-ai/validation';
import type { LanguageCode } from '@property-ai/shared-types';

export class RuleController {
  private service: RuleService;

  constructor(ruleService?: RuleService) {
    this.service = ruleService || new RuleService();
  }

  private sendSuccess<T>(reply: FastifyReply, request: FastifyRequest, data: T, statusCode = 200) {
    return reply.status(statusCode).send({
      success: true,
      data,
      meta: {
        requestId: request.id,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * GET /api/v1/shortcuts
   */
  listShortcuts = async (
    request: FastifyRequest<{
      Querystring: { enabledOnly?: string };
    }>,
    reply: FastifyReply,
  ) => {
    const enabledOnly = request.query.enabledOnly === 'true';
    const shortcuts = await this.service.listShortcuts(enabledOnly);
    return this.sendSuccess(reply, request, shortcuts);
  };

  /**
   * GET /api/v1/shortcuts/:command
   */
  getShortcutByCommand = async (
    request: FastifyRequest<{
      Params: { command: string };
    }>,
    reply: FastifyReply,
  ) => {
    const { command } = request.params;
    const shortcut = await this.service.getShortcutByCommand(command);
    return this.sendSuccess(reply, request, shortcut);
  };

  /**
   * POST /api/v1/shortcuts
   */
  createShortcut = async (request: FastifyRequest, reply: FastifyReply) => {
    const validated = CreateShortcutSchema.parse(request.body);
    const created = await this.service.createShortcut(validated);
    return this.sendSuccess(reply, request, created, 201);
  };

  /**
   * PATCH /api/v1/shortcuts/:id
   */
  updateShortcut = async (
    request: FastifyRequest<{
      Params: { id: string };
      Body: {
        name?: string;
        description?: string;
        targetIntent?: string;
        naturalLanguagePhrases?: string[];
        responseTemplate?: string | null;
        enabled?: boolean;
        priority?: number;
      };
    }>,
    reply: FastifyReply,
  ) => {
    const { id } = request.params;
    const updated = await this.service.updateShortcut(id, request.body);
    return this.sendSuccess(reply, request, updated);
  };

  /**
   * DELETE /api/v1/shortcuts/:id
   */
  deleteShortcut = async (
    request: FastifyRequest<{
      Params: { id: string };
    }>,
    reply: FastifyReply,
  ) => {
    const { id } = request.params;
    await this.service.deleteShortcut(id);
    return this.sendSuccess(reply, request, { deleted: true, id });
  };

  /**
   * POST /api/v1/rules/match
   */
  matchMessage = async (
    request: FastifyRequest<{
      Body: {
        text: string;
        propertySlug?: string;
        language?: LanguageCode;
      };
    }>,
    reply: FastifyReply,
  ) => {
    const { text, propertySlug, language } = request.body;
    const result = await this.service.processMessage(text, {
      propertySlug,
      language,
    });
    return this.sendSuccess(reply, request, result);
  };

  /**
   * POST /api/v1/rules/reload
   */
  reloadRules = async (request: FastifyRequest, reply: FastifyReply) => {
    const reloaded = await this.service.reloadRules();
    return this.sendSuccess(reply, request, {
      reloadedCount: reloaded.length,
      rules: reloaded.map((r) => ({ command: r.command, priority: r.priority })),
    });
  };
}
