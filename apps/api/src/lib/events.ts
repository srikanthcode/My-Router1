import type { FastifyReply } from "fastify";

export interface DashboardEvent {
  id: string;
  type: string;
  timestamp: string;
  userId: string;
  data: Record<string, unknown>;
}

interface ClientConnection {
  id: string;
  reply: FastifyReply;
  connectedAt: Date;
}

class EventHub {
  private clients = new Map<string, Set<ClientConnection>>();
  private eventHistory = new Map<string, DashboardEvent[]>();
  private sequence = 0;
  private readonly MAX_HISTORY_PER_USER = 100;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Send a keep-alive heartbeat every 15 seconds to prevent proxy dropouts
    this.heartbeatInterval = setInterval(() => {
      this.broadcastHeartbeat();
    }, 15000);
    if (this.heartbeatInterval.unref) {
      this.heartbeatInterval.unref();
    }
  }

  private nextEventId(): string {
    this.sequence += 1;
    return `evt_${Date.now()}_${this.sequence}`;
  }

  public subscribe(userId: string, reply: FastifyReply, lastEventId?: string): () => void {
    const connId = `conn_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const conn: ClientConnection = {
      id: connId,
      reply,
      connectedAt: new Date(),
    };

    if (!this.clients.has(userId)) {
      this.clients.set(userId, new Set());
    }
    this.clients.get(userId)!.add(conn);

    // If Last-Event-ID provided, replay missed events
    if (lastEventId) {
      const history = this.eventHistory.get(userId) || [];
      const idx = history.findIndex((e) => e.id === lastEventId);
      if (idx !== -1 && idx < history.length - 1) {
        for (let i = idx + 1; i < history.length; i++) {
          this.writeSSE(conn, history[i]);
        }
      }
    }

    // Send connection established event
    this.writeSSE(conn, {
      id: this.nextEventId(),
      type: "system.connected",
      timestamp: new Date().toISOString(),
      userId,
      data: { connected: true, serverTime: new Date().toISOString() },
    });

    const cleanup = () => {
      const userConns = this.clients.get(userId);
      if (userConns) {
        userConns.delete(conn);
        if (userConns.size === 0) {
          this.clients.delete(userId);
        }
      }
    };

    reply.raw.on("close", cleanup);
    reply.raw.on("error", cleanup);
    return cleanup;
  }

  public publish(userId: string, type: string, data: Record<string, unknown>): DashboardEvent {
    const event: DashboardEvent = {
      id: this.nextEventId(),
      type,
      timestamp: new Date().toISOString(),
      userId,
      data,
    };

    // Store in history for replay
    if (!this.eventHistory.has(userId)) {
      this.eventHistory.set(userId, []);
    }
    const history = this.eventHistory.get(userId)!;
    history.push(event);
    if (history.length > this.MAX_HISTORY_PER_USER) {
      history.shift();
    }

    // Dispatch to active user connections
    const userConns = this.clients.get(userId);
    if (userConns && userConns.size > 0) {
      for (const conn of userConns) {
        try {
          this.writeSSE(conn, event);
        } catch {
          // Socket might have closed
        }
      }
    }

    return event;
  }

  private writeSSE(conn: ClientConnection, event: DashboardEvent) {
    if (conn.reply.raw.writableEnded || conn.reply.raw.destroyed) return;
    conn.reply.raw.write(
      `id: ${event.id}\nevent: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`
    );
  }

  private broadcastHeartbeat() {
    for (const [, conns] of this.clients.entries()) {
      for (const conn of conns) {
        if (!conn.reply.raw.writableEnded && !conn.reply.raw.destroyed) {
          try {
            conn.reply.raw.write(": keepalive\n\n");
          } catch {
            // Ignore closed sockets
          }
        }
      }
    }
  }
}

export const eventHub = new EventHub();
