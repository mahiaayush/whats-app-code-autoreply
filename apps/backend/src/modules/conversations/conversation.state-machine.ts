import type { ConversationMode, ConversationAction } from '@property-ai/shared-types';
import { ValidationError } from '../../common/errors/app-error.js';

export interface TransitionDefinition {
  from: ConversationMode;
  to: ConversationMode;
  action: ConversationAction;
  allowedTrigger: ('HUMAN' | 'SYSTEM' | 'AI')[];
}

export class ConversationStateMachine {
  /**
   * Complete transition table specifying valid mode transitions, the triggering action,
   * and who is authorized to initiate it.
   */
  private static readonly ALLOWED_TRANSITIONS: TransitionDefinition[] = [
    // From AI_ACTIVE
    { from: 'AI_ACTIVE', to: 'HUMAN_REQUIRED', action: 'TAKEOVER', allowedTrigger: ['SYSTEM', 'AI'] },
    { from: 'AI_ACTIVE', to: 'HUMAN_ACTIVE', action: 'TAKEOVER', allowedTrigger: ['HUMAN'] },
    { from: 'AI_ACTIVE', to: 'PAUSED', action: 'PAUSE', allowedTrigger: ['HUMAN'] },
    { from: 'AI_ACTIVE', to: 'CLOSED', action: 'CLOSE', allowedTrigger: ['HUMAN', 'SYSTEM'] },

    // From HUMAN_REQUIRED
    { from: 'HUMAN_REQUIRED', to: 'HUMAN_ACTIVE', action: 'TAKEOVER', allowedTrigger: ['HUMAN'] },
    { from: 'HUMAN_REQUIRED', to: 'AI_ACTIVE', action: 'RELEASE', allowedTrigger: ['HUMAN'] },
    { from: 'HUMAN_REQUIRED', to: 'PAUSED', action: 'PAUSE', allowedTrigger: ['HUMAN'] },
    { from: 'HUMAN_REQUIRED', to: 'CLOSED', action: 'CLOSE', allowedTrigger: ['HUMAN', 'SYSTEM'] },

    // From HUMAN_ACTIVE
    { from: 'HUMAN_ACTIVE', to: 'AI_ACTIVE', action: 'RELEASE', allowedTrigger: ['HUMAN'] },
    { from: 'HUMAN_ACTIVE', to: 'PAUSED', action: 'PAUSE', allowedTrigger: ['HUMAN'] },
    { from: 'HUMAN_ACTIVE', to: 'CLOSED', action: 'CLOSE', allowedTrigger: ['HUMAN', 'SYSTEM'] },

    // From PAUSED
    { from: 'PAUSED', to: 'AI_ACTIVE', action: 'RESUME', allowedTrigger: ['HUMAN'] },
    { from: 'PAUSED', to: 'HUMAN_ACTIVE', action: 'TAKEOVER', allowedTrigger: ['HUMAN'] },
    { from: 'PAUSED', to: 'CLOSED', action: 'CLOSE', allowedTrigger: ['HUMAN', 'SYSTEM'] },

    // From CLOSED
    { from: 'CLOSED', to: 'AI_ACTIVE', action: 'RESUME', allowedTrigger: ['SYSTEM', 'HUMAN'] },
  ];

  /**
   * Checks whether a transition between two modes is permissible.
   */
  public static canTransition(
    from: ConversationMode,
    to: ConversationMode,
    trigger: 'HUMAN' | 'SYSTEM' | 'AI' = 'HUMAN',
  ): boolean {
    if (from === to) {
      return true; // No-op transition is always valid
    }

    return this.ALLOWED_TRANSITIONS.some(
      (t) => t.from === from && t.to === to && t.allowedTrigger.includes(trigger),
    );
  }

  /**
   * Asserts that a transition between two modes is valid, or throws a ValidationError.
   */
  public static validateTransition(
    from: ConversationMode,
    to: ConversationMode,
    trigger: 'HUMAN' | 'SYSTEM' | 'AI' = 'HUMAN',
  ): TransitionDefinition {
    if (from === to) {
      return {
        from,
        to,
        action: 'RESUME',
        allowedTrigger: [trigger],
      };
    }

    const matched = this.ALLOWED_TRANSITIONS.find(
      (t) => t.from === from && t.to === to && t.allowedTrigger.includes(trigger),
    );

    if (!matched) {
      throw new ValidationError(
        `Invalid conversation transition: Cannot move mode from '${from}' to '${to}' triggered by '${trigger}'`,
      );
    }

    return matched;
  }
}
