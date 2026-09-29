import { PrismaClient } from '@prisma/client';
import { logger } from '../config/index.js';

let prismaInstance: PrismaClient | null = null;

export function getPrismaClient(): PrismaClient {
  if (!prismaInstance) {
    prismaInstance = new PrismaClient({
      log: [
        { level: 'warn', emit: 'event' },
        { level: 'error', emit: 'event' },
      ],
    });

    // @ts-expect-error Prisma event logging types
    prismaInstance.$on('warn', (e) => {
      logger.warn({ prismaEvent: e }, 'Prisma warning');
    });

    // @ts-expect-error Prisma event logging types
    prismaInstance.$on('error', (e) => {
      logger.error({ prismaEvent: e }, 'Prisma error');
    });
  }

  return prismaInstance;
}

export async function checkPostgresHealth(): Promise<{
  status: 'ok' | 'error';
  latencyMs?: number;
  error?: string;
}> {
  const start = Date.now();
  try {
    const prisma = getPrismaClient();
    await prisma.$queryRaw`SELECT 1`;
    const latencyMs = Date.now() - start;
    return { status: 'ok', latencyMs };
  } catch (error) {
    return {
      status: 'error',
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : 'Database query failed',
    };
  }
}

export async function closePrismaClient(): Promise<void> {
  if (prismaInstance) {
    try {
      await prismaInstance.$disconnect();
      logger.info('Prisma database connection closed cleanly');
    } catch (err) {
      logger.warn({ err }, 'Error disconnecting Prisma client');
    } finally {
      prismaInstance = null;
    }
  }
}
