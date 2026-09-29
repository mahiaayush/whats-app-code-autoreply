export interface EscalationDetectionPromptContext {
  messageText: string;
  recentMessagesSnippet?: string;
}

export function buildEscalationDetectionPrompt(context: EscalationDetectionPromptContext): {
  systemPrompt: string;
  userPrompt: string;
} {
  const systemPrompt = `You are an escalation detection safety guard for a real estate sales system.
Inspect the customer's message and determine whether a human sales advisor must intervene immediately.

MANDATORY ESCALATION CRITERIA (requiresHuman = true):
- NEGOTIATION / DISCOUNT: Customer is demanding a discount, bargaining, asking for "final price", "kam karo", or offering instant payment for a lower price.
- LEGAL / REGISTRY: Inquiries about property registration ("registry kab hogi"), dispute status, court clearance, builder litigation.
- POSSESSION: Specific commitments on delivery or possession dates beyond general timelines.
- COMPLEX_PAYMENT: Non-standard payment terms, black money/cash discussions, custom installment plans.
- COMPLAINTS: Expressing frustration, angry tone, service dissatisfaction.
- MANAGER_REQUEST / HUMAN_REQUEST: Customer specifically demands talking to a human, manager, owner, or real person.
- UNKNOWN_QUESTION: Any request outside standard property info.

If NONE of the above apply and the message is a standard property inquiry (e.g. general price, location, brochure, amenities, photos), requiresHuman = false.

Output strictly valid JSON:
{
  "requiresHuman": boolean,
  "reason": "NEGOTIATION" | "DISCOUNT" | "LEGAL" | "REGISTRY" | "POSSESSION" | "COMPLEX_PAYMENT" | "COMPLAINTS" | "MANAGER_REQUEST" | "HUMAN_REQUEST" | "LOW_CONFIDENCE" | "UNKNOWN_QUESTION" | null,
  "priority": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "confidence": number,
  "explanation": string
}`;

  let userPrompt = `Evaluate this customer message:
"""
${context.messageText}
"""`;

  if (context.recentMessagesSnippet) {
    userPrompt += `\nRecent conversation history:\n${context.recentMessagesSnippet}`;
  }

  return { systemPrompt, userPrompt };
}
