import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Duel, CATEGORY_LABELS, CATEGORY_EMOJIS, DuelStatus } from '@/types';

interface Props {
  duel: Duel;
  myUserId: string;
  onPress: () => void;
}

const STATUS_LABELS: Record<DuelStatus, string> = {
  pending: '대기 중',
  active: '진행 중',
  finished: '종료',
};

const STATUS_COLORS: Record<DuelStatus, string> = {
  pending: '#FDCB6E',
  active: '#00B894',
  finished: '#636E72',
};

function formatDaysLeft(endsAt: string | null): string {
  if (!endsAt) return '';
  const diff = new Date(endsAt).getTime() - Date.now();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (days < 0) return '종료됨';
  if (days === 0) return '오늘 마감';
  return `D-${days}`;
}

export function DuelCard({ duel, myUserId, onPress }: Props) {
  const isCreator = duel.creator_id === myUserId;
  const opponent = isCreator ? duel.opponent : duel.creator;
  const opponentName = opponent?.nickname ?? '대기 중...';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.header}>
        <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[duel.status] }]}>
          <Text style={styles.statusText}>{STATUS_LABELS[duel.status]}</Text>
        </View>
        {duel.status === 'active' && duel.ends_at && (
          <Text style={styles.daysLeft}>{formatDaysLeft(duel.ends_at)}</Text>
        )}
      </View>

      <View style={styles.body}>
        <Text style={styles.categoryEmoji}>
          {CATEGORY_EMOJIS[duel.category]}
        </Text>
        <View style={styles.info}>
          <Text style={styles.categoryText}>
            {duel.category === 'custom' && duel.custom_category_name
              ? duel.custom_category_name
              : CATEGORY_LABELS[duel.category]}
          </Text>
          <Text style={styles.opponent}>vs {opponentName}</Text>
        </View>
        <View style={styles.periodBadge}>
          <Text style={styles.periodText}>{duel.period_days}일</Text>
        </View>
      </View>

      <View style={styles.stakeContainer}>
        <Text style={styles.stakeLabel}>내기</Text>
        <Text style={styles.stakeText} numberOfLines={1}>{duel.stake_text}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  daysLeft: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6C5CE7',
  },
  body: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  categoryEmoji: {
    fontSize: 32,
  },
  info: {
    flex: 1,
  },
  categoryText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2D3436',
  },
  opponent: {
    fontSize: 13,
    color: '#636E72',
    marginTop: 2,
  },
  periodBadge: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 8,
  },
  periodText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6C5CE7',
  },
  stakeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    gap: 8,
  },
  stakeLabel: {
    fontSize: 11,
    color: '#B2BEC3',
    fontWeight: '600',
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  stakeText: {
    flex: 1,
    fontSize: 13,
    color: '#636E72',
  },
});
