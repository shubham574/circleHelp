import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  Alert,
  Linking,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { api, ApiError } from '../../lib/api';
import type { Community, CommunityMember } from '@nearhelp/shared';

interface MemberWithUser extends CommunityMember {
  phone: string | null;
  avatarUrl: string | null;
}

export default function CommunityDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [community, setCommunity] = useState<Community | null>(null);
  const [members, setMembers] = useState<MemberWithUser[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const handleCall112 = () => {
    Linking.openURL('tel:112');
  };

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const commData = await api.get<{
        community: Community;
        membership: CommunityMember;
      }>(`/communities/${id}`);
      setCommunity(commData.community);

      // If approved member, load members list
      if (commData.membership?.status === 'approved') {
        const membersData = await api.get<{
          members: MemberWithUser[];
          canManage: boolean;
        }>(`/communities/${id}/members`);
        setMembers(membersData.members);
        setCanManage(membersData.canManage);
      }
    } catch (err) {
      Alert.alert('Error', err instanceof ApiError ? err.message : 'Failed to load community details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleUpdateMember = async (userId: string, status: 'approved' | 'banned') => {
    if (!id) return;
    setActionLoadingId(userId);
    try {
      await api.patch(`/communities/${id}/members/${userId}`, {
        status,
      });
      // Refresh member list
      await loadData();
    } catch (err) {
      Alert.alert('Action Failed', err instanceof ApiError ? err.message : 'Could not update member');
    } finally {
      setActionLoadingId(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#DC2626" />
      </View>
    );
  }

  const pendingMembers = members.filter((m) => m.status === 'pending');
  const activeMembers = members.filter((m) => m.status === 'approved');

  return (
    <FlatList
      data={canManage ? pendingMembers : activeMembers}
      keyExtractor={(item) => item.userId}
      contentContainerStyle={styles.container}
      ListHeaderComponent={
        <>
          {/* 112 Banner */}
          <TouchableOpacity style={styles.emergencyBanner} onPress={handleCall112}>
            <Text style={styles.emergencyIcon}>🚨</Text>
            <View style={styles.bannerContent}>
              <Text style={styles.bannerTitle}>Emergency Call: 112</Text>
              <Text style={styles.bannerSub}>Call Police / EMS immediately in life danger</Text>
            </View>
            <Text style={styles.bannerCallBtn}>CALL 112</Text>
          </TouchableOpacity>

          {/* Community Info Card */}
          <View style={styles.infoCard}>
            <Text style={styles.commIcon}>🏘️</Text>
            <Text style={styles.commName}>{community?.name}</Text>
            <Text style={styles.commDesc}>{community?.description || 'Verified Community'}</Text>

            <View style={styles.metaRow}>
              <View style={styles.metaBadge}>
                <Text style={styles.metaBadgeLabel}>Radius</Text>
                <Text style={styles.metaBadgeValue}>
                  {community ? `${(community.radiusM / 1000).toFixed(1)} km` : '-'}
                </Text>
              </View>
              <View style={styles.metaBadge}>
                <Text style={styles.metaBadgeLabel}>Active Members</Text>
                <Text style={styles.metaBadgeValue}>{activeMembers.length}</Text>
              </View>
            </View>

            {community?.inviteCode && (
              <View style={styles.inviteBox}>
                <Text style={styles.inviteLabel}>Invite Code to Share:</Text>
                <Text style={styles.inviteCode}>{community.inviteCode}</Text>
              </View>
            )}
          </View>

          {/* Pending Approvals Section Title */}
          {canManage && (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                Pending Approvals ({pendingMembers.length})
              </Text>
              <Text style={styles.sectionSubtitle}>
                New applicants must be verified before they can respond or trigger SOS
              </Text>
            </View>
          )}
        </>
      }
      renderItem={({ item }) => (
        <View style={styles.memberCard}>
          <View style={styles.memberInfo}>
            <Text style={styles.memberName}>{item.displayName}</Text>
            <Text style={styles.memberPhone}>{item.phone || 'No phone provided'}</Text>
            <Text style={styles.memberRoleBadge}>{item.role.toUpperCase()}</Text>
          </View>

          {canManage && item.status === 'pending' && (
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.approveBtn}
                onPress={() => handleUpdateMember(item.userId, 'approved')}
                disabled={actionLoadingId === item.userId}
              >
                {actionLoadingId === item.userId ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.approveBtnText}>Approve</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.rejectBtn}
                onPress={() => handleUpdateMember(item.userId, 'banned')}
                disabled={actionLoadingId === item.userId}
              >
                <Text style={styles.rejectBtnText}>Reject</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
      ListEmptyComponent={
        canManage ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>🎉 No pending member approvals</Text>
          </View>
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#F9FAFB',
    flexGrow: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emergencyBanner: {
    backgroundColor: '#DC2626',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
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
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    marginBottom: 20,
  },
  commIcon: {
    fontSize: 40,
    marginBottom: 6,
  },
  commName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
  },
  commDesc: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  metaBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  metaBadgeLabel: {
    fontSize: 11,
    color: '#6B7280',
  },
  metaBadgeValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 2,
  },
  inviteBox: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginTop: 16,
  },
  inviteLabel: {
    fontSize: 11,
    color: '#1E40AF',
  },
  inviteCode: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1D4ED8',
    letterSpacing: 2,
    marginTop: 2,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  sectionSubtitle: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  memberCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  memberPhone: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  memberRoleBadge: {
    fontSize: 10,
    color: '#4B5563',
    backgroundColor: '#F3F4F6',
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 6,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  approveBtn: {
    backgroundColor: '#059669',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 70,
    alignItems: 'center',
  },
  approveBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  rejectBtn: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  rejectBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
  },
});
