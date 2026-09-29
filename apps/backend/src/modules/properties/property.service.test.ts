import { describe, it, expect, afterAll } from 'vitest';
import { PropertyService } from './property.service.js';
import { closePrismaClient } from '../../database/prisma.client.js';
import { NotFoundError } from '../../common/errors/app-error.js';

describe('PropertyService', () => {
  const service = new PropertyService();

  afterAll(async () => {
    await closePrismaClient();
  });

  it('should list all properties', async () => {
    const list = await service.listProperties();
    expect(list.length).toBeGreaterThanOrEqual(1);
    expect(list[0].slug).toBe('luxzirius-villas');
  });

  it('should get full property details', async () => {
    const property = await service.getProperty('luxzirius-villas');
    expect(property.slug).toBe('luxzirius-villas');
    expect(property.title).toBe('Luxzirius Villas');
    expect(property.price?.priceDisplayFormatted).toContain('₹1.75 Cr');
  });

  it('should throw NotFoundError for invalid slug', async () => {
    await expect(service.getProperty('non-existent-property')).rejects.toThrow(NotFoundError);
  });

  it('should throw NotFoundError for getPrice on invalid slug', async () => {
    await expect(service.getPrice('non-existent-property')).rejects.toThrow(NotFoundError);
  });

  it('should generate concise Ground-Truth Fact Sheet', async () => {
    const factSheet = await service.getGroundTruthFactSheet('luxzirius-villas');
    expect(typeof factSheet).toBe('string');
    expect(factSheet).toContain('PROPERTY GROUND TRUTH: Luxzirius Villas');
    expect(factSheet).toContain('Developer: Luxzirius Realty Pvt Ltd (Demo)');
    expect(factSheet).toContain('RERA Number:');
    expect(factSheet).toContain('Bengaluru');
    expect(factSheet).toContain('Pricing: ₹1.75 Cr - ₹3.20 Cr');
    expect(factSheet).toContain('Booking Amount: ₹5,00,000');
    expect(factSheet).toContain('3BHK Luxury Villa');
    expect(factSheet).toContain('Sales Contact:');
    expect(factSheet).toContain('GROUND TRUTH INVARIANT');
  });

  it('should format deterministic price response in English, Hindi, and Hinglish', async () => {
    const en = await service.formatPriceResponse('luxzirius-villas', 'en');
    expect(en).toContain('Luxzirius Villas pricing is ₹1.75 Cr - ₹3.20 Cr');
    expect(en).toContain('₹5,00,000');

    const hi = await service.formatPriceResponse('luxzirius-villas', 'hi');
    expect(hi).toContain('की कीमत ₹1.75 Cr - ₹3.20 Cr है');
    expect(hi).toContain('बुकिंग राशि ₹5,00,000');

    const hinglish = await service.formatPriceResponse('luxzirius-villas', 'hinglish');
    expect(hinglish).toContain('Luxzirius Villas ki pricing ₹1.75 Cr - ₹3.20 Cr');
    expect(hinglish).toContain('Booking amount ₹5,00,000 hai');
  });

  it('should format deterministic availability response in English, Hindi, and Hinglish', async () => {
    const en = await service.formatAvailabilityResponse('luxzirius-villas', 'en');
    expect(en).toContain('units available');
    expect(en).toContain('AVAILABLE');

    const hi = await service.formatAvailabilityResponse('luxzirius-villas', 'hi');
    expect(hi).toContain('इकाइयाँ उपलब्ध हैं');

    const hinglish = await service.formatAvailabilityResponse('luxzirius-villas', 'hinglish');
    expect(hinglish).toContain('units available hain');
  });
});
