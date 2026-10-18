import { useState, useEffect } from 'react';
import {
  View,
  Text,
  Switch,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  startLocationTracking,
  stopLocationTracking,
  isLocationTrackingActive,
} from '../lib/location';

interface AvailabilityToggleProps {
  communityId: string | null;
  communityName?: string;
  isApprovedMember: boolean;
  onAvailabilityChange?: (isAvailable: boolean) => void;
}

export function AvailabilityToggle({
  communityId,
  communityName,
  isApprovedMember,
  onAvailabilityChange,
}: AvailabilityToggleProps) {
  const [isAvailable, setIsAvailable] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function checkStatus() {
      const active = await isLocationTrackingActive();
      setIsAvailable(active);
    }
    checkStatus();
  }, []);

  const handleToggle = async (value: boolean) => {
    if (!communityId) {
      Alert.alert('No Community Selected', 'Please join or select a community first.');
      return;
    }

    if (!isApprovedMember) {
      Alert.alert(
        'Approval Pending',
        'Your community membership is pending coordinator approval. You can only become an active helper once approved.'
      );
      return;
    }

    setLoading(true);
    try {
      if (value) {
        await startLocationTracking(communityId);
        setIsAvailable(true);
        onAvailabilityChange?.(true);
      } else {
        await stopLocationTracking(communityId);
        setIsAvailable(false);
        onAvailabilityChange?.(false);
      }
    } catch (err) {
      Alert.alert('Location Error', err instanceof Error ? err.message : 'Failed to update availability');
      setIsAvailable(!value);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, isAvailable ? styles.containerActive : styles.containerInactive]}>
      <View style={styles.topRow}>
        <View style={styles.textContainer}>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, isAvailable ? styles.dotActive : styles.dotInactive]} />
            <Text style={styles.statusLabel}>
              {isAvailable ? 'AVAILABLE TO RESPOND' : 'OFFLINE / OFF-DUTY'}
            </Text>
          </View>
          <Text style={styles.communityText}>
            {communityName ? `Community: ${communityName}` : 'No active community'}
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator color={isAvailable ? '#059669' : '#6B7280'} />
        ) : (
          <Switch
            value={isAvailable}
            onValueChange={handleToggle}
            trackColor={{ false: '#D1D5DB', true: '#A7F3D0' }}
            thumbColor={isAvailable ? '#059669' : '#9CA3AF'}
          />
        )}
      </View>

      <Text style={styles.privacyNote}>
        {isAvailable
          ? '🛡️ Active: You will be alerted if someone presses SOS within 1 km. Background GPS is battery-optimized (~100m filter).'
          : '🔒 Offline: Your location is never tracked or stored when you are offline.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1.5,
  },
  containerActive: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
  },
  containerInactive: {
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  textContainer: {
    flex: 1,
    paddingRight: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  dotActive: {
    backgroundColor: '#059669',
  },
  dotInactive: {
    backgroundColor: '#9CA3AF',
  },
  statusLabel: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: '#111827',
  },
  communityText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  privacyNote: {
    fontSize: 11,
    color: '#4B5563',
    lineHeight: 15,
  },
});
