import { View, Text, StyleSheet, TouchableOpacity, Linking, ScrollView } from 'react-native';
import { useAuthStore } from '../../store/auth-store';
import { AvailabilityToggle } from '../../components/AvailabilityToggle';

export default function HomeScreen() {
  const { user } = useAuthStore();

  const handleCall112 = () => {
    Linking.openURL('tel:112');
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
        communityId="123e4567-e89b-12d3-a456-426614174000"
        communityName="Green Valley Society"
        isApprovedMember={true}
      />

      {/* SOS Button Area (Full implementation in Milestone 6) */}
      <View style={styles.sosCard}>
        <TouchableOpacity style={styles.sosButton} activeOpacity={0.8}>
          <Text style={styles.sosText}>SOS</Text>
          <Text style={styles.sosSubText}>PRESS & HOLD</Text>
        </TouchableOpacity>
        <Text style={styles.sosDisclaimer}>
          Alerts verified community helpers within 1 km.
        </Text>
      </View>

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
    marginBottom: 20,
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
  greetingCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 24,
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
    marginBottom: 24,
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
    fontSize: 13,
    color: '#6B7280',
    marginTop: 18,
    textAlign: 'center',
  },
  safetyFooter: {
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 16,
  },
});
