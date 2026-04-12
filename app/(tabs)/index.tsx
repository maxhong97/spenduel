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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '@/hooks/useAuth';
import { getMyDuels } from '@/lib/api';
import { DuelCard } from '@/components/DuelCard';
import { Duel } from '@/types';

export default function HomeScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [duels, setDuels] = useState<Duel[]>([]);
  const [loading, setLoading] = useState(false);

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

  const activeDuels = duels.filter((d) => d.status === 'active');
  const pendingDuels = duels.filter((d) => d.status === 'pending');
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
        <StatBox label="대기 중" value={pendingDuels.length} color="#FDCB6E" />
        <StatBox label="완료" value={finishedDuels.length} color="#00B894" />
      </View>

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

      {duels.length > 0 && (
        <Text style={styles.sectionTitle}>내 대결 목록</Text>
      )}
    </View>
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
        data={duels}
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
        contentContainerStyle={duels.length === 0 ? styles.emptyList : undefined}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
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
