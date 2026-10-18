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
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/auth-store';

export default function LoginScreen() {
  const router = useRouter();
  const { login, isLoading, error, clearError } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localLoading, setLocalLoading] = useState(false);

  const handleCall112 = () => {
    Linking.openURL('tel:112');
  };

  const handleLogin = async () => {
    if (!email) return;
    setLocalLoading(true);
    clearError();
    try {
      // In development, mock_token_<uid> connects seamlessly with the backend mock auth
      const mockUid = email.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const token = `mock_token_${mockUid}`;
      await login(token);
      router.replace('/(tabs)/home');
    } catch {
      // Error handled by store
    } finally {
      setLocalLoading(false);
    }
  };

  const handleQuickDemo = async (name: string, uid: string) => {
    setLocalLoading(true);
    clearError();
    try {
      await login(`mock_token_${uid}`);
      router.replace('/(tabs)/home');
    } catch {
      // If user not registered yet, send to register with prefilled token
      router.push({
        pathname: '/(auth)/register',
        params: { token: `mock_token_${uid}`, suggestedName: name },
      });
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
          <Text style={styles.emergencyBannerTitle}>Immediate Danger? Call 112</Text>
          <Text style={styles.emergencyBannerSub}>NearHelp is community assistance, not police/EMS</Text>
        </View>
        <Text style={styles.emergencyCallBtn}>CALL 112</Text>
      </TouchableOpacity>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.appIcon}>🏥</Text>
        <Text style={styles.appName}>NearHelp</Text>
        <Text style={styles.tagline}>Community Emergency Response</Text>
      </View>

      {/* Form Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Sign In</Text>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <Text style={styles.label}>Email Address</Text>
        <TextInput
          style={styles.input}
          placeholder="your.email@example.com"
          placeholderTextColor="#9CA3AF"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          placeholder="••••••••"
          placeholderTextColor="#9CA3AF"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity
          style={[styles.primaryButton, (isLoading || localLoading) && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={isLoading || localLoading}
        >
          {isLoading || localLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>Sign In</Text>
          )}
        </TouchableOpacity>

        {/* Quick Demo Logins for Fast Pair Testing */}
        <View style={styles.demoSection}>
          <Text style={styles.demoTitle}>Quick Demo Logins (Dev Mode):</Text>
          <View style={styles.demoButtonsRow}>
            <TouchableOpacity
              style={styles.demoBtn}
              onPress={() => handleQuickDemo('Alice Admin', 'seed_firebase_admin_001')}
            >
              <Text style={styles.demoBtnText}>Alice (Admin)</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.demoBtn}
              onPress={() => handleQuickDemo('Bob Victim', 'seed_firebase_victim_002')}
            >
              <Text style={styles.demoBtnText}>Bob (Victim)</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.demoBtn}
              onPress={() => handleQuickDemo('Charlie Helper', 'seed_firebase_charlie_003')}
            >
              <Text style={styles.demoBtnText}>Charlie (Helper)</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.footerRow}>
          <Text style={styles.footerText}>New to NearHelp? </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
            <Text style={styles.footerLink}>Create an Account</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.disclaimerText}>
        Safety Notice: Helpers are never obliged to respond. Always prioritize personal safety and call 112 first.
      </Text>
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
    marginBottom: 24,
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
    marginBottom: 24,
  },
  appIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  appName: {
    fontSize: 30,
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
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardTitle: {
    fontSize: 20,
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
    marginBottom: 16,
  },
  primaryButton: {
    backgroundColor: '#DC2626',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  demoSection: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  demoTitle: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
    marginBottom: 8,
  },
  demoButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  demoBtn: {
    flex: 1,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  demoBtnText: {
    color: '#1D4ED8',
    fontSize: 11,
    fontWeight: '600',
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
  disclaimerText: {
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 24,
    paddingHorizontal: 16,
  },
});
