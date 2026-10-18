import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Linking,
  ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '../../store/auth-store';

export default function RegisterScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ token?: string; suggestedName?: string }>();
  const { register, isLoading, error, clearError } = useAuthStore();

  const [displayName, setDisplayName] = useState(params.suggestedName || '');
  const [phone, setPhone] = useState('');
  const [localLoading, setLocalLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleCall112 = () => {
    Linking.openURL('tel:112');
  };

  const handleRegister = async () => {
    setValidationError(null);
    clearError();

    if (!displayName.trim() || displayName.trim().length < 2) {
      setValidationError('Please enter a display name (at least 2 characters)');
      return;
    }

    if (phone && !/^\+[1-9]\d{1,14}$/.test(phone.trim())) {
      setValidationError('Phone must be in international format (e.g. +919876543210)');
      return;
    }

    setLocalLoading(true);
    try {
      // Use existing token if passed, or generate mock token from name
      const token =
        params.token ||
        `mock_token_${displayName.toLowerCase().trim().replace(/[^a-z0-9]/g, '_')}_${Date.now()}`;

      await register(token, displayName.trim(), phone.trim() || undefined);
      router.replace('/(tabs)/home');
    } catch {
      // Error handled by store
    } finally {
      setLocalLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* 112 Emergency Banner */}
      <TouchableOpacity style={styles.emergencyBanner} onPress={handleCall112}>
        <Text style={styles.emergencyBannerIcon}>🚨</Text>
        <View style={styles.emergencyBannerTextContainer}>
          <Text style={styles.emergencyBannerTitle}>Emergency? Call 112</Text>
          <Text style={styles.emergencyBannerSub}>Always call police/medical services in real danger</Text>
        </View>
        <Text style={styles.emergencyCallBtn}>CALL 112</Text>
      </TouchableOpacity>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.appIcon}>🏥</Text>
        <Text style={styles.appName}>Join NearHelp</Text>
        <Text style={styles.tagline}>Create your community safety profile</Text>
      </View>

      {/* Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Complete Profile</Text>

        {(validationError || error) && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{validationError || error}</Text>
          </View>
        )}

        <Text style={styles.label}>Full Name / Display Name *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Priya Sharma"
          placeholderTextColor="#9CA3AF"
          value={displayName}
          onChangeText={setDisplayName}
        />

        <Text style={styles.label}>Phone Number (Optional, for emergency coordination)</Text>
        <TextInput
          style={styles.input}
          placeholder="+919876543210"
          placeholderTextColor="#9CA3AF"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />
        <Text style={styles.helperText}>Include country code with + (E.164 format)</Text>

        {/* Safety & Privacy Notice */}
        <View style={styles.noticeBox}>
          <Text style={styles.noticeTitle}>🛡️ Privacy & Safety Rules:</Text>
          <Text style={styles.noticeItem}>• Your location is ONLY shared while you are marked available or during an active SOS.</Text>
          <Text style={styles.noticeItem}>• No location history is ever retained.</Text>
          <Text style={styles.noticeItem}>• You are NEVER obligated to respond to an emergency alert.</Text>
          <Text style={styles.noticeItem}>• Do not confront danger; call 112 first.</Text>
        </View>

        <TouchableOpacity
          style={[styles.primaryButton, (isLoading || localLoading) && styles.buttonDisabled]}
          onPress={handleRegister}
          disabled={isLoading || localLoading}
        >
          {isLoading || localLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>Create Account & Continue</Text>
          )}
        </TouchableOpacity>

        <View style={styles.footerRow}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
            <Text style={styles.footerLink}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
  },
  emergencyBanner: {
    backgroundColor: '#DC2626',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
  },
  emergencyBannerIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  emergencyBannerTextContainer: {
    flex: 1,
  },
  emergencyBannerTitle: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  emergencyBannerSub: {
    color: '#FEE2E2',
    fontSize: 11,
  },
  emergencyCallBtn: {
    backgroundColor: '#FFFFFF',
    color: '#DC2626',
    fontWeight: 'bold',
    fontSize: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  appIcon: {
    fontSize: 44,
    marginBottom: 6,
  },
  appName: {
    fontSize: 26,
    fontWeight: '800',
    color: '#111827',
  },
  tagline: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
  },
  errorBox: {
    backgroundColor: '#FEE2E2',
    padding: 10,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 13,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
    marginBottom: 6,
  },
  helperText: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 16,
  },
  noticeBox: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
  },
  noticeTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 6,
  },
  noticeItem: {
    fontSize: 11,
    color: '#78350F',
    lineHeight: 16,
    marginBottom: 2,
  },
  primaryButton: {
    backgroundColor: '#DC2626',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  footerText: {
    fontSize: 14,
    color: '#6B7280',
  },
  footerLink: {
    fontSize: 14,
    color: '#DC2626',
    fontWeight: '600',
  },
});
