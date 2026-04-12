-- ============================================================
-- 자정 집계: 클린 데이 & 연속 달성 보너스 자동 지급
-- Supabase Edge Functions 또는 pg_cron으로 매일 00:05에 실행
-- ============================================================

CREATE OR REPLACE FUNCTION award_clean_days()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  r RECORD;
  yesterday DATE := CURRENT_DATE - INTERVAL '1 day';
  had_spending BOOLEAN;
  clean_streak INT;
BEGIN
  -- 현재 active 상태인 모든 대결 참여자 순회
  FOR r IN
    SELECT DISTINCT
      d.id AS duel_id,
      d.category,
      u.id AS user_id
    FROM duels d
    JOIN users u ON u.id = d.creator_id OR u.id = d.opponent_id
    WHERE d.status = 'active'
      AND d.ends_at > NOW()
      AND d.opponent_id IS NOT NULL
  LOOP
    -- 어제 해당 카테고리 소비가 있었는지 확인
    SELECT EXISTS (
      SELECT 1 FROM score_events se
      WHERE se.duel_id = r.duel_id
        AND se.user_id = r.user_id
        AND se.event_type IN ('spending_sm','spending_md','spending_lg')
        AND DATE(se.created_at) = yesterday
    ) INTO had_spending;

    -- 소비가 없었으면 클린 데이 +10점 지급
    IF NOT had_spending THEN
      INSERT INTO score_events (duel_id, user_id, event_type, points)
      VALUES (r.duel_id, r.user_id, 'clean_day', 10);

      -- 연속 클린 데이 계산 (최근 N일 연속인지)
      SELECT COUNT(*) INTO clean_streak
      FROM (
        SELECT DISTINCT DATE(created_at) AS clean_date
        FROM score_events
        WHERE duel_id = r.duel_id
          AND user_id = r.user_id
          AND event_type = 'clean_day'
          AND created_at >= (CURRENT_DATE - INTERVAL '7 days')
      ) sub;

      -- 3일 연속 보너스
      IF clean_streak = 3 THEN
        INSERT INTO score_events (duel_id, user_id, event_type, points)
        VALUES (r.duel_id, r.user_id, 'streak_3', 10);
      END IF;

      -- 7일 연속 보너스
      IF clean_streak = 7 THEN
        INSERT INTO score_events (duel_id, user_id, event_type, points)
        VALUES (r.duel_id, r.user_id, 'streak_7', 20);
      END IF;
    END IF;
  END LOOP;

  -- 종료된 대결 처리 (ends_at 이 지난 active 대결)
  FOR r IN
    SELECT
      d.id,
      d.creator_id,
      d.opponent_id
    FROM duels d
    WHERE d.status = 'active'
      AND d.ends_at <= NOW()
  LOOP
    DECLARE
      creator_score INT;
      opponent_score INT;
      winner UUID;
    BEGIN
      SELECT COALESCE(SUM(points), 0) INTO creator_score
      FROM score_events
      WHERE duel_id = r.id AND user_id = r.creator_id;

      SELECT COALESCE(SUM(points), 0) INTO opponent_score
      FROM score_events
      WHERE duel_id = r.id AND user_id = r.opponent_id;

      IF creator_score >= opponent_score THEN
        winner := r.creator_id;
      ELSE
        winner := r.opponent_id;
      END IF;

      UPDATE duels
      SET status = 'finished', winner_id = winner
      WHERE id = r.id;
    END;
  END LOOP;
END;
$$;

-- pg_cron 사용 시 (Supabase Pro 이상):
-- SELECT cron.schedule('award-clean-days', '5 0 * * *', 'SELECT award_clean_days()');
