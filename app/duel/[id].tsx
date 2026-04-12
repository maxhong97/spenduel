import React, { useState, useCallback, useEffect } from 'react';
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
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useLayoutEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useDuel } from '@/hooks/useDuel';
import { useRealtimeScores, useRealtimeDisputes } from '@/hooks/useRealtime';
import {
  recordResistTemptation,
  createDispute,
  resolveDispute,
  acceptDuel,
  rejectDuel,
  getMyPendingDisputes,
} from '@/lib/api';
import { sendLocalNotification } from '@/lib/notifications';
import { ScoreBoard } from '@/components/ScoreBoard';
import { ActivityFeed } from '@/components/ActivityFeed';
import { SpendingModal } from '@/components/SpendingModal';
import { CATEGORY_LABELS, CATEGORY_EMOJIS, EVENT_LABELS, EventType, Dispute } from '@/types';

export default function DuelDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const navigation = useNavigation();
  const router = useRouter();

  const { duel, events, scores, loading, error, refresh } = useDuel(id);

  const [spendingVisible, setSpendingVisible] = useState(false);
  const [disputeVisible, setDisputeVisible] = useState(false);
  const [disputeText, setDisputeText] = useState('');
  const [disputeLoading, setDisputeLoading] = useState(false);
  const [resistLoading, setResistLoading] = useState(false);
  const [acceptLoading, setAcceptLoading] = useState(false);
  const [myPendingDisputes, setMyPendingDisputes] = useState<Dispute[]>([]);
  const [resolvingDisputeId, setResolvingDisputeId] = useState<string | null>(null);

  // score_events 실시간 구독 - 상대 활동 시 로컬 알림
  useRealtimeScores(id, useCallback((payload?: any) => {
    if (payload?.new?.user_id && user && payload.new.user_id !== user.id) {
      const eventType = payload.new.event_type as EventType;
      const label = EVENT_LABELS[eventType] ?? '활동';
      sendLocalNotification('상대방 활동 🔔', `상대방이 ${label}을 기록했습니다.`);
    }
    refresh();
  }, [user, refresh]));

  // disputes 실시간 구독
  useRealtimeDisputes(id, useCallback(() => {
    refresh();
    fetchMyDisputes();
  }, [refresh]));

  const fetchMyDisputes = useCallback(async () => {
    if (!user || !id) return;
    try {
      const disputes = await getMyPendingDisputes(id, user.id);
      setMyPendingDisputes(disputes);
    } catch {
      // 조용히 실패
    }
  }, [user, id]);

  useEffect(() => {
    fetchMyDisputes();
  }, [fetchMyDisputes]);

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

  // ── 수락/거절 ──────────────────────────────────────────────────────────────

  const handleAccept = async () => {
    if (!user || !duel) return;
    setAcceptLoading(true);
    try {
      await acceptDuel(duel.id, user.id);
      await refresh();
      Alert.alert('대결 시작! 🔥', '대결이 시작되었습니다. 절제력을 보여주세요!');
    } catch (e: any) {
      Alert.alert('오류', e.message);
    } finally {
      setAcceptLoading(false);
    }
  };

  const handleReject = () => {
    if (!duel) return;
    Alert.alert(
      '대결 거절',
      '대결 신청을 거절하시겠어요?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '거절',
          style: 'destructive',
          onPress: async () => {
            try {
              await rejectDuel(duel.id);
              router.replace('/(tabs)');
            } catch (e: any) {
              Alert.alert('오류', e.message);
            }
          },
        },
      ]
    );
  };

  // ── 유혹 참기 ──────────────────────────────────────────────────────────────

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

  // ── 이의 제기 (신고) ────────────────────────────────────────────────────────

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
      Alert.alert('신고 완료', '상대방이 인정하면 점수가 조정됩니다.\n상대방이 24시간 내 응답하지 않으면 자동 기각됩니다.');
    } catch (e: any) {
      Alert.alert('오류', e.message);
    } finally {
      setDisputeLoading(false);
    }
  };

  // ── 분쟁 응답 (피신고자) ──────────────────────────────────────────────────

  const handleResolveDispute = async (dispute: Dispute, accept: boolean) => {
    if (!user || !duel) return;
    setResolvingDisputeId(dispute.id);
    try {
      await resolveDispute(
        dispute.id,
        accept ? 'accepted' : 'rejected',
        duel.id,
        dispute.reporter_id,
        user.id
      );
      await fetchMyDisputes();
      await refresh();
      if (accept) {
        Alert.alert('인정 완료', '이의 제기를 인정했습니다. 점수가 조정됩니다.');
      } else {
        Alert.alert('거부 완료', '이의 제기를 거부했습니다.');
      }
    } catch (e: any) {
      Alert.alert('오류', e.message);
    } finally {
      setResolvingDisputeId(null);
    }
  };

  // ── 결과 공유 ──────────────────────────────────────────────────────────────

  const handleShareResult = async () => {
    if (!duel || !user) return;
    const myScore = scores[user.id] ?? 0;
    const opponentId = duel.creator_id === user.id ? duel.opponent_id : duel.creator_id;
    const opponentScore = opponentId ? (scores[opponentId] ?? 0) : 0;
    const opponent = duel.creator_id === user.id ? duel.opponent : duel.creator;
    const isWinner = duel.winner_id === user.id;

    const categoryLabel = duel.category === 'custom' && duel.custom_category_name
      ? duel.custom_category_name
      : CATEGORY_LABELS[duel.category];

    const text = [
      `⚔️ 스펜듀얼 ${duel.period_days}일 대결 결과`,
      ``,
      `카테고리: ${CATEGORY_EMOJIS[duel.category]} ${categoryLabel}`,
      ``,
      `${isWinner ? '🏆' : '😢'} ${user.nickname} ${myScore > 0 ? '+' : ''}${myScore}점`,
      `${isWinner ? '😢' : '🏆'} ${opponent?.nickname ?? '상대방'} ${opponentScore > 0 ? '+' : ''}${opponentScore}점`,
      ``,
      `내기: ${duel.stake_text}`,
      ``,
      `#스펜듀얼 #소비절제 #친구대결`,
    ].join('\n');

    try {
      await Share.share({ message: text });
    } catch {
      // 사용자가 취소한 경우 무시
    }
  };

  // ── 렌더링 ─────────────────────────────────────────────────────────────────

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
  const isPending = duel.status === 'pending';
  const isFinished = duel.status === 'finished';
  const isMyDuel = duel.creator_id === user?.id || duel.opponent_id === user?.id;
  const amIOpponent = duel.opponent_id === user?.id;
  const amICreator = duel.creator_id === user?.id;
  const myScore = user ? (scores[user.id] ?? 0) : 0;
  const opponentId = amICreator ? duel.opponent_id : duel.creator_id;
  const opponentScore = opponentId ? (scores[opponentId] ?? 0) : 0;
  const isLeading = myScore >= opponentScore;
  const isWinner = duel.winner_id === user?.id;
  const isDraw = isFinished && duel.winner_id === null;

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
        {/* ── 수락 대기 배너 (내가 만든 대결) ── */}
        {isPending && amICreator && (
          <View style={styles.pendingBanner}>
            <Text style={styles.pendingText}>⏳ {duel.opponent?.nickname ?? '상대방'}님의 수락을 기다리는 중...</Text>
          </View>
        )}

        {/* ── 수락/거절 배너 (상대가 나에게 신청) ── */}
        {isPending && amIOpponent && (
          <View style={styles.inviteBanner}>
            <Text style={styles.inviteBannerTitle}>
              ⚔️ {duel.creator?.nickname ?? '상대방'}님이 대결을 신청했습니다!
            </Text>
            <Text style={styles.inviteBannerStake}>내기: {duel.stake_text}</Text>
            <View style={styles.inviteActions}>
              <TouchableOpacity style={styles.inviteRejectBtn} onPress={handleReject}>
                <Text style={styles.inviteRejectText}>거절</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.inviteAcceptBtn, acceptLoading && styles.disabledButton]}
                onPress={handleAccept}
                disabled={acceptLoading}
              >
                {acceptLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.inviteAcceptText}>수락하기 🔥</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── 종료 결과 카드 ── */}
        {isFinished && (
          <View style={[styles.resultCard, isWinner ? styles.resultCardWin : isDraw ? styles.resultCardDraw : styles.resultCardLose]}>
            <Text style={styles.resultEmoji}>
              {isDraw ? '🤝' : isWinner ? '🏆' : '😢'}
            </Text>
            <Text style={styles.resultTitle}>
              {isDraw ? '동점! 무승부' : isWinner ? '대결 승리!' : '아쉽게 패배'}
            </Text>
            <Text style={styles.resultScore}>
              내 점수: {myScore > 0 ? '+' : ''}{myScore}점 vs 상대: {opponentScore > 0 ? '+' : ''}{opponentScore}점
            </Text>

            {/* 내기 문구 강조 */}
            <View style={styles.resultStakeBox}>
              <Text style={styles.resultStakeLabel}>약속</Text>
              <Text style={styles.resultStakeText}>{duel.stake_text}</Text>
            </View>

            {!isDraw && (
              <Text style={styles.resultHint}>
                {isWinner
                  ? '상대방에게 약속 이행을 요청하세요!'
                  : '약속을 지키고 다음엔 꼭 이겨보세요!'}
              </Text>
            )}

            <TouchableOpacity style={styles.shareButton} onPress={handleShareResult}>
              <Text style={styles.shareButtonText}>결과 공유하기 📤</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── 내기 문구 바 ── */}
        <View style={styles.stakeBar}>
          <Text style={styles.stakeBarLabel}>내기</Text>
          <Text style={styles.stakeBarText}>{duel.stake_text}</Text>
          {isActive && duel.ends_at && (
            <Text style={styles.endsAtText}>{formatEndsAt()}</Text>
          )}
        </View>

        {/* ── 점수판 ── */}
        {duel.creator && (
          <ScoreBoard
            creator={duel.creator}
            opponent={duel.opponent ?? null}
            scores={scores}
            winnerId={duel.winner_id}
          />
        )}

        {/* ── 내 점수 상태 (진행 중일 때) ── */}
        {isActive && user && (
          <View style={[styles.myScoreCard, isLeading ? styles.myScoreLeading : styles.myScoreTrailing]}>
            <Text style={styles.myScoreLabel}>내 점수</Text>
            <Text style={styles.myScoreValue}>{myScore > 0 ? `+${myScore}` : myScore}점</Text>
            <Text style={styles.myScoreStatus}>{isLeading ? '🔥 앞서는 중!' : '💪 역전 가능!'}</Text>
          </View>
        )}

        {/* ── 나에게 온 분쟁 알림 ── */}
        {isActive && myPendingDisputes.length > 0 && (
          <View style={styles.disputeAlertSection}>
            <Text style={styles.disputeAlertTitle}>⚠️ 이의 제기 알림</Text>
            {myPendingDisputes.map((dispute) => (
              <View key={dispute.id} style={styles.disputeAlertCard}>
                <Text style={styles.disputeAlertFrom}>
                  {(dispute as any).reporter?.nickname ?? '상대방'}의 이의 제기
                </Text>
                <Text style={styles.disputeAlertDesc}>{dispute.description}</Text>
                <Text style={styles.disputeAlertNote}>
                  인정 시: 나 -15점, 상대 +5점 / 거부 시: 점수 변동 없음
                </Text>
                <View style={styles.disputeAlertActions}>
                  <TouchableOpacity
                    style={[
                      styles.disputeRejectBtn,
                      resolvingDisputeId === dispute.id && styles.disabledButton,
                    ]}
                    onPress={() => handleResolveDispute(dispute, false)}
                    disabled={resolvingDisputeId !== null}
                  >
                    <Text style={styles.disputeRejectBtnText}>거부하기</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.disputeAcceptBtn,
                      resolvingDisputeId === dispute.id && styles.disabledButton,
                    ]}
                    onPress={() => handleResolveDispute(dispute, true)}
                    disabled={resolvingDisputeId !== null}
                  >
                    {resolvingDisputeId === dispute.id ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.disputeAcceptBtnText}>인정하기</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ── 액션 버튼 (진행 중) ── */}
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

        {/* ── 활동 피드 ── */}
        <View style={styles.feedSection}>
          <Text style={styles.sectionTitle}>활동 피드</Text>
          <ActivityFeed events={events} myUserId={user?.id ?? ''} />
        </View>
      </ScrollView>

      {/* ── 소비 기록 모달 ── */}
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

      {/* ── 이의 제기 모달 ── */}
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
              상대방이 인정하면 상대 -15점, 나 +5점이 적용됩니다.
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
              style={[styles.disputeSubmit, (disputeLoading || !disputeText.trim()) && styles.disabledButton]}
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

  // Pending banners
  pendingBanner: {
    backgroundColor: '#FDCB6E',
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  pendingText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  inviteBanner: {
    backgroundColor: '#2D3436',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 10,
  },
  inviteBannerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  inviteBannerStake: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
  },
  inviteActions: {
    flexDirection: 'row',
    gap: 10,
  },
  inviteRejectBtn: {
    flex: 0.35,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  inviteRejectText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
  },
  inviteAcceptBtn: {
    flex: 1,
    backgroundColor: '#6C5CE7',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  inviteAcceptText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  disabledButton: {
    opacity: 0.5,
  },

  // Result card
  resultCard: {
    margin: 16,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  resultCardWin: {
    backgroundColor: '#6C5CE7',
  },
  resultCardLose: {
    backgroundColor: '#636E72',
  },
  resultCardDraw: {
    backgroundColor: '#00B894',
  },
  resultEmoji: {
    fontSize: 56,
  },
  resultTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#fff',
  },
  resultScore: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  resultStakeBox: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    width: '100%',
    marginTop: 4,
  },
  resultStakeLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  resultStakeText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
  resultHint: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
  },
  shareButton: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 4,
  },
  shareButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },

  // Stake bar
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

  // My score highlight
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

  // Dispute alert (내게 온 분쟁)
  disputeAlertSection: {
    paddingHorizontal: 16,
    marginBottom: 8,
    gap: 8,
  },
  disputeAlertTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#E17055',
  },
  disputeAlertCard: {
    backgroundColor: '#FFF5F0',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#E17055',
    gap: 8,
  },
  disputeAlertFrom: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2D3436',
  },
  disputeAlertDesc: {
    fontSize: 13,
    color: '#636E72',
    lineHeight: 18,
  },
  disputeAlertNote: {
    fontSize: 11,
    color: '#B2BEC3',
  },
  disputeAlertActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  disputeRejectBtn: {
    flex: 0.4,
    borderWidth: 1.5,
    borderColor: '#DFE6E9',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  disputeRejectBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#636E72',
  },
  disputeAcceptBtn: {
    flex: 1,
    backgroundColor: '#E17055',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  disputeAcceptBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },

  // Actions
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

  // Feed
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
  modalCancel: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 15,
    color: '#B2BEC3',
  },
});
