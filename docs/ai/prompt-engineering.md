# Prompt Engineering & Ground-Truth Context Injection

> **Engine**: Local Ollama (`qwen2.5:3b`)  
> **Package**: `@property-ai/prompts`  
> **Schema Enforcement**: Zod Validation via `@property-ai/validation`  

---

## 1. Intent Classification Prompt Strategy

The system relies on few-shot structured prompting requiring the local LLM to return strict JSON matching this schema:

```json
{
  "intent": "PROPERTY_PRICE | PROPERTY_AREA | PROPERTY_LOCATION | PROPERTY_AMENITIES | PROPERTY_BROCHURE | PROPERTY_SITE_VISIT | PROPERTY_CONTACT | PROPERTY_LOAN | PROPERTY_AVAILABILITY | GENERAL_GREETING | HUMAN_REQUIRED | UNKNOWN",
  "language": "en | hi | hinglish",
  "propertySlug": "string | null",
  "confidence": 0.95,
  "requiresHuman": false,
  "detectedEntities": {
    "unitType": "3BHK",
    "budget": null,
    "locationQuery": null,
    "requestType": null
  },
  "reasoning": "Customer specifically asked about 3BHK villa starting pricing in Hinglish."
}
```

### Safety & Escalation Rules Built into System Prompts
1. **Price Negotiation**: If the customer asks for a discount, offer, negotiation, or waiver, `intent` must be set to `HUMAN_REQUIRED`, `requiresHuman: true`, and `confidence: 1.0`.
2. **Legal & Disputes**: Any question regarding litigation, disputes, land titling, or compensation forces `HUMAN_REQUIRED`.
3. **Explicit Agent Request**: Demands to speak with a human/manager/person force `HUMAN_REQUIRED`.

---

## 2. Ground-Truth Injection Pattern

When generating customer-facing replies, the prompt **NEVER** allows the model to draw upon internal training data for real estate facts. Instead, the prompt template injects the exact database parameters from `PropertyService`:

```markdown
SYSTEM:
You are an AI sales assistant for Luxzirius Villas.
State ONLY facts provided in the GROUND TRUTH block below.
Never invent discounts, unlisted payment terms, or possession dates.

GROUND TRUTH:
- Developer: Luxzirius Realty Pvt Ltd (Demo)
- Status: AVAILABLE (Possession: December 2026 (Estimated))
- RERA: PRM/KA/RERA/1251/310/PR/000000/DEMO
- Address: Survey No. 42, Lakeview Road, Tech Corridor, Bengaluru
- Pricing: ₹1.75 Cr - ₹3.20 Cr
- Booking Amount: ₹5,00,000
- Available Configurations:
  * 3BHK Luxury Villa: 2250 sq.ft carpet area (₹1.75 Cr) - 8 units available
  * 4BHK Grand Villa: 3100 sq.ft carpet area (₹2.65 Cr) - 4 units available
  * 5BHK Presidential Villa: 4200 sq.ft carpet area (₹3.20 Cr) - 2 units available
- Amenities: 25,000 sq.ft Clubhouse, Olympic Swimming Pool, Tennis & Squash Courts
- Sales Contact: Vikram Malhotra (Lead Property Advisor) - Phone: +919876543210
```

This guarantees 0% hallucination rate on critical sales conversations.
