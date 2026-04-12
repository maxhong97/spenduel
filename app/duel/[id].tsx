import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { useLayoutEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useDuel } from '@/hooks/useDuel';
import { useRealtimeScores, useRealtimeDisputes } from '@/hooks/useRealtime';
import { recordResistTemptation, createDispute, uploadEvidence } from '@/lib/api';
import { ScoreBoard } from '@/components/ScoreBoard';
import { ActivityFeed } from '@/components/ActivityFeed';
import { SpendingModal } from '@/components/SpendingModal';
import { CATEGORY_LABELS, CATEGORY_EMOJIS } from '@/types';

export default function DuelDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const navigation = useNavigation();

  const { duel, events, scores, loading, error, refresh } = useDuel(id);
  useRealtimeScores(id, refresh);
  useRealtimeDisputes(id, refresh);

  const [spendingVisible, setSpendingVisible] = useState(false);
  const [disputeVisible, setDisputeVisible] = useState(false);
  const [disputeText, setDisputeText] = useState('');
  const [disputeLoading, setDisputeLoading] = useState(false);
  const [resistLoading, setResistLoading] = useState(false);

  useLayoutEffect(() => {
    if (duel) {
      const label = duel.category === 'custom' && duel.custom_category_name
        ? duel.custom_category_name
        : CATEGORY_LABELS[duel.category];
      navigation.setOptions({
        headerTitle: `${CATEGORY_EMOJIS[duel.category]} ${label} 대결`,
      });
    }
  }, [duel, navigation]);

  const handleResistTemptation = async () => {
    if (!user || !duel) return;
    setResistLoading(true);
    try {
      await recordResistTemptation({ duelId: duel.id, userId: user.id });
      await refresh();
      Alert.alert('💪 유혹 참기!', '+3점 획득했습니다.');
    } catch (e: any) {
      Alert.alert('오류', e.message);
    } finally {
      setResistLoading(false);
    }
  };

  const handleDispute = async () => {
    if (!user || !duel || !disputeText.trim()) return;
    const opponentId = duel.creator_id === user.id ? duel.opponent_id : duel.creator_id;
    if (!opponentId) return;

    setDisputeLoading(true);
    try {
      await createDispute({
        duelId: duel.id,
        reporterId: user.id,
        targetUserId: opponentId,
        description: disputeText.trim(),
      });
      setDisputeVisible(false);
      setDisputeText('');
      Alert.alert('신고 완료', '상대방에게 24시간 내 이의제기가 전달됩니다.');
    } catch (e: any) {
      Alert.alert('오류', e.message);
    } finally {
      setDisputeLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6C5CE7" />
      </View>
    );
  }

  if (error || !duel) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error ?? '대결을 찾을 수 없어요.'}</Text>
        <TouchableOpacity onPress={refresh}>
          <Text style={styles.retryText}>다시 시도</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isActive = duel.status === 'active';
  const isMyDuel = duel.creator_id === user?.id || duel.opponent_id === user?.id;
  const myScore = user ? (scores[user.id] ?? 0) : 0;
  const opponentId = duel.creator_id === user?.id ? duel.opponent_id : duel.creator_id;
  const opponentScore = opponentId ? (scores[opponentId] ?? 0) : 0;
  const isLeading = myScore >= opponentScore;

  const formatEndsAt = () => {
    if (!duel.ends_at) return '';
    const diff = new Date(duel.ends_at).getTime() - Date.now();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    if (days <= 0) return '종료됨';
    if (days === 1) return '내일 종료';
    return `${days}일 남음`;
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refresh} tintColor="#6C5CE7" />
        }
      >
        {/* Status Banner */}
        {duel.status === 'pending' && (
          <View style={styles.pendingBanner}>
            <Text style={styles.pendingText}>⏳ 상대방의 수락을 기다리는 중...</Text>
          </View>
        )}

        {duel.status === 'finished' && (
          <View style={[styles.pendingBanner, styles.finishedBanner]}>
            <Text style={styles.pendingText}>
              {duel.winner_id === user?.id ? '🏆 대결 승리!' : '😢 아쉽게 패배...'}
            </Text>
          </View>
        )}

        {/* Stake Info */}
        <View style={styles.stakeBar}>
          <Text style={styles.stakeBarLabel}>내기</Text>
          <Text style={styles.stakeBarText}>{duel.stake_text}</Text>
          {isActive && duel.ends_at && (
            <Text style={styles.endsAtText}>{formatEndsAt()}</Text>
          )}
        </View>

        {/* Score Board */}
        {duel.creator && (
          <ScoreBoard
            creator={duel.creator}
            opponent={duel.opponent ?? null}
            scores={scores}
            winnerId={duel.winner_id}
          />
        )}

        {/* My Score Highlight */}
        {isActive && user && (
          <View style={[styles.myScoreCard, isLeading ? styles.myScoreLeading : styles.myScoreTrailing]}>
            <Text style={styles.myScoreLabel}>내 점수</Text>
            <Text style={styles.myScoreValue}>{myScore > 0 ? `+${myScore}` : myScore}점</Text>
            <Text style={styles.myScoreStatus}>{isLeading ? '🔥 앞서는 중!' : '💪 역전 가능!'}</Text>
          </View>
        )}

        {/* Action Buttons */}
        {isActive && isMyDuel && user && (
          <View style={styles.actionsSection}>
            <Text style={styles.sectionTitle}>활동 기록</Text>
            <View style={styles.actionGrid}>
              <ActionButton
                emoji="💸"
                label="소비 기록"
                sublabel="영수증 첨부"
                color="#E17055"
                onPress={() => setSpendingVisible(true)}
              />
              <ActionButton
                emoji="💪"
                label="유혹 참기"
                sublabel="+3점 (하루 2회)"
                color="#00B894"
                onPress={handleResistTemptation}
                loading={resistLoading}
              />
              <ActionButton
                emoji="🚨"
                label="이의 제기"
                sublabel="상대 신고"
                color="#FDCB6E"
                onPress={() => setDisputeVisible(true)}
              />
            </View>
          </View>
        )}

        {/* Activity Feed */}
        <View style={styles.feedSection}>
          <Text style={styles.sectionTitle}>활동 피드</Text>
          <ActivityFeed events={events} myUserId={user?.id ?? ''} />
        </View>
      </ScrollView>

      {/* Spending Modal */}
      {user && (
        <SpendingModal
          visible={spendingVisible}
          duelId={duel.id}
          user={user}
          onClose={() => setSpendingVisible(false)}
          onSuccess={async () => {
            setSpendingVisible(false);
            await refresh();
          }}
        />
      )}

      {/* Dispute Modal */}
      <Modal
        visible={disputeVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setDisputeVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>이의 제기 🚨</Text>
            <Text style={styles.modalSubtitle}>
              상대방의 부정 행위나 잘못된 기록을 신고해주세요.{'\n'}
              신고 인정 시 상대방 -15점, 나 +5점이 적용됩니다.
            </Text>
            <TextInput
              style={styles.disputeInput}
              placeholder="어떤 문제가 있었는지 설명해주세요..."
              value={disputeText}
              onChangeText={setDisputeText}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <TouchableOpacity
              style={[styles.disputeSubmit, disputeLoading && styles.disabledButton]}
              onPress={handleDispute}
              disabled={disputeLoading || !disputeText.trim()}
            >
              {disputeLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.disputeSubmitText}>신고하기</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalCancel}
              onPress={() => setDisputeVisible(false)}
            >
              <Text style={styles.modalCancelText}>취소</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function ActionButton({
  emoji,
  label,
  sublabel,
  color,
  onPress,
  loading,
}: {
  emoji: string;
  label: string;
  sublabel: string;
  color: string;
  onPress: () => void;
  loading?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.actionButton, { borderTopColor: color }]}
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={color} />
      ) : (
        <Text style={styles.actionEmoji}>{emoji}</Text>
      )}
      <Text style={[styles.actionLabel, { color }]}>{label}</Text>
      <Text style={styles.actionSublabel}>{sublabel}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F7FF',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  errorText: {
    fontSize: 15,
    color: '#636E72',
  },
  retryText: {
    fontSize: 15,
    color: '#6C5CE7',
    fontWeight: '600',
  },
  pendingBanner: {
    backgroundColor: '#FDCB6E',
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  finishedBanner: {
    backgroundColor: '#6C5CE7',
  },
  pendingText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  stakeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  stakeBarLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B2BEC3',
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  stakeBarText: {
    flex: 1,
    fontSize: 13,
    color: '#2D3436',
    fontWeight: '500',
  },
  endsAtText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6C5CE7',
  },
  myScoreCard: {
    marginHorizontal: 16,
    marginTop: -8,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  myScoreLeading: {
    backgroundColor: '#F0EBFF',
  },
  myScoreTrailing: {
    backgroundColor: '#FFF5F0',
  },
  myScoreLabel: {
    fontSize: 13,
    color: '#636E72',
    fontWeight: '500',
  },
  myScoreValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#6C5CE7',
  },
  myScoreStatus: {
    marginLeft: 'auto',
    fontSize: 13,
    fontWeight: '600',
    color: '#636E72',
  },
  actionsSection: {
    paddingHorizontal: 16,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2D3436',
    marginBottom: 12,
  },
  actionGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    gap: 4,
    borderTopWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  actionEmoji: {
    fontSize: 26,
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  actionSublabel: {
    fontSize: 10,
    color: '#B2BEC3',
    textAlign: 'center',
  },
  feedSection: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    gap: 14,
  },
  modalHandle: {
    width: 36,
    height: 4,
    backgroundColor: '#DFE6E9',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2D3436',
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#636E72',
    lineHeight: 20,
  },
  disputeInput: {
    borderWidth: 1.5,
    borderColor: '#DFE6E9',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#2D3436',
    backgroundColor: '#F8F9FA',
    minHeight: 100,
  },
  disputeSubmit: {
    backgroundColor: '#E17055',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  disputeSubmitText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  disabledButton: {
    opacity: 0.4,
  },
  modalCancel: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 15,
    color: '#B2BEC3',
  },
});
