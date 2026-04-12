import { useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * score_events 테이블을 실시간으로 구독하고, 변경 시 콜백을 호출합니다.
 */
export function useRealtimeScores(duelId: string, onUpdate: () => void) {
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
        () => onUpdate()
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
export function useRealtimeDisputes(duelId: string, onUpdate: () => void) {
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
        () => onUpdate()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [duelId, onUpdate]);
}
