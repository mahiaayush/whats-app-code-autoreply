import { z } from 'zod';

export const PropertyLocationSchema = z.object({
  address: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().optional(),
  pincode: z.string().optional(),
  landmark: z.string().nullable().optional(),
  googleMapsUrl: z.string().url().nullable().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  connectivityHighlights: z.array(z.string()).default([]),
});

export const PropertyPriceSchema = z.object({
  startingPrice: z.number().positive('Starting price must be positive'),
  maxPrice: z.number().positive().nullable().optional(),
  pricePerSqFt: z.number().positive().nullable().optional(),
  currency: z.string().default('INR'),
  priceDisplayFormatted: z.string().min(1, 'Formatted price display is required'),
  bookingAmount: z.number().positive().nullable().optional(),
  paymentPlans: z.array(z.string()).default([]),
  maintenanceCharges: z.string().nullable().optional(),
});

export const PropertyUnitSchema = z.object({
  unitType: z.string().min(1, 'Unit type is required'),
  carpetAreaSqFt: z.number().positive('Carpet area must be positive'),
  superBuiltUpAreaSqFt: z.number().positive().nullable().optional(),
  basePrice: z.number().positive().nullable().optional(),
  priceDisplay: z.string().nullable().optional(),
  floorPlanUrl: z.string().url().nullable().optional(),
  unitsAvailable: z.number().int().min(0).default(1),
});

export const PropertyAmenitySchema = z.object({
  category: z.string().min(1, 'Category is required'),
  name: z.string().min(1, 'Amenity name is required'),
  description: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
});

export const PropertyMediaSchema = z.object({
  type: z.enum(['IMAGE', 'VIDEO', 'BROCHURE', 'FLOOR_PLAN']),
  title: z.string().min(1, 'Media title is required'),
  url: z.string().url('Must be a valid URL'),
  thumbnailUrl: z.string().url().nullable().optional(),
  isHero: z.boolean().default(false),
  orderIndex: z.number().int().default(0),
});

export const PropertyFaqSchema = z.object({
  question: z.string().min(1, 'Question is required'),
  answer: z.string().min(1, 'Answer is required'),
  category: z.string().nullable().optional(),
  keywords: z.array(z.string()).default([]),
});

export const CreatePropertySchema = z.object({
  slug: z
    .string()
    .min(2)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  title: z.string().min(2, 'Title must have at least 2 characters'),
  tagline: z.string().nullable().optional(),
  description: z.string().min(10, 'Description must have at least 10 characters'),
  status: z.enum(['AVAILABLE', 'FEW_UNITS_LEFT', 'SOLD_OUT', 'UPCOMING']).default('AVAILABLE'),
  developerName: z.string().min(2, 'Developer name is required'),
  reraRegistrationNumber: z.string().nullable().optional(),
  possessionDate: z.string().nullable().optional(),
  location: PropertyLocationSchema.optional(),
  price: PropertyPriceSchema.optional(),
  units: z.array(PropertyUnitSchema).default([]),
  amenities: z.array(PropertyAmenitySchema).default([]),
  media: z.array(PropertyMediaSchema).default([]),
  faqs: z.array(PropertyFaqSchema).default([]),
});

export type CreatePropertyDto = z.infer<typeof CreatePropertySchema>;

export const UpdatePropertySchema = CreatePropertySchema.partial();
export type UpdatePropertyDto = z.infer<typeof UpdatePropertySchema>;
