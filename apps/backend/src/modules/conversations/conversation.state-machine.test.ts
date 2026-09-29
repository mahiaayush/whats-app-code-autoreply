import { describe, it, expect } from 'vitest';
import { ConversationStateMachine } from './conversation.state-machine.js';
import { ValidationError } from '../../common/errors/app-error.js';

describe('ConversationStateMachine', () => {
  describe('Valid Transitions', () => {
    it('should allow AI_ACTIVE -> HUMAN_REQUIRED triggered by SYSTEM or AI', () => {
      expect(ConversationStateMachine.canTransition('AI_ACTIVE', 'HUMAN_REQUIRED', 'SYSTEM')).toBe(true);
      expect(ConversationStateMachine.canTransition('AI_ACTIVE', 'HUMAN_REQUIRED', 'AI')).toBe(true);
      const def = ConversationStateMachine.validateTransition('AI_ACTIVE', 'HUMAN_REQUIRED', 'SYSTEM');
      expect(def.action).toBe('TAKEOVER');
    });

    it('should allow AI_ACTIVE -> HUMAN_ACTIVE triggered by HUMAN', () => {
      expect(ConversationStateMachine.canTransition('AI_ACTIVE', 'HUMAN_ACTIVE', 'HUMAN')).toBe(true);
      const def = ConversationStateMachine.validateTransition('AI_ACTIVE', 'HUMAN_ACTIVE', 'HUMAN');
      expect(def.action).toBe('TAKEOVER');
    });

    it('should allow HUMAN_ACTIVE -> AI_ACTIVE triggered by HUMAN (release)', () => {
      expect(ConversationStateMachine.canTransition('HUMAN_ACTIVE', 'AI_ACTIVE', 'HUMAN')).toBe(true);
      const def = ConversationStateMachine.validateTransition('HUMAN_ACTIVE', 'AI_ACTIVE', 'HUMAN');
      expect(def.action).toBe('RELEASE');
    });

    it('should allow AI_ACTIVE -> PAUSED and PAUSED -> AI_ACTIVE', () => {
      expect(ConversationStateMachine.canTransition('AI_ACTIVE', 'PAUSED', 'HUMAN')).toBe(true);
      expect(ConversationStateMachine.canTransition('PAUSED', 'AI_ACTIVE', 'HUMAN')).toBe(true);
    });

    it('should allow CLOSED -> AI_ACTIVE (reopening)', () => {
      expect(ConversationStateMachine.canTransition('CLOSED', 'AI_ACTIVE', 'SYSTEM')).toBe(true);
      expect(ConversationStateMachine.canTransition('CLOSED', 'AI_ACTIVE', 'HUMAN')).toBe(true);
    });

    it('should allow no-op transition (same mode)', () => {
      expect(ConversationStateMachine.canTransition('AI_ACTIVE', 'AI_ACTIVE')).toBe(true);
      expect(ConversationStateMachine.validateTransition('AI_ACTIVE', 'AI_ACTIVE').to).toBe('AI_ACTIVE');
    });
  });

  describe('Invalid Transitions', () => {
    it('should reject CLOSED -> HUMAN_ACTIVE without reopening', () => {
      expect(ConversationStateMachine.canTransition('CLOSED', 'HUMAN_ACTIVE', 'HUMAN')).toBe(false);
      expect(() =>
        ConversationStateMachine.validateTransition('CLOSED', 'HUMAN_ACTIVE', 'HUMAN'),
      ).toThrow(ValidationError);
    });

    it('should reject unauthorized triggers (e.g. AI attempting agent takeover)', () => {
      expect(ConversationStateMachine.canTransition('AI_ACTIVE', 'HUMAN_ACTIVE', 'AI')).toBe(false);
      expect(() =>
        ConversationStateMachine.validateTransition('AI_ACTIVE', 'HUMAN_ACTIVE', 'AI'),
      ).toThrow(ValidationError);
    });
  });
});
