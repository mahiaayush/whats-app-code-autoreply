import { config, logger } from '../../config/index.js';
import { OllamaClient } from './ollama.client.js';
import { PropertyService } from '../properties/property.service.js';
import {
  buildIntentClassificationPrompt,
  buildLanguageDetectionPrompt,
  buildResponseGenerationPrompt,
} from '@property-ai/prompts';
import {
  AiClassificationSchema,
  GeneratedResponseSchema,
  LanguageDetectionSchema,
  type AiClassificationDto,
  type GeneratedResponseDto,
} from '@property-ai/validation';
import type { AIResponsePayload, LanguageCode } from '@property-ai/shared-types';

export class AiService {
  private ollama: OllamaClient;
  private propertyService: PropertyService;

  constructor(ollamaClient?: OllamaClient, propertyService?: PropertyService) {
    this.ollama = ollamaClient || new OllamaClient();
    this.propertyService = propertyService || new PropertyService();
  }

  /**
   * Fast Language Detection Heuristic with LLM fallback
   */
  async detectLanguage(messageText: string): Promise<LanguageCode> {
    const text = messageText.trim();

    // 1. Fast regex checks
    // Devanagari script detection
    if (/[\u0900-\u097F]/.test(text)) {
      return 'hi';
    }

    // Common Hinglish marker words
    const hinglishMarkers = [
      /\b(kya|hai|kitna|kitne|hoga|chahiye|batao|milega|karna|kaise|kaha|bhai|sahab|namaste|shuru|bache)\b/i,
    ];
    if (hinglishMarkers.some((regex) => regex.test(text))) {
      return 'hinglish';
    }

    // Fast English detection: standard English question markers
    const englishWords =
      /\b(the|is|what|where|are|there|any|how|can|please|when|court|litigation|case|legal|dispute|who|give|me|you|we|about|starting|price|villas?)\b/i;
    if (englishWords.test(text)) {
      return 'en';
    }

    // 2. LLM detection fallback if text is long enough and ambiguous
    if (text.length > 20) {
      try {
        const { systemPrompt, userPrompt } = buildLanguageDetectionPrompt({ messageText: text });
        const result = await this.ollama.generateStructuredJson({
          prompt: userPrompt,
          system: systemPrompt,
          schema: LanguageDetectionSchema,
        });
        return result.language;
      } catch (err) {
        logger.debug({ err }, 'Language detection LLM fallback failed, defaulting to en');
      }
    }

    return 'en';
  }

  /**
   * Classify message into verified Intent, Language, and Human Escalation requirement
   */
  async classifyMessage(
    messageText: string,
    context?: {
      activePropertySlug?: string;
      recentMessagesSnippet?: string;
      language?: LanguageCode;
    },
  ): Promise<AiClassificationDto> {
    const text = messageText.trim();
    const detectedLang = context?.language || (await this.detectLanguage(text));

    // 1. Pre-LLM Safety Guardrail: Force human escalation for critical keywords
    const negotiationRegex =
      /\b(discount|negotiat|kam karo|kam hoga|final price|best price|offer price|bargain|deal karlo|price kam)\b/i;
    const legalDisputeRegex =
      /\b(registry|khata|rera case|dispute|illegal|case|court|litigation|lawyer|complaint|police)\b/i;
    const humanDemandRegex =
      /\b(human|agent|person|manager|salesman|representative|baat karao|call me|insan)\b/i;

    if (negotiationRegex.test(text)) {
      return {
        intent: 'HUMAN_REQUIRED',
        language: detectedLang,
        propertySlug: context?.activePropertySlug || null,
        confidence: 1.0,
        requiresHuman: true,
        reasoning: 'Price negotiation or discount request requires mandatory human operator review.',
      };
    }

    if (legalDisputeRegex.test(text)) {
      return {
        intent: 'HUMAN_REQUIRED',
        language: detectedLang,
        propertySlug: context?.activePropertySlug || null,
        confidence: 1.0,
        requiresHuman: true,
        reasoning: 'Legal, registry, or dispute inquiry requires mandatory human escalation.',
      };
    }

    if (humanDemandRegex.test(text)) {
      return {
        intent: 'HUMAN_REQUIRED',
        language: detectedLang,
        propertySlug: context?.activePropertySlug || null,
        confidence: 1.0,
        requiresHuman: true,
        reasoning: 'Customer explicitly requested to interact with a human agent or manager.',
      };
    }

    // 2. LLM-powered Intent Classification
    const { systemPrompt, userPrompt } = buildIntentClassificationPrompt({
      messageText: text,
      detectedLanguage: detectedLang,
      activePropertySlug: context?.activePropertySlug,
      recentMessagesSnippet: context?.recentMessagesSnippet,
    });

    let classification: AiClassificationDto;
    try {
      classification = await this.ollama.generateStructuredJson({
        system: systemPrompt,
        prompt: userPrompt,
        schema: AiClassificationSchema,
      });
    } catch (err) {
      logger.warn({ err }, 'Ollama classification failed; defaulting to HUMAN_REQUIRED fallback');
      return {
        intent: 'HUMAN_REQUIRED',
        language: detectedLang,
        propertySlug: context?.activePropertySlug || null,
        confidence: 0.5,
        requiresHuman: true,
        reasoning: 'AI model service unavailable or returned invalid schema; routing to human fallback.',
      };
    }

    // 3. Post-LLM Confidence Threshold Guard
    if (classification.confidence < config.AI_CONFIDENCE_THRESHOLD) {
      classification.requiresHuman = true;
      classification.intent = 'HUMAN_REQUIRED';
      classification.reasoning = `Confidence (${classification.confidence}) is below configured threshold (${config.AI_CONFIDENCE_THRESHOLD}).`;
    }

    return classification;
  }

  /**
   * Generate an anti-hallucination, ground-truth anchored customer response
   */
  async generateResponse(options: {
    customerQuery: string;
    intent: string;
    language: LanguageCode;
    propertySlug?: string;
    customerName?: string;
  }): Promise<GeneratedResponseDto> {
    const slug = options.propertySlug || 'luxzirius-villas';

    // Retrieve verified PostgreSQL ground truth
    const property = await this.propertyService.getProperty(slug);

    const verifiedPropertyFacts: Record<string, unknown> = {
      title: property.title,
      developer: property.developerName,
      status: property.status,
      possessionDate: property.possessionDate,
      reraNumber: property.reraRegistrationNumber,
      pricing: property.price
        ? {
            display: property.price.priceDisplayFormatted,
            startingPrice: property.price.startingPrice,
            bookingAmount: property.price.bookingAmount,
            paymentPlans: property.price.paymentPlans,
          }
        : null,
      units: property.units.map((u) => ({
        unitType: u.unitType,
        carpetAreaSqFt: u.carpetAreaSqFt,
        priceDisplay: u.priceDisplay,
        unitsAvailable: u.unitsAvailable,
      })),
      location: property.location
        ? {
            address: property.location.address,
            city: property.location.city,
            landmark: property.location.landmark,
            googleMapsUrl: property.location.googleMapsUrl,
            connectivity: property.location.connectivityHighlights,
          }
        : null,
      amenities: property.amenities.map((a) => a.name),
      contacts: property.contacts.map((c) => ({
        role: c.role,
        name: c.name,
        phone: c.phone,
        hours: c.availabilityHours,
      })),
    };

    const { systemPrompt, userPrompt } = buildResponseGenerationPrompt({
      customerName: options.customerName,
      customerQuery: options.customerQuery,
      intent: options.intent,
      language: options.language,
      verifiedPropertyFacts,
    });

    try {
      const generated = await this.ollama.generateStructuredJson<GeneratedResponseDto>({
        system: systemPrompt,
        prompt: userPrompt,
        schema: GeneratedResponseSchema,
        temperature: 0.1, // Near-zero temperature for maximum factual consistency
      });

      return generated;
    } catch (err) {
      logger.warn({ err }, 'Ollama response generation failed, falling back to deterministic template');

      // Zero-failure fallback using deterministic formatters
      if (options.intent === 'PROPERTY_PRICE') {
        const text = await this.propertyService.formatPriceResponse(slug, options.language);
        return {
          response: text,
          language: options.language,
          groundedFactsUsed: ['pricing', 'bookingAmount'],
          confidence: 1.0,
        };
      }

      if (options.intent === 'PROPERTY_AVAILABILITY') {
        const text = await this.propertyService.formatAvailabilityResponse(slug, options.language);
        return {
          response: text,
          language: options.language,
          groundedFactsUsed: ['unitInventory', 'status'],
          confidence: 1.0,
        };
      }

      return {
        response: `Thank you for inquiring about ${property.title}. Our lead property advisor is reviewing your request and will share details directly with you shortly.`,
        language: options.language,
        groundedFactsUsed: ['title'],
        confidence: 0.9,
      };
    }
  }

  /**
   * Complete End-to-End Chat Pipeline (Classification -> Ground-Truth Sourcing -> Response Generation)
   */
  async executeChatPipeline(options: {
    message: string;
    propertySlug?: string;
    language?: LanguageCode;
    customerName?: string;
  }): Promise<AIResponsePayload> {
    const propertySlug = options.propertySlug || 'luxzirius-villas';

    // Step 1: Classify intent and safety requirement
    const classification = await this.classifyMessage(options.message, {
      activePropertySlug: propertySlug,
      language: options.language,
    });

    const language = classification.language || options.language || 'en';

    // Step 2: Handle mandatory human escalation
    if (classification.requiresHuman) {
      let escalationMessage =
        'Thank you for reaching out! A senior property sales advisor will assist you personally regarding this shortly.';
      if (language === 'hi') {
        escalationMessage =
          'संपर्क करने के लिए धन्यवाद! हमारे वरिष्ठ प्रॉपर्टी सलाहकार शीघ्र ही आपसे व्यक्तिगत रूप से संपर्क करेंगे।';
      } else if (language === 'hinglish') {
        escalationMessage =
          'Thank you contact karne ke liye! Hamare senior property advisor jaldi hi aapko personally assist karenge.';
      }

      return {
        content: escalationMessage,
        language,
        intent: classification.intent,
        confidence: classification.confidence,
        source: 'HUMAN_FALLBACK',
        requiresHuman: true,
        escalationReason: classification.reasoning || 'Human assistance required',
        metadata: {
          classificationReasoning: classification.reasoning,
        },
      };
    }

    // Step 3: Generate grounded response using verified PostgreSQL facts
    const response = await this.generateResponse({
      customerQuery: options.message,
      intent: classification.intent,
      language,
      propertySlug,
      customerName: options.customerName,
    });

    return {
      content: response.response,
      language: response.language,
      intent: classification.intent,
      confidence: Math.min(classification.confidence, response.confidence),
      source: 'LLM',
      requiresHuman: false,
      metadata: {
        groundedFactsUsed: response.groundedFactsUsed,
        suggestedFollowUps: response.suggestedFollowUps,
      },
    };
  }
}
