import type { FastifyInstance } from 'fastify';
import { PropertyController } from './property.controller.js';

export async function propertyRoutes(fastify: FastifyInstance) {
  const controller = new PropertyController();

  // List all properties
  fastify.get('/', controller.listProperties);

  // Property detail (Ground Truth Root)
  fastify.get('/:slug', controller.getPropertyBySlug);

  // Specific facets
  fastify.get('/:slug/price', controller.getPrice);
  fastify.get('/:slug/units', controller.getUnits);
  fastify.get('/:slug/area', controller.getUnits); // Alias for unit sizes & area
  fastify.get('/:slug/location', controller.getLocation);
  fastify.get('/:slug/amenities', controller.getAmenities);
  fastify.get('/:slug/media', controller.getMedia);
  fastify.get('/:slug/availability', controller.getAvailability);
  fastify.get('/:slug/faq', controller.getFaqs);
  fastify.get('/:slug/faqs', controller.getFaqs); // Alias
  fastify.get('/:slug/contacts', controller.getContacts);
  fastify.get('/:slug/documents', controller.getDocuments);

  // AI & Automation Ground-Truth Formats
  fastify.get('/:slug/ground-truth', controller.getGroundTruthFactSheet);
  fastify.get('/:slug/format-price', controller.formatPrice);
  fastify.get('/:slug/format-availability', controller.formatAvailability);
}
