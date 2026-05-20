/**
 * matchService.ts — Match management + Realtime for VOLKI 13:03
 *
 * Full match lifecycle: scheduling, going live, score updates,
 * finishing, bracket advancement, and Supabase Realtime subscriptions.
 */

import { supabase } from '../lib/supabase';
import type { MatchRow, MatchInsert } from '../types/database';
import type { RealtimeChannel } from '@supabase/supabase-js';

// ─── Read Operations ───

/**
 * Fetch all matches for a specific tournament, ordered by creation date.
 */
export async function fetchMatchesByTournament(
  tournamentId: string
): Promise<MatchRow[]> {
  try {
    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .eq('tournament_id', tournamentId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[matchService] fetchMatchesByTournament error:', error.message);
      return [];
    }

    return (data as MatchRow[]) ?? [];
  } catch (err) {
    console.error('[matchService] fetchMatchesByTournament unexpected error:', err);
    return [];
  }
}

/**
 * Fetch all matches across all tournaments.
 */
export async function fetchAllMatches(): Promise<MatchRow[]> {
  try {
    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[matchService] fetchAllMatches error:', error.message);
      return [];
    }

    return (data as MatchRow[]) ?? [];
  } catch (err) {
    console.error('[matchService] fetchAllMatches unexpected error:', err);
    return [];
  }
}

// ─── Write Operations ───

/**
 * Create a single match.
 */
export async function createMatch(data: MatchInsert): Promise<MatchRow | null> {
  try {
    const { data: created, error } = await supabase
      .from('matches')
      .insert(data)
      .select()
      .single();

    if (error) {
      console.error('[matchService] createMatch error:', error.message);
      return null;
    }

    return created as MatchRow;
  } catch (err) {
    console.error('[matchService] createMatch unexpected error:', err);
    return null;
  }
}

/**
 * Create multiple matches in a single batch insert (e.g. full bracket).
 */
export async function createMatches(data: MatchInsert[]): Promise<MatchRow[]> {
  try {
    if (data.length === 0) return [];

    const { data: created, error } = await supabase
      .from('matches')
      .insert(data)
      .select();

    if (error) {
      console.error('[matchService] createMatches error:', error.message);
      return [];
    }

    return (created as MatchRow[]) ?? [];
  } catch (err) {
    console.error('[matchService] createMatches unexpected error:', err);
    return [];
  }
}

// ─── Live Match Operations ───

/**
 * Set a match to LIVE status, reset scores, and log the event.
 */
export async function setMatchLive(matchId: string): Promise<MatchRow | null> {
  try {
    // Read current live_logs to append
    const { data: current, error: readError } = await supabase
      .from('matches')
      .select('live_logs')
      .eq('id', matchId)
      .single();

    if (readError) {
      console.error('[matchService] setMatchLive read error:', readError.message);
      return null;
    }

    const existingLogs: string[] = (current?.live_logs as string[]) ?? [];
    const timestamp = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    const updatedLogs = [...existingLogs, `[${timestamp}] 🔴 Match started LIVE!`];

    const { data: updated, error } = await supabase
      .from('matches')
      .update({
        status: 'live',
        score_a: 0,
        score_b: 0,
        live_logs: updatedLogs,
      })
      .eq('id', matchId)
      .select()
      .single();

    if (error) {
      console.error('[matchService] setMatchLive update error:', error.message);
      return null;
    }

    return updated as MatchRow;
  } catch (err) {
    console.error('[matchService] setMatchLive unexpected error:', err);
    return null;
  }
}

/**
 * Update the live score of a match.
 */
export async function updateMatchScore(
  matchId: string,
  scoreA: number,
  scoreB: number
): Promise<MatchRow | null> {
  try {
    const { data: updated, error } = await supabase
      .from('matches')
      .update({ score_a: scoreA, score_b: scoreB })
      .eq('id', matchId)
      .select()
      .single();

    if (error) {
      console.error('[matchService] updateMatchScore error:', error.message);
      return null;
    }

    return updated as MatchRow;
  } catch (err) {
    console.error('[matchService] updateMatchScore unexpected error:', err);
    return null;
  }
}

/**
 * Finish a match: set final scores, winner, and status.
 */
export async function finishMatch(
  matchId: string,
  winnerId: string,
  finalScoreA: number,
  finalScoreB: number
): Promise<MatchRow | null> {
  try {
    // Append finish log
    const { data: current } = await supabase
      .from('matches')
      .select('live_logs')
      .eq('id', matchId)
      .single();

    const existingLogs: string[] = (current?.live_logs as string[]) ?? [];
    const timestamp = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    const updatedLogs = [
      ...existingLogs,
      `[${timestamp}] 🏁 Match finished! Final: ${finalScoreA}–${finalScoreB}`,
    ];

    const { data: updated, error } = await supabase
      .from('matches')
      .update({
        status: 'finished',
        winner_id: winnerId,
        score_a: finalScoreA,
        score_b: finalScoreB,
        live_logs: updatedLogs,
      })
      .eq('id', matchId)
      .select()
      .single();

    if (error) {
      console.error('[matchService] finishMatch error:', error.message);
      return null;
    }

    return updated as MatchRow;
  } catch (err) {
    console.error('[matchService] finishMatch unexpected error:', err);
    return null;
  }
}

// ─── Bracket Advancement ───

/**
 * Advance a semifinal winner into the Final match for the same tournament.
 * Finds the Final match and fills the first available slot (team_a or team_b).
 */
export async function advanceWinnerToFinal(
  tournamentId: string,
  _semiMatchId: string,
  winnerId: string
): Promise<MatchRow | null> {
  try {
    // Find the Final match for this tournament
    const { data: finalMatch, error: findError } = await supabase
      .from('matches')
      .select('*')
      .eq('tournament_id', tournamentId)
      .eq('round_name', 'Final')
      .single();

    if (findError || !finalMatch) {
      console.error('[matchService] advanceWinnerToFinal: Final match not found:', findError?.message);
      return null;
    }

    // Determine which slot to fill
    const updatePayload: Partial<MatchRow> = {};
    if (!finalMatch.team_a_id) {
      updatePayload.team_a_id = winnerId;
    } else if (!finalMatch.team_b_id) {
      updatePayload.team_b_id = winnerId;
    } else {
      console.error('[matchService] advanceWinnerToFinal: Final match already has both teams');
      return finalMatch as MatchRow;
    }

    const { data: updated, error: updateError } = await supabase
      .from('matches')
      .update(updatePayload)
      .eq('id', finalMatch.id)
      .select()
      .single();

    if (updateError) {
      console.error('[matchService] advanceWinnerToFinal update error:', updateError.message);
      return null;
    }

    return updated as MatchRow;
  } catch (err) {
    console.error('[matchService] advanceWinnerToFinal unexpected error:', err);
    return null;
  }
}

// ─── Cleanup ───

/**
 * Delete all matches for a given tournament (e.g. bracket regeneration).
 */
export async function deleteMatchesByTournament(
  tournamentId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('matches')
      .delete()
      .eq('tournament_id', tournamentId);

    if (error) {
      console.error('[matchService] deleteMatchesByTournament error:', error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[matchService] deleteMatchesByTournament unexpected error:', err);
    return false;
  }
}

// ─── Realtime Subscriptions ───

/**
 * Subscribe to all changes on the `matches` table via Supabase Realtime.
 * Returns the channel for cleanup via `unsubscribeFromMatches`.
 */
export function subscribeToMatches(
  callback: (payload: unknown) => void
): RealtimeChannel {
  const channel = supabase
    .channel('matches-realtime')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'matches',
      },
      (payload) => {
        callback(payload);
      }
    )
    .subscribe();

  return channel;
}

/**
 * Unsubscribe from a Realtime channel (cleanup on unmount).
 */
export async function unsubscribeFromMatches(
  channel: RealtimeChannel
): Promise<void> {
  try {
    await supabase.removeChannel(channel);
  } catch (err) {
    console.error('[matchService] unsubscribeFromMatches error:', err);
  }
}
