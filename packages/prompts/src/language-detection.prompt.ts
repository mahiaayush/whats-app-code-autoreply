export interface LanguageDetectionPromptContext {
  messageText: string;
}

export function buildLanguageDetectionPrompt(context: LanguageDetectionPromptContext): {
  systemPrompt: string;
  userPrompt: string;
} {
  const systemPrompt = `You are a specialized linguistic classifier for a real estate WhatsApp assistant in India.
Analyze the customer's message and determine the primary language:
- "en": English (e.g., "What is the price of the 4BHK villa?")
- "hi": Pure Hindi in Devanagari script (e.g., "विला की कीमत क्या है?")
- "hinglish": Hindi written in Roman/Latin script, or a natural mix of Hindi and English words (e.g., "bhai price kya hai?", "villa kitne ka hai?", "location kahan hai please tell me").

You MUST return ONLY valid JSON matching this schema:
{
  "language": "en" | "hi" | "hinglish",
  "confidence": number (between 0.0 and 1.0)
}`;

  const userPrompt = `Classify the language of this message:
"""
${context.messageText}
"""`;

  return { systemPrompt, userPrompt };
}
