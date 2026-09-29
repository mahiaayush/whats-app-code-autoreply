import type { EscalationEvaluationResult } from './escalation.types.js';

export class EscalationDetector {
  // 1. Legal / RERA / Court Disputes -> CRITICAL
  private static readonly LEGAL_REGEX =
    /\b(rera\s*case|rera\s*complaint|court\s*case|litigation|lawyer|advocate|dispute|illegal|notice|police|khata\s*(transfer|issue|dispute)|registry\s*(kab|case|dispute|issue)|case\s*chal\s*raha)\b/i;

  // 2. Severe Complaints / Fraud / Anger -> CRITICAL
  private static readonly COMPLAINT_REGEX =
    /\b(fraud|cheat|cheater|scam|fake\s*project|consumer\s*court|police\s*complaint|dhokha|chor|lut\s*liya|bakwas\s*service|worst\s*experience|pathetic|report\s*karunga|sue\s*you)\b/i;

  // 3. Price Negotiation / Discounts -> HIGH
  private static readonly DISCOUNT_REGEX =
    /\b(discount|off\s*price|kuch\s*discount|discount\s*milega|discount\s*doge|offer\s*price)\b/i;

  private static readonly NEGOTIATION_REGEX =
    /\b(negotiat|kam\s*karo|kam\s*hoga|price\s*kam|rate\s*kam|final\s*price|best\s*price|bargain|deal\s*karlo|aakhri\s*price|budget\s*se\s*bahar\s*hai\s*kam)\b/i;

  // 4. Complex / Unaccounted Payment Discussions -> HIGH
  private static readonly COMPLEX_PAYMENT_REGEX =
    /\b(black\s*money|cash\s*(payment|me|portion|component)|unaccounted|2\s*number|do\s*number|cash\s*kitna|under\s*the\s*table)\b/i;

  // 5. Explicit Human / Manager Handoff -> HIGH
  private static readonly MANAGER_REGEX =
    /\b(manager|owner|senior\s*advisor|director|boss)\b/i;

  private static readonly HUMAN_REGEX =
    /\b(human|real\s*person|insan|agent|representative|salesman|baat\s*karao|call\s*me|phone\s*karo|mujhe\s*baat\s*karni\s*hai|connect\s*to\s*human|talk\s*to\s*(a\s*)?person|call\s*please)\b/i;

  // 6. Possession Disputes / Delay Commitments -> MEDIUM
  private static readonly POSSESSION_REGEX =
    /\b(possession\s*delay|delay\s*penalty|delay\s*hua\s*to|possession\s*guarantee|late\s*possession\s*compensation)\b/i;

  /**
   * Evaluate customer message text against deterministic escalation safety patterns.
   */
  public static evaluate(messageText: string): EscalationEvaluationResult {
    const text = messageText.trim();

    // 1. Legal / Disputes
    if (this.LEGAL_REGEX.test(text)) {
      return {
        requiresEscalation: true,
        reason: 'LEGAL',
        priority: 'CRITICAL',
        confidence: 1.0,
        explanation: 'Legal, court litigation, RERA dispute, or registry controversy inquiry requires immediate critical escalation.',
      };
    }

    // 2. Complaints / Fraud
    if (this.COMPLAINT_REGEX.test(text)) {
      return {
        requiresEscalation: true,
        reason: 'COMPLAINTS',
        priority: 'CRITICAL',
        confidence: 1.0,
        explanation: 'Customer complaint, anger, fraud allegation, or consumer forum threat requires immediate critical human management.',
      };
    }

    // 3. Complex / Cash Payment
    if (this.COMPLEX_PAYMENT_REGEX.test(text)) {
      return {
        requiresEscalation: true,
        reason: 'COMPLEX_PAYMENT',
        priority: 'HIGH',
        confidence: 1.0,
        explanation: 'Inquiry regarding cash component, unaccounted funds, or non-standard payment terms requires high-priority human review.',
      };
    }

    // 4. Discounts
    if (this.DISCOUNT_REGEX.test(text)) {
      return {
        requiresEscalation: true,
        reason: 'DISCOUNT',
        priority: 'HIGH',
        confidence: 1.0,
        explanation: 'Direct discount inquiry requires human sales authority.',
      };
    }

    // 5. Price Negotiation
    if (this.NEGOTIATION_REGEX.test(text)) {
      return {
        requiresEscalation: true,
        reason: 'NEGOTIATION',
        priority: 'HIGH',
        confidence: 1.0,
        explanation: 'Price negotiation or bargaining inquiry requires human advisor negotiation.',
      };
    }

    // 6. Manager / Human Agent Request
    if (this.MANAGER_REGEX.test(text) && this.HUMAN_REGEX.test(text)) {
      return {
        requiresEscalation: true,
        reason: 'MANAGER_REQUEST',
        priority: 'HIGH',
        confidence: 1.0,
        explanation: 'Customer explicitly demanded to speak with a property sales manager or owner.',
      };
    }

    if (this.HUMAN_REGEX.test(text)) {
      return {
        requiresEscalation: true,
        reason: 'HUMAN_REQUEST',
        priority: 'HIGH',
        confidence: 1.0,
        explanation: 'Customer explicitly requested to interact with a human agent or phone call.',
      };
    }

    // 7. Possession Delay
    if (this.POSSESSION_REGEX.test(text)) {
      return {
        requiresEscalation: true,
        reason: 'POSSESSION',
        priority: 'MEDIUM',
        confidence: 0.95,
        explanation: 'Inquiry regarding possession delays or late delivery penalty commitments.',
      };
    }

    return {
      requiresEscalation: false,
      reason: null,
      priority: 'LOW',
      confidence: 1.0,
      explanation: 'Message does not match any mandatory human escalation triggers.',
    };
  }
}
