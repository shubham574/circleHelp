import {
  purgeClosedIncidentResponderLocations,
  purgeOldIncidentLocations,
} from '../db/geo.js';
import { logger } from '../server.js';
import { config } from '../config.js';

/**
 * Scheduled job to enforce Privacy Retention Policies:
 * 1. Nullify responder locations on closed/expired incidents.
 * 2. Purge incident locations older than retention window (default 30 days).
 */
export async function runPrivacyRetentionJob(): Promise<{
  responderLocationsPurged: number;
  oldIncidentLocationsPurged: number;
}> {
  logger.info('Running privacy retention enforcement job...');
  try {
    const responderPurged = await purgeClosedIncidentResponderLocations();
    const incidentLocationsPurged = await purgeOldIncidentLocations(
      config.INCIDENT_LOCATION_RETENTION_DAYS || 30
    );

    logger.info(
      { responderPurged, incidentLocationsPurged },
      'Privacy retention enforcement completed successfully'
    );

    return {
      responderLocationsPurged: responderPurged,
      oldIncidentLocationsPurged: incidentLocationsPurged,
    };
  } catch (err) {
    logger.error(err, 'Failed to complete privacy retention job');
    return {
      responderLocationsPurged: 0,
      oldIncidentLocationsPurged: 0,
    };
  }
}
