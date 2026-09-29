import type { PrismaClient } from '@prisma/client';
import { getPrismaClient } from '../../database/prisma.client.js';

export interface SerializedPropertyPrice {
  id: string;
  propertyId: string;
  startingPrice: number;
  maxPrice: number | null;
  pricePerSqFt: number | null;
  currency: string;
  priceDisplayFormatted: string;
  bookingAmount: number | null;
  paymentPlans: string[];
  maintenanceCharges: string | null;
}

export interface SerializedPropertyUnit {
  id: string;
  propertyId: string;
  unitType: string;
  carpetAreaSqFt: number;
  superBuiltUpAreaSqFt: number | null;
  basePrice: number | null;
  priceDisplay: string | null;
  floorPlanUrl: string | null;
  unitsAvailable: number;
}

export interface SerializedPropertySummary {
  id: string;
  slug: string;
  title: string;
  tagline: string | null;
  description: string;
  status: string;
  developerName: string;
  reraRegistrationNumber: string | null;
  possessionDate: string | null;
  city: string | null;
  startingPriceFormatted: string | null;
  availableUnitsCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SerializedPropertyDetail {
  id: string;
  slug: string;
  title: string;
  tagline: string | null;
  description: string;
  status: string;
  developerName: string;
  reraRegistrationNumber: string | null;
  possessionDate: string | null;
  createdAt: Date;
  updatedAt: Date;
  location: {
    id: string;
    propertyId: string;
    address: string;
    city: string;
    state: string | null;
    pincode: string | null;
    landmark: string | null;
    googleMapsUrl: string | null;
    latitude: number | null;
    longitude: number | null;
    connectivityHighlights: string[];
  } | null;
  price: SerializedPropertyPrice | null;
  units: SerializedPropertyUnit[];
  amenities: {
    id: string;
    propertyId: string;
    category: string;
    name: string;
    description: string | null;
    icon: string | null;
  }[];
  media: {
    id: string;
    propertyId: string;
    type: string;
    title: string;
    url: string;
    thumbnailUrl: string | null;
    isHero: boolean;
    orderIndex: number;
  }[];
  faqs: {
    id: string;
    propertyId: string;
    question: string;
    answer: string;
    category: string | null;
    keywords: string[];
  }[];
  documents: {
    id: string;
    propertyId: string;
    title: string;
    type: string;
    fileUrl: string;
    fileSizeBytes: number | null;
  }[];
  contacts: {
    id: string;
    propertyId: string;
    role: string;
    name: string;
    phone: string;
    email: string | null;
    availabilityHours: string | null;
  }[];
}

export interface AvailabilitySummary {
  propertySlug: string;
  propertyTitle: string;
  propertyStatus: string;
  totalAvailableUnits: number;
  units: {
    unitType: string;
    carpetAreaSqFt: number;
    priceDisplay: string | null;
    unitsAvailable: number;
  }[];
}

export function serializePrice(price: {
  id: string;
  propertyId: string;
  startingPrice: bigint;
  maxPrice: bigint | null;
  pricePerSqFt: number | null;
  currency: string;
  priceDisplayFormatted: string;
  bookingAmount: bigint | null;
  paymentPlans: string[];
  maintenanceCharges: string | null;
} | null): SerializedPropertyPrice | null {
  if (!price) return null;
  return {
    ...price,
    startingPrice: Number(price.startingPrice),
    maxPrice: price.maxPrice !== null ? Number(price.maxPrice) : null,
    bookingAmount: price.bookingAmount !== null ? Number(price.bookingAmount) : null,
  };
}

export function serializeUnit(unit: {
  id: string;
  propertyId: string;
  unitType: string;
  carpetAreaSqFt: number;
  superBuiltUpAreaSqFt: number | null;
  basePrice: bigint | null;
  priceDisplay: string | null;
  floorPlanUrl: string | null;
  unitsAvailable: number;
}): SerializedPropertyUnit {
  return {
    ...unit,
    basePrice: unit.basePrice !== null ? Number(unit.basePrice) : null,
  };
}

export class PropertyRepository {
  private prisma: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || getPrismaClient();
  }

  /**
   * Find all active properties with summary details
   */
  async findAll(filters?: {
    status?: string;
    city?: string;
  }): Promise<SerializedPropertySummary[]> {
    const where: Record<string, unknown> = {};

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.city) {
      where.location = {
        city: {
          equals: filters.city,
          mode: 'insensitive',
        },
      };
    }

    const properties = await this.prisma.property.findMany({
      where,
      include: {
        location: {
          select: {
            city: true,
          },
        },
        price: {
          select: {
            priceDisplayFormatted: true,
          },
        },
        units: {
          select: {
            unitsAvailable: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return properties.map((p) => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      tagline: p.tagline,
      description: p.description,
      status: p.status,
      developerName: p.developerName,
      reraRegistrationNumber: p.reraRegistrationNumber,
      possessionDate: p.possessionDate,
      city: p.location?.city || null,
      startingPriceFormatted: p.price?.priceDisplayFormatted || null,
      availableUnitsCount: p.units.reduce((sum, u) => sum + u.unitsAvailable, 0),
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));
  }

  /**
   * Find a single property by slug with all relations (Ground Truth Root)
   */
  async findBySlug(slug: string): Promise<SerializedPropertyDetail | null> {
    const property = await this.prisma.property.findUnique({
      where: { slug },
      include: {
        location: true,
        price: true,
        units: {
          orderBy: { carpetAreaSqFt: 'asc' },
        },
        amenities: {
          orderBy: [{ category: 'asc' }, { name: 'asc' }],
        },
        media: {
          orderBy: { orderIndex: 'asc' },
        },
        faqs: true,
        documents: true,
        contacts: true,
      },
    });

    if (!property) return null;

    return {
      ...property,
      price: serializePrice(property.price),
      units: property.units.map(serializeUnit),
    };
  }

  /**
   * Find a single property by ID
   */
  async findById(id: string): Promise<SerializedPropertyDetail | null> {
    const property = await this.prisma.property.findUnique({
      where: { id },
      include: {
        location: true,
        price: true,
        units: {
          orderBy: { carpetAreaSqFt: 'asc' },
        },
        amenities: {
          orderBy: [{ category: 'asc' }, { name: 'asc' }],
        },
        media: {
          orderBy: { orderIndex: 'asc' },
        },
        faqs: true,
        documents: true,
        contacts: true,
      },
    });

    if (!property) return null;

    return {
      ...property,
      price: serializePrice(property.price),
      units: property.units.map(serializeUnit),
    };
  }

  /**
   * Get verified ground-truth price for a property
   */
  async getPriceBySlug(slug: string): Promise<SerializedPropertyPrice | null> {
    const property = await this.prisma.property.findUnique({
      where: { slug },
      select: {
        price: true,
      },
    });

    if (!property || !property.price) return null;
    return serializePrice(property.price);
  }

  /**
   * Get unit configurations and carpet area breakdown
   */
  async getUnitsBySlug(slug: string): Promise<SerializedPropertyUnit[] | null> {
    const property = await this.prisma.property.findUnique({
      where: { slug },
      select: {
        units: {
          orderBy: { carpetAreaSqFt: 'asc' },
        },
      },
    });

    if (!property) return null;
    return property.units.map(serializeUnit);
  }

  /**
   * Get location details and connectivity highlights
   */
  async getLocationBySlug(slug: string) {
    const property = await this.prisma.property.findUnique({
      where: { slug },
      select: {
        location: true,
      },
    });

    if (!property) return null;
    return property.location;
  }

  /**
   * Get amenities, optionally filtered by category
   */
  async getAmenitiesBySlug(slug: string, category?: string) {
    const whereClause: Record<string, unknown> = {};
    if (category) {
      whereClause.category = {
        contains: category,
        mode: 'insensitive',
      };
    }

    const property = await this.prisma.property.findUnique({
      where: { slug },
      select: {
        amenities: {
          where: whereClause,
          orderBy: [{ category: 'asc' }, { name: 'asc' }],
        },
      },
    });

    if (!property) return null;
    return property.amenities;
  }

  /**
   * Get media assets, optionally filtered by media type
   */
  async getMediaBySlug(slug: string, type?: string) {
    const whereClause: Record<string, unknown> = {};
    if (type) {
      whereClause.type = {
        equals: type.toUpperCase(),
      };
    }

    const property = await this.prisma.property.findUnique({
      where: { slug },
      select: {
        media: {
          where: whereClause,
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    if (!property) return null;
    return property.media;
  }

  /**
   * Get inventory and unit availability summary
   */
  async getAvailabilityBySlug(slug: string): Promise<AvailabilitySummary | null> {
    const property = await this.prisma.property.findUnique({
      where: { slug },
      select: {
        slug: true,
        title: true,
        status: true,
        units: {
          select: {
            unitType: true,
            carpetAreaSqFt: true,
            priceDisplay: true,
            unitsAvailable: true,
          },
          orderBy: { carpetAreaSqFt: 'asc' },
        },
      },
    });

    if (!property) return null;

    const totalAvailable = property.units.reduce((sum, u) => sum + u.unitsAvailable, 0);

    return {
      propertySlug: property.slug,
      propertyTitle: property.title,
      propertyStatus: property.status,
      totalAvailableUnits: totalAvailable,
      units: property.units,
    };
  }

  /**
   * Get FAQs, optionally searching by keyword in question, answer, or keywords list
   */
  async getFaqsBySlug(slug: string, keyword?: string) {
    const property = await this.prisma.property.findUnique({
      where: { slug },
      select: {
        faqs: true,
      },
    });

    if (!property) return null;

    if (!keyword || keyword.trim() === '') {
      return property.faqs;
    }

    const term = keyword.toLowerCase().trim();
    return property.faqs.filter(
      (f) =>
        f.question.toLowerCase().includes(term) ||
        f.answer.toLowerCase().includes(term) ||
        f.keywords.some((k) => k.toLowerCase().includes(term)),
    );
  }

  /**
   * Get property sales advisors and representatives
   */
  async getContactsBySlug(slug: string) {
    const property = await this.prisma.property.findUnique({
      where: { slug },
      select: {
        contacts: true,
      },
    });

    if (!property) return null;
    return property.contacts;
  }

  /**
   * Get property documents (brochures, RERA certificates, etc.)
   */
  async getDocumentsBySlug(slug: string) {
    const property = await this.prisma.property.findUnique({
      where: { slug },
      select: {
        documents: true,
      },
    });

    if (!property) return null;
    return property.documents;
  }
}
