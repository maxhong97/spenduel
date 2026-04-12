import { useState, useEffect, useCallback } from 'react';
import { getDuel, getDuelScoreEvents, getDuelScores } from '@/lib/api';
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
      setDuel(duelData);
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
