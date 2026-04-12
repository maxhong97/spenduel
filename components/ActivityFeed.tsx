import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { ScoreEvent, EVENT_LABELS, EventType } from '@/types';

interface Props {
  events: ScoreEvent[];
  myUserId: string;
}

const EVENT_ICONS: Record<EventType, string> = {
  clean_day: '✨',
  resist_temptation: '💪',
  streak_3: '🔥',
  streak_7: '🏆',
  spending_sm: '💸',
  spending_md: '💸',
  spending_lg: '💸',
  dispute_penalty: '⚠️',
  dispute_bonus: '🎯',
};

function formatTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '방금 전';
  if (hours < 1) return `${minutes}분 전`;
  if (days < 1) return `${hours}시간 전`;
  return `${days}일 전`;
}

function formatAmount(amount: number): string {
  return amount.toLocaleString('ko-KR') + '원';
}

function EventItem({ event, isMe }: { event: ScoreEvent; isMe: boolean }) {
  const isPositive = event.points >= 0;

  return (
    <View style={[styles.eventItem, isMe && styles.eventItemMe]}>
      <Text style={styles.eventIcon}>{EVENT_ICONS[event.event_type]}</Text>
      <View style={styles.eventBody}>
        <View style={styles.eventHeader}>
          <Text style={styles.userName}>{event.user?.nickname ?? '알 수 없음'}</Text>
          <Text style={styles.eventTime}>{formatTime(event.created_at)}</Text>
        </View>
        <Text style={styles.eventLabel}>
          {EVENT_LABELS[event.event_type]}
          {event.merchant_name ? ` · ${event.merchant_name}` : ''}
          {event.amount ? ` (${formatAmount(event.amount)})` : ''}
        </Text>
      </View>
      <Text style={[styles.points, isPositive ? styles.pointsPos : styles.pointsNeg]}>
        {isPositive ? `+${event.points}` : event.points}
      </Text>
    </View>
  );
}

export function ActivityFeed({ events, myUserId }: Props) {
  if (events.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyIcon}>📋</Text>
        <Text style={styles.emptyText}>아직 활동이 없어요.</Text>
        <Text style={styles.emptySubText}>소비를 기록하거나 유혹 참기를 눌러보세요!</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={events}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <EventItem event={item} isMe={item.user_id === myUserId} />
      )}
      scrollEnabled={false}
      contentContainerStyle={styles.list}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginVertical: 4,
    gap: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#DFE6E9',
  },
  eventItemMe: {
    borderLeftColor: '#6C5CE7',
  },
  eventIcon: {
    fontSize: 22,
    width: 32,
    textAlign: 'center',
  },
  eventBody: {
    flex: 1,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2D3436',
  },
  eventTime: {
    fontSize: 11,
    color: '#B2BEC3',
  },
  eventLabel: {
    fontSize: 12,
    color: '#636E72',
    marginTop: 2,
  },
  points: {
    fontSize: 15,
    fontWeight: '700',
    minWidth: 40,
    textAlign: 'right',
  },
  pointsPos: {
    color: '#00B894',
  },
  pointsNeg: {
    color: '#E17055',
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyIcon: {
    fontSize: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#636E72',
  },
  emptySubText: {
    fontSize: 13,
    color: '#B2BEC3',
    textAlign: 'center',
  },
});
