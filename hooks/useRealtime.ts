import { useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * score_events 테이블을 실시간으로 구독하고, 변경 시 payload와 함께 콜백을 호출합니다.
 */
export function useRealtimeScores(
  duelId: string,
  onUpdate: (payload?: any) => void
) {
  const subscribe = useCallback(() => {
    const channel = supabase
      .channel(`duel:${duelId}:scores`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'score_events',
          filter: `duel_id=eq.${duelId}`,
        },
        (payload) => onUpdate(payload)
      )
      .subscribe();

    return channel;
  }, [duelId, onUpdate]);

  useEffect(() => {
    const channel = subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [subscribe]);
}

/**
 * disputes 테이블을 실시간으로 구독합니다.
 */
export function useRealtimeDisputes(
  duelId: string,
  onUpdate: (payload?: any) => void
) {
  useEffect(() => {
    const channel = supabase
      .channel(`duel:${duelId}:disputes`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'disputes',
          filter: `duel_id=eq.${duelId}`,
        },
        (payload) => onUpdate(payload)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [duelId, onUpdate]);
}

/**
 * duels 테이블에서 나에게 온 신규 대결 신청을 구독합니다. (홈 화면용)
 */
export function useRealtimeIncomingDuels(
  userId: string,
  onUpdate: () => void
) {
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`user:${userId}:incoming-duels`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'duels',
          filter: `opponent_id=eq.${userId}`,
        },
        () => onUpdate()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, onUpdate]);
}
