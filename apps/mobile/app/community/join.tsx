import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { api, ApiError } from '../../lib/api';
import type { Community, CommunityMember } from '@nearhelp/shared';

export default function JoinCommunityScreen() {
  const router = useRouter();
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    community: Community;
    membership: CommunityMember;
    alreadyMember: boolean;
  } | null>(null);

  const handleCall112 = () => {
    Linking.openURL('tel:112');
  };

  const handleJoin = async () => {
    if (!inviteCode.trim()) {
      setError('Please enter an invite code');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await api.post<{
        community: Community;
        membership: CommunityMember;
        alreadyMember: boolean;
      }>('/communities/join', {
        inviteCode: inviteCode.trim(),
      });

      setResult(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to join community');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* 112 Emergency Banner */}
      <TouchableOpacity style={styles.emergencyBanner} onPress={handleCall112}>
        <Text style={styles.emergencyIcon}>🚨</Text>
        <View style={styles.bannerContent}>
          <Text style={styles.bannerTitle}>Emergency Call: 112</Text>
          <Text style={styles.bannerSub}>Police, Ambulance, Fire dispatch</Text>
        </View>
        <Text style={styles.bannerCallBtn}>CALL 112</Text>
      </TouchableOpacity>

      <View style={styles.header}>
        <Text style={styles.titleIcon}>🏘️</Text>
        <Text style={styles.title}>Join a Community</Text>
        <Text style={styles.subtitle}>
          Enter the 8-character invite code provided by your society, campus, or colony admin
        </Text>
      </View>

      {!result ? (
        <View style={styles.card}>
          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <Text style={styles.label}>Invite Code</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. GVALLEY1"
            placeholderTextColor="#9CA3AF"
            value={inviteCode}
            onChangeText={(text) => setInviteCode(text.toUpperCase())}
            autoCapitalize="characters"
            maxLength={16}
          />

          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.buttonDisabled]}
            onPress={handleJoin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>Join Community</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.resultCard}>
          <Text style={styles.successIcon}>
            {result.membership.status === 'approved' ? '✅' : '⏳'}
          </Text>
          <Text style={styles.communityName}>{result.community.name}</Text>
          <Text style={styles.statusBadge}>
            Status: {result.membership.status.toUpperCase()}
          </Text>

          {result.membership.status === 'pending' ? (
            <View style={styles.pendingNoticeBox}>
              <Text style={styles.pendingNoticeTitle}>Approval Required</Text>
              <Text style={styles.pendingNoticeText}>
                Your request has been submitted. A community coordinator or admin must approve your membership before you can send or receive emergency alerts.
              </Text>
            </View>
          ) : (
            <Text style={styles.approvedNoticeText}>
              You are an active member! You can now send and receive emergency alerts in this community.
            </Text>
          )}

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.replace('/(tabs)/home')}
          >
            <Text style={styles.primaryButtonText}>Go to Home</Text>
          </TouchableOpacity>
        </View>
      )}

      <Text style={styles.disclaimerText}>
        Safety Policy: Communities are verified closed networks. Every member is verified to maintain mutual accountability and trust.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#F9FAFB',
    flexGrow: 1,
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
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  titleIcon: {
    fontSize: 44,
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 16,
    lineHeight: 18,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
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
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 2,
    color: '#111827',
    textAlign: 'center',
    marginBottom: 20,
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
    fontWeight: 'bold',
    fontSize: 16,
  },
  resultCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  successIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  communityName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
  },
  statusBadge: {
    fontSize: 13,
    fontWeight: '700',
    color: '#D97706',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 16,
  },
  pendingNoticeBox: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 10,
    padding: 14,
    marginBottom: 20,
  },
  pendingNoticeTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#92400E',
    marginBottom: 4,
  },
  pendingNoticeText: {
    fontSize: 12,
    color: '#78350F',
    lineHeight: 16,
  },
  approvedNoticeText: {
    fontSize: 13,
    color: '#065F46',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },
  disclaimerText: {
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 24,
    paddingHorizontal: 16,
    lineHeight: 16,
  },
});
