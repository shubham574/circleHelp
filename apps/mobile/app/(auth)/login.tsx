import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Linking,
  ScrollView,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/auth-store';
import { getApiUrl, loadSavedServerUrl, setCustomServerUrl } from '../../lib/api';
import { disconnectSocket } from '../../lib/socket';

export default function LoginScreen() {
  const router = useRouter();
  const { login, isLoading, error, clearError } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localLoading, setLocalLoading] = useState(false);

  const [serverUrl, setServerUrl] = useState(getApiUrl());
  const [showServerModal, setShowServerModal] = useState(false);
  const [serverInput, setServerInput] = useState(getApiUrl());
  const [serverTesting, setServerTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    loadSavedServerUrl().then((url) => {
      setServerUrl(url);
      setServerInput(url);
    });
  }, []);

  const handleCall112 = () => {
    Linking.openURL('tel:112');
  };

  const handleOpenServerModal = () => {
    setServerInput(serverUrl);
    setTestResult(null);
    setShowServerModal(true);
  };

  const handleTestAndSaveServer = async () => {
    if (!serverInput.trim()) return;
    setServerTesting(true);
    setTestResult(null);
    const candidate = serverInput.trim().replace(/\/+$/, '');
    try {
      const res = await fetch(`${candidate}/health`, { method: 'GET' });
      if (res.ok) {
        await setCustomServerUrl(candidate);
        disconnectSocket();
        setServerUrl(candidate);
        setTestResult({ ok: true, msg: 'Connected successfully to API server!' });
        setTimeout(() => setShowServerModal(false), 900);
      } else {
        setTestResult({ ok: false, msg: `Server responded with HTTP ${res.status}` });
      }
    } catch (e: any) {
      setTestResult({
        ok: false,
        msg: `Connection failed: ${e?.message || 'Server unreachable'}. Check URL or network.`,
      });
    } finally {
      setServerTesting(false);
    }
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

      {/* Server Config Bar */}
      <TouchableOpacity style={styles.serverBar} onPress={handleOpenServerModal}>
        <Text style={styles.serverBarIcon}>🌐</Text>
        <View style={styles.serverBarTextCol}>
          <Text style={styles.serverBarLabel}>API Server (Tap to change)</Text>
          <Text style={styles.serverBarUrl} numberOfLines={1}>
            {serverUrl}
          </Text>
        </View>
        <Text style={styles.serverBarChangeBtn}>Edit</Text>
      </TouchableOpacity>

      <Text style={styles.disclaimerText}>
        Safety Notice: Helpers are never obliged to respond. Always prioritize personal safety and call 112 first.
      </Text>

      {/* Server Configuration Modal */}
      <Modal
        visible={showServerModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowServerModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Configure API Server</Text>
            <Text style={styles.modalSubtitle}>
              Connect your mobile app to your Render backend or local server:
            </Text>

            <TextInput
              style={styles.modalInput}
              value={serverInput}
              onChangeText={setServerInput}
              placeholder="https://nearhelp-api.onrender.com"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />

            {testResult && (
              <View
                style={[
                  styles.testResultBox,
                  testResult.ok ? styles.testSuccessBox : styles.testErrorBox,
                ]}
              >
                <Text
                  style={[
                    styles.testResultText,
                    testResult.ok ? styles.testSuccessText : styles.testErrorText,
                  ]}
                >
                  {testResult.msg}
                </Text>
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowServerModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSaveBtn, serverTesting && styles.buttonDisabled]}
                onPress={handleTestAndSaveServer}
                disabled={serverTesting}
              >
                {serverTesting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalSaveText}>Test & Connect</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    marginTop: 16,
    paddingHorizontal: 16,
  },
  serverBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  serverBarIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  serverBarTextCol: {
    flex: 1,
  },
  serverBarLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  serverBarUrl: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 2,
  },
  serverBarChangeBtn: {
    backgroundColor: '#F3F4F6',
    color: '#374151',
    fontWeight: '700',
    fontSize: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 22,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#111827',
    marginBottom: 12,
  },
  testResultBox: {
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  testSuccessBox: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  testErrorBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  testResultText: {
    fontSize: 12,
    fontWeight: '600',
  },
  testSuccessText: {
    color: '#065F46',
  },
  testErrorText: {
    color: '#991B1B',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 8,
  },
  modalCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
  },
  modalSaveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#DC2626',
    minWidth: 110,
    alignItems: 'center',
  },
  modalSaveText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
