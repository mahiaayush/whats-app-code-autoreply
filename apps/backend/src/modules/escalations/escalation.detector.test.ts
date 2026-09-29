import { describe, it, expect } from 'vitest';
import { EscalationDetector } from './escalation.detector.js';

describe('EscalationDetector Unit Tests', () => {
  describe('Legal / RERA / Dispute Detection (CRITICAL)', () => {
    it('should detect RERA case inquiry in English as CRITICAL', () => {
      const res = EscalationDetector.evaluate('Is there any RERA case or court litigation on this property?');
      expect(res.requiresEscalation).toBe(true);
      expect(res.reason).toBe('LEGAL');
      expect(res.priority).toBe('CRITICAL');
      expect(res.confidence).toBe(1.0);
    });

    it('should detect registry dispute inquiry in Hinglish as CRITICAL', () => {
      const res = EscalationDetector.evaluate('bhai is project me registry dispute chal raha hai kya?');
      expect(res.requiresEscalation).toBe(true);
      expect(res.reason).toBe('LEGAL');
      expect(res.priority).toBe('CRITICAL');
    });

    it('should detect police or advocate notice threat as CRITICAL', () => {
      const res = EscalationDetector.evaluate('I am consulting my advocate and will issue legal notice');
      expect(res.requiresEscalation).toBe(true);
      expect(res.reason).toBe('LEGAL');
      expect(res.priority).toBe('CRITICAL');
    });
  });

  describe('Severe Complaints / Fraud Allegations (CRITICAL)', () => {
    it('should detect fraud / scam allegations as CRITICAL', () => {
      const res = EscalationDetector.evaluate('This builder is a fraud and scam company!');
      expect(res.requiresEscalation).toBe(true);
      expect(res.reason).toBe('COMPLAINTS');
      expect(res.priority).toBe('CRITICAL');
    });

    it('should detect consumer court threat in Hinglish as CRITICAL', () => {
      const res = EscalationDetector.evaluate('Tum logo ne dhokha diya hai consumer court me report karunga');
      expect(res.requiresEscalation).toBe(true);
      expect(res.reason).toBe('COMPLAINTS');
      expect(res.priority).toBe('CRITICAL');
    });

    it('should detect cheater allegations as CRITICAL', () => {
      const res = EscalationDetector.evaluate('Worst experience pathetic service cheater developer');
      expect(res.requiresEscalation).toBe(true);
      expect(res.reason).toBe('COMPLAINTS');
      expect(res.priority).toBe('CRITICAL');
    });
  });

  describe('Complex / Cash Payment Discussions (HIGH)', () => {
    it('should detect black money / cash payment inquiry as HIGH', () => {
      const res = EscalationDetector.evaluate('Can I pay 30% in black money or cash payment?');
      expect(res.requiresEscalation).toBe(true);
      expect(res.reason).toBe('COMPLEX_PAYMENT');
      expect(res.priority).toBe('HIGH');
    });

    it('should detect cash component in Hinglish as HIGH', () => {
      const res = EscalationDetector.evaluate('Cash me kitna chalega do number payment possible hai?');
      expect(res.requiresEscalation).toBe(true);
      expect(res.reason).toBe('COMPLEX_PAYMENT');
      expect(res.priority).toBe('HIGH');
    });
  });

  describe('Discount & Price Negotiation (HIGH)', () => {
    it('should detect direct discount request as HIGH', () => {
      const res = EscalationDetector.evaluate('Is there any special discount on upfront payment?');
      expect(res.requiresEscalation).toBe(true);
      expect(res.reason).toBe('DISCOUNT');
      expect(res.priority).toBe('HIGH');
    });

    it('should detect negotiation in Hinglish as HIGH', () => {
      const res = EscalationDetector.evaluate('Bhai 2.5 Cr me final price deal karlo kam karo thoda');
      expect(res.requiresEscalation).toBe(true);
      expect(res.reason).toBe('NEGOTIATION');
      expect(res.priority).toBe('HIGH');
    });

    it('should detect rate kam inquiry as HIGH', () => {
      const res = EscalationDetector.evaluate('budget se bahar hai kam karo rate kam hoga kya');
      expect(res.requiresEscalation).toBe(true);
      expect(res.reason).toBe('NEGOTIATION');
      expect(res.priority).toBe('HIGH');
    });
  });

  describe('Manager & Human Agent Requests (HIGH)', () => {
    it('should detect manager request as HIGH', () => {
      const res = EscalationDetector.evaluate('Mujhe sales manager se baat karni hai connect to human');
      expect(res.requiresEscalation).toBe(true);
      expect(res.reason).toBe('MANAGER_REQUEST');
      expect(res.priority).toBe('HIGH');
    });

    it('should detect human advisor call request as HIGH', () => {
      const res = EscalationDetector.evaluate('Please connect me to a real person, call me now');
      expect(res.requiresEscalation).toBe(true);
      expect(res.reason).toBe('HUMAN_REQUEST');
      expect(res.priority).toBe('HIGH');
    });

    it('should detect Hindi human agent request as HIGH', () => {
      const res = EscalationDetector.evaluate('kisi insan se baat karao phone karo');
      expect(res.requiresEscalation).toBe(true);
      expect(res.reason).toBe('HUMAN_REQUEST');
      expect(res.priority).toBe('HIGH');
    });
  });

  describe('Possession Commitments (MEDIUM)', () => {
    it('should detect delayed possession penalty inquiry as MEDIUM', () => {
      const res = EscalationDetector.evaluate('What is the possession delay penalty if construction is late?');
      expect(res.requiresEscalation).toBe(true);
      expect(res.reason).toBe('POSSESSION');
      expect(res.priority).toBe('MEDIUM');
    });
  });

  describe('Standard Non-Escalating Inquiries (LOW / False)', () => {
    it('should NOT escalate standard property price inquiry', () => {
      const res = EscalationDetector.evaluate('What is the starting price for 4 BHK villa?');
      expect(res.requiresEscalation).toBe(false);
      expect(res.reason).toBeNull();
      expect(res.priority).toBe('LOW');
    });

    it('should NOT escalate location / address inquiry', () => {
      const res = EscalationDetector.evaluate('Where is Luxzirius Villas located and nearest airport?');
      expect(res.requiresEscalation).toBe(false);
      expect(res.reason).toBeNull();
    });

    it('should NOT escalate brochure or amenities inquiry', () => {
      const res = EscalationDetector.evaluate('Can you share the brochure and list of amenities?');
      expect(res.requiresEscalation).toBe(false);
      expect(res.reason).toBeNull();
    });
  });
});
