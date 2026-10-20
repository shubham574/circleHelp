import { admin } from './firebase.js';
import { logger } from '../server.js';
import { config } from '../config.js';

export interface PushNotificationPayload {
  tokens: string[];
  title: string;
  body: string;
  data?: Record<string, string>;
  sound?: string;
  priority?: 'high' | 'normal';
}

/**
 * Send FCM push notifications to a list of device tokens.
 * Handles batches up to 500 tokens (FCM multicast limit).
 * Operates gracefully in mock/test mode without credentials.
 */
export async function sendMulticastNotification(
  payload: PushNotificationPayload
): Promise<{ successCount: number; failureCount: number }> {
  const { tokens, title, body, data = {}, priority = 'high' } = payload;

  if (!tokens || tokens.length === 0) {
    return { successCount: 0, failureCount: 0 };
  }

  // If in test mode or no Firebase app initialized, log and return mock success
  if (config.NODE_ENV === 'test' || !admin.apps.length) {
    logger.debug(
      { tokenCount: tokens.length, title, body, priority },
      'Mock push notification dispatched (Firebase Admin not initialized or in test)'
    );
    return { successCount: tokens.length, failureCount: 0 };
  }

  try {
    const messaging = admin.messaging();

    // FCM sendEachForMulticast accepts max 500 tokens per call
    const batchSize = 500;
    let totalSuccess = 0;
    let totalFailure = 0;

    for (let i = 0; i < tokens.length; i += batchSize) {
      const batchTokens = tokens.slice(i, i + batchSize);

      const response = await messaging.sendEachForMulticast({
        tokens: batchTokens,
        notification: {
          title,
          body,
        },
        data: {
          ...data,
          click_action: 'FLUTTER_NOTIFICATION_CLICK',
        },
        android: {
          priority: priority === 'high' ? 'high' : 'normal',
          notification: {
            sound: 'default',
            priority: priority === 'high' ? 'max' : 'default',
            channelId: 'emergency_alerts',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              critical: priority === 'high',
            },
          },
        },
      });

      totalSuccess += response.successCount;
      totalFailure += response.failureCount;

      if (response.failureCount > 0) {
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            logger.warn(
              { token: batchTokens[idx], error: resp.error?.message },
              'Failed to deliver notification to token'
            );
          }
        });
      }
    }

    logger.info(
      { totalSuccess, totalFailure },
      'Dispatched multicast push notification'
    );
    return { successCount: totalSuccess, failureCount: totalFailure };
  } catch (err) {
    logger.error(err, 'Error dispatching multicast push notifications');
    return { successCount: 0, failureCount: tokens.length };
  }
}
