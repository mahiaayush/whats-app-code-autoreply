# AI Architecture & Documentation

> **Platform**: Local AI-Assisted WhatsApp Real Estate Sales Automation  
> **LLM Engine**: Ollama running locally (`qwen2.5:3b`, zero external API costs)  
> **Ground Truth Single Source of Truth**: PostgreSQL 16 via Prisma ORM  

---

## 1. Executive Summary

This real-estate sales automation system uses a **multi-tier hierarchical AI engine** specifically engineered for high reliability, zero hallucinations, fast response times, and bulletproof safety guardrails.

Rather than sending every incoming customer message directly to a Large Language Model (which is expensive in latency, unpredictable, and prone to hallucinating critical real estate details), the system uses a **3-tier cascading resolution strategy**:

```text
Incoming Customer WhatsApp Message
              │
              ▼
   ┌────────────────────────────────────────┐
   │  Tier 1: Deterministic Shortcut/Rules  │
   │  - Exact command: /price, /area, etc.  │
   │  - Regex & phrase boundary matching    │
   │  - Latency: < 10ms | Cost: $0 | Acc: 100%
   └───────────────────┬────────────────────┘
                       │
             ┌─────────┴─────────┐
      Matched│                   │ No Match
             ▼                   ▼
   ┌──────────────────┐ ┌────────────────────────────────────────┐
   │ Template Engine  │ │  Tier 2: AI Intent & Language Detection│
   │ Direct Database  │ │  - Ollama local LLM (qwen2.5:3b)       │
   │ Ground Truth     │ │  - Structured JSON classification      │
   │ Zero LLM latency │ │  - Confidence score scoring            │
   └──────────────────┘ └───────────────────┬────────────────────┘
                                            │
                                  ┌─────────┴─────────┐
                      High Conf & │                   │ Unmatched /
                 Property Intent  │                   │ Low Confidence (<0.85)
                                  ▼                   ▼
                       ┌────────────────────┐ ┌────────────────────┐
                       │ Ground-Truth Sourced│ │ Tier 3: Human Gate │
                       │ Response Generation│ │ Auto-escalation    │
                       │ Anti-hallucination │ │ Dashboard alert    │
                       │ Prompt Context     │ │ Human takeover     │
                       └────────────────────┘ └────────────────────┘
```

---

## 2. The Ground-Truth Invariant

> [!IMPORTANT]
> In real estate sales, hallucinations regarding **pricing**, **discounts**, **carpet areas**, **possession dates**, or **RERA legalities** can result in financial loss and legal liability.

The AI system is strictly architected under the **Ground-Truth Invariant**:
- The LLM is **never permitted to guess, fabricate, or extrapolate** property specifications.
- Every factual attribute (prices, payment plans, unit types, carpet area, address, landmarks, amenities, contact details) is retrieved directly from PostgreSQL (`PropertyService`) and injected into the response template or prompt context.
- Inquiries about unlisted discounts, price negotiations, custom payment schedules, or legal disputes trigger **instant human escalation**.

---

## 3. Multilingual Engine

The system provides native multilingual comprehension and generation across three distinct language modes:
1. **English (`en`)**: Formal and professional English for international or corporate buyers.
2. **Hindi (`hi`)**: Proper Devanagari script for local and regional buyers.
3. **Hinglish (`hinglish`)**: Conversational Romanized Hindi/English mix widely spoken across WhatsApp in India (e.g., *"Villa ka price kitna hai aur possession kab milega?"*).

---

## 4. Safety & Human Takeover Mechanisms

- **`AUTO_SEND=false` Default**: Outgoing messages require operator approval by default.
- **Fail-Closed Verification**: Automatic transmission aborts if recipient phone, active chat title, or message status fails verification.
- **Escalation Triggers**: Immediate routing to human agents upon detecting keywords/intents for:
  - Price negotiation / discounts (`"discount milega kya"`, `"give best offer"`)
  - Legal & RERA disputes
  - Complaints and urgent human requests (`"agent se baat karni hai"`, `"human please"`)
