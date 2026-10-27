import { sql } from 'drizzle-orm';
import { db } from './client.js';
import type { GeoPoint } from '@nearhelp/shared';

export interface NearbyResponder {
  userId: string;
  displayName: string;
  phone: string | null;
  fcmToken: string | null;
  platform: 'ios' | 'android' | 'web' | null;
  distanceMeters: number;
}

/**
 * Find available, approved community members within emergency radius.
 * - Uses PostGIS ST_DWithin on the partial GiST index of `availability`.
 * - Excludes the reporter (victim).
 * - Excludes any ping older than maxStalenessMinutes (default 5 min).
 * - Returns results ordered by proximity in meters.
 */
export async function findNearbyResponders({
  incidentLng,
  incidentLat,
  communityId,
  radiusMeters = 1000,
  excludeUserId,
  maxStalenessMinutes = 5,
  limit = 50,
}: {
  incidentLng: number;
  incidentLat: number;
  communityId: string;
  radiusMeters?: number;
  excludeUserId?: string;
  maxStalenessMinutes?: number;
  limit?: number;
}): Promise<NearbyResponder[]> {
  const result = await db.execute<{
    user_id: string;
    display_name: string;
    phone: string | null;
    fcm_token: string | null;
    platform: 'ios' | 'android' | 'web' | null;
    distance_meters: number;
  }>(sql`
    SELECT
      u.id AS user_id,
      u.display_name,
      u.phone,
      d.fcm_token,
      d.platform,
      ROUND(ST_Distance(
        a.location,
        ST_SetSRID(ST_MakePoint(${incidentLng}, ${incidentLat}), 4326)::geography
      ))::int AS distance_meters
    FROM availability a
    JOIN community_members cm
      ON cm.user_id = a.user_id
      AND cm.community_id = a.community_id
    JOIN users u
      ON u.id = a.user_id
    LEFT JOIN devices d
      ON d.user_id = u.id
    WHERE a.community_id = ${communityId}
      AND a.is_available = true
      AND a.location IS NOT NULL
      AND cm.status = 'approved'
      AND a.updated_at >= NOW() - (${maxStalenessMinutes} || ' minutes')::interval
      ${excludeUserId ? sql`AND a.user_id != ${excludeUserId}` : sql``}
      AND ST_DWithin(
        a.location,
        ST_SetSRID(ST_MakePoint(${incidentLng}, ${incidentLat}), 4326)::geography,
        ${radiusMeters}
      )
    ORDER BY distance_meters ASC
    LIMIT ${limit};
  `);

  return (result.rows || []).map((row) => ({
    userId: row.user_id,
    displayName: row.display_name,
    phone: row.phone,
    fcmToken: row.fcm_token,
    platform: row.platform,
    distanceMeters: Number(row.distance_meters),
  }));
}

/**
 * Upsert user availability and location point.
 * When isAvailable is toggled to false, location is immediately set to NULL (Privacy Rule 3).
 */
export async function updateUserLocation({
  userId,
  communityId,
  isAvailable,
  location,
}: {
  userId: string;
  communityId: string;
  isAvailable: boolean;
  location?: GeoPoint | null;
}): Promise<void> {
  if (isAvailable && location) {
    await db.execute(sql`
      INSERT INTO availability (user_id, community_id, is_available, location, updated_at)
      VALUES (
        ${userId},
        ${communityId},
        true,
        ST_SetSRID(ST_MakePoint(${location.lng}, ${location.lat}), 4326)::geography,
        NOW()
      )
      ON CONFLICT (user_id, community_id)
      DO UPDATE SET
        is_available = true,
        location = ST_SetSRID(ST_MakePoint(${location.lng}, ${location.lat}), 4326)::geography,
        updated_at = NOW();
    `);
    return;
  }

  // Toggling OFF or clearing location: set location to NULL
  await db.execute(sql`
    INSERT INTO availability (user_id, community_id, is_available, location, updated_at)
    VALUES (
      ${userId},
      ${communityId},
      false,
      NULL,
      NOW()
    )
    ON CONFLICT (user_id, community_id)
    DO UPDATE SET
      is_available = false,
      location = NULL,
      updated_at = NOW();
  `);
}

/**
 * Upsert responder live tracking point during an active incident.
 */
export async function updateResponderLocation({
  incidentId,
  userId,
  location,
}: {
  incidentId: string;
  userId: string;
  location: GeoPoint;
}): Promise<void> {
  await db.execute(sql`
    UPDATE incident_responders
    SET
      location = ST_SetSRID(ST_MakePoint(${location.lng}, ${location.lat}), 4326)::geography,
      updated_at = NOW()
    WHERE incident_id = ${incidentId}
      AND user_id = ${userId};
  `);
}

/**
 * Privacy purge: Nullify stale availability locations (> 30 min old).
 */
export async function purgeStaleAvailability(staleMinutes = 30) {
  const result = await db.execute(sql`
    UPDATE availability
    SET
      is_available = false,
      location = NULL,
      updated_at = NOW()
    WHERE is_available = true
      AND updated_at < NOW() - (${staleMinutes} || ' minutes')::interval;
  `);
  return result.rowCount ?? 0;
}

/**
 * Privacy purge: Nullify live coordinates of responders once an incident is closed.
 */
export async function purgeClosedIncidentResponderLocations(incidentId?: string) {
  if (incidentId) {
    const result = await db.execute(sql`
      UPDATE incident_responders
      SET location = NULL, updated_at = NOW()
      WHERE incident_id = ${incidentId}
        AND location IS NOT NULL;
    `);
    return result.rowCount ?? 0;
  }

  const result = await db.execute(sql`
    UPDATE incident_responders ir
    SET location = NULL, updated_at = NOW()
    FROM incidents i
    WHERE ir.incident_id = i.id
      AND ir.location IS NOT NULL
      AND (
        i.status IN ('resolved', 'cancelled', 'expired')
        OR ir.updated_at < NOW() - INTERVAL '24 hours'
      );
  `);
  return result.rowCount ?? 0;
}

/**
 * Privacy purge: Purge incident locations older than retention period (default 30 days).
 */
export async function purgeOldIncidentLocations(retentionDays = 30) {
  const result = await db.execute(sql`
    UPDATE incidents
    SET location = NULL
    WHERE status IN ('resolved', 'cancelled', 'expired')
      AND location IS NOT NULL
      AND (
        (resolved_at IS NOT NULL AND resolved_at < NOW() - (${retentionDays} || ' days')::interval)
        OR (cancelled_at IS NOT NULL AND cancelled_at < NOW() - (${retentionDays} || ' days')::interval)
        OR (created_at < NOW() - ((${retentionDays} + 1) || ' days')::interval)
      );
  `);
  return result.rowCount ?? 0;
}
