import { NotFoundError } from '../../common/errors/app-error.js';
import {
  PropertyRepository,
  type SerializedPropertyDetail,
  type SerializedPropertyPrice,
  type SerializedPropertySummary,
  type SerializedPropertyUnit,
  type AvailabilitySummary,
} from './property.repository.js';

export class PropertyService {
  private repo: PropertyRepository;

  constructor(repository?: PropertyRepository) {
    this.repo = repository || new PropertyRepository();
  }

  /**
   * List all properties with high-level summary
   */
  async listProperties(filters?: {
    status?: string;
    city?: string;
  }): Promise<SerializedPropertySummary[]> {
    return this.repo.findAll(filters);
  }

  /**
   * Get single property by slug with all relations (Ground Truth Root)
   */
  async getProperty(slug: string): Promise<SerializedPropertyDetail> {
    const property = await this.repo.findBySlug(slug);
    if (!property) {
      throw new NotFoundError(`Property with slug '${slug}' was not found`);
    }
    return property;
  }

  /**
   * Get verified ground-truth price details
   */
  async getPrice(slug: string): Promise<SerializedPropertyPrice> {
    // Check property existence
    const property = await this.repo.findBySlug(slug);
    if (!property) {
      throw new NotFoundError(`Property with slug '${slug}' was not found`);
    }

    const price = await this.repo.getPriceBySlug(slug);
    if (!price) {
      throw new NotFoundError(`Price information not configured for property '${slug}'`);
    }

    return price;
  }

  /**
   * Get unit configurations and carpet area breakdown
   */
  async getUnits(slug: string): Promise<SerializedPropertyUnit[]> {
    const property = await this.repo.findBySlug(slug);
    if (!property) {
      throw new NotFoundError(`Property with slug '${slug}' was not found`);
    }

    const units = await this.repo.getUnitsBySlug(slug);
    return units || [];
  }

  /**
   * Get physical location details & landmarks
   */
  async getLocation(slug: string) {
    const property = await this.repo.findBySlug(slug);
    if (!property) {
      throw new NotFoundError(`Property with slug '${slug}' was not found`);
    }

    const location = await this.repo.getLocationBySlug(slug);
    if (!location) {
      throw new NotFoundError(`Location details not configured for property '${slug}'`);
    }

    return location;
  }

  /**
   * Get amenities, optionally filtered by category
   */
  async getAmenities(slug: string, category?: string) {
    const property = await this.repo.findBySlug(slug);
    if (!property) {
      throw new NotFoundError(`Property with slug '${slug}' was not found`);
    }

    return this.repo.getAmenitiesBySlug(slug, category);
  }

  /**
   * Get media assets (images, videos, brochures, floor plans)
   */
  async getMedia(slug: string, type?: string) {
    const property = await this.repo.findBySlug(slug);
    if (!property) {
      throw new NotFoundError(`Property with slug '${slug}' was not found`);
    }

    return this.repo.getMediaBySlug(slug, type);
  }

  /**
   * Get unit inventory and availability status
   */
  async getAvailability(slug: string): Promise<AvailabilitySummary> {
    const availability = await this.repo.getAvailabilityBySlug(slug);
    if (!availability) {
      throw new NotFoundError(`Property with slug '${slug}' was not found`);
    }
    return availability;
  }

  /**
   * Get FAQs, optionally searching by keyword
   */
  async getFaqs(slug: string, keyword?: string) {
    const property = await this.repo.findBySlug(slug);
    if (!property) {
      throw new NotFoundError(`Property with slug '${slug}' was not found`);
    }

    return this.repo.getFaqsBySlug(slug, keyword);
  }

  /**
   * Get sales advisors and contacts
   */
  async getContacts(slug: string) {
    const property = await this.repo.findBySlug(slug);
    if (!property) {
      throw new NotFoundError(`Property with slug '${slug}' was not found`);
    }

    return this.repo.getContactsBySlug(slug);
  }

  /**
   * Get property documents (brochures, RERA certificates)
   */
  async getDocuments(slug: string) {
    const property = await this.repo.findBySlug(slug);
    if (!property) {
      throw new NotFoundError(`Property with slug '${slug}' was not found`);
    }

    return this.repo.getDocumentsBySlug(slug);
  }

  /**
   * Compile concise Ground-Truth Fact Sheet for AI Prompt Context
   * This is the anti-hallucination factual foundation injected into LLM prompts.
   */
  async getGroundTruthFactSheet(slug: string): Promise<string> {
    const property = await this.getProperty(slug);

    const lines: string[] = [];
    lines.push(`PROPERTY GROUND TRUTH: ${property.title}`);
    lines.push(`- Developer: ${property.developerName}`);
    lines.push(`- Status: ${property.status} (Possession: ${property.possessionDate || 'On Request'})`);
    if (property.reraRegistrationNumber) {
      lines.push(`- RERA Number: ${property.reraRegistrationNumber}`);
    }

    if (property.location) {
      lines.push(`- Address: ${property.location.address}, ${property.location.city}`);
      if (property.location.landmark) {
        lines.push(`- Landmark: ${property.location.landmark}`);
      }
      if (property.location.connectivityHighlights.length > 0) {
        lines.push(`- Connectivity: ${property.location.connectivityHighlights.join(', ')}`);
      }
    }

    if (property.price) {
      lines.push(`- Pricing: ${property.price.priceDisplayFormatted}`);
      if (property.price.bookingAmount) {
        lines.push(`- Booking Amount: ₹${property.price.bookingAmount.toLocaleString('en-IN')}`);
      }
      if (property.price.paymentPlans.length > 0) {
        lines.push(`- Payment Plans: ${property.price.paymentPlans.join(' | ')}`);
      }
    }

    if (property.units.length > 0) {
      lines.push('- Available Configurations:');
      for (const unit of property.units) {
        lines.push(
          `  * ${unit.unitType}: ${unit.carpetAreaSqFt} sq.ft carpet area${
            unit.priceDisplay ? ` (${unit.priceDisplay})` : ''
          } - ${unit.unitsAvailable} units available`,
        );
      }
    }

    if (property.amenities.length > 0) {
      const amenityNames = property.amenities.map((a) => a.name).slice(0, 8);
      lines.push(`- Amenities: ${amenityNames.join(', ')}`);
    }

    if (property.contacts.length > 0) {
      const contact = property.contacts[0];
      lines.push(
        `- Sales Contact: ${contact.name} (${contact.role}) - Phone: ${contact.phone}${
          contact.availabilityHours ? ` [Hours: ${contact.availabilityHours}]` : ''
        }`,
      );
    }

    lines.push(
      'GROUND TRUTH INVARIANT: You MUST rely exclusively on these facts. Never fabricate discounts, unlisted payment terms, or possession dates.',
    );

    return lines.join('\n');
  }

  /**
   * Deterministic Price Response Generator (Zero LLM latency/cost)
   */
  async formatPriceResponse(
    slug: string,
    language: 'en' | 'hi' | 'hinglish' = 'en',
  ): Promise<string> {
    const property = await this.getProperty(slug);
    const price = property.price;

    if (!price) {
      return `Pricing details for ${property.title} are currently available on request.`;
    }

    const bookingStr = price.bookingAmount
      ? `₹${price.bookingAmount.toLocaleString('en-IN')}`
      : 'On Request';
    const plansStr = price.paymentPlans.join(', ');

    if (language === 'hi') {
      return `${property.title} की कीमत ${price.priceDisplayFormatted} है। बुकिंग राशि ${bookingStr} है। उपलब्ध भुगतान योजनाएं: ${plansStr}।`;
    }

    if (language === 'hinglish') {
      return `${property.title} ki pricing ${price.priceDisplayFormatted} se shuru hoti hai. Booking amount ${bookingStr} hai. Available payment plans: ${plansStr}.`;
    }

    return `${property.title} pricing is ${price.priceDisplayFormatted}. The booking amount is ${bookingStr}. Available payment plans: ${plansStr}.`;
  }

  /**
   * Deterministic Availability Response Generator (Zero LLM latency/cost)
   */
  async formatAvailabilityResponse(
    slug: string,
    language: 'en' | 'hi' | 'hinglish' = 'en',
  ): Promise<string> {
    const availability = await this.getAvailability(slug);

    const breakdown = availability.units
      .map((u) => `${u.unitType}: ${u.unitsAvailable} available`)
      .join(', ');

    if (language === 'hi') {
      return `${availability.propertyTitle} में वर्तमान में कुल ${availability.totalAvailableUnits} इकाइयाँ उपलब्ध हैं (${breakdown})। स्थिति: ${availability.propertyStatus}।`;
    }

    if (language === 'hinglish') {
      return `${availability.propertyTitle} me currently total ${availability.totalAvailableUnits} units available hain (${breakdown}). Status: ${availability.propertyStatus}.`;
    }

    return `${availability.propertyTitle} currently has ${availability.totalAvailableUnits} units available (${breakdown}). Project status: ${availability.propertyStatus}.`;
  }
}
