/**
 * teamService.ts — Team registration for VOLKI 13:03
 *
 * Handles team creation and retrieval for tournament brackets.
 * Teams are linked to tournaments via `tournament_id`.
 */

import { supabase } from '../lib/supabase';
import type { TeamRow, TeamInsert } from '../types/database';

/**
 * Fetch all teams registered for a specific tournament.
 */
export async function fetchTeamsByTournament(
  tournamentId: string
): Promise<TeamRow[]> {
  try {
    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .eq('tournament_id', tournamentId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[teamService] fetchTeamsByTournament error:', error.message);
      return [];
    }

    return (data as TeamRow[]) ?? [];
  } catch (err) {
    console.error('[teamService] fetchTeamsByTournament unexpected error:', err);
    return [];
  }
}

/**
 * Register a new team for a tournament.
 * The insert data should include tournament_id, name, tag, captain, players, etc.
 */
export async function registerTeam(
  data: TeamInsert
): Promise<TeamRow | null> {
  try {
    const { data: created, error } = await supabase
      .from('teams')
      .insert(data)
      .select()
      .single();

    if (error) {
      console.error('[teamService] registerTeam error:', error.message);
      return null;
    }

    return created as TeamRow;
  } catch (err) {
    console.error('[teamService] registerTeam unexpected error:', err);
    return null;
  }
}

/**
 * Fetch all teams across all tournaments, ordered by creation date.
 * Useful for admin views and cross-tournament team listings.
 */
export async function fetchAllTeams(): Promise<TeamRow[]> {
  try {
    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[teamService] fetchAllTeams error:', error.message);
      return [];
    }

    return (data as TeamRow[]) ?? [];
  } catch (err) {
    console.error('[teamService] fetchAllTeams unexpected error:', err);
    return [];
  }
}
