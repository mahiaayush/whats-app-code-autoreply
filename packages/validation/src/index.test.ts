import { describe, it, expect } from 'vitest';
import {
  IncomingMessageSchema,
  AiClassificationSchema,
  EscalationDetectionSchema,
  CreateShortcutSchema,
  CreatePropertySchema,
} from './index.js';

describe('Validation Package Schemas', () => {
  it('should validate valid incoming messages', () => {
    const valid = {
      externalMessageId: 'msg_12345',
      chatId: '919876543210@c.us',
      customerName: 'Rahul Sharma',
      customerPhone: '+919876543210',
      message: 'Villa kitne ka hai?',
      timestamp: Date.now(),
      direction: 'INCOMING' as const,
    };
    const result = IncomingMessageSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('should reject incoming messages with empty message content', () => {
    const invalid = {
      externalMessageId: 'msg_12345',
      chatId: '919876543210@c.us',
      customerName: 'Rahul Sharma',
      message: '',
      timestamp: Date.now(),
      direction: 'INCOMING' as const,
    };
    const result = IncomingMessageSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should validate structured AI classification outputs', () => {
    const aiOutput = {
      intent: 'PROPERTY_PRICE',
      language: 'hi',
      propertySlug: 'luxzirius-villas',
      confidence: 0.96,
      requiresHuman: false,
    };
    const result = AiClassificationSchema.safeParse(aiOutput);
    expect(result.success).toBe(true);
  });

  it('should reject AI classification with invalid intent', () => {
    const invalidAiOutput = {
      intent: 'INVALID_INTENT_XYZ',
      language: 'hi',
      confidence: 0.9,
      requiresHuman: false,
    };
    const result = AiClassificationSchema.safeParse(invalidAiOutput);
    expect(result.success).toBe(false);
  });

  it('should validate escalation detection schema', () => {
    const escalation = {
      requiresHuman: true,
      reason: 'NEGOTIATION',
      priority: 'HIGH',
      confidence: 0.88,
      explanation: 'Customer requested a direct discount on the villa price',
    };
    const result = EscalationDetectionSchema.safeParse(escalation);
    expect(result.success).toBe(true);
  });

  it('should validate shortcut creation schema', () => {
    const shortcut = {
      command: '/price',
      name: 'Price Inquiry',
      description: 'Provides property price details',
      targetIntent: 'PROPERTY_PRICE',
      naturalLanguagePhrases: ['price kya hai', 'kitne ka hai', 'what is the price'],
      enabled: true,
      priority: 10,
    };
    const result = CreateShortcutSchema.safeParse(shortcut);
    expect(result.success).toBe(true);
  });

  it('should reject shortcut commands that do not start with slash', () => {
    const invalidShortcut = {
      command: 'price',
      name: 'Price Inquiry',
      description: 'Provides property price details',
      targetIntent: 'PROPERTY_PRICE',
    };
    const result = CreateShortcutSchema.safeParse(invalidShortcut);
    expect(result.success).toBe(false);
  });

  it('should validate property creation schema', () => {
    const property = {
      slug: 'luxzirius-villas',
      title: 'Luxzirius Villas',
      tagline: 'Exclusive Luxury Living',
      description: 'A premium enclave of 4BHK and 5BHK luxury villas with private pools.',
      status: 'AVAILABLE' as const,
      developerName: 'Luxzirius Developers',
      price: {
        startingPrice: 15000000,
        currency: 'INR',
        priceDisplayFormatted: '₹1.50 Cr Onwards',
      },
    };
    const result = CreatePropertySchema.safeParse(property);
    expect(result.success).toBe(true);
  });
});
