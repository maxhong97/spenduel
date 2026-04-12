-- ============================================================
-- Spenduel - Idempotent Schema (safe to re-run)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Tables ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  kakao_id    TEXT UNIQUE NOT NULL,
  nickname    TEXT NOT NULL,
  avatar_url  TEXT,
  trust_score INT NOT NULL DEFAULT 100,
  card_linked BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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

CREATE INDEX IF NOT EXISTS idx_duels_creator    ON duels(creator_id);
CREATE INDEX IF NOT EXISTS idx_duels_opponent   ON duels(opponent_id);
CREATE INDEX IF NOT EXISTS idx_duels_status     ON duels(status);
CREATE INDEX IF NOT EXISTS idx_score_events_duel      ON score_events(duel_id);
CREATE INDEX IF NOT EXISTS idx_score_events_user      ON score_events(user_id);
CREATE INDEX IF NOT EXISTS idx_score_events_duel_user ON score_events(duel_id, user_id);
CREATE INDEX IF NOT EXISTS idx_disputes_duel    ON disputes(duel_id);

-- ── RLS 활성화 ───────────────────────────────────────────────

ALTER TABLE users        ENABLE ROW LEVEL SECURITY;
ALTER TABLE duels        ENABLE ROW LEVEL SECURITY;
ALTER TABLE score_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE disputes     ENABLE ROW LEVEL SECURITY;

-- ── RLS Policies (DROP IF EXISTS → CREATE) ──────────────────

-- users
DROP POLICY IF EXISTS "Users can read all profiles"    ON users;
DROP POLICY IF EXISTS "Users can update own profile"   ON users;
DROP POLICY IF EXISTS "Allow insert during signup"     ON users;

CREATE POLICY "Users can read all profiles"
  ON users FOR SELECT USING (true);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Allow insert during signup"
  ON users FOR INSERT WITH CHECK (true);

-- duels
DROP POLICY IF EXISTS "Duel participants can read"          ON duels;
DROP POLICY IF EXISTS "Authenticated users can create duels" ON duels;
DROP POLICY IF EXISTS "Participants can update duel"        ON duels;

CREATE POLICY "Duel participants can read"
  ON duels FOR SELECT
  USING (auth.uid() = creator_id OR auth.uid() = opponent_id);

CREATE POLICY "Authenticated users can create duels"
  ON duels FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Participants can update duel"
  ON duels FOR UPDATE
  USING (auth.uid() = creator_id OR auth.uid() = opponent_id);

-- score_events
DROP POLICY IF EXISTS "Duel participants can read score events" ON score_events;
DROP POLICY IF EXISTS "Users can insert own score events"       ON score_events;

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

-- disputes
DROP POLICY IF EXISTS "Duel participants can read disputes" ON disputes;
DROP POLICY IF EXISTS "Users can create disputes"          ON disputes;
DROP POLICY IF EXISTS "Target user can resolve dispute"    ON disputes;

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

-- ── Realtime 활성화 ──────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE score_events;
ALTER PUBLICATION supabase_realtime ADD TABLE disputes;
ALTER PUBLICATION supabase_realtime ADD TABLE duels;
