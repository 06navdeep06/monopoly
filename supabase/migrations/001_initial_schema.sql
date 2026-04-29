-- ═══════════════════════════════════════════════════════════════
-- RICHUP.IO CLONE — COMPLETE DATABASE SCHEMA
-- Migration: 001_initial_schema.sql
-- ═══════════════════════════════════════════════════════════════

-- ─── ENUMS ───────────────────────────────────────────────────

CREATE TYPE room_status AS ENUM ('waiting', 'starting', 'in_progress', 'finished');
CREATE TYPE player_status AS ENUM ('waiting', 'ready', 'playing', 'bankrupt', 'disconnected');
CREATE TYPE bot_difficulty AS ENUM ('easy', 'medium', 'hard');
CREATE TYPE game_phase AS ENUM ('roll', 'action', 'buy', 'auction', 'trade', 'jail_decision', 'end_turn');
CREATE TYPE transaction_type AS ENUM ('rent', 'purchase', 'tax', 'salary', 'card', 'trade', 'mortgage', 'build', 'auction', 'bankruptcy');
CREATE TYPE trade_status AS ENUM ('pending', 'accepted', 'rejected', 'cancelled', 'expired');
CREATE TYPE auction_status AS ENUM ('active', 'completed', 'cancelled');
CREATE TYPE chat_message_type AS ENUM ('chat', 'system', 'game_event');

-- ─── HELPER: auto-update updated_at ─────────────────────────

CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════
-- TABLE 1: profiles
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username        TEXT UNIQUE NOT NULL CHECK (char_length(username) BETWEEN 2 AND 30),
  avatar_url      TEXT DEFAULT '',
  avatar_token    TEXT DEFAULT 'hat',
  preferred_color TEXT DEFAULT '#F59E0B',
  total_games_played INT NOT NULL DEFAULT 0,
  total_wins      INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_profiles_username ON profiles(username);

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ═══════════════════════════════════════════════════════════════
-- TABLE 2: rooms
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE rooms (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code       TEXT UNIQUE NOT NULL CHECK (char_length(code) = 6),
  host_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status     room_status NOT NULL DEFAULT 'waiting',
  settings   JSONB NOT NULL DEFAULT '{
    "starting_cash": 1500,
    "turn_duration_seconds": 60,
    "max_players": 6,
    "allow_bots": true,
    "board_theme": "classic",
    "house_limit": 4,
    "hotel_limit": 1,
    "free_parking_jackpot": false,
    "speed_mode": false,
    "starting_position": 0
  }'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rooms_code ON rooms(code);
CREATE INDEX idx_rooms_host_id ON rooms(host_id);
CREATE INDEX idx_rooms_status ON rooms(status);

CREATE TRIGGER set_rooms_updated_at
  BEFORE UPDATE ON rooms
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ═══════════════════════════════════════════════════════════════
-- TABLE 3: room_players
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE room_players (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id        UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  player_id      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  is_bot         BOOLEAN NOT NULL DEFAULT FALSE,
  bot_difficulty bot_difficulty,
  display_name   TEXT NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 30),
  color          TEXT NOT NULL DEFAULT '#F59E0B',
  token          TEXT NOT NULL DEFAULT 'hat',
  turn_order     INT NOT NULL DEFAULT 0,
  status         player_status NOT NULL DEFAULT 'waiting',
  joined_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_room_players_room_id ON room_players(room_id);
CREATE INDEX idx_room_players_player_id ON room_players(player_id);
CREATE UNIQUE INDEX idx_room_players_room_player ON room_players(room_id, player_id) WHERE player_id IS NOT NULL;

-- ═══════════════════════════════════════════════════════════════
-- TABLE 4: game_states
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE game_states (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id                 UUID UNIQUE NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  current_player_id       UUID REFERENCES room_players(id) ON DELETE SET NULL,
  turn_number             INT NOT NULL DEFAULT 1,
  phase                   game_phase NOT NULL DEFAULT 'roll',
  dice_values             INT[2],
  consecutive_doubles     INT NOT NULL DEFAULT 0,
  free_parking_pool       INT NOT NULL DEFAULT 0,
  bank_houses_remaining   INT NOT NULL DEFAULT 32,
  bank_hotels_remaining   INT NOT NULL DEFAULT 12,
  community_chest_deck    INT[] NOT NULL DEFAULT '{}',
  chance_deck             INT[] NOT NULL DEFAULT '{}',
  community_chest_index   INT NOT NULL DEFAULT 0,
  chance_index            INT NOT NULL DEFAULT 0,
  turn_deadline           TIMESTAMPTZ,
  winner_id               UUID REFERENCES room_players(id) ON DELETE SET NULL,
  started_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at                TIMESTAMPTZ,
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_game_states_room_id ON game_states(room_id);
CREATE INDEX idx_game_states_current_player ON game_states(current_player_id);

CREATE TRIGGER set_game_states_updated_at
  BEFORE UPDATE ON game_states
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ═══════════════════════════════════════════════════════════════
-- TABLE 5: player_states
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE player_states (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_state_id           UUID NOT NULL REFERENCES game_states(id) ON DELETE CASCADE,
  player_id               UUID NOT NULL REFERENCES room_players(id) ON DELETE CASCADE,
  cash                    INT NOT NULL DEFAULT 1500,
  position                INT NOT NULL DEFAULT 0 CHECK (position >= 0 AND position <= 39),
  jail_turns_remaining    INT NOT NULL DEFAULT 0,
  get_out_of_jail_cards   INT NOT NULL DEFAULT 0,
  is_bankrupt             BOOLEAN NOT NULL DEFAULT FALSE,
  bankrupt_at             TIMESTAMPTZ,
  net_worth               INT NOT NULL DEFAULT 1500,
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_player_states_game_state ON player_states(game_state_id);
CREATE INDEX idx_player_states_player ON player_states(player_id);
CREATE UNIQUE INDEX idx_player_states_game_player ON player_states(game_state_id, player_id);

CREATE TRIGGER set_player_states_updated_at
  BEFORE UPDATE ON player_states
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ═══════════════════════════════════════════════════════════════
-- TABLE 6: property_states
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE property_states (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_state_id       UUID NOT NULL REFERENCES game_states(id) ON DELETE CASCADE,
  property_id         INT NOT NULL CHECK (property_id >= 0 AND property_id <= 39),
  owner_id            UUID REFERENCES room_players(id) ON DELETE SET NULL,
  is_mortgaged        BOOLEAN NOT NULL DEFAULT FALSE,
  houses              INT NOT NULL DEFAULT 0 CHECK (houses >= 0 AND houses <= 5),
  purchase_price_paid INT,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_property_states_game_state ON property_states(game_state_id);
CREATE INDEX idx_property_states_owner ON property_states(owner_id);
CREATE UNIQUE INDEX idx_property_states_game_property ON property_states(game_state_id, property_id);

CREATE TRIGGER set_property_states_updated_at
  BEFORE UPDATE ON property_states
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ═══════════════════════════════════════════════════════════════
-- TABLE 7: transactions
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE transactions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_state_id    UUID NOT NULL REFERENCES game_states(id) ON DELETE CASCADE,
  from_player_id   UUID REFERENCES room_players(id) ON DELETE SET NULL,
  to_player_id     UUID REFERENCES room_players(id) ON DELETE SET NULL,
  amount           INT NOT NULL CHECK (amount >= 0),
  reason           TEXT NOT NULL DEFAULT '',
  transaction_type transaction_type NOT NULL,
  metadata         JSONB DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_transactions_game_state ON transactions(game_state_id);
CREATE INDEX idx_transactions_from_player ON transactions(from_player_id);
CREATE INDEX idx_transactions_to_player ON transactions(to_player_id);
CREATE INDEX idx_transactions_type ON transactions(transaction_type);

-- ═══════════════════════════════════════════════════════════════
-- TABLE 8: trades
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE trades (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_state_id   UUID NOT NULL REFERENCES game_states(id) ON DELETE CASCADE,
  proposer_id     UUID NOT NULL REFERENCES room_players(id) ON DELETE CASCADE,
  recipient_id    UUID NOT NULL REFERENCES room_players(id) ON DELETE CASCADE,
  status          trade_status NOT NULL DEFAULT 'pending',
  offer           JSONB NOT NULL DEFAULT '{"cash": 0, "properties": [], "gooj_cards": 0}',
  request         JSONB NOT NULL DEFAULT '{"cash": 0, "properties": [], "gooj_cards": 0}',
  expires_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_trades_game_state ON trades(game_state_id);
CREATE INDEX idx_trades_proposer ON trades(proposer_id);
CREATE INDEX idx_trades_recipient ON trades(recipient_id);
CREATE INDEX idx_trades_status ON trades(status);

CREATE TRIGGER set_trades_updated_at
  BEFORE UPDATE ON trades
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ═══════════════════════════════════════════════════════════════
-- TABLE 9: auctions
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE auctions (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_state_id               UUID NOT NULL REFERENCES game_states(id) ON DELETE CASCADE,
  property_id                 INT NOT NULL,
  initiated_by_player_id      UUID NOT NULL REFERENCES room_players(id) ON DELETE CASCADE,
  status                      auction_status NOT NULL DEFAULT 'active',
  current_highest_bid         INT NOT NULL DEFAULT 0,
  current_highest_bidder_id   UUID REFERENCES room_players(id) ON DELETE SET NULL,
  ends_at                     TIMESTAMPTZ NOT NULL,
  winner_id                   UUID REFERENCES room_players(id) ON DELETE SET NULL,
  final_price                 INT,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_auctions_game_state ON auctions(game_state_id);
CREATE INDEX idx_auctions_status ON auctions(status);

CREATE TRIGGER set_auctions_updated_at
  BEFORE UPDATE ON auctions
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ═══════════════════════════════════════════════════════════════
-- TABLE 10: auction_bids
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE auction_bids (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id  UUID NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
  player_id   UUID NOT NULL REFERENCES room_players(id) ON DELETE CASCADE,
  amount      INT NOT NULL CHECK (amount > 0),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_auction_bids_auction ON auction_bids(auction_id);
CREATE INDEX idx_auction_bids_player ON auction_bids(player_id);

-- ═══════════════════════════════════════════════════════════════
-- TABLE 11: chat_messages
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE chat_messages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id       UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  player_id     UUID REFERENCES room_players(id) ON DELETE SET NULL,
  message       TEXT NOT NULL CHECK (char_length(message) BETWEEN 1 AND 500),
  message_type  chat_message_type NOT NULL DEFAULT 'chat',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chat_messages_room ON chat_messages(room_id);
CREATE INDEX idx_chat_messages_created ON chat_messages(created_at DESC);

-- ═══════════════════════════════════════════════════════════════
-- TABLE 12: game_events (audit log)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE game_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_state_id   UUID NOT NULL REFERENCES game_states(id) ON DELETE CASCADE,
  event_type      TEXT NOT NULL,
  payload         JSONB NOT NULL DEFAULT '{}',
  player_id       UUID REFERENCES room_players(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_game_events_game_state ON game_events(game_state_id);
CREATE INDEX idx_game_events_type ON game_events(event_type);
CREATE INDEX idx_game_events_created ON game_events(created_at);

-- ═══════════════════════════════════════════════════════════════
-- TRIGGERS: Business Logic
-- ═══════════════════════════════════════════════════════════════

-- Trigger: compute net_worth on player_states update
CREATE OR REPLACE FUNCTION compute_player_net_worth()
RETURNS TRIGGER AS $$
DECLARE
  property_value INT;
  house_value INT;
BEGIN
  SELECT
    COALESCE(SUM(
      CASE WHEN ps.is_mortgaged THEN 0
      ELSE COALESCE(ps.purchase_price_paid, 0)
      END
    ), 0),
    COALESCE(SUM(
      CASE WHEN ps.houses > 0 AND ps.houses <= 4 THEN ps.houses * 50
      WHEN ps.houses = 5 THEN 4 * 50 + 50
      ELSE 0 END
    ), 0)
  INTO property_value, house_value
  FROM property_states ps
  WHERE ps.game_state_id = NEW.game_state_id
    AND ps.owner_id = NEW.player_id;

  NEW.net_worth = NEW.cash + property_value + house_value;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_compute_net_worth
  BEFORE INSERT OR UPDATE ON player_states
  FOR EACH ROW EXECUTE FUNCTION compute_player_net_worth();

-- Trigger: set room status to 'finished' when winner_id is set
CREATE OR REPLACE FUNCTION on_game_winner_set()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.winner_id IS NOT NULL AND OLD.winner_id IS NULL THEN
    NEW.ended_at = NOW();
    UPDATE rooms SET status = 'finished' WHERE id = NEW.room_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_game_winner_set
  BEFORE UPDATE ON game_states
  FOR EACH ROW EXECUTE FUNCTION on_game_winner_set();

-- ═══════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE auctions ENABLE ROW LEVEL SECURITY;
ALTER TABLE auction_bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_events ENABLE ROW LEVEL SECURITY;

-- ─── profiles ────────────────────────────────────────────────

CREATE POLICY "Users can view any profile"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ─── rooms ───────────────────────────────────────────────────

CREATE POLICY "Anyone can view rooms"
  ON rooms FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create rooms"
  ON rooms FOR INSERT
  WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Host can update own room"
  ON rooms FOR UPDATE
  USING (auth.uid() = host_id)
  WITH CHECK (auth.uid() = host_id);

-- ─── room_players ────────────────────────────────────────────

CREATE POLICY "Players can view room_players in their room"
  ON room_players FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM room_players rp
      WHERE rp.room_id = room_players.room_id
        AND rp.player_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can join rooms"
  ON room_players FOR INSERT
  WITH CHECK (auth.uid() = player_id OR is_bot = true);

CREATE POLICY "Players can update own status"
  ON room_players FOR UPDATE
  USING (auth.uid() = player_id)
  WITH CHECK (auth.uid() = player_id);

-- ─── game_states ─────────────────────────────────────────────

CREATE POLICY "Players can view their game state"
  ON game_states FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM room_players rp
      WHERE rp.room_id = game_states.room_id
        AND rp.player_id = auth.uid()
    )
  );

-- game_states mutations happen via Edge Functions (service role)

-- ─── player_states ───────────────────────────────────────────

CREATE POLICY "Players can view player_states in their game"
  ON player_states FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM game_states gs
      JOIN room_players rp ON rp.room_id = gs.room_id
      WHERE gs.id = player_states.game_state_id
        AND rp.player_id = auth.uid()
    )
  );

-- player_states mutations happen via Edge Functions (service role)

-- ─── property_states ─────────────────────────────────────────

CREATE POLICY "Players can view property_states in their game"
  ON property_states FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM game_states gs
      JOIN room_players rp ON rp.room_id = gs.room_id
      WHERE gs.id = property_states.game_state_id
        AND rp.player_id = auth.uid()
    )
  );

-- ─── transactions ────────────────────────────────────────────

CREATE POLICY "Players can view transactions in their game"
  ON transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM game_states gs
      JOIN room_players rp ON rp.room_id = gs.room_id
      WHERE gs.id = transactions.game_state_id
        AND rp.player_id = auth.uid()
    )
  );

-- ─── trades ──────────────────────────────────────────────────

CREATE POLICY "Players can view trades in their game"
  ON trades FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM game_states gs
      JOIN room_players rp ON rp.room_id = gs.room_id
      WHERE gs.id = trades.game_state_id
        AND rp.player_id = auth.uid()
    )
  );

-- ─── auctions ────────────────────────────────────────────────

CREATE POLICY "Players can view auctions in their game"
  ON auctions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM game_states gs
      JOIN room_players rp ON rp.room_id = gs.room_id
      WHERE gs.id = auctions.game_state_id
        AND rp.player_id = auth.uid()
    )
  );

-- ─── auction_bids ────────────────────────────────────────────

CREATE POLICY "Players can view auction_bids in their auction"
  ON auction_bids FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auctions a
      JOIN game_states gs ON gs.id = a.game_state_id
      JOIN room_players rp ON rp.room_id = gs.room_id
      WHERE a.id = auction_bids.auction_id
        AND rp.player_id = auth.uid()
    )
  );

-- ─── chat_messages ───────────────────────────────────────────

CREATE POLICY "Players can view chat in their room"
  ON chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM room_players rp
      WHERE rp.room_id = chat_messages.room_id
        AND rp.player_id = auth.uid()
    )
  );

CREATE POLICY "Players can send chat messages"
  ON chat_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM room_players rp
      WHERE rp.room_id = chat_messages.room_id
        AND rp.player_id = auth.uid()
        AND rp.id = chat_messages.player_id
    )
  );

-- ─── game_events ─────────────────────────────────────────────

CREATE POLICY "Players can view events in their game"
  ON game_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM game_states gs
      JOIN room_players rp ON rp.room_id = gs.room_id
      WHERE gs.id = game_events.game_state_id
        AND rp.player_id = auth.uid()
    )
  );

-- ═══════════════════════════════════════════════════════════════
-- Enable Realtime on required tables
-- ═══════════════════════════════════════════════════════════════

ALTER PUBLICATION supabase_realtime ADD TABLE game_states;
ALTER PUBLICATION supabase_realtime ADD TABLE player_states;
ALTER PUBLICATION supabase_realtime ADD TABLE property_states;
ALTER PUBLICATION supabase_realtime ADD TABLE trades;
ALTER PUBLICATION supabase_realtime ADD TABLE auctions;
ALTER PUBLICATION supabase_realtime ADD TABLE auction_bids;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE room_players;

-- ═══════════════════════════════════════════════════════════════
-- Utility function: generate room code
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION generate_room_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INT;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;
