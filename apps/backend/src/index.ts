import { buildApp } from './app.js';
import { config, logger } from './config/index.js';
import { closeRedisClient } from './database/redis.client.js';
import { WebSocketManager } from './websocket/ws.server.js';

const app = buildApp();

async function startServer(): Promise<void> {
  try {
    await app.listen({
      port: config.PORT,
      host: config.HOST,
    });
    logger.info(
      {
        port: config.PORT,
        host: config.HOST,
        env: config.NODE_ENV,
        nodeVersion: process.version,
      },
      'Backend Fastify service initialized and listening',
    );
  } catch (err) {
    logger.fatal({ err }, 'Failed to start Fastify server');
    process.exit(1);
  }
}

async function handleShutdown(signal: string): Promise<void> {
  logger.info({ signal }, 'Graceful shutdown initiated');

  try {
    // 1. Close WebSocket connections
    WebSocketManager.getInstance().close();

    // 2. Stop accepting new HTTP requests and finish in-flight requests
    await app.close();
    logger.info('HTTP server closed');

    // 3. Close Redis connection
    await closeRedisClient();

    logger.info('Graceful shutdown completed successfully');
    process.exit(0);
  } catch (err) {
    logger.error({ err }, 'Error during graceful shutdown');
    process.exit(1);
  }
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

startServer();
