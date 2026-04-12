import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '@/hooks/useAuth';
import { getMyDuels, acceptDuel, rejectDuel } from '@/lib/api';
import { useRealtimeIncomingDuels } from '@/hooks/useRealtime';
import { sendLocalNotification } from '@/lib/notifications';
import { DuelCard } from '@/components/DuelCard';
import { Duel } from '@/types';

export default function HomeScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [duels, setDuels] = useState<Duel[]>([]);
  const [loading, setLoading] = useState(false);
  const [actioningId, setActioningId] = useState<string | null>(null);

  const fetchDuels = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getMyDuels(user.id);
      setDuels(data);
    } catch (e: any) {
      Alert.alert('오류', e.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      fetchDuels();
    }, [fetchDuels])
  );

  // 새 대결 신청 도착 시 알림 + 목록 갱신
  useRealtimeIncomingDuels(user?.id ?? '', useCallback(() => {
    sendLocalNotification('⚔️ 대결 신청!', '친구가 대결을 신청했습니다.');
    fetchDuels();
  }, [fetchDuels]));

  const handleAccept = async (duel: Duel) => {
    if (!user) return;
    setActioningId(duel.id);
    try {
      await acceptDuel(duel.id, user.id);
      await fetchDuels();
      Alert.alert('대결 시작! 🔥', '대결이 시작되었습니다. 절제력을 보여주세요!');
    } catch (e: any) {
      Alert.alert('오류', e.message);
    } finally {
      setActioningId(null);
    }
  };

  const handleReject = (duel: Duel) => {
    Alert.alert(
      '대결 거절',
      `${duel.creator?.nickname ?? '상대방'}의 대결 신청을 거절하시겠어요?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '거절',
          style: 'destructive',
          onPress: async () => {
            setActioningId(duel.id);
            try {
              await rejectDuel(duel.id);
              await fetchDuels();
            } catch (e: any) {
              Alert.alert('오류', e.message);
            } finally {
              setActioningId(null);
            }
          },
        },
      ]
    );
  };

  // 나에게 온 pending 대결 (내가 opponent인 경우)
  const incomingDuels = duels.filter(
    (d) => d.status === 'pending' && d.opponent_id === user?.id
  );
  // 내가 만든 pending 대결 (수락 대기 중)
  const outgoingPendingDuels = duels.filter(
    (d) => d.status === 'pending' && d.creator_id === user?.id
  );
  const activeDuels = duels.filter((d) => d.status === 'active');
  const finishedDuels = duels.filter((d) => d.status === 'finished');

  const renderHeader = () => (
    <View>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.greeting}>안녕하세요 👋</Text>
          <Text style={styles.userName}>{user?.nickname ?? ''}님</Text>
        </View>
        <View style={styles.topBarRight}>
          <View style={styles.trustBadge}>
            <Text style={styles.trustIcon}>🛡️</Text>
            <Text style={styles.trustScore}>{user?.trust_score ?? 100}</Text>
          </View>
          {user?.avatar_url ? (
            <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitial}>{user?.nickname?.charAt(0) ?? '?'}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Stats Summary */}
      <View style={styles.statsRow}>
        <StatBox label="진행 중" value={activeDuels.length} color="#6C5CE7" />
        <StatBox label="신청 받음" value={incomingDuels.length} color="#E17055" />
        <StatBox label="완료" value={finishedDuels.length} color="#00B894" />
      </View>

      {/* 받은 대결 신청 섹션 */}
      {incomingDuels.length > 0 && (
        <View style={styles.incomingSection}>
          <Text style={styles.incomingSectionTitle}>⚔️ 받은 대결 신청</Text>
          {incomingDuels.map((duel) => (
            <IncomingDuelCard
              key={duel.id}
              duel={duel}
              loading={actioningId === duel.id}
              onAccept={() => handleAccept(duel)}
              onReject={() => handleReject(duel)}
              onPress={() => router.push(`/duel/${duel.id}`)}
            />
          ))}
        </View>
      )}

      {/* New Duel Button */}
      <TouchableOpacity
        style={styles.newDuelButton}
        onPress={() => router.push('/duel/create')}
        activeOpacity={0.85}
      >
        <Text style={styles.newDuelIcon}>⚔️</Text>
        <View>
          <Text style={styles.newDuelTitle}>새 대결 만들기</Text>
          <Text style={styles.newDuelSubtitle}>친구에게 도전장을 보내보세요!</Text>
        </View>
        <Text style={styles.newDuelArrow}>›</Text>
      </TouchableOpacity>

      {/* 내가 보낸 대결 수락 대기 */}
      {outgoingPendingDuels.length > 0 && (
        <View style={styles.outgoingHint}>
          <Text style={styles.outgoingHintText}>
            ⏳ {outgoingPendingDuels.length}개 대결이 상대방의 수락을 기다리고 있어요
          </Text>
        </View>
      )}

      {(activeDuels.length > 0 || finishedDuels.length > 0 || outgoingPendingDuels.length > 0) && (
        <Text style={styles.sectionTitle}>내 대결 목록</Text>
      )}
    </View>
  );

  // 목록에는 incoming은 제외 (위 섹션에서 별도 표시)
  const listDuels = duels.filter(
    (d) => !(d.status === 'pending' && d.opponent_id === user?.id)
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyEmoji}>⚔️</Text>
      <Text style={styles.emptyTitle}>아직 대결이 없어요</Text>
      <Text style={styles.emptyText}>친구에게 소비 절제 대결을 신청해보세요!</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={listDuels}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <DuelCard
            duel={item}
            myUserId={user?.id ?? ''}
            onPress={() => router.push(`/duel/${item.id}`)}
          />
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={!loading ? renderEmpty : null}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={fetchDuels}
            tintColor="#6C5CE7"
          />
        }
        contentContainerStyle={listDuels.length === 0 ? styles.emptyList : undefined}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

function IncomingDuelCard({
  duel,
  loading,
  onAccept,
  onReject,
  onPress,
}: {
  duel: Duel;
  loading: boolean;
  onAccept: () => void;
  onReject: () => void;
  onPress: () => void;
}) {
  const { CATEGORY_LABELS, CATEGORY_EMOJIS } = require('@/types');
  const categoryLabel =
    duel.category === 'custom' && duel.custom_category_name
      ? duel.custom_category_name
      : CATEGORY_LABELS[duel.category];

  return (
    <TouchableOpacity style={styles.incomingCard} onPress={onPress} activeOpacity={0.9}>
      <View style={styles.incomingHeader}>
        <Text style={styles.incomingFromText}>
          {CATEGORY_EMOJIS[duel.category]} {duel.creator?.nickname ?? '?'}님의 도전
        </Text>
        <Text style={styles.incomingPeriod}>{duel.period_days}일</Text>
      </View>
      <Text style={styles.incomingCategory}>{categoryLabel} 절제 대결</Text>
      <View style={styles.incomingStake}>
        <Text style={styles.incomingStakeLabel}>내기</Text>
        <Text style={styles.incomingStakeText} numberOfLines={1}>{duel.stake_text}</Text>
      </View>
      <View style={styles.incomingActions}>
        <TouchableOpacity
          style={styles.rejectButton}
          onPress={onReject}
          disabled={loading}
        >
          <Text style={styles.rejectButtonText}>거절</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.acceptButton, loading && styles.disabledButton]}
          onPress={onAccept}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.acceptButtonText}>수락하기 ⚔️</Text>
          )}
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

function StatBox({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={[styles.statBox, { borderTopColor: color }]}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F7FF',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  greeting: {
    fontSize: 14,
    color: '#636E72',
  },
  userName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#2D3436',
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  trustIcon: {
    fontSize: 14,
  },
  trustScore: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6C5CE7',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#6C5CE7',
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#6C5CE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    borderTopWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 11,
    color: '#B2BEC3',
    marginTop: 2,
    fontWeight: '500',
  },
  incomingSection: {
    paddingHorizontal: 16,
    marginBottom: 8,
    gap: 10,
  },
  incomingSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#E17055',
    marginBottom: 2,
  },
  incomingCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: '#E17055',
    gap: 8,
    shadowColor: '#E17055',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  incomingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  incomingFromText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2D3436',
  },
  incomingPeriod: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6C5CE7',
    backgroundColor: '#F0EBFF',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  incomingCategory: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2D3436',
  },
  incomingStake: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  incomingStakeLabel: {
    fontSize: 11,
    color: '#B2BEC3',
    fontWeight: '600',
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  incomingStakeText: {
    flex: 1,
    fontSize: 13,
    color: '#636E72',
  },
  incomingActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  rejectButton: {
    flex: 0.35,
    borderWidth: 1.5,
    borderColor: '#DFE6E9',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  rejectButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#636E72',
  },
  acceptButton: {
    flex: 1,
    backgroundColor: '#E17055',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  acceptButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  disabledButton: {
    opacity: 0.5,
  },
  newDuelButton: {
    marginHorizontal: 16,
    marginVertical: 8,
    backgroundColor: '#6C5CE7',
    borderRadius: 18,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  newDuelIcon: {
    fontSize: 32,
  },
  newDuelTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  newDuelSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  newDuelArrow: {
    marginLeft: 'auto',
    fontSize: 28,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 28,
  },
  outgoingHint: {
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 4,
    backgroundColor: '#FFF9E6',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#FDCB6E',
  },
  outgoingHintText: {
    fontSize: 13,
    color: '#636E72',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2D3436',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 4,
  },
  emptyList: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 8,
  },
  emptyEmoji: {
    fontSize: 56,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#636E72',
  },
  emptyText: {
    fontSize: 14,
    color: '#B2BEC3',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
