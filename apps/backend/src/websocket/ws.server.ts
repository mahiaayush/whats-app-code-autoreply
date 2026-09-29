import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { WebSocket } from 'ws';
import type { WebSocketEventType, WebSocketMessage } from '@property-ai/shared-types';
import { logger } from '../config/index.js';

export interface ConnectedClient {
  id: string;
  type: 'EXTENSION' | 'DASHBOARD' | 'UNKNOWN';
  socket: WebSocket;
  isAlive: boolean;
  connectedAt: Date;
}

export class WebSocketManager {
  private static instance: WebSocketManager | null = null;
  private clients: Map<string, ConnectedClient> = new Map();
  private pingInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.startHeartbeat();
  }

  public static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }

  public registerClient(
    id: string,
    socket: WebSocket,
    type: 'EXTENSION' | 'DASHBOARD' | 'UNKNOWN' = 'UNKNOWN',
  ): void {
    const client: ConnectedClient = {
      id,
      type,
      socket,
      isAlive: true,
      connectedAt: new Date(),
    };

    this.clients.set(id, client);
    logger.info(
      { clientId: id, clientType: type, totalClients: this.clients.size },
      'WebSocket client connected',
    );

    socket.on('pong', () => {
      client.isAlive = true;
    });

    socket.on('close', () => {
      this.clients.delete(id);
      logger.info(
        { clientId: id, totalClients: this.clients.size },
        'WebSocket client disconnected',
      );
    });

    socket.on('error', (err: Error) => {
      logger.warn({ clientId: id, err }, 'WebSocket client socket error');
      this.clients.delete(id);
    });
  }

  public setClientType(clientId: string, type: 'EXTENSION' | 'DASHBOARD'): void {
    const client = this.clients.get(clientId);
    if (client) {
      client.type = type;
      logger.info({ clientId, type }, 'WebSocket client identified');
    }
  }

  public broadcast<T>(
    event: WebSocketEventType,
    data: T,
    targetType?: 'EXTENSION' | 'DASHBOARD',
  ): void {
    const payload: WebSocketMessage<T> = {
      event,
      timestamp: new Date().toISOString(),
      data,
    };
    const message = JSON.stringify(payload);

    for (const client of this.clients.values()) {
      if (targetType && client.type !== targetType) {
        continue;
      }
      if (client.socket.readyState === client.socket.OPEN) {
        client.socket.send(message);
      }
    }
  }

  public getConnectedClientsCount(): { total: number; extensions: number; dashboards: number } {
    let extensions = 0;
    let dashboards = 0;

    for (const client of this.clients.values()) {
      if (client.type === 'EXTENSION') extensions++;
      if (client.type === 'DASHBOARD') dashboards++;
    }

    return {
      total: this.clients.size,
      extensions,
      dashboards,
    };
  }

  private startHeartbeat(): void {
    this.pingInterval = setInterval(() => {
      for (const [id, client] of this.clients.entries()) {
        if (!client.isAlive) {
          logger.warn({ clientId: id }, 'Terminating unresponsive WebSocket client');
          client.socket.terminate();
          this.clients.delete(id);
          continue;
        }

        client.isAlive = false;
        client.socket.ping();
      }
    }, 30000);
  }

  public close(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    for (const client of this.clients.values()) {
      client.socket.close(1001, 'Server shutting down');
    }
    this.clients.clear();
  }
}

export async function registerWebSocketRoutes(app: FastifyInstance): Promise<void> {
  const wsManager = WebSocketManager.getInstance();

  app.get('/api/v1/ws', { websocket: true }, (socket: WebSocket, req: FastifyRequest) => {
    const clientId = req.id || String(Date.now());

    wsManager.registerClient(clientId, socket);

    socket.send(
      JSON.stringify({
        event: 'CONNECTION_ESTABLISHED',
        timestamp: new Date().toISOString(),
        data: {
          clientId,
          status: 'connected',
        },
      }),
    );

    socket.on('message', (raw: Buffer | string) => {
      try {
        const parsed = JSON.parse(raw.toString());
        if (parsed.event === 'EXTENSION_REGISTER') {
          wsManager.setClientType(clientId, 'EXTENSION');
        } else if (parsed.event === 'DASHBOARD_SUBSCRIBE') {
          wsManager.setClientType(clientId, 'DASHBOARD');
        }
      } catch (err) {
        logger.warn({ clientId, err }, 'Failed to parse incoming WebSocket message');
      }
    });
  });
}
