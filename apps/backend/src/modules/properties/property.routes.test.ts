import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../app.js';
import { closePrismaClient } from '../../database/prisma.client.js';

describe('Property REST API Endpoints', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await closePrismaClient();
  });

  it('GET /api/v1/properties - should return list of properties', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/properties',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThanOrEqual(1);
    expect(body.data[0].slug).toBe('luxzirius-villas');
    expect(body.meta.requestId).toBeDefined();
  });

  it('GET /api/v1/properties/:slug - should return full property ground truth', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/properties/luxzirius-villas',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data.slug).toBe('luxzirius-villas');
    expect(body.data.title).toBe('Luxzirius Villas');
    expect(body.data.price.startingPrice).toBe(17500000);
    expect(body.data.location.city).toBe('Bengaluru');
    expect(body.data.units.length).toBeGreaterThanOrEqual(3);
    expect(body.data.amenities.length).toBeGreaterThanOrEqual(5);
  });

  it('GET /api/v1/properties/:slug - should return 404 for unknown slug', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/properties/unknown-slug',
    });

    expect(response.statusCode).toBe(404);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('GET /api/v1/properties/:slug/price - should return pricing details', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/properties/luxzirius-villas/price',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data.priceDisplayFormatted).toContain('₹1.75 Cr');
    expect(body.data.bookingAmount).toBe(500000);
  });

  it('GET /api/v1/properties/:slug/units & /area - should return configurations', async () => {
    const resUnits = await app.inject({
      method: 'GET',
      url: '/api/v1/properties/luxzirius-villas/units',
    });
    expect(resUnits.statusCode).toBe(200);
    const bodyUnits = JSON.parse(resUnits.body);
    expect(bodyUnits.data.length).toBeGreaterThanOrEqual(3);

    const resArea = await app.inject({
      method: 'GET',
      url: '/api/v1/properties/luxzirius-villas/area',
    });
    expect(resArea.statusCode).toBe(200);
    const bodyArea = JSON.parse(resArea.body);
    expect(bodyArea.data).toEqual(bodyUnits.data);
  });

  it('GET /api/v1/properties/:slug/location - should return location details', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/properties/luxzirius-villas/location',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data.city).toBe('Bengaluru');
    expect(body.data.landmark).toBe('Adjacent to Green Valley Golf Course (Demo)');
  });

  it('GET /api/v1/properties/:slug/amenities - should support category filter', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/properties/luxzirius-villas/amenities?category=Sports',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data.length).toBeGreaterThanOrEqual(1);
    expect(body.data.every((a: { category: string }) => a.category.toLowerCase().includes('sports'))).toBe(
      true,
    );
  });

  it('GET /api/v1/properties/:slug/media - should support type filter', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/properties/luxzirius-villas/media?type=BROCHURE',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data.length).toBeGreaterThanOrEqual(1);
    expect(body.data[0].type).toBe('BROCHURE');
  });

  it('GET /api/v1/properties/:slug/availability - should return unit stock breakdown', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/properties/luxzirius-villas/availability',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data.propertySlug).toBe('luxzirius-villas');
    expect(body.data.totalAvailableUnits).toBeGreaterThan(0);
    expect(body.data.units.length).toBeGreaterThanOrEqual(3);
  });

  it('GET /api/v1/properties/:slug/faq - should return FAQs with search filter', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/properties/luxzirius-villas/faq?q=loan',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('GET /api/v1/properties/:slug/contacts - should return sales advisors', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/properties/luxzirius-villas/contacts',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data.length).toBeGreaterThanOrEqual(1);
    expect(body.data[0].name).toBe('Vikram Malhotra (Demo)');
  });

  it('GET /api/v1/properties/:slug/documents - should return documents', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/properties/luxzirius-villas/documents',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('GET /api/v1/properties/:slug/ground-truth - should return fact sheet', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/properties/luxzirius-villas/ground-truth',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data.factSheet).toContain('PROPERTY GROUND TRUTH: Luxzirius Villas');
    expect(body.data.factSheet).toContain('GROUND TRUTH INVARIANT');
  });

  it('GET /api/v1/properties/:slug/format-price - should return formatted response', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/properties/luxzirius-villas/format-price?language=hinglish',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data.language).toBe('hinglish');
    expect(body.data.text).toContain('Luxzirius Villas ki pricing');
  });
});
