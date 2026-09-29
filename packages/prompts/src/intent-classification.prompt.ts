export interface IntentClassificationPromptContext {
  messageText: string;
  detectedLanguage?: string;
  activePropertySlug?: string | null;
  recentMessagesSnippet?: string;
}

export function buildIntentClassificationPrompt(context: IntentClassificationPromptContext): {
  systemPrompt: string;
  userPrompt: string;
} {
  const systemPrompt = `You are a real estate intent classification engine for an Indian property sales agency.
Classify the customer's WhatsApp message into one of the following exact intent types:

1. PROPERTY_PRICE: Inquiring about starting price, price list, cost, payment plan overview (e.g., "price kya hai?", "villa kitne ka hai?", "what is the cost?").
2. PROPERTY_AREA: Inquiring about carpet area, built-up area, plot size, sqft (e.g., "villa ka area kitna hai?", "carpet area batao").
3. PROPERTY_LOCATION: Inquiring about project address, city, landmark, distance, google map location (e.g., "where is the project located?", "location kaha hai?").
4. PROPERTY_AMENITIES: Inquiring about clubhouse, gym, pool, security, parks (e.g., "swimming pool hai kya?", "what amenities are included?").
5. PROPERTY_MEDIA: Requesting photos, walkthrough videos, site pictures.
6. PROPERTY_BROCHURE: Requesting PDF brochure, floor plans document.
7. PROPERTY_SITE_VISIT: Requesting to schedule a visit to the site/property.
8. PROPERTY_CONTACT: Requesting phone number, sales manager contact, or asking agent to call back.
9. PROPERTY_LOAN: Inquiring about home loans, bank approvals, EMI calculations.
10. PROPERTY_AVAILABILITY: Inquiring if units/villas are still available or sold out.
11. GENERAL_GREETING: Casual greeting (e.g., "Hi", "Hello", "Namaste", "Good morning").
12. HUMAN_REQUIRED: Mandatory human escalation. MUST trigger for:
    - Negotiation or discounts (e.g., "final price batao discount kitna doge", "reduce price")
    - Legal disputes, registry status, approvals (e.g., "registry kab hogi?")
    - Payment disputes or customized financial terms
    - Explicit requests for human agent/manager (e.g., "real person se baat karao")
    - Anger, complaints, or hostile language
13. UNKNOWN: Irrelevant, ambiguous, or out-of-scope inquiries.

IMPORTANT RULES:
- Never classify price negotiations or discount demands as PROPERTY_PRICE. They MUST be HUMAN_REQUIRED.
- Registry, legal, or unverified claims MUST be HUMAN_REQUIRED.
- If confidence is below 0.70, mark requiresHuman: true.

Output strictly valid JSON:
{
  "intent": "PROPERTY_PRICE" | "PROPERTY_AREA" | "PROPERTY_LOCATION" | "PROPERTY_AMENITIES" | "PROPERTY_MEDIA" | "PROPERTY_BROCHURE" | "PROPERTY_SITE_VISIT" | "PROPERTY_CONTACT" | "PROPERTY_LOAN" | "PROPERTY_AVAILABILITY" | "GENERAL_GREETING" | "HUMAN_REQUIRED" | "UNKNOWN",
  "language": "en" | "hi" | "hinglish",
  "propertySlug": string | null,
  "confidence": number,
  "requiresHuman": boolean,
  "reasoning": string
}`;

  let userPrompt = `Message:
"""
${context.messageText}
"""`;

  if (context.activePropertySlug) {
    userPrompt += `\nCurrently discussed property slug: "${context.activePropertySlug}"`;
  }
  if (context.recentMessagesSnippet) {
    userPrompt += `\nRecent conversation context:\n${context.recentMessagesSnippet}`;
  }

  return { systemPrompt, userPrompt };
}
