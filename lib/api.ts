import { supabase } from './supabase';
import { Duel, DuelCategory, ScoreEvent, EventType, POINTS, User, Dispute } from '@/types';

// ── Users ──────────────────────────────────────────────────────────────────

/**
 * authId: Supabase auth.users.id (= session.user.id)
 * users.id는 auth.uid()와 동일하게 유지해 RLS가 올바르게 동작합니다.
 */
export async function upsertUser(
  authId: string,
  kakaoId: string,
  nickname: string,
  avatarUrl?: string
) {
  const { data, error } = await supabase
    .from('users')
    .upsert(
      { id: authId, kakao_id: kakaoId, nickname, avatar_url: avatarUrl ?? null },
      { onConflict: 'kakao_id' }
    )
    .select()
    .single();

  if (error) throw error;
  return data as User;
}

export async function getUser(userId: string) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data as User;
}

export async function searchUserByNickname(nickname: string) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .ilike('nickname', `%${nickname}%`)
    .limit(10);

  if (error) throw error;
  return data as User[];
}

// ── Duels ──────────────────────────────────────────────────────────────────

export async function getMyDuels(userId: string) {
  const { data, error } = await supabase
    .from('duels')
    .select(`
      *,
      creator:users!duels_creator_id_fkey(*),
      opponent:users!duels_opponent_id_fkey(*)
    `)
    .or(`creator_id.eq.${userId},opponent_id.eq.${userId}`)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as Duel[];
}

export async function getDuel(duelId: string) {
  const { data, error } = await supabase
    .from('duels')
    .select(`
      *,
      creator:users!duels_creator_id_fkey(*),
      opponent:users!duels_opponent_id_fkey(*)
    `)
    .eq('id', duelId)
    .single();

  if (error) throw error;
  return data as Duel;
}

export async function createDuel(params: {
  creatorId: string;
  category: DuelCategory;
  customCategoryName?: string;
  periodDays: 7 | 14 | 30;
  stakeText: string;
}) {
  const { data, error } = await supabase
    .from('duels')
    .insert({
      creator_id: params.creatorId,
      category: params.category,
      custom_category_name: params.customCategoryName ?? null,
      period_days: params.periodDays,
      stake_text: params.stakeText,
      status: 'pending',
    })
    .select()
    .single();

  if (error) throw error;
  return data as Duel;
}

export async function acceptDuel(duelId: string, opponentId: string) {
  const now = new Date();
  const duel = await getDuel(duelId);
  const endsAt = new Date(now.getTime() + duel.period_days * 24 * 60 * 60 * 1000);

  const { data, error } = await supabase
    .from('duels')
    .update({
      opponent_id: opponentId,
      status: 'active',
      started_at: now.toISOString(),
      ends_at: endsAt.toISOString(),
    })
    .eq('id', duelId)
    .select()
    .single();

  if (error) throw error;
  return data as Duel;
}

// ── Score Events ────────────────────────────────────────────────────────────

export async function getDuelScoreEvents(duelId: string) {
  const { data, error } = await supabase
    .from('score_events')
    .select(`*, user:users(*)`)
    .eq('duel_id', duelId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as ScoreEvent[];
}

export async function getDuelScores(duelId: string): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from('score_events')
    .select('user_id, points')
    .eq('duel_id', duelId);

  if (error) throw error;

  const scores: Record<string, number> = {};
  for (const event of data ?? []) {
    scores[event.user_id] = (scores[event.user_id] ?? 0) + event.points;
  }
  return scores;
}

export async function recordSpending(params: {
  duelId: string;
  userId: string;
  amount: number;
  merchantName?: string;
  evidenceUrl?: string;
}) {
  let eventType: EventType;
  if (params.amount < 10000) eventType = 'spending_sm';
  else if (params.amount < 30000) eventType = 'spending_md';
  else eventType = 'spending_lg';

  const { data, error } = await supabase
    .from('score_events')
    .insert({
      duel_id: params.duelId,
      user_id: params.userId,
      event_type: eventType,
      points: POINTS[eventType],
      evidence_url: params.evidenceUrl ?? null,
      merchant_name: params.merchantName ?? null,
      amount: params.amount,
    })
    .select()
    .single();

  if (error) throw error;
  return data as ScoreEvent;
}

export async function recordResistTemptation(params: {
  duelId: string;
  userId: string;
}) {
  // Check daily limit (max 2 per day)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { count } = await supabase
    .from('score_events')
    .select('*', { count: 'exact', head: true })
    .eq('duel_id', params.duelId)
    .eq('user_id', params.userId)
    .eq('event_type', 'resist_temptation')
    .gte('created_at', today.toISOString());

  if ((count ?? 0) >= 2) {
    throw new Error('오늘은 이미 2회 유혹 참기를 기록했습니다.');
  }

  const { data, error } = await supabase
    .from('score_events')
    .insert({
      duel_id: params.duelId,
      user_id: params.userId,
      event_type: 'resist_temptation',
      points: POINTS['resist_temptation'],
    })
    .select()
    .single();

  if (error) throw error;
  return data as ScoreEvent;
}

// ── Disputes ────────────────────────────────────────────────────────────────

export async function createDispute(params: {
  duelId: string;
  reporterId: string;
  targetUserId: string;
  description: string;
  evidenceUrl?: string;
}) {
  const { data, error } = await supabase
    .from('disputes')
    .insert({
      duel_id: params.duelId,
      reporter_id: params.reporterId,
      target_user_id: params.targetUserId,
      description: params.description,
      evidence_url: params.evidenceUrl ?? null,
      status: 'pending',
    })
    .select()
    .single();

  if (error) throw error;
  return data as Dispute;
}

export async function resolveDispute(
  disputeId: string,
  status: 'accepted' | 'rejected',
  duelId: string,
  reporterId: string,
  targetUserId: string
) {
  const { error: updateError } = await supabase
    .from('disputes')
    .update({ status })
    .eq('id', disputeId);

  if (updateError) throw updateError;

  if (status === 'accepted') {
    // Apply penalty to target, bonus to reporter
    await supabase.from('score_events').insert([
      {
        duel_id: duelId,
        user_id: targetUserId,
        event_type: 'dispute_penalty',
        points: POINTS['dispute_penalty'],
      },
      {
        duel_id: duelId,
        user_id: reporterId,
        event_type: 'dispute_bonus',
        points: POINTS['dispute_bonus'],
      },
    ]);
  }
}

// ── Storage ─────────────────────────────────────────────────────────────────

export async function uploadEvidence(
  userId: string,
  localUri: string
): Promise<string> {
  const fileName = `${userId}/${Date.now()}.jpg`;

  const response = await fetch(localUri);
  const blob = await response.blob();
  const arrayBuffer = await blob.arrayBuffer();

  const { error } = await supabase.storage
    .from('evidences')
    .upload(fileName, arrayBuffer, { contentType: 'image/jpeg' });

  if (error) throw error;

  const { data } = supabase.storage.from('evidences').getPublicUrl(fileName);
  return data.publicUrl;
}
