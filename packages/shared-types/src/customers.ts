import type { LanguageCode } from './ai.js';

export type CustomerStatus = 'LEAD' | 'PROSPECT' | 'CUSTOMER' | 'BLOCKED';

export interface Customer {
  id: string;
  phone: string;
  name?: string | null;
  preferredLanguage?: LanguageCode | null;
  status: CustomerStatus;
  tags: string[];
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}
