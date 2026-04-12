import { useState, useEffect, useCallback } from 'react';
import { getDuel, getDuelScoreEvents, getDuelScores, finishDuel } from '@/lib/api';
import { Duel, ScoreEvent } from '@/types';

export function useDuel(duelId: string) {
  const [duel, setDuel] = useState<Duel | null>(null);
  const [events, setEvents] = useState<ScoreEvent[]>([]);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      setError(null);
      const [duelData, eventsData, scoresData] = await Promise.all([
        getDuel(duelId),
        getDuelScoreEvents(duelId),
        getDuelScores(duelId),
      ]);

      // ends_at이 지난 active 대결을 클라이언트에서 종료 처리
      let finalDuel = duelData;
      if (duelData.status === 'active' && duelData.ends_at) {
        if (new Date(duelData.ends_at) < new Date()) {
          finalDuel = await finishDuel(duelData.id, scoresData);
        }
      }

      setDuel(finalDuel);
      setEvents(eventsData);
      setScores(scoresData);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [duelId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return { duel, events, scores, loading, error, refresh: fetchAll };
}
