import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { createDuel, searchUserByNickname } from '@/lib/api';
import {
  DuelCategory,
  CATEGORY_LABELS,
  CATEGORY_EMOJIS,
  User,
} from '@/types';

const CATEGORIES: DuelCategory[] = [
  'impulse_buy',
  'cafe',
  'delivery',
  'dining',
  'shopping',
  'custom',
];

const PERIODS: Array<7 | 14 | 30> = [7, 14, 30];

const PERIOD_DESCRIPTIONS: Record<number, string> = {
  7: '한 주 도전',
  14: '두 주 도전',
  30: '한 달 도전',
};

type Step = 'category' | 'period' | 'stake' | 'invite';

export default function CreateDuelScreen() {
  const { user } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState<Step>('category');
  const [category, setCategory] = useState<DuelCategory | null>(null);
  const [customCategory, setCustomCategory] = useState('');
  const [period, setPeriod] = useState<7 | 14 | 30 | null>(null);
  const [stakeText, setStakeText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedOpponent, setSelectedOpponent] = useState<User | null>(null);
  const [creating, setCreating] = useState(false);

  const canProceedCategory = category !== null && (category !== 'custom' || customCategory.trim());
  const canProceedPeriod = period !== null;
  const canProceedStake = stakeText.trim().length >= 2;

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const results = await searchUserByNickname(searchQuery.trim());
      setSearchResults(results.filter((u) => u.id !== user?.id));
    } catch (e: any) {
      Alert.alert('오류', e.message);
    } finally {
      setSearching(false);
    }
  };

  const handleSelectOpponent = (u: User) => {
    setSelectedOpponent(u);
    setSearchResults([]);
    setSearchQuery('');
  };

  const handleCreate = async () => {
    if (!user || !category || !period || !selectedOpponent) return;

    setCreating(true);
    try {
      const duel = await createDuel({
        creatorId: user.id,
        opponentId: selectedOpponent.id,
        category,
        customCategoryName: category === 'custom' ? customCategory.trim() : undefined,
        periodDays: period,
        stakeText: stakeText.trim(),
      });

      Alert.alert(
        '대결 신청 완료! ⚔️',
        `${selectedOpponent.nickname}님이 수락하면 대결이 시작됩니다.`,
        [
          {
            text: '확인',
            onPress: () => router.replace(`/duel/${duel.id}`),
          },
        ]
      );
    } catch (e: any) {
      Alert.alert('오류', e.message);
    } finally {
      setCreating(false);
    }
  };

  const renderStepIndicator = () => {
    const steps: Step[] = ['category', 'period', 'stake', 'invite'];
    const stepLabels = ['카테고리', '기간', '내기', '초대'];
    const currentIdx = steps.indexOf(step);

    return (
      <View style={styles.stepIndicator}>
        {steps.map((s, i) => (
          <React.Fragment key={s}>
            <View style={styles.stepItem}>
              <View style={[
                styles.stepDot,
                i <= currentIdx && styles.stepDotActive,
              ]}>
                <Text style={[
                  styles.stepDotText,
                  i <= currentIdx && styles.stepDotTextActive,
                ]}>{i + 1}</Text>
              </View>
              <Text style={[
                styles.stepLabel,
                i <= currentIdx && styles.stepLabelActive,
              ]}>{stepLabels[i]}</Text>
            </View>
            {i < steps.length - 1 && (
              <View style={[
                styles.stepLine,
                i < currentIdx && styles.stepLineActive,
              ]} />
            )}
          </React.Fragment>
        ))}
      </View>
    );
  };

  // ── Step 1: Category ──────────────────────────────────────────────────────

  const renderCategoryStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>어떤 소비를 절제할까요?</Text>
      <Text style={styles.stepSubtitle}>대결 카테고리를 선택해주세요</Text>

      <View style={styles.categoryGrid}>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[
              styles.categoryItem,
              category === cat && styles.categoryItemSelected,
            ]}
            onPress={() => setCategory(cat)}
            activeOpacity={0.8}
          >
            <Text style={styles.categoryEmoji}>{CATEGORY_EMOJIS[cat]}</Text>
            <Text style={[
              styles.categoryLabel,
              category === cat && styles.categoryLabelSelected,
            ]}>
              {CATEGORY_LABELS[cat]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {category === 'custom' && (
        <TextInput
          style={styles.customInput}
          placeholder="카테고리 이름을 입력하세요 (예: 술, 게임 아이템)"
          value={customCategory}
          onChangeText={setCustomCategory}
          maxLength={20}
          autoFocus
        />
      )}

      <TouchableOpacity
        style={[styles.nextButton, !canProceedCategory && styles.nextButtonDisabled]}
        onPress={() => setStep('period')}
        disabled={!canProceedCategory}
      >
        <Text style={styles.nextButtonText}>다음</Text>
      </TouchableOpacity>
    </View>
  );

  // ── Step 2: Period ────────────────────────────────────────────────────────

  const renderPeriodStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>대결 기간은?</Text>
      <Text style={styles.stepSubtitle}>기간이 길수록 더 많은 점수를 얻을 수 있어요</Text>

      <View style={styles.periodList}>
        {PERIODS.map((p) => (
          <TouchableOpacity
            key={p}
            style={[
              styles.periodItem,
              period === p && styles.periodItemSelected,
            ]}
            onPress={() => setPeriod(p)}
            activeOpacity={0.8}
          >
            <View>
              <Text style={[
                styles.periodDays,
                period === p && styles.periodDaysSelected,
              ]}>{p}일</Text>
              <Text style={styles.periodDesc}>{PERIOD_DESCRIPTIONS[p]}</Text>
            </View>
            {period === p && <Text style={styles.checkMark}>✓</Text>}
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.backButton} onPress={() => setStep('category')}>
          <Text style={styles.backButtonText}>이전</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.nextButton, styles.nextButtonFlex, !canProceedPeriod && styles.nextButtonDisabled]}
          onPress={() => setStep('stake')}
          disabled={!canProceedPeriod}
        >
          <Text style={styles.nextButtonText}>다음</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ── Step 3: Stake ─────────────────────────────────────────────────────────

  const renderStakeStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>내기 문구를 정해요</Text>
      <Text style={styles.stepSubtitle}>지면 어떤 벌칙을 받을지 자유롭게 적어주세요</Text>

      <View style={styles.stakeExamples}>
        {[
          '지는 사람이 커피 사기 ☕',
          '지는 사람이 치킨 쏘기 🍗',
          '지는 사람이 밥 사기 🍚',
        ].map((ex) => (
          <TouchableOpacity
            key={ex}
            style={styles.exampleChip}
            onPress={() => setStakeText(ex)}
          >
            <Text style={styles.exampleChipText}>{ex}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TextInput
        style={styles.stakeInput}
        placeholder="내기 문구를 입력하세요..."
        value={stakeText}
        onChangeText={setStakeText}
        multiline
        numberOfLines={3}
        maxLength={100}
        textAlignVertical="top"
      />
      <Text style={styles.charCount}>{stakeText.length}/100</Text>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.backButton} onPress={() => setStep('period')}>
          <Text style={styles.backButtonText}>이전</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.nextButton, styles.nextButtonFlex, !canProceedStake && styles.nextButtonDisabled]}
          onPress={() => setStep('invite')}
          disabled={!canProceedStake}
        >
          <Text style={styles.nextButtonText}>다음</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ── Step 4: Invite ────────────────────────────────────────────────────────

  const renderInviteStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>대결 상대를 선택해요</Text>
      <Text style={styles.stepSubtitle}>닉네임으로 친구를 찾아 도전장을 보내세요</Text>

      {/* Summary */}
      <View style={styles.summaryCard}>
        <SummaryRow label="카테고리" value={
          category === 'custom' ? customCategory : (category ? CATEGORY_LABELS[category] : '')
        } emoji={category ? CATEGORY_EMOJIS[category] : ''} />
        <SummaryRow label="기간" value={`${period}일`} emoji="📅" />
        <SummaryRow label="내기" value={stakeText} emoji="🏆" />
      </View>

      {/* Selected Opponent */}
      {selectedOpponent ? (
        <View style={styles.selectedOpponentCard}>
          <View style={styles.selectedOpponentLeft}>
            <View style={styles.resultAvatar}>
              <Text style={styles.resultAvatarText}>{selectedOpponent.nickname.charAt(0)}</Text>
            </View>
            <View>
              <Text style={styles.selectedOpponentName}>{selectedOpponent.nickname}</Text>
              <Text style={styles.selectedOpponentSub}>🛡️ 신뢰도 {selectedOpponent.trust_score}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.changeOpponentButton}
            onPress={() => setSelectedOpponent(null)}
          >
            <Text style={styles.changeOpponentText}>변경</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* Friend Search */}
          <View style={styles.searchRow}>
            <TextInput
              style={styles.searchInput}
              placeholder="친구 닉네임 검색..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
              onSubmitEditing={handleSearch}
            />
            <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
              {searching ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.searchButtonText}>검색</Text>
              )}
            </TouchableOpacity>
          </View>

          {searchResults.length > 0 && (
            <View style={styles.searchResults}>
              {searchResults.map((u) => (
                <TouchableOpacity
                  key={u.id}
                  style={styles.searchResultItem}
                  onPress={() => handleSelectOpponent(u)}
                  activeOpacity={0.75}
                >
                  <View style={styles.resultAvatar}>
                    <Text style={styles.resultAvatarText}>{u.nickname.charAt(0)}</Text>
                  </View>
                  <Text style={styles.resultNickname}>{u.nickname}</Text>
                  <View style={styles.resultTrust}>
                    <Text style={styles.resultTrustText}>🛡️ {u.trust_score}</Text>
                  </View>
                  <Text style={styles.selectHint}>선택 →</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {searchResults.length === 0 && searchQuery === '' && (
            <View style={styles.searchHint}>
              <Text style={styles.searchHintText}>
                ⚠️ 대결 상대를 선택해야 대결을 신청할 수 있어요.{'\n'}
                친구가 앱에 가입되어 있어야 합니다.
              </Text>
            </View>
          )}
        </>
      )}

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.backButton} onPress={() => setStep('stake')}>
          <Text style={styles.backButtonText}>이전</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.createButton,
            (!selectedOpponent || creating) && styles.nextButtonDisabled,
          ]}
          onPress={handleCreate}
          disabled={!selectedOpponent || creating}
        >
          {creating ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.createButtonText}>도전장 보내기 ⚔️</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scroll}
      >
        {renderStepIndicator()}

        {step === 'category' && renderCategoryStep()}
        {step === 'period' && renderPeriodStep()}
        {step === 'stake' && renderStakeStep()}
        {step === 'invite' && renderInviteStep()}
      </ScrollView>
    </SafeAreaView>
  );
}

function SummaryRow({ label, value, emoji }: { label: string; value: string; emoji: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryEmoji}>{emoji}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F7FF',
  },
  scroll: {
    paddingBottom: 32,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  stepItem: {
    alignItems: 'center',
    gap: 4,
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#DFE6E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: {
    backgroundColor: '#6C5CE7',
  },
  stepDotText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B2BEC3',
  },
  stepDotTextActive: {
    color: '#fff',
  },
  stepLabel: {
    fontSize: 10,
    color: '#B2BEC3',
    fontWeight: '500',
  },
  stepLabelActive: {
    color: '#6C5CE7',
    fontWeight: '700',
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#DFE6E9',
    marginHorizontal: 4,
    marginBottom: 16,
  },
  stepLineActive: {
    backgroundColor: '#6C5CE7',
  },
  stepContent: {
    paddingHorizontal: 20,
    gap: 16,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#2D3436',
  },
  stepSubtitle: {
    fontSize: 14,
    color: '#636E72',
    marginTop: -8,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryItem: {
    width: '30%',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    gap: 6,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  categoryItemSelected: {
    borderColor: '#6C5CE7',
    backgroundColor: '#F0EBFF',
  },
  categoryEmoji: {
    fontSize: 28,
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#636E72',
    textAlign: 'center',
  },
  categoryLabelSelected: {
    color: '#6C5CE7',
  },
  customInput: {
    borderWidth: 1.5,
    borderColor: '#6C5CE7',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#2D3436',
    backgroundColor: '#fff',
  },
  periodList: {
    gap: 10,
  },
  periodItem: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  periodItemSelected: {
    borderColor: '#6C5CE7',
    backgroundColor: '#F0EBFF',
  },
  periodDays: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2D3436',
  },
  periodDaysSelected: {
    color: '#6C5CE7',
  },
  periodDesc: {
    fontSize: 13,
    color: '#B2BEC3',
    marginTop: 2,
  },
  checkMark: {
    fontSize: 20,
    color: '#6C5CE7',
    fontWeight: '700',
  },
  stakeExamples: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  exampleChip: {
    backgroundColor: '#F0EBFF',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  exampleChipText: {
    fontSize: 13,
    color: '#6C5CE7',
    fontWeight: '500',
  },
  stakeInput: {
    borderWidth: 1.5,
    borderColor: '#DFE6E9',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#2D3436',
    backgroundColor: '#fff',
    minHeight: 80,
  },
  charCount: {
    textAlign: 'right',
    fontSize: 11,
    color: '#B2BEC3',
    marginTop: -8,
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  summaryEmoji: {
    fontSize: 18,
    width: 28,
    textAlign: 'center',
  },
  summaryLabel: {
    fontSize: 13,
    color: '#636E72',
    width: 50,
  },
  summaryValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#2D3436',
  },
  selectedOpponentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0EBFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 2,
    borderColor: '#6C5CE7',
  },
  selectedOpponentLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  selectedOpponentName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2D3436',
  },
  selectedOpponentSub: {
    fontSize: 12,
    color: '#636E72',
    marginTop: 2,
  },
  changeOpponentButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderRadius: 10,
  },
  changeOpponentText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6C5CE7',
  },
  searchRow: {
    flexDirection: 'row',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#DFE6E9',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#2D3436',
    backgroundColor: '#fff',
  },
  searchButton: {
    backgroundColor: '#6C5CE7',
    borderRadius: 12,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  searchResults: {
    backgroundColor: '#fff',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  resultAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#6C5CE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  resultNickname: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#2D3436',
  },
  resultTrust: {
    backgroundColor: '#F0EBFF',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  resultTrustText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6C5CE7',
  },
  selectHint: {
    fontSize: 12,
    color: '#B2BEC3',
    marginLeft: 4,
  },
  searchHint: {
    backgroundColor: '#FFF9E6',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FDCB6E',
  },
  searchHintText: {
    fontSize: 13,
    color: '#636E72',
    lineHeight: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  backButton: {
    flex: 0.4,
    borderWidth: 1.5,
    borderColor: '#DFE6E9',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#636E72',
  },
  nextButton: {
    backgroundColor: '#6C5CE7',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  nextButtonFlex: {
    flex: 1,
  },
  nextButtonDisabled: {
    opacity: 0.4,
  },
  nextButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  createButton: {
    flex: 1,
    backgroundColor: '#6C5CE7',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  createButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});
