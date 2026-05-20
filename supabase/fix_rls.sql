-- ============================================================
-- VOLKI 13:03 — FIX RLS POLICIES
-- Run this in Supabase Dashboard → SQL Editor
-- This opens write access so the admin panel can insert/update without Supabase auth
-- ============================================================

-- ─── TOURNAMENTS ───
DROP POLICY IF EXISTS "tournaments_insert_admin" ON tournaments;
DROP POLICY IF EXISTS "tournaments_update_admin" ON tournaments;
DROP POLICY IF EXISTS "tournaments_delete_admin" ON tournaments;

CREATE POLICY "tournaments_insert_all" ON tournaments
  FOR INSERT WITH CHECK (true);

CREATE POLICY "tournaments_update_all" ON tournaments
  FOR UPDATE USING (true);

CREATE POLICY "tournaments_delete_all" ON tournaments
  FOR DELETE USING (true);

-- ─── TEAMS ───
DROP POLICY IF EXISTS "teams_insert_auth" ON teams;

CREATE POLICY "teams_insert_all" ON teams
  FOR INSERT WITH CHECK (true);

CREATE POLICY "teams_update_all" ON teams
  FOR UPDATE USING (true);

CREATE POLICY "teams_delete_all" ON teams
  FOR DELETE USING (true);

-- ─── MATCHES ───
DROP POLICY IF EXISTS "matches_insert_admin" ON matches;
DROP POLICY IF EXISTS "matches_update_admin" ON matches;
DROP POLICY IF EXISTS "matches_delete_admin" ON matches;

CREATE POLICY "matches_insert_all" ON matches
  FOR INSERT WITH CHECK (true);

CREATE POLICY "matches_update_all" ON matches
  FOR UPDATE USING (true);

CREATE POLICY "matches_delete_all" ON matches
  FOR DELETE USING (true);

-- ─── PREDICTIONS ───
DROP POLICY IF EXISTS "predictions_insert_own" ON predictions;
DROP POLICY IF EXISTS "predictions_update_admin" ON predictions;
DROP POLICY IF EXISTS "predictions_select_admin" ON predictions;

CREATE POLICY "predictions_insert_all" ON predictions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "predictions_update_all" ON predictions
  FOR UPDATE USING (true);

CREATE POLICY "predictions_select_all" ON predictions
  FOR SELECT USING (true);

-- ─── PROFILES ───
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;

CREATE POLICY "profiles_update_all" ON profiles
  FOR UPDATE USING (true);

CREATE POLICY "profiles_insert_all" ON profiles
  FOR INSERT WITH CHECK (true);

-- ─── REALTIME (make sure matches & tournaments are enabled) ───
ALTER PUBLICATION supabase_realtime ADD TABLE matches;
ALTER PUBLICATION supabase_realtime ADD TABLE tournaments;
ALTER PUBLICATION supabase_realtime ADD TABLE teams;
