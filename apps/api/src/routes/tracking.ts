import type { FastifyPluginAsync } from 'fastify';
import { db } from '../db/client.js';
import { incidents, incidentResponders, users } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { config } from '../config.js';
import { DEFAULTS } from '@nearhelp/shared';
import crypto from 'crypto';

interface TrackingTokenPayload {
  incidentId: string;
  exp: number; // Unix timestamp in seconds
}

/**
 * Generate a tamper-proof HMAC-SHA256 signed tracking token.
 */
export function generateTrackingToken(incidentId: string): string {
  const exp = Math.floor(Date.now() / 1000) + DEFAULTS.TRACKING_TOKEN_EXPIRY_HOURS * 3600;
  const payload: TrackingTokenPayload = { incidentId, exp };
  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', config.TRACKING_TOKEN_SECRET)
    .update(payloadBase64)
    .digest('base64url');

  return `${payloadBase64}.${signature}`;
}

/**
 * Verify and decode an HMAC-SHA256 signed tracking token.
 */
export function verifyTrackingToken(token: string): TrackingTokenPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;

    const [payloadBase64, signature] = parts;
    if (!payloadBase64 || !signature) return null;
    const expectedSig = crypto
      .createHmac('sha256', config.TRACKING_TOKEN_SECRET)
      .update(payloadBase64)
      .digest('base64url');

    const sigBuf = Buffer.from(signature, 'utf8');
    const expBuf = Buffer.from(expectedSig, 'utf8');

    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }

    const payload: TrackingTokenPayload = JSON.parse(
      Buffer.from(payloadBase64, 'base64url').toString('utf8')
    );

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      return null; // Expired
    }

    return payload;
  } catch {
    return null;
  }
}

export const trackingRoutes: FastifyPluginAsync = async (app) => {
  /**
   * GET /tracking/:token
   * Public unauthenticated view for emergency contacts to track victim status.
   */
  app.get('/:token', async (request, reply) => {
    const { token } = request.params as { token: string };

    const payload = verifyTrackingToken(token);
    if (!payload) {
      return reply.status(403).send({
        success: false,
        error: {
          code: 'INVALID_TRACKING_TOKEN',
          message: 'Tracking link is invalid or has expired',
        },
      });
    }

    const [incident] = await db
      .select({
        id: incidents.id,
        category: incidents.category,
        status: incidents.status,
        location: incidents.location,
        isDrill: incidents.isDrill,
        createdAt: incidents.createdAt,
        resolvedAt: incidents.resolvedAt,
        cancelledAt: incidents.cancelledAt,
        reporterName: users.displayName,
      })
      .from(incidents)
      .leftJoin(users, eq(users.id, incidents.reporterId))
      .where(eq(incidents.id, payload.incidentId))
      .limit(1);

    if (!incident) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'INCIDENT_NOT_FOUND',
          message: 'Incident record not found',
        },
      });
    }

    // Count accepted responders without leaking their personal identities
    const acceptedResponders = await db
      .select({ id: incidentResponders.userId })
      .from(incidentResponders)
      .where(
        and(
          eq(incidentResponders.incidentId, payload.incidentId),
          eq(incidentResponders.status, 'accepted')
        )
      );

    return reply.send({
      success: true,
      data: {
        incident: {
          id: incident.id,
          category: incident.category,
          status: incident.status,
          location: incident.location,
          isDrill: incident.isDrill,
          createdAt: incident.createdAt,
          resolvedAt: incident.resolvedAt,
          cancelledAt: incident.cancelledAt,
        },
        reporter: {
          displayName: incident.reporterName,
        },
        acceptedRespondersCount: acceptedResponders.length,
        isExpired: incident.status !== 'active',
      },
    });
  });

  /**
   * POST /tracking/token
   * Generate a tracking token for an incident (reporter or admin).
   */
  app.post('/token', async (request, reply) => {
    const { incidentId } = request.body as { incidentId: string };
    if (!incidentId) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'incidentId is required' },
      });
    }

    const token = generateTrackingToken(incidentId);
    const trackingUrl = `${config.API_BASE_URL}/tracking/${token}`;

    return reply.send({
      success: true,
      data: {
        token,
        trackingUrl,
        expiresInHours: DEFAULTS.TRACKING_TOKEN_EXPIRY_HOURS,
      },
    });
  });
};
