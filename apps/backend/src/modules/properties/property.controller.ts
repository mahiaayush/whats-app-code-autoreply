import type { FastifyReply, FastifyRequest } from 'fastify';
import { PropertyService } from './property.service.js';

export class PropertyController {
  private service: PropertyService;

  constructor(propertyService?: PropertyService) {
    this.service = propertyService || new PropertyService();
  }

  /**
   * Helper to format standardized successful responses
   */
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
   * GET /api/v1/properties
   */
  listProperties = async (
    request: FastifyRequest<{
      Querystring: { status?: string; city?: string };
    }>,
    reply: FastifyReply,
  ) => {
    const filters = request.query;
    const properties = await this.service.listProperties(filters);
    return this.sendSuccess(reply, request, properties);
  };

  /**
   * GET /api/v1/properties/:slug
   */
  getPropertyBySlug = async (
    request: FastifyRequest<{
      Params: { slug: string };
    }>,
    reply: FastifyReply,
  ) => {
    const { slug } = request.params;
    const property = await this.service.getProperty(slug);
    return this.sendSuccess(reply, request, property);
  };

  /**
   * GET /api/v1/properties/:slug/price
   */
  getPrice = async (
    request: FastifyRequest<{
      Params: { slug: string };
    }>,
    reply: FastifyReply,
  ) => {
    const { slug } = request.params;
    const price = await this.service.getPrice(slug);
    return this.sendSuccess(reply, request, price);
  };

  /**
   * GET /api/v1/properties/:slug/units
   */
  getUnits = async (
    request: FastifyRequest<{
      Params: { slug: string };
    }>,
    reply: FastifyReply,
  ) => {
    const { slug } = request.params;
    const units = await this.service.getUnits(slug);
    return this.sendSuccess(reply, request, units);
  };

  /**
   * GET /api/v1/properties/:slug/location
   */
  getLocation = async (
    request: FastifyRequest<{
      Params: { slug: string };
    }>,
    reply: FastifyReply,
  ) => {
    const { slug } = request.params;
    const location = await this.service.getLocation(slug);
    return this.sendSuccess(reply, request, location);
  };

  /**
   * GET /api/v1/properties/:slug/amenities
   */
  getAmenities = async (
    request: FastifyRequest<{
      Params: { slug: string };
      Querystring: { category?: string };
    }>,
    reply: FastifyReply,
  ) => {
    const { slug } = request.params;
    const { category } = request.query;
    const amenities = await this.service.getAmenities(slug, category);
    return this.sendSuccess(reply, request, amenities);
  };

  /**
   * GET /api/v1/properties/:slug/media
   */
  getMedia = async (
    request: FastifyRequest<{
      Params: { slug: string };
      Querystring: { type?: string };
    }>,
    reply: FastifyReply,
  ) => {
    const { slug } = request.params;
    const { type } = request.query;
    const media = await this.service.getMedia(slug, type);
    return this.sendSuccess(reply, request, media);
  };

  /**
   * GET /api/v1/properties/:slug/availability
   */
  getAvailability = async (
    request: FastifyRequest<{
      Params: { slug: string };
    }>,
    reply: FastifyReply,
  ) => {
    const { slug } = request.params;
    const availability = await this.service.getAvailability(slug);
    return this.sendSuccess(reply, request, availability);
  };

  /**
   * GET /api/v1/properties/:slug/faq
   */
  getFaqs = async (
    request: FastifyRequest<{
      Params: { slug: string };
      Querystring: { q?: string };
    }>,
    reply: FastifyReply,
  ) => {
    const { slug } = request.params;
    const { q } = request.query;
    const faqs = await this.service.getFaqs(slug, q);
    return this.sendSuccess(reply, request, faqs);
  };

  /**
   * GET /api/v1/properties/:slug/contacts
   */
  getContacts = async (
    request: FastifyRequest<{
      Params: { slug: string };
    }>,
    reply: FastifyReply,
  ) => {
    const { slug } = request.params;
    const contacts = await this.service.getContacts(slug);
    return this.sendSuccess(reply, request, contacts);
  };

  /**
   * GET /api/v1/properties/:slug/documents
   */
  getDocuments = async (
    request: FastifyRequest<{
      Params: { slug: string };
    }>,
    reply: FastifyReply,
  ) => {
    const { slug } = request.params;
    const documents = await this.service.getDocuments(slug);
    return this.sendSuccess(reply, request, documents);
  };

  /**
   * GET /api/v1/properties/:slug/ground-truth
   */
  getGroundTruthFactSheet = async (
    request: FastifyRequest<{
      Params: { slug: string };
    }>,
    reply: FastifyReply,
  ) => {
    const { slug } = request.params;
    const factSheet = await this.service.getGroundTruthFactSheet(slug);
    return this.sendSuccess(reply, request, { factSheet });
  };

  /**
   * GET /api/v1/properties/:slug/format-price
   */
  formatPrice = async (
    request: FastifyRequest<{
      Params: { slug: string };
      Querystring: { language?: 'en' | 'hi' | 'hinglish' };
    }>,
    reply: FastifyReply,
  ) => {
    const { slug } = request.params;
    const language = request.query.language || 'en';
    const text = await this.service.formatPriceResponse(slug, language);
    return this.sendSuccess(reply, request, { text, language });
  };

  /**
   * GET /api/v1/properties/:slug/format-availability
   */
  formatAvailability = async (
    request: FastifyRequest<{
      Params: { slug: string };
      Querystring: { language?: 'en' | 'hi' | 'hinglish' };
    }>,
    reply: FastifyReply,
  ) => {
    const { slug } = request.params;
    const language = request.query.language || 'en';
    const text = await this.service.formatAvailabilityResponse(slug, language);
    return this.sendSuccess(reply, request, { text, language });
  };
}
