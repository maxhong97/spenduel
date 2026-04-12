export type DuelCategory =
  | 'impulse_buy'
  | 'cafe'
  | 'delivery'
  | 'dining'
  | 'shopping'
  | 'custom';

export type DuelStatus = 'pending' | 'active' | 'finished';

export type EventType =
  | 'clean_day'
  | 'resist_temptation'
  | 'streak_3'
  | 'streak_7'
  | 'spending_sm'
  | 'spending_md'
  | 'spending_lg'
  | 'dispute_penalty'
  | 'dispute_bonus';

export type DisputeStatus = 'pending' | 'accepted' | 'rejected';

export interface User {
  id: string;
  kakao_id: string;
  nickname: string;
  avatar_url: string | null;
  trust_score: number;
  card_linked: boolean;
  created_at: string;
}

export interface Duel {
  id: string;
  creator_id: string;
  opponent_id: string | null;
  category: DuelCategory;
  custom_category_name: string | null;
  period_days: 7 | 14 | 30;
  stake_text: string;
  status: DuelStatus;
  started_at: string | null;
  ends_at: string | null;
  winner_id: string | null;
  created_at: string;
  // joined fields
  creator?: User;
  opponent?: User;
}

export interface ScoreEvent {
  id: string;
  duel_id: string;
  user_id: string;
  event_type: EventType;
  points: number;
  evidence_url: string | null;
  merchant_name: string | null;
  amount: number | null;
  created_at: string;
  // joined
  user?: User;
}

export interface Dispute {
  id: string;
  duel_id: string;
  reporter_id: string;
  target_user_id: string;
  description: string;
  evidence_url: string | null;
  status: DisputeStatus;
  created_at: string;
  // joined
  reporter?: User;
  target_user?: User;
}

export interface DuelScore {
  user_id: string;
  total_points: number;
}

export const CATEGORY_LABELS: Record<DuelCategory, string> = {
  impulse_buy: '충동구매',
  cafe: '카페',
  delivery: '배달음식',
  dining: '외식',
  shopping: '쇼핑',
  custom: '직접 입력',
};

export const CATEGORY_EMOJIS: Record<DuelCategory, string> = {
  impulse_buy: '🛒',
  cafe: '☕',
  delivery: '🛵',
  dining: '🍽️',
  shopping: '👜',
  custom: '✏️',
};

export const PERIOD_LABELS: Record<number, string> = {
  7: '7일',
  14: '14일',
  30: '30일',
};

export const EVENT_LABELS: Record<EventType, string> = {
  clean_day: '클린 데이',
  resist_temptation: '유혹 참기',
  streak_3: '3일 연속 달성',
  streak_7: '7일 연속 달성',
  spending_sm: '소비 기록 (1만원 미만)',
  spending_md: '소비 기록 (1~3만원)',
  spending_lg: '소비 기록 (3만원 이상)',
  dispute_penalty: '신고 패널티',
  dispute_bonus: '신고 보너스',
};

export const POINTS: Record<EventType, number> = {
  clean_day: 10,
  resist_temptation: 3,
  streak_3: 10,
  streak_7: 20,
  spending_sm: -5,
  spending_md: -10,
  spending_lg: -20,
  dispute_penalty: -15,
  dispute_bonus: 5,
};
