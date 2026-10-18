import { purgeStaleAvailability } from '../db/geo.js';
import { logger } from '../server.js';
import { config } from '../config.js';

/**
 * Scheduled job to enforce Privacy Rule 3:
 * Nullify location and set isAvailable to false for any user whose ping is older than 30 minutes.
 */
export async function runStaleAvailabilityPurgeJob(): Promise<number> {
  logger.info('Running stale availability privacy purge job...');
  try {
    const purgedCount = await purgeStaleAvailability(config.AVAILABILITY_PURGE_MINUTES || 30);
    logger.info({ purgedCount }, 'Stale availability purge complete');
    return purgedCount;
  } catch (err) {
    logger.error(err, 'Failed to run stale availability purge');
    return 0;
  }
}
