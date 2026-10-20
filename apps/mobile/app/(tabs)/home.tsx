import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  ScrollView,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as Location from 'expo-location';
import { useAuthStore } from '../../store/auth-store';
import { AvailabilityToggle } from '../../components/AvailabilityToggle';
import { api } from '../../lib/api';
import {
  INCIDENT_CATEGORIES,
  INCIDENT_CATEGORY_LABELS,
  type IncidentCategory,
  DRILL_BANNER_TEXT,
} from '@nearhelp/shared';

interface ActiveIncidentState {
  id: string;
  category: IncidentCategory;
  isDrill: boolean;
  notifiedCount: number;
  createdAt: string;
}

export default function HomeScreen() {
  const { user } = useAuthStore();
  const [selectedCategory, setSelectedCategory] = useState<IncidentCategory>('medical');
  const [isDrill, setIsDrill] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  // 5-Second Cancel Countdown State
  const [countdown, setCountdown] = useState<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Active Incident State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeIncident, setActiveIncident] = useState<ActiveIncidentState | null>(null);

  const defaultCommunityId = '123e4567-e89b-12d3-a456-426614174000';

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleCall112 = () => {
    Linking.openURL('tel:112');
  };

  // 1. User presses SOS button -> initiates 5-second cancel countdown window
  const startSOSCountdown = () => {
    setCountdown(5);
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          triggerSOS();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // User aborts within 5-second window
  const cancelCountdown = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setCountdown(null);
  };

  // 2. Countdown expired -> Trigger SOS
  const triggerSOS = async () => {
    setIsSubmitting(true);
    try {
      // Request location permission & get current coordinates
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Error', 'Location permission is required to trigger SOS');
        setIsSubmitting(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const response = await api.post<{
        incident: { id: string; category: IncidentCategory; isDrill: boolean; createdAt: string };
        notifiedRespondersCount: number;
      }>('/incidents', {
        communityId: defaultCommunityId,
        category: selectedCategory,
        location: {
          lat: loc.coords.latitude,
          lng: loc.coords.longitude,
        },
        isDrill,
        description: isDrill ? 'Community Safety Drill Exercise' : 'Urgent SOS Emergency',
      });

      setActiveIncident({
        id: response.incident.id,
        category: response.incident.category,
        isDrill: response.incident.isDrill,
        notifiedCount: response.notifiedRespondersCount,
        createdAt: response.incident.createdAt,
      });

      Alert.alert(
        isDrill ? 'Drill Started' : 'SOS Alert Broadcasted',
        isDrill
          ? 'Community safety drill exercise is active.'
          : `Alert sent to ${response.notifiedRespondersCount} nearby verified helpers within 1 km!`
      );
    } catch (err: unknown) {
      const error = err as { message?: string };
      Alert.alert('SOS Trigger Failed', error.message || 'Could not connect to emergency server');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. Cancel Active Incident
  const handleCancelIncident = async () => {
    if (!activeIncident) return;
    try {
      await api.post(`/incidents/${activeIncident.id}/cancel`);
      setActiveIncident(null);
      Alert.alert('Alert Cancelled', 'The SOS alert has been cancelled.');
    } catch (err: unknown) {
      const error = err as { message?: string };
      Alert.alert('Error', error.message || 'Failed to cancel incident');
    }
  };

  // 4. Resolve Active Incident
  const handleResolveIncident = async () => {
    if (!activeIncident) return;
    try {
      await api.post(`/incidents/${activeIncident.id}/resolve`, {
        notes: 'Resolved by reporter',
      });
      setActiveIncident(null);
      Alert.alert('Incident Resolved', 'Glad you are safe! Thank you for notifying responders.');
    } catch (err: unknown) {
      const error = err as { message?: string };
      Alert.alert('Error', error.message || 'Failed to resolve incident');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* 112 Mandatory Emergency Banner */}
      <TouchableOpacity style={styles.emergencyBanner} onPress={handleCall112}>
        <Text style={styles.emergencyIcon}>🚨</Text>
        <View style={styles.bannerContent}>
          <Text style={styles.bannerTitle}>EMERGENCY: DIAL 112</Text>
          <Text style={styles.bannerSub}>Immediate connection to police, ambulance, and fire</Text>
        </View>
        <Text style={styles.bannerCallBtn}>CALL NOW</Text>
      </TouchableOpacity>

      {/* Drill Banner if drill mode is toggled */}
      {isDrill && (
        <View style={styles.drillBanner}>
          <Text style={styles.drillBannerText}>{DRILL_BANNER_TEXT}</Text>
        </View>
      )}

      {/* User Greeting */}
      <View style={styles.greetingCard}>
        <Text style={styles.greetingText}>
          Hello, <Text style={styles.userName}>{user?.displayName || 'Member'}</Text> 👋
        </Text>
        <Text style={styles.statusText}>
          {user?.phone ? `Linked Phone: ${user.phone}` : 'No phone linked'}
        </Text>
      </View>

      {/* Availability & Background Location Toggle */}
      <AvailabilityToggle
        communityId={defaultCommunityId}
        communityName="Green Valley Society"
        isApprovedMember={true}
      />

      {/* ACTIVE SOS STATUS CARD */}
      {activeIncident ? (
        <View style={styles.activeSosCard}>
          <Text style={styles.activeSosHeader}>🚨 EMERGENCY ALERT ACTIVE</Text>
          <Text style={styles.activeSosCategory}>
            Category: {INCIDENT_CATEGORY_LABELS[activeIncident.category]}
          </Text>
          <Text style={styles.activeSosResponders}>
            ⚡ {activeIncident.notifiedCount} Community Helpers Notified
          </Text>
          <Text style={styles.activeSosSubtext}>
            Stay calm. Helpers are navigating to your location.
          </Text>

          <View style={styles.actionButtonGroup}>
            <TouchableOpacity style={styles.resolveButton} onPress={handleResolveIncident}>
              <Text style={styles.resolveButtonText}>✅ I AM SAFE (RESOLVE)</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelAlertButton} onPress={handleCancelIncident}>
              <Text style={styles.cancelAlertButtonText}>CANCEL (FALSE ALARM)</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        /* SOS TRIGGER CARD */
        <View style={styles.sosCard}>
          {/* Category Selector Button */}
          <TouchableOpacity
            style={styles.categoryPickerButton}
            onPress={() => setShowCategoryModal(true)}
          >
            <Text style={styles.categoryPickerLabel}>Type: </Text>
            <Text style={styles.categoryPickerValue}>
              {INCIDENT_CATEGORY_LABELS[selectedCategory]} ▼
            </Text>
          </TouchableOpacity>

          {/* Drill Mode Switch */}
          <TouchableOpacity
            style={[styles.drillToggle, isDrill && styles.drillToggleActive]}
            onPress={() => setIsDrill(!isDrill)}
          >
            <Text style={[styles.drillToggleText, isDrill && styles.drillToggleTextActive]}>
              {isDrill ? '⚠️ Drill Mode ON' : '🛡️ Standard SOS'}
            </Text>
          </TouchableOpacity>

          {/* SOS Big Button */}
          {countdown !== null ? (
            <View style={styles.countdownContainer}>
              <Text style={styles.countdownNumber}>{countdown}</Text>
              <Text style={styles.countdownWarning}>Alerting helpers in {countdown}s...</Text>
              <TouchableOpacity style={styles.cancelCountdownButton} onPress={cancelCountdown}>
                <Text style={styles.cancelCountdownText}>CANCEL SOS</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.sosButton, isDrill && styles.sosButtonDrill]}
              activeOpacity={0.8}
              onPress={startSOSCountdown}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="large" color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.sosText}>SOS</Text>
                  <Text style={styles.sosSubText}>TAP TO ALERT</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          <Text style={styles.sosDisclaimer}>
            5-second cancel countdown before alerting helpers within 1 km.
          </Text>
        </View>
      )}

      {/* Category Selection Modal */}
      <Modal visible={showCategoryModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Select Emergency Category</Text>
            {INCIDENT_CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryOption,
                  selectedCategory === cat && styles.categoryOptionSelected,
                ]}
                onPress={() => {
                  setSelectedCategory(cat);
                  setShowCategoryModal(false);
                }}
              >
                <Text
                  style={[
                    styles.categoryOptionText,
                    selectedCategory === cat && styles.categoryOptionTextSelected,
                  ]}
                >
                  {INCIDENT_CATEGORY_LABELS[cat]}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowCategoryModal(false)}
            >
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Text style={styles.safetyFooter}>
        ⚠️ Safety Guidance: Helpers are volunteers and never obliged to enter danger. Call 112 first.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#F9FAFB',
    flexGrow: 1,
  },
  emergencyBanner: {
    backgroundColor: '#DC2626',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    marginBottom: 16,
    elevation: 3,
  },
  emergencyIcon: {
    fontSize: 26,
    marginRight: 10,
  },
  bannerContent: {
    flex: 1,
  },
  bannerTitle: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  bannerSub: {
    color: '#FEE2E2',
    fontSize: 11,
    marginTop: 2,
  },
  bannerCallBtn: {
    backgroundColor: '#FFFFFF',
    color: '#DC2626',
    fontWeight: '800',
    fontSize: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  drillBanner: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
    padding: 10,
    borderRadius: 10,
    marginBottom: 16,
    alignItems: 'center',
  },
  drillBannerText: {
    color: '#92400E',
    fontWeight: '700',
    fontSize: 12,
  },
  greetingCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 20,
  },
  greetingText: {
    fontSize: 18,
    color: '#1F2937',
  },
  userName: {
    fontWeight: 'bold',
    color: '#111827',
  },
  statusText: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  sosCard: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    marginBottom: 20,
  },
  categoryPickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 12,
  },
  categoryPickerLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  categoryPickerValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
  },
  drillToggle: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    marginBottom: 20,
  },
  drillToggleActive: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  drillToggleText: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '600',
  },
  drillToggleTextActive: {
    color: '#92400E',
    fontWeight: '700',
  },
  sosButton: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#DC2626',
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 6,
    borderColor: '#FCA5A5',
  },
  sosButtonDrill: {
    backgroundColor: '#D97706',
    borderColor: '#FDE68A',
  },
  sosText: {
    color: '#FFFFFF',
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: 2,
  },
  sosSubText: {
    color: '#FEE2E2',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },
  sosDisclaimer: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 18,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  countdownContainer: {
    alignItems: 'center',
    padding: 20,
  },
  countdownNumber: {
    fontSize: 72,
    fontWeight: '900',
    color: '#DC2626',
  },
  countdownWarning: {
    fontSize: 14,
    color: '#4B5563',
    marginTop: 8,
    fontWeight: '600',
  },
  cancelCountdownButton: {
    marginTop: 20,
    backgroundColor: '#111827',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  cancelCountdownText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  activeSosCard: {
    backgroundColor: '#FEF2F2',
    borderWidth: 2,
    borderColor: '#EF4444',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  activeSosHeader: {
    color: '#DC2626',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  activeSosCategory: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 8,
  },
  activeSosResponders: {
    fontSize: 14,
    fontWeight: '700',
    color: '#059669',
    marginTop: 6,
  },
  activeSosSubtext: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center',
  },
  actionButtonGroup: {
    width: '100%',
    marginTop: 18,
  },
  resolveButton: {
    backgroundColor: '#059669',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  resolveButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  cancelAlertButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DC2626',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelAlertButtonText: {
    color: '#DC2626',
    fontWeight: '700',
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 16,
  },
  categoryOption: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  categoryOptionSelected: {
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    paddingHorizontal: 10,
  },
  categoryOptionText: {
    fontSize: 15,
    color: '#374151',
    fontWeight: '500',
  },
  categoryOptionTextSelected: {
    color: '#DC2626',
    fontWeight: '700',
  },
  modalCloseButton: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCloseText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '600',
  },
  safetyFooter: {
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 16,
    marginTop: 10,
  },
});
