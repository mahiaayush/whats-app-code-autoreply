import { describe, it, expect, afterAll } from 'vitest';
import { PropertyRepository } from './property.repository.js';
import { closePrismaClient } from '../../database/prisma.client.js';

describe('PropertyRepository', () => {
  const repo = new PropertyRepository();

  afterAll(async () => {
    await closePrismaClient();
  });

  it('should list all properties', async () => {
    const properties = await repo.findAll();
    expect(Array.isArray(properties)).toBe(true);
    expect(properties.length).toBeGreaterThanOrEqual(1);

    const villa = properties.find((p) => p.slug === 'luxzirius-villas');
    expect(villa).toBeDefined();
    expect(villa?.title).toBe('Luxzirius Villas');
    expect(villa?.status).toBe('AVAILABLE');
    expect(villa?.city).toBe('Bengaluru');
    expect(typeof villa?.availableUnitsCount).toBe('number');
  });

  it('should filter properties by city', async () => {
    const bglrProperties = await repo.findAll({ city: 'Bengaluru' });
    expect(bglrProperties.length).toBeGreaterThanOrEqual(1);
    expect(bglrProperties.every((p) => p.city?.toLowerCase() === 'bengaluru')).toBe(true);

    const empty = await repo.findAll({ city: 'NonExistentCity' });
    expect(empty.length).toBe(0);
  });

  it('should find property by slug with all relations and serialized BigInts', async () => {
    const property = await repo.findBySlug('luxzirius-villas');
    expect(property).not.toBeNull();
    expect(property?.slug).toBe('luxzirius-villas');
    expect(property?.title).toBe('Luxzirius Villas');

    // Verify price serialization (BigInt converted to Number)
    expect(property?.price).toBeDefined();
    expect(typeof property?.price?.startingPrice).toBe('number');
    expect(property?.price?.startingPrice).toBe(17500000);
    expect(typeof property?.price?.maxPrice).toBe('number');
    expect(property?.price?.maxPrice).toBe(32000000);
    expect(typeof property?.price?.bookingAmount).toBe('number');
    expect(property?.price?.bookingAmount).toBe(500000);

    // Verify relations
    expect(property?.location?.city).toBe('Bengaluru');
    expect(property?.location?.connectivityHighlights.length).toBeGreaterThan(0);
    expect(property?.units.length).toBeGreaterThanOrEqual(3);
    expect(typeof property?.units[0].basePrice).toBe('number');
    expect(property?.amenities.length).toBeGreaterThanOrEqual(5);
    expect(property?.media.length).toBeGreaterThanOrEqual(4);
    expect(property?.faqs.length).toBeGreaterThanOrEqual(4);
    expect(property?.contacts.length).toBeGreaterThanOrEqual(1);
  });

  it('should return null for non-existent slug', async () => {
    const property = await repo.findBySlug('non-existent-property');
    expect(property).toBeNull();
  });

  it('should get verified price by slug', async () => {
    const price = await repo.getPriceBySlug('luxzirius-villas');
    expect(price).not.toBeNull();
    expect(price?.currency).toBe('INR');
    expect(price?.priceDisplayFormatted).toContain('₹1.75 Cr');
    expect(price?.paymentPlans.length).toBeGreaterThan(0);
  });

  it('should get unit configurations by slug', async () => {
    const units = await repo.getUnitsBySlug('luxzirius-villas');
    expect(units).not.toBeNull();
    expect(units?.length).toBeGreaterThanOrEqual(3);
    expect(units?.[0].unitType).toBeDefined();
    expect(units?.[0].carpetAreaSqFt).toBeGreaterThan(0);
  });

  it('should get location details by slug', async () => {
    const location = await repo.getLocationBySlug('luxzirius-villas');
    expect(location).not.toBeNull();
    expect(location?.city).toBe('Bengaluru');
    expect(location?.address).toContain('Lakeview Road');
  });

  it('should get amenities and support category filter', async () => {
    const allAmenities = await repo.getAmenitiesBySlug('luxzirius-villas');
    expect(allAmenities?.length).toBeGreaterThanOrEqual(5);

    const sportsAmenities = await repo.getAmenitiesBySlug('luxzirius-villas', 'Sports');
    expect(sportsAmenities?.length).toBeGreaterThanOrEqual(1);
    expect(sportsAmenities?.every((a) => a.category.toLowerCase().includes('sports'))).toBe(true);
  });

  it('should get media and support type filter', async () => {
    const allMedia = await repo.getMediaBySlug('luxzirius-villas');
    expect(allMedia?.length).toBeGreaterThanOrEqual(4);

    const brochures = await repo.getMediaBySlug('luxzirius-villas', 'BROCHURE');
    expect(brochures?.length).toBeGreaterThanOrEqual(1);
    expect(brochures?.every((m) => m.type === 'BROCHURE')).toBe(true);
  });

  it('should get availability summary', async () => {
    const availability = await repo.getAvailabilityBySlug('luxzirius-villas');
    expect(availability).not.toBeNull();
    expect(availability?.propertySlug).toBe('luxzirius-villas');
    expect(availability?.totalAvailableUnits).toBeGreaterThan(0);
    expect(availability?.units.length).toBeGreaterThanOrEqual(3);
  });

  it('should get FAQs and filter by keyword', async () => {
    const allFaqs = await repo.getFaqsBySlug('luxzirius-villas');
    expect(allFaqs?.length).toBeGreaterThanOrEqual(4);

    const loanFaqs = await repo.getFaqsBySlug('luxzirius-villas', 'loan');
    expect(loanFaqs?.length).toBeGreaterThanOrEqual(1);
  });

  it('should get contacts', async () => {
    const contacts = await repo.getContactsBySlug('luxzirius-villas');
    expect(contacts?.length).toBeGreaterThanOrEqual(1);
    expect(contacts?.[0].phone).toBeDefined();
  });
});
