export interface PropertyExtractionContext {
  messageText: string;
  knownProperties: Array<{ slug: string; title: string }>;
}

export function buildPropertyExtractionPrompt(context: PropertyExtractionContext): {
  systemPrompt: string;
  userPrompt: string;
} {
  const propertyCatalog = context.knownProperties
    .map((p) => `- "${p.title}" (slug: "${p.slug}")`)
    .join('\n');

  const systemPrompt = `You are a real estate entity extractor.
Given a customer's message and a catalog of known properties, identify which property the customer is referring to.

Known Properties:
${propertyCatalog}

Rules:
- If a property title, nickname, or typo unambiguously matches one in the list, extract its slug.
- If no specific property is mentioned, return null.

Output strictly valid JSON:
{
  "matchedSlug": string | null,
  "confidence": number,
  "detectedMention": string | null
}`;

  const userPrompt = `Customer message:
"""
${context.messageText}
"""`;

  return { systemPrompt, userPrompt };
}
