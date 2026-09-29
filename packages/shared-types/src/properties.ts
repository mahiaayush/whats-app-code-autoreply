export type PropertyStatus = 'AVAILABLE' | 'FEW_UNITS_LEFT' | 'SOLD_OUT' | 'UPCOMING';

export type MediaType = 'IMAGE' | 'VIDEO' | 'BROCHURE' | 'FLOOR_PLAN';

export interface PropertyLocation {
  id?: string;
  address: string;
  city: string;
  state?: string;
  pincode?: string;
  landmark?: string | null;
  googleMapsUrl?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  connectivityHighlights: string[];
}

export interface PropertyPrice {
  id?: string;
  startingPrice: number;
  maxPrice?: number | null;
  pricePerSqFt?: number | null;
  currency: string; // e.g. "INR"
  priceDisplayFormatted: string; // e.g. "₹1.25 Cr - ₹2.50 Cr"
  bookingAmount?: number | null;
  paymentPlans?: string[];
  maintenanceCharges?: string | null;
}

export interface PropertyUnit {
  id?: string;
  unitType: string; // e.g. "3 BHK Villa", "4 BHK Villa"
  carpetAreaSqFt: number;
  superBuiltUpAreaSqFt?: number | null;
  basePrice?: number | null;
  priceDisplay?: string | null;
  floorPlanUrl?: string | null;
  unitsAvailable: number;
}

export interface PropertyAmenity {
  id?: string;
  category: string; // e.g. "Sports", "Leisure", "Security"
  name: string;
  description?: string | null;
  icon?: string | null;
}

export interface PropertyMedia {
  id?: string;
  type: MediaType;
  title: string;
  url: string;
  thumbnailUrl?: string | null;
  isHero: boolean;
  orderIndex: number;
}

export interface PropertyFaq {
  id?: string;
  question: string;
  answer: string;
  category?: string | null;
  keywords: string[];
}

export interface PropertyDocument {
  id?: string;
  title: string;
  type: string; // e.g. "BROCHURE", "PRICE_SHEET", "RERA_CERTIFICATE"
  fileUrl: string;
  fileSizeBytes?: number | null;
}

export interface PropertyContact {
  id?: string;
  role: string; // e.g. "Sales Manager", "Site Executive"
  name: string;
  phone: string;
  email?: string | null;
  availabilityHours?: string | null;
}

export interface Property {
  id: string;
  slug: string;
  title: string;
  tagline?: string | null;
  description: string;
  status: PropertyStatus;
  developerName: string;
  reraRegistrationNumber?: string | null;
  possessionDate?: string | null;
  location?: PropertyLocation | null;
  price?: PropertyPrice | null;
  units: PropertyUnit[];
  amenities: PropertyAmenity[];
  media: PropertyMedia[];
  faqs: PropertyFaq[];
  documents: PropertyDocument[];
  contacts: PropertyContact[];
  createdAt: Date;
  updatedAt: Date;
}
