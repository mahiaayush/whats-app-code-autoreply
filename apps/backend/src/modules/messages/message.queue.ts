import { logger } from '../../config/index.js';
import type { IncomingMessageDto } from '@property-ai/validation';
import { messagePipelineService, MessagePipelineResult } from './message-pipeline.service.js';

export interface QueueJob {
  id: string;
  dto: IncomingMessageDto;
  queuedAt: number;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  result?: MessagePipelineResult;
  error?: string;
}

export class MessageQueue {
  private jobs: Map<string, QueueJob> = new Map();
  private conversationQueues: Map<string, Array<() => Promise<void>>> = new Map();
  private conversationBusy: Map<string, boolean> = new Map();

  /**
   * Enqueues an inbound message for asynchronous background processing.
   */
  public enqueue(dto: IncomingMessageDto): string {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const job: QueueJob = {
      id: jobId,
      dto,
      queuedAt: Date.now(),
      status: 'QUEUED',
    };

    this.jobs.set(jobId, job);
    logger.info({ jobId, chatId: dto.chatId }, 'Message enqueued into background worker queue');

    this.scheduleJob(job);
    return jobId;
  }

  /**
   * Schedules execution serialized by chatId so messages from the same conversation execute in order.
   */
  private scheduleJob(job: QueueJob): void {
    const chatId = job.dto.chatId;

    const task = async () => {
      job.status = 'PROCESSING';
      try {
        const result = await messagePipelineService.processIncomingMessage(job.dto);
        job.status = 'COMPLETED';
        job.result = result;
      } catch (err) {
        job.status = 'FAILED';
        job.error = err instanceof Error ? err.message : String(err);
        logger.error({ jobId: job.id, chatId, err }, 'Async message queue job failed');
      }
    };

    if (!this.conversationQueues.has(chatId)) {
      this.conversationQueues.set(chatId, []);
    }

    this.conversationQueues.get(chatId)!.push(task);
    this.processNext(chatId);
  }

  /**
   * Processes the next task in the conversation queue if not currently busy.
   */
  private async processNext(chatId: string): Promise<void> {
    if (this.conversationBusy.get(chatId)) {
      return;
    }

    const queue = this.conversationQueues.get(chatId);
    if (!queue || queue.length === 0) {
      this.conversationQueues.delete(chatId);
      this.conversationBusy.delete(chatId);
      return;
    }

    this.conversationBusy.set(chatId, true);
    const nextTask = queue.shift()!;

    try {
      await nextTask();
    } catch (err) {
      logger.error({ chatId, err }, 'Unhandled error in conversation worker queue task');
    } finally {
      this.conversationBusy.set(chatId, false);
      this.processNext(chatId);
    }
  }

  /**
   * Checks the status and result of a queued job.
   */
  public getJob(jobId: string): QueueJob | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Wait until all active conversation queues are empty (useful for testing or graceful shutdown).
   */
  public async waitForIdle(timeoutMs: number = 30000): Promise<void> {
    const startTime = Date.now();
    while (this.conversationQueues.size > 0 || Array.from(this.conversationBusy.values()).some(Boolean)) {
      if (Date.now() - startTime > timeoutMs) {
        throw new Error('Timeout waiting for message worker queue to drain');
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }
}

export const messageQueue = new MessageQueue();
