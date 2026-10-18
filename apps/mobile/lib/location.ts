import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { api } from './api';

export const LOCATION_TASK_NAME = 'nearhelp-background-location';

let activeCommunityId: string | null = null;

export function setActiveCommunityId(communityId: string | null) {
  activeCommunityId = communityId;
}

export function getActiveCommunityId(): string | null {
  return activeCommunityId;
}

/**
 * Define the global headless background location task.
 * Note: Must be declared at the module level outside React components.
 */
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    // Silently log in headless task
    return;
  }

  if (data) {
    const { locations } = data as { locations: Location.LocationObject[] };
    if (!locations || locations.length === 0) return;

    const latest = locations[locations.length - 1];
    if (!latest) return;

    const commId = activeCommunityId;
    if (!commId) return;

    try {
      // Send location heartbeat to the server
      await api.post('/availability/location', {
        communityId: commId,
        location: {
          lat: latest.coords.latitude,
          lng: latest.coords.longitude,
        },
      });
    } catch {
      // Network failure during background ping; will retry on next displacement
    }
  }
});

/**
 * Request sequential location and notification permissions.
 * Flow: Foreground -> Background -> Notifications
 */
export async function requestLocationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return true;
  }

  // 1. Foreground Location Permission
  const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
  if (fgStatus !== 'granted') {
    return false;
  }

  // 2. Background Location Permission (Android 10+ / iOS)
  const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
  if (bgStatus !== 'granted') {
    // If background permission is denied, foreground tracking can still work
  }

  // 3. Notification Permission (Required for Android Foreground Service & Emergency Alerts)
  try {
    await Notifications.requestPermissionsAsync();
  } catch {
    // Optional on older Android versions
  }

  return true;
}

/**
 * Start background location updates with battery-friendly configuration.
 * Distance filter: ~100m, Accuracy: Balanced.
 */
export async function startLocationTracking(communityId: string): Promise<Location.LocationObject> {
  setActiveCommunityId(communityId);

  const hasPerms = await requestLocationPermissions();
  if (!hasPerms) {
    throw new Error('Location permissions are required to mark yourself available as a helper');
  }

  // 1. Get immediate current fix
  const currentLocation = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  // 2. Send initial availability ON to API
  await api.post('/availability', {
    communityId,
    isAvailable: true,
    location: {
      lat: currentLocation.coords.latitude,
      lng: currentLocation.coords.longitude,
    },
  });

  // 3. Register background tracking task if supported and not web
  if (Platform.OS !== 'web') {
    const isStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
    if (!isStarted) {
      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: Location.Accuracy.Balanced,
        distanceInterval: 100, // ~100m distance filter
        deferredUpdatesInterval: 30000, // 30s
        deferredUpdatesDistance: 100,
        showsBackgroundLocationIndicator: true,
        foregroundService: {
          notificationTitle: 'NearHelp Helper Active 🛡️',
          notificationBody: 'You are marked available to assist nearby community members in emergencies.',
          notificationColor: '#DC2626',
          killServiceOnDestroy: false,
        },
      });
    }
  }

  return currentLocation;
}

/**
 * Stop background location tracking and immediately nullify location on server (Privacy Rule 3).
 */
export async function stopLocationTracking(communityId: string): Promise<void> {
  setActiveCommunityId(null);

  if (Platform.OS !== 'web') {
    const isStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
    if (isStarted) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
    }
  }

  // Tell server we are offline — coordinates are immediately set to NULL
  try {
    await api.post('/availability', {
      communityId,
      isAvailable: false,
    });
  } catch {
    // Handled
  }
}

/**
 * Check if background location tracking task is currently active.
 */
export async function isLocationTrackingActive(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  return Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
}
