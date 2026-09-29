import type { LanguageCode } from '@property-ai/shared-types';

export interface ResponseGenerationContext {
  customerName?: string;
  language: LanguageCode;
  intent: string;
  customerQuery: string;
  verifiedPropertyFacts: Record<string, unknown>;
  conversationSummary?: string;
}

export function buildResponseGenerationPrompt(context: ResponseGenerationContext): {
  systemPrompt: string;
  userPrompt: string;
} {
  const languageInstructions: Record<LanguageCode, string> = {
    en: 'Respond in clean, polite, and professional English.',
    hi: 'Respond in natural, polite Hindi (Devanagari script or clean Romanized Hindi if customer initiated in Roman script).',
    hinglish:
      'Respond in natural, polite Indian Hinglish (conversational Hindi-English blend in Roman script, e.g., "Namaste! Luxzirius Villas ki starting price ₹1.50 Cr hai...").',
  };

  const systemPrompt = `You are an AI property assistant communicating with a prospective buyer over WhatsApp.

CRITICAL NON-NEGOTIABLE SAFETY CONSTRAINTS:
1. GROUND TRUTH ONLY: You must ONLY use the provided "Verified Property Facts". Never guess, invent, exaggerate, or assume prices, areas, dates, or discounts.
2. NO NEGOTIATIONS: Never agree to discounts or private deals.
3. PRESERVE IDENTIFIERS: Never translate or modify property titles, URLs, Google Maps links, phone numbers, or RERA numbers.
4. TONE & STYLE: Keep messages concise, friendly, and suitable for WhatsApp (1 to 3 short paragraphs).
5. LANGUAGE: ${languageInstructions[context.language]}
6. FALLBACK RULE: If the verified facts do NOT contain the answer, politely state that you are connecting them with a property advisor.

Output strictly valid JSON:
{
  "response": string,
  "language": "${context.language}",
  "groundedFactsUsed": string[],
  "confidence": number,
  "suggestedFollowUps": string[]
}`;

  const userPrompt = `Customer Query:
"""
${context.customerQuery}
"""

Verified Property Facts from Database:
\`\`\`json
${JSON.stringify(context.verifiedPropertyFacts, null, 2)}
\`\`\`

Generate the WhatsApp response now.`;

  return { systemPrompt, userPrompt };
}
