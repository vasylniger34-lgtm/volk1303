-- ============================================================
-- VOLKI 13:03 — Full Supabase Database Schema
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- ─── 1. PROFILES (extends auth.users) ───

CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  balance INTEGER DEFAULT 5000 NOT NULL,
  level INTEGER DEFAULT 1 NOT NULL,
  xp INTEGER DEFAULT 0 NOT NULL,
  xp_next INTEGER DEFAULT 1000 NOT NULL,
  role TEXT DEFAULT 'player' NOT NULL CHECK (role IN ('player', 'admin', 'moderator')),
  wins INTEGER DEFAULT 0 NOT NULL,
  losses INTEGER DEFAULT 0 NOT NULL,
  predictions_placed INTEGER DEFAULT 0 NOT NULL,
  predictions_won INTEGER DEFAULT 0 NOT NULL,
  avatar_url TEXT,
  telegram_id TEXT UNIQUE,
  telegram_username TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ─── 2. TOURNAMENTS ───

CREATE TABLE IF NOT EXISTS tournaments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('2X2', '4X4', 'BCI')),
  date TEXT NOT NULL,
  prize_pool TEXT NOT NULL,
  prize_first TEXT,
  prize_second TEXT,
  prize_third TEXT,
  participants_count INTEGER DEFAULT 0 NOT NULL,
  max_participants INTEGER DEFAULT 16 NOT NULL,
  status TEXT DEFAULT 'upcoming' NOT NULL CHECK (status IN ('upcoming', 'active', 'completed')),
  map TEXT NOT NULL,
  system TEXT DEFAULT 'Single Elimination' NOT NULL,
  rules TEXT[] DEFAULT '{}' NOT NULL,
  image_url TEXT,
  stream_url TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ─── 3. TEAMS ───

CREATE TABLE IF NOT EXISTS teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  tag TEXT NOT NULL,
  captain TEXT NOT NULL,
  players JSONB NOT NULL DEFAULT '[]',
  logo_text TEXT,
  logo_bg TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ─── 4. MATCHES ───

CREATE TABLE IF NOT EXISTS matches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE NOT NULL,
  tournament_name TEXT NOT NULL,
  round_name TEXT NOT NULL CHECK (round_name IN ('1/8', 'Quarterfinal', 'Semifinal', 'Final')),
  team_a_id UUID REFERENCES teams(id),
  team_b_id UUID REFERENCES teams(id),
  score_a INTEGER DEFAULT 0 NOT NULL,
  score_b INTEGER DEFAULT 0 NOT NULL,
  status TEXT DEFAULT 'scheduled' NOT NULL CHECK (status IN ('scheduled', 'live', 'finished')),
  winner_id UUID REFERENCES teams(id),
  odds_a NUMERIC(4,2) DEFAULT 1.85 NOT NULL,
  odds_b NUMERIC(4,2) DEFAULT 1.85 NOT NULL,
  map TEXT NOT NULL,
  time TEXT,
  current_map INTEGER DEFAULT 1 NOT NULL,
  map_scores JSONB DEFAULT '[]' NOT NULL,
  live_logs TEXT[] DEFAULT '{}' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ─── 5. PREDICTIONS / BETS ───

CREATE TABLE IF NOT EXISTS predictions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE NOT NULL,
  tournament_name TEXT,
  team_a TEXT,
  team_b TEXT,
  prediction_type TEXT NOT NULL CHECK (prediction_type IN ('winner', 'total_rounds')),
  predicted_value TEXT NOT NULL,
  odds NUMERIC(4,2) NOT NULL,
  wager INTEGER NOT NULL,
  status TEXT DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'won', 'lost')),
  payout INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- ─── PROFILES ───
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Everyone can read profiles
CREATE POLICY "profiles_select_all" ON profiles
  FOR SELECT USING (true);

-- Users can only update their own profile
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Auto-create profile on signup (via trigger)
CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ─── TOURNAMENTS ───
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;

-- Everyone can read tournaments
CREATE POLICY "tournaments_select_all" ON tournaments
  FOR SELECT USING (true);

-- Admins can create tournaments
CREATE POLICY "tournaments_insert_admin" ON tournaments
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Admins can update tournaments
CREATE POLICY "tournaments_update_admin" ON tournaments
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Admins can delete tournaments
CREATE POLICY "tournaments_delete_admin" ON tournaments
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ─── TEAMS ───
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- Everyone can read teams
CREATE POLICY "teams_select_all" ON teams
  FOR SELECT USING (true);

-- Authenticated users can register teams
CREATE POLICY "teams_insert_auth" ON teams
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ─── MATCHES ───
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

-- Everyone can read matches
CREATE POLICY "matches_select_all" ON matches
  FOR SELECT USING (true);

-- Admins can manage matches
CREATE POLICY "matches_insert_admin" ON matches
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "matches_update_admin" ON matches
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "matches_delete_admin" ON matches
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ─── PREDICTIONS ───
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;

-- Users can read their own predictions
CREATE POLICY "predictions_select_own" ON predictions
  FOR SELECT USING (auth.uid() = user_id);

-- Users can place their own predictions
CREATE POLICY "predictions_insert_own" ON predictions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admins can read all predictions (for resolution)
CREATE POLICY "predictions_select_admin" ON predictions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Admins can update predictions (resolve bets)
CREATE POLICY "predictions_update_admin" ON predictions
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- First drop the trigger and function to avoid dependency issues
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Auto-create profile when a new user signs up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  base_username TEXT;
  final_username TEXT;
  counter INTEGER := 1;
BEGIN
  -- Get base username
  base_username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    NEW.raw_user_meta_data->>'telegram_username',
    'player'
  );
  
  -- Clean and format base username (alphanumeric and underscores only)
  base_username := REGEXP_REPLACE(base_username, '[^a-zA-Z0-9_]', '', 'g');
  IF base_username = '' THEN
    base_username := 'player';
  END IF;
  
  final_username := base_username;

  -- Handle username duplicate conflict loop
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) LOOP
    final_username := base_username || counter;
    counter := counter + 1;
  END LOOP;

  -- Insert profile, do nothing or update if ID already exists
  INSERT INTO public.profiles (id, username, telegram_id, telegram_username)
  VALUES (
    NEW.id,
    final_username,
    NEW.raw_user_meta_data->>'telegram_id',
    NEW.raw_user_meta_data->>'telegram_username'
  )
  ON CONFLICT (id) DO UPDATE
  SET
    username = EXCLUDED.username,
    telegram_id = COALESCE(profiles.telegram_id, EXCLUDED.telegram_id),
    telegram_username = COALESCE(profiles.telegram_username, EXCLUDED.telegram_username);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger on auth.users insert
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- REALTIME — Enable for live match updates
-- ============================================================

-- Enable Realtime for matches table (score updates broadcast to all)
ALTER PUBLICATION supabase_realtime ADD TABLE matches;

-- Enable Realtime for tournaments (new tournaments appear instantly)
ALTER PUBLICATION supabase_realtime ADD TABLE tournaments;

-- ============================================================
-- INDEXES for performance
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_matches_tournament_id ON matches(tournament_id);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
CREATE INDEX IF NOT EXISTS idx_teams_tournament_id ON teams(tournament_id);
CREATE INDEX IF NOT EXISTS idx_predictions_user_id ON predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_predictions_match_id ON predictions(match_id);
CREATE INDEX IF NOT EXISTS idx_profiles_telegram_id ON profiles(telegram_id);
