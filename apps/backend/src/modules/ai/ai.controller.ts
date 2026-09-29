import type { FastifyReply, FastifyRequest } from 'fastify';
import { AiService } from './ai.service.js';
import { OllamaClient } from './ollama.client.js';
import type { LanguageCode } from '@property-ai/shared-types';

export class AiController {
  private service: AiService;
  private client: OllamaClient;

  constructor(aiService?: AiService, ollamaClient?: OllamaClient) {
    this.service = aiService || new AiService();
    this.client = ollamaClient || new OllamaClient();
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
   * POST /api/v1/ai/classify
   */
  classify = async (
    request: FastifyRequest<{
      Body: {
        message: string;
        activePropertySlug?: string;
        language?: LanguageCode;
        recentMessagesSnippet?: string;
      };
    }>,
    reply: FastifyReply,
  ) => {
    const { message, activePropertySlug, language, recentMessagesSnippet } = request.body;
    const result = await this.service.classifyMessage(message, {
      activePropertySlug,
      language,
      recentMessagesSnippet,
    });
    return this.sendSuccess(reply, request, result);
  };

  /**
   * POST /api/v1/ai/generate
   */
  generate = async (
    request: FastifyRequest<{
      Body: {
        customerQuery: string;
        intent: string;
        language: LanguageCode;
        propertySlug?: string;
        customerName?: string;
      };
    }>,
    reply: FastifyReply,
  ) => {
    const result = await this.service.generateResponse(request.body);
    return this.sendSuccess(reply, request, result);
  };

  /**
   * POST /api/v1/ai/chat
   */
  chat = async (
    request: FastifyRequest<{
      Body: {
        message: string;
        propertySlug?: string;
        language?: LanguageCode;
        customerName?: string;
      };
    }>,
    reply: FastifyReply,
  ) => {
    const result = await this.service.executeChatPipeline(request.body);
    return this.sendSuccess(reply, request, result);
  };

  /**
   * GET /api/v1/ai/models
   */
  listModels = async (request: FastifyRequest, reply: FastifyReply) => {
    const models = await this.client.listModels();
    return this.sendSuccess(reply, request, { models });
  };

  /**
   * GET /api/v1/ai/health
   */
  health = async (request: FastifyRequest, reply: FastifyReply) => {
    const health = await this.client.checkHealth();
    return this.sendSuccess(reply, request, health);
  };
}
