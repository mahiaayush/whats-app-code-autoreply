import { getConnectedRedisClient } from '../../database/redis.client.js';
import { logger } from '../../config/index.js';

export interface DeduplicationOptions {
  ttlSeconds?: number;
  keyPrefix?: string;
}

export class MessageDeduplicator {
  private defaultTtlSeconds: number;
  private keyPrefix: string;

  constructor(options?: DeduplicationOptions) {
    this.defaultTtlSeconds = options?.ttlSeconds ?? 300; // 5 minutes default
    this.keyPrefix = options?.keyPrefix ?? 'msg:dedup:';
  }

  private getKey(externalMessageId: string): string {
    return `${this.keyPrefix}${externalMessageId}`;
  }

  /**
   * Attempts to acquire an atomic deduplication lock for an external message ID.
   * Returns true if this is the first time the message is seen (lock acquired).
   * Returns false if the message has already been processed or is currently processing.
   */
  public async acquireLock(
    externalMessageId: string,
    ttlSeconds: number = this.defaultTtlSeconds,
  ): Promise<boolean> {
    if (!externalMessageId || externalMessageId.trim() === '') {
      return true;
    }

    try {
      const redis = await getConnectedRedisClient();
      const key = this.getKey(externalMessageId);
      // SET key "1" EX ttl NX -> returns "OK" if set, null if already exists
      const result = await redis.set(key, '1', 'EX', ttlSeconds, 'NX');

      const acquired = result === 'OK';
      if (!acquired) {
        logger.warn(
          { externalMessageId, key },
          'Duplicate message detected by Redis deduplication filter',
        );
      }
      return acquired;
    } catch (error) {
      logger.error(
        { externalMessageId, err: error },
        'Redis deduplication error, falling back to permissive mode',
      );
      // Graceful fallback: return true so message is not dropped if Redis is down
      return true;
    }
  }

  /**
   * Checks whether a message ID has already been registered in the deduplication cache.
   */
  public async isDuplicate(externalMessageId: string): Promise<boolean> {
    if (!externalMessageId || externalMessageId.trim() === '') {
      return false;
    }

    try {
      const redis = await getConnectedRedisClient();
      const key = this.getKey(externalMessageId);
      const exists = await redis.exists(key);
      return exists === 1;
    } catch (error) {
      logger.error(
        { externalMessageId, err: error },
        'Redis error while checking message duplication',
      );
      return false;
    }
  }

  /**
   * Releases or clears the deduplication lock early (e.g. if message ingestion failed before processing).
   */
  public async releaseLock(externalMessageId: string): Promise<void> {
    if (!externalMessageId || externalMessageId.trim() === '') {
      return;
    }

    try {
      const redis = await getConnectedRedisClient();
      const key = this.getKey(externalMessageId);
      await redis.del(key);
    } catch (error) {
      logger.error(
        { externalMessageId, err: error },
        'Redis error while releasing deduplication lock',
      );
    }
  }
}

export const messageDeduplicator = new MessageDeduplicator();

