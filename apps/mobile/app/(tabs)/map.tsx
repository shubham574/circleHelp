import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import * as Location from 'expo-location';
import { api } from '../../lib/api';
import { connectSocket } from '../../lib/socket';
import {
  INCIDENT_CATEGORY_LABELS,
  SAFETY_DISCLAIMER,
  type IncidentCategory,
  type IncidentResponder,
} from '@nearhelp/shared';

interface ActiveIncident {
  id: string;
  category: IncidentCategory;
  reporterName: string;
  location: { lat: number; lng: number };
  radiusM: number;
  isDrill: boolean;
  description: string | null;
  createdAt: string;
}

export default function MapScreen() {
  const [loading, setLoading] = useState(true);
  const [activeIncident, setActiveIncident] = useState<ActiveIncident | null>(null);
  const [responders, setResponders] = useState<IncidentResponder[]>([]);
  const [userResponseStatus, setUserResponseStatus] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);

  const fetchActiveIncident = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get<{ incidents: ActiveIncident[] }>('/incidents/active');
      if (res.incidents && res.incidents.length > 0) {
        const inc = res.incidents[0];
        if (inc) {
          setActiveIncident(inc);
          // Fetch responders details
          const detail = await api.get<{ responders: IncidentResponder[] }>(`/incidents/${inc.id}`);
          setResponders(detail.responders || []);
        }
      } else {
        setActiveIncident(null);
        setResponders([]);
      }
    } catch {
      // In offline or fresh state, clear
      setActiveIncident(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Acquire user location for ETA calculation
    Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
      .then((loc) => {
        setCurrentLocation({
          lat: loc.coords.latitude,
          lng: loc.coords.longitude,
        });
      })
      .catch(() => {});

    fetchActiveIncident();

    // Socket.IO real-time listener
    const socket = connectSocket();

    socket.on('incident:created', ({ incident }: { incident: ActiveIncident }) => {
      setActiveIncident(incident);
      setResponders([]);
      setUserResponseStatus(null);
      Alert.alert('🚨 Emergency Alert Nearby', `${incident.reporterName} needs help! Check map.`);
    });

    socket.on(
      'responder:accepted',
      ({ responder }: { incidentId: string; responder: IncidentResponder }) => {
        setResponders((prev) => {
          const filtered = prev.filter((r) => r.userId !== responder.userId);
          return [...filtered, responder];
        });
      }
    );

    socket.on('responder:arrived', ({ userId }: { incidentId: string; userId: string }) => {
      setResponders((prev) =>
        prev.map((r) => (r.userId === userId ? { ...r, status: 'arrived' as const } : r))
      );
    });

    socket.on('incident:resolved', () => {
      setActiveIncident(null);
      setResponders([]);
      setUserResponseStatus(null);
      Alert.alert('Incident Resolved', 'The emergency incident has been resolved.');
    });

    socket.on('incident:cancelled', () => {
      setActiveIncident(null);
      setResponders([]);
      setUserResponseStatus(null);
      Alert.alert('Incident Cancelled', 'The emergency alert was cancelled.');
    });

    return () => {
      socket.off('incident:created');
      socket.off('responder:accepted');
      socket.off('responder:arrived');
      socket.off('incident:resolved');
      socket.off('incident:cancelled');
    };
  }, [fetchActiveIncident]);

  const handleRespond = async (action: 'accept' | 'decline' | 'arrived') => {
    if (!activeIncident) return;
    try {
      await api.post(`/incidents/${activeIncident.id}/respond`, {
        action,
        location: currentLocation || undefined,
      });

      setUserResponseStatus(action);

      if (action === 'accept') {
        Alert.alert('Help Accepted', 'Thank you! Proceed safely to the emergency location.');
      } else if (action === 'arrived') {
        Alert.alert('Arrival Confirmed', 'You are marked as arrived on scene.');
      }
    } catch (err: unknown) {
      const error = err as { message?: string };
      Alert.alert('Error', error.message || 'Failed to update response status');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* 112 Safety First Banner */}
      <View style={styles.safetyBanner}>
        <Text style={styles.safetyBannerText}>⚠️ {SAFETY_DISCLAIMER}</Text>
        <TouchableOpacity style={styles.call112Btn} onPress={() => Linking.openURL('tel:112')}>
          <Text style={styles.call112BtnText}>Call 112</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionHeader}>🗺️ Live Community Emergency Radar</Text>

      {loading ? (
        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color="#DC2626" />
          <Text style={styles.loadingText}>Scanning nearby community radar...</Text>
        </View>
      ) : activeIncident ? (
        <View style={styles.incidentCard}>
          {activeIncident.isDrill && (
            <View style={styles.drillBadge}>
              <Text style={styles.drillBadgeText}>⚠️ COMMUNITY SAFETY DRILL</Text>
            </View>
          )}

          <Text style={styles.incidentCategory}>
            🚨 {INCIDENT_CATEGORY_LABELS[activeIncident.category]}
          </Text>
          <Text style={styles.incidentReporter}>
            Reported by: <Text style={styles.boldText}>{activeIncident.reporterName}</Text>
          </Text>
          <Text style={styles.incidentDistance}>
            📍 Radius: within {activeIncident.radiusM}m of reported position
          </Text>

          {/* Simulated Map Visualizer */}
          <View style={styles.mapVisualizer}>
            <View style={styles.radarPulse}>
              <Text style={styles.radarIcon}>🚨</Text>
            </View>
            <Text style={styles.mapCoordinates}>
              Lat: {activeIncident.location.lat.toFixed(4)}, Lng:{' '}
              {activeIncident.location.lng.toFixed(4)}
            </Text>
            <Text style={styles.mapStatus}>Real-Time GPS Coordinate Stream Active</Text>
          </View>

          {/* Responder Controls */}
          <View style={styles.responderActions}>
            {userResponseStatus === 'arrived' ? (
              <View style={styles.statusBadgeArrived}>
                <Text style={styles.statusBadgeText}>✅ You have arrived on scene</Text>
              </View>
            ) : userResponseStatus === 'accept' ? (
              <TouchableOpacity
                style={styles.arriveButton}
                onPress={() => handleRespond('arrived')}
              >
                <Text style={styles.arriveButtonText}>📍 I Have Arrived at Location</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={styles.acceptButton}
                  onPress={() => handleRespond('accept')}
                >
                  <Text style={styles.acceptButtonText}>✋ I Can Help (Respond)</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.declineButton}
                  onPress={() => handleRespond('decline')}
                >
                  <Text style={styles.declineButtonText}>Cannot Respond</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Responders En Route List */}
          <View style={styles.respondersListCard}>
            <Text style={styles.respondersHeader}>
              Responders En Route ({responders.filter((r) => r.status === 'accepted').length})
            </Text>

            {responders.length === 0 ? (
              <Text style={styles.noRespondersText}>
                Waiting for nearby community helpers to accept...
              </Text>
            ) : (
              responders.map((r) => (
                <View key={r.userId} style={styles.responderRow}>
                  <View>
                    <Text style={styles.responderName}>{r.displayName}</Text>
                    <Text style={styles.responderEta}>
                      {r.status === 'arrived'
                        ? '✅ Arrived on scene'
                        : `ETA: ~${r.etaMinutes ?? 3} min (${r.distanceMeters ?? 'nearby'}m)`}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.responderStatusBadge,
                      r.status === 'arrived' && styles.responderStatusArrived,
                    ]}
                  >
                    {r.status.toUpperCase()}
                  </Text>
                </View>
              ))
            )}
          </View>
        </View>
      ) : (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>🛡️</Text>
          <Text style={styles.emptyTitle}>All Clear in Your Vicinity</Text>
          <Text style={styles.emptySub}>
            No active emergencies reported right now. When an SOS is triggered by someone nearby,
            it will appear here in real-time.
          </Text>
          <TouchableOpacity style={styles.refreshButton} onPress={fetchActiveIncident}>
            <Text style={styles.refreshButtonText}>Refresh Radar</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#F9FAFB',
    flexGrow: 1,
  },
  safetyBanner: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  safetyBannerText: {
    fontSize: 11,
    color: '#92400E',
    flex: 1,
    marginRight: 8,
    lineHeight: 15,
  },
  call112Btn: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  call112BtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 11,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 14,
  },
  loadingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 12,
  },
  incidentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 2,
    borderColor: '#FCA5A5',
    elevation: 3,
  },
  drillBadge: {
    backgroundColor: '#FEF3C7',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  drillBadgeText: {
    color: '#B45309',
    fontSize: 11,
    fontWeight: '800',
  },
  incidentCategory: {
    fontSize: 20,
    fontWeight: '900',
    color: '#DC2626',
  },
  incidentReporter: {
    fontSize: 14,
    color: '#4B5563',
    marginTop: 4,
  },
  boldText: {
    fontWeight: '700',
    color: '#111827',
  },
  incidentDistance: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  mapVisualizer: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    height: 180,
    marginTop: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radarPulse: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#EF4444',
  },
  radarIcon: {
    fontSize: 28,
  },
  mapCoordinates: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 12,
  },
  mapStatus: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  responderActions: {
    marginTop: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  acceptButton: {
    flex: 2,
    backgroundColor: '#059669',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  acceptButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  declineButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  declineButtonText: {
    color: '#6B7280',
    fontWeight: '600',
    fontSize: 13,
  },
  arriveButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  arriveButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  statusBadgeArrived: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#10B981',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  statusBadgeText: {
    color: '#065F46',
    fontWeight: '700',
    fontSize: 14,
  },
  respondersListCard: {
    marginTop: 18,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 14,
  },
  respondersHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 10,
  },
  noRespondersText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  responderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB',
  },
  responderName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  responderEta: {
    fontSize: 11,
    color: '#059669',
    marginTop: 2,
    fontWeight: '500',
  },
  responderStatusBadge: {
    fontSize: 10,
    fontWeight: '700',
    backgroundColor: '#FEF3C7',
    color: '#92400E',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  responderStatusArrived: {
    backgroundColor: '#D1FAE5',
    color: '#065F46',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  emptySub: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  refreshButton: {
    marginTop: 20,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  refreshButtonText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '700',
  },
});
