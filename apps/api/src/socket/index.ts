import { Server as SocketIOServer } from 'socket.io';
import type { Socket } from 'socket.io';
import type { Server as HttpServer } from 'http';
import { logger } from '../server.js';
import { verifyFirebaseToken } from '../services/firebase.js';
import { config } from '../config.js';
import { updateResponderLocation } from '../db/geo.js';
import type { GeoPoint } from '@nearhelp/shared';

let io: SocketIOServer | null = null;

export function initSocketServer(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: config.CORS_ORIGIN.split(','),
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // Authentication middleware for socket connections
  io.use(async (socket: Socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace(/^Bearer\s+/, '');

      if (!token) {
        // Allow unauthenticated connection in non-production for testing if needed,
        // or reject if strict
        if (config.NODE_ENV === 'test') {
          socket.data.userId = 'test-anonymous-socket-user';
          return next();
        }
        return next(new Error('Authentication error: Missing token'));
      }

      const decoded = await verifyFirebaseToken(token);
      socket.data.userId = decoded.uid;
      next();
    } catch (err) {
      logger.warn({ err }, 'Socket authentication failed');
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = socket.data.userId;
    logger.debug({ socketId: socket.id, userId }, 'Socket connected');

    // Join community room to receive emergency alerts for the community
    socket.on('join:community', ({ communityId }: { communityId: string }) => {
      if (communityId) {
        socket.join(`community:${communityId}`);
        logger.debug({ socketId: socket.id, communityId }, 'Joined community room');
      }
    });

    socket.on('leave:community', ({ communityId }: { communityId: string }) => {
      if (communityId) {
        socket.leave(`community:${communityId}`);
      }
    });

    // Join incident room to receive real-time updates for an active incident
    socket.on('join:incident', ({ incidentId }: { incidentId: string }) => {
      if (incidentId) {
        socket.join(`incident:${incidentId}`);
        logger.debug({ socketId: socket.id, incidentId }, 'Joined incident room');
      }
    });

    socket.on('leave:incident', ({ incidentId }: { incidentId: string }) => {
      if (incidentId) {
        socket.leave(`incident:${incidentId}`);
      }
    });

    // Live location update from accepted responder
    socket.on(
      'location:update',
      async ({ incidentId, location }: { incidentId: string; location: GeoPoint }) => {
        if (!incidentId || !location || !userId) return;

        try {
          // Update location in database
          await updateResponderLocation({
            incidentId,
            userId,
            location,
          });

          // Broadcast location to all clients tracking this incident
          io?.to(`incident:${incidentId}`).emit('responder:location', {
            incidentId,
            userId,
            location,
          });
        } catch (err) {
          logger.error({ err, incidentId, userId }, 'Failed to process socket location:update');
        }
      }
    );

    socket.on('disconnect', () => {
      logger.debug({ socketId: socket.id, userId }, 'Socket disconnected');
    });
  });

  return io;
}

export function getSocketServer(): SocketIOServer | null {
  return io;
}

export function emitToCommunity(communityId: string, event: string, payload: unknown) {
  if (io) {
    io.to(`community:${communityId}`).emit(event, payload);
  }
}

export function emitToIncident(incidentId: string, event: string, payload: unknown) {
  if (io) {
    io.to(`incident:${incidentId}`).emit(event, payload);
  }
}
