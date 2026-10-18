import { View, Text, StyleSheet, TouchableOpacity, Alert, Linking, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/auth-store';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleCall112 = () => {
    Linking.openURL('tel:112');
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* 112 Call Banner */}
      <TouchableOpacity style={styles.emergencyBanner} onPress={handleCall112}>
        <Text style={styles.emergencyIcon}>🚨</Text>
        <View style={styles.bannerContent}>
          <Text style={styles.bannerTitle}>Emergency Call: 112</Text>
          <Text style={styles.bannerSub}>Immediate Police, Ambulance, Fire dispatch</Text>
        </View>
        <Text style={styles.bannerCallBtn}>CALL 112</Text>
      </TouchableOpacity>

      {/* Profile Card */}
      <View style={styles.profileCard}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarInitial}>
            {user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
          </Text>
        </View>
        <Text style={styles.userName}>{user?.displayName || 'Unknown User'}</Text>
        <Text style={styles.userPhone}>{user?.phone || 'No phone number linked'}</Text>
        <Text style={styles.userIdBadge}>ID: {user?.id?.slice(0, 8)}...</Text>
      </View>

      {/* Actions */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Safety & Emergency Settings</Text>

        <TouchableOpacity
          style={styles.menuRow}
          onPress={() => router.push('/(tabs)/contacts')}
        >
          <Text style={styles.menuIcon}>📞</Text>
          <View style={styles.menuTextContainer}>
            <Text style={styles.menuTitle}>Emergency Contacts</Text>
            <Text style={styles.menuSubtitle}>Notify contacts with a live tracking link on SOS</Text>
          </View>
          <Text style={styles.menuChevron}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuRow} onPress={handleCall112}>
          <Text style={styles.menuIcon}>🚨</Text>
          <View style={styles.menuTextContainer}>
            <Text style={styles.menuTitle}>Call National Emergency (112)</Text>
            <Text style={styles.menuSubtitle}>Toll-free emergency dispatch</Text>
          </View>
          <Text style={styles.menuChevron}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Sign Out</Text>
      </TouchableOpacity>

      <Text style={styles.disclaimerText}>
        NearHelp App v0.1.0 • Privacy by design: no permanent location tracking.
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
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
  },
  emergencyIcon: {
    fontSize: 22,
    marginRight: 10,
  },
  bannerContent: {
    flex: 1,
  },
  bannerTitle: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
  bannerSub: {
    color: '#FEE2E2',
    fontSize: 11,
  },
  bannerCallBtn: {
    backgroundColor: '#FFFFFF',
    color: '#DC2626',
    fontWeight: 'bold',
    fontSize: 11,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 20,
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#EFF6FF',
    borderWidth: 2,
    borderColor: '#BFDBFE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarInitial: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1D4ED8',
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  userPhone: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  userIdBadge: {
    fontSize: 11,
    color: '#9CA3AF',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 8,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 12,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  menuIcon: {
    fontSize: 22,
    marginRight: 12,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  menuSubtitle: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  menuChevron: {
    fontSize: 20,
    color: '#9CA3AF',
  },
  logoutButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 20,
  },
  logoutButtonText: {
    color: '#DC2626',
    fontWeight: 'bold',
    fontSize: 15,
  },
  disclaimerText: {
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 16,
  },
});
