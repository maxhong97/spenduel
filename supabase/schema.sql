-- ============================================================
-- Spenduel - Supabase Schema
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── users ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  kakao_id    TEXT UNIQUE NOT NULL,
  nickname    TEXT NOT NULL,
  avatar_url  TEXT,
  trust_score INT NOT NULL DEFAULT 100,
  card_linked BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── duels ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS duels (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  opponent_id          UUID REFERENCES users(id) ON DELETE SET NULL,
  category             TEXT NOT NULL CHECK (category IN (
                         'impulse_buy','cafe','delivery','dining','shopping','custom'
                       )),
  custom_category_name TEXT,
  period_days          INT NOT NULL CHECK (period_days IN (7, 14, 30)),
  stake_text           TEXT NOT NULL,
  status               TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
                         'pending','active','finished'
                       )),
  started_at           TIMESTAMPTZ,
  ends_at              TIMESTAMPTZ,
  winner_id            UUID REFERENCES users(id),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── score_events ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS score_events (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  duel_id       UUID NOT NULL REFERENCES duels(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type    TEXT NOT NULL CHECK (event_type IN (
                  'clean_day','resist_temptation','streak_3','streak_7',
                  'spending_sm','spending_md','spending_lg',
                  'dispute_penalty','dispute_bonus'
                )),
  points        INT NOT NULL,
  evidence_url  TEXT,
  merchant_name TEXT,
  amount        INT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── disputes ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS disputes (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  duel_id        UUID NOT NULL REFERENCES duels(id) ON DELETE CASCADE,
  reporter_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  description    TEXT NOT NULL,
  evidence_url   TEXT,
  status         TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
                   'pending','accepted','rejected'
                 )),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Indexes ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_duels_creator ON duels(creator_id);
CREATE INDEX IF NOT EXISTS idx_duels_opponent ON duels(opponent_id);
CREATE INDEX IF NOT EXISTS idx_duels_status ON duels(status);
CREATE INDEX IF NOT EXISTS idx_score_events_duel ON score_events(duel_id);
CREATE INDEX IF NOT EXISTS idx_score_events_user ON score_events(user_id);
CREATE INDEX IF NOT EXISTS idx_score_events_duel_user ON score_events(duel_id, user_id);
CREATE INDEX IF NOT EXISTS idx_disputes_duel ON disputes(duel_id);

-- ── Row Level Security ───────────────────────────────────────
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE duels ENABLE ROW LEVEL SECURITY;
ALTER TABLE score_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;

-- users: 본인 프로필은 읽기/수정 가능, 다른 사용자 프로필은 읽기만
CREATE POLICY "Users can read all profiles"
  ON users FOR SELECT USING (true);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Allow insert during signup"
  ON users FOR INSERT WITH CHECK (true);

-- duels: 참여자만 읽기, 생성자만 생성, 참여자만 수정
CREATE POLICY "Duel participants can read"
  ON duels FOR SELECT
  USING (auth.uid() = creator_id OR auth.uid() = opponent_id);

CREATE POLICY "Authenticated users can create duels"
  ON duels FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Participants can update duel"
  ON duels FOR UPDATE
  USING (auth.uid() = creator_id OR auth.uid() = opponent_id);

-- score_events: 대결 참여자만 읽기, 본인만 삽입
CREATE POLICY "Duel participants can read score events"
  ON score_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM duels
      WHERE duels.id = score_events.duel_id
        AND (duels.creator_id = auth.uid() OR duels.opponent_id = auth.uid())
    )
  );

CREATE POLICY "Users can insert own score events"
  ON score_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- disputes: 대결 참여자만 읽기/삽입
CREATE POLICY "Duel participants can read disputes"
  ON disputes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM duels
      WHERE duels.id = disputes.duel_id
        AND (duels.creator_id = auth.uid() OR duels.opponent_id = auth.uid())
    )
  );

CREATE POLICY "Users can create disputes"
  ON disputes FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Target user can resolve dispute"
  ON disputes FOR UPDATE
  USING (auth.uid() = target_user_id);

-- ── Realtime ─────────────────────────────────────────────────
-- Supabase Dashboard에서 아래 테이블에 Realtime을 활성화하세요:
-- score_events, disputes, duels
-- ALTER PUBLICATION supabase_realtime ADD TABLE score_events;
-- ALTER PUBLICATION supabase_realtime ADD TABLE disputes;
-- ALTER PUBLICATION supabase_realtime ADD TABLE duels;

-- ── Storage Bucket ───────────────────────────────────────────
-- Supabase Dashboard > Storage에서 'evidences' 버킷을 생성하고
-- 아래 정책을 적용하세요 (또는 Dashboard에서 직접 설정):
--
-- INSERT: auth.uid() IS NOT NULL
-- SELECT: true (public read)
