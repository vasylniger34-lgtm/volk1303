/**
 * TypeScript types matching the Supabase PostgreSQL schema.
 * These types are used by the Supabase client for type-safe queries.
 */

// ─── Row Types (what you read FROM the DB) ───

export interface ProfileRow {
  id: string;
  username: string;
  balance: number;
  level: number;
  xp: number;
  xp_next: number;
  role: 'player' | 'admin' | 'moderator';
  wins: number;
  losses: number;
  predictions_placed: number;
  predictions_won: number;
  avatar_url: string | null;
  telegram_id: string | null;
  telegram_username: string | null;
  created_at: string;
  reg_num: number;
}

export interface TournamentRow {
  id: string;
  name: string;
  type: '2X2' | '4X4' | 'BCI';
  date: string;
  prize_pool: string;
  prize_first: string | null;
  prize_second: string | null;
  prize_third: string | null;
  participants_count: number;
  max_participants: number;
  status: 'upcoming' | 'active' | 'completed';
  map: string;
  system: string;
  rules: string[];
  image_url: string | null;
  created_by: string | null;
  created_at: string;
}

export interface TeamRow {
  id: string;
  tournament_id: string;
  name: string;
  tag: string;
  captain: string;
  players: { username: string }[];
  logo_text: string | null;
  logo_bg: string | null;
  created_at: string;
}

export interface MatchRow {
  id: string;
  tournament_id: string;
  tournament_name: string;
  round_name: '1/8' | 'Quarterfinal' | 'Semifinal' | 'Final';
  team_a_id: string | null;
  team_b_id: string | null;
  score_a: number;
  score_b: number;
  status: 'scheduled' | 'live' | 'finished';
  winner_id: string | null;
  odds_a: number;
  odds_b: number;
  map: string;
  time: string | null;
  current_map: number;
  map_scores: { scoreA: number; scoreB: number }[];
  live_logs: string[];
  created_at: string;
}

export interface PredictionRow {
  id: string;
  user_id: string;
  match_id: string | null;
  tournament_name: string | null;
  team_a: string | null;
  team_b: string | null;
  prediction_type: 'winner' | 'total_rounds' | 'tournament_winner';
  predicted_value: string;
  odds: number;
  wager: number;
  status: 'pending' | 'won' | 'lost';
  payout: number;
  created_at: string;
}

// ─── Insert Types (what you write TO the DB) ───

export type ProfileInsert = Partial<ProfileRow> & { id: string; username: string };
export type TournamentInsert = Omit<TournamentRow, 'id' | 'created_at'> & { id?: string };
export type TeamInsert = Omit<TeamRow, 'id' | 'created_at'> & { id?: string };
export type MatchInsert = Omit<MatchRow, 'id' | 'created_at'> & { id?: string };
export type PredictionInsert = Omit<PredictionRow, 'id' | 'created_at'> & { id?: string };

// ─── Database Type Map (for Supabase Client generics) ───

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: ProfileInsert;
        Update: Partial<ProfileRow>;
      };
      tournaments: {
        Row: TournamentRow;
        Insert: TournamentInsert;
        Update: Partial<TournamentRow>;
      };
      teams: {
        Row: TeamRow;
        Insert: TeamInsert;
        Update: Partial<TeamRow>;
      };
      matches: {
        Row: MatchRow;
        Insert: MatchInsert;
        Update: Partial<MatchRow>;
      };
      predictions: {
        Row: PredictionRow;
        Insert: PredictionInsert;
        Update: Partial<PredictionRow>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
