import { describe, it, expect, afterAll } from 'vitest';
import { MessageDeduplicator } from './message.dedup.js';
import { closeRedisClient } from '../../database/redis.client.js';

describe('MessageDeduplicator', () => {
  const dedup = new MessageDeduplicator({ ttlSeconds: 10, keyPrefix: 'test:dedup:' });

  afterAll(async () => {
    await closeRedisClient();
  });

  it('should acquire lock for first-time externalMessageId', async () => {
    const testId = `msg_test_${Date.now()}_1`;
    const acquired = await dedup.acquireLock(testId);
    expect(acquired).toBe(true);
  });

  it('should reject duplicate lock for the same externalMessageId', async () => {
    const testId = `msg_test_${Date.now()}_2`;
    const firstAttempt = await dedup.acquireLock(testId);
    const secondAttempt = await dedup.acquireLock(testId);

    expect(firstAttempt).toBe(true);
    expect(secondAttempt).toBe(false);
  });

  it('should report isDuplicate accurately', async () => {
    const testId = `msg_test_${Date.now()}_3`;
    expect(await dedup.isDuplicate(testId)).toBe(false);

    await dedup.acquireLock(testId);
    expect(await dedup.isDuplicate(testId)).toBe(true);
  });

  it('should allow re-acquisition after releaseLock', async () => {
    const testId = `msg_test_${Date.now()}_4`;
    await dedup.acquireLock(testId);
    expect(await dedup.isDuplicate(testId)).toBe(true);

    await dedup.releaseLock(testId);
    expect(await dedup.isDuplicate(testId)).toBe(false);

    const reacquired = await dedup.acquireLock(testId);
    expect(reacquired).toBe(true);
  });

  it('should handle empty or whitespace IDs without throwing', async () => {
    expect(await dedup.acquireLock('')).toBe(true);
    expect(await dedup.isDuplicate('')).toBe(false);
  });
});
