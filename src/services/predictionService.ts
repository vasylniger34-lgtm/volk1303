/**
 * predictionService.ts — Betting / Predictions for VOLK 1303
 *
 * Users place predictions on match outcomes. After a match finishes,
 * predictions are resolved as won/lost with calculated payouts.
 */

import { supabase } from '../lib/supabase';
import type { PredictionRow, PredictionInsert } from '../types/database';

/**
 * Fetch all predictions for a specific user, newest first.
 */
export async function fetchPredictionsByUser(
  userId: string
): Promise<PredictionRow[]> {
  try {
    const { data, error } = await supabase
      .from('predictions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[predictionService] fetchPredictionsByUser error:', error.message);
      return [];
    }

    return (data as PredictionRow[]) ?? [];
  } catch (err) {
    console.error('[predictionService] fetchPredictionsByUser unexpected error:', err);
    return [];
  }
}

/**
 * Place a new prediction (bet).
 * The caller should ensure the user has sufficient balance before calling.
 */
export async function placePrediction(
  data: PredictionInsert
): Promise<PredictionRow | null> {
  try {
    const { data: created, error } = await supabase
      .from('predictions')
      .insert({
        ...data,
        status: 'pending',
        payout: 0,
      })
      .select()
      .single();

    if (error) {
      console.error('[predictionService] placePrediction error:', error.message);
      return null;
    }

    return created as PredictionRow;
  } catch (err) {
    console.error('[predictionService] placePrediction unexpected error:', err);
    return null;
  }
}

/**
 * Resolve all pending predictions for a finished match.
 *
 * Logic:
 * - For 'winner' type: compare predicted_value against winnerId
 * - For 'total_rounds' type: compare predicted_value against totalRounds
 * - Won predictions get payout = wager × odds
 * - Lost predictions get payout = 0
 *
 * Returns the number of predictions resolved.
 */
export async function resolvePredictions(
  matchId: string,
  winnerId: string,
  totalRounds: number
): Promise<{ resolved: number; error: string | null }> {
  try {
    // 1. Fetch all pending predictions for this match
    const { data: pendingPredictions, error: fetchError } = await supabase
      .from('predictions')
      .select('*')
      .eq('match_id', matchId)
      .eq('status', 'pending');

    if (fetchError) {
      console.error('[predictionService] resolvePredictions fetch error:', fetchError.message);
      return { resolved: 0, error: fetchError.message };
    }

    if (!pendingPredictions || pendingPredictions.length === 0) {
      return { resolved: 0, error: null };
    }

    // 2. Evaluate each prediction and batch update
    let resolvedCount = 0;

    for (const prediction of pendingPredictions as PredictionRow[]) {
      let isWin = false;

      if (prediction.prediction_type === 'winner') {
        // predicted_value should be a team ID
        isWin = prediction.predicted_value === winnerId;
      } else if (prediction.prediction_type === 'total_rounds') {
        // predicted_value should be a number as string
        isWin = prediction.predicted_value === String(totalRounds);
      }

      const newStatus = isWin ? 'won' : 'lost';
      const payout = isWin
        ? Math.round(prediction.wager * prediction.odds * 100) / 100
        : 0;

      const { error: updateError } = await supabase
        .from('predictions')
        .update({
          status: newStatus,
          payout,
        })
        .eq('id', prediction.id);

      if (updateError) {
        console.error(
          `[predictionService] resolvePredictions update error for prediction ${prediction.id}:`,
          updateError.message
        );
        continue;
      }

      // If the user won, credit their balance
      if (isWin && payout > 0) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('balance, predictions_won')
          .eq('id', prediction.user_id)
          .single();

        if (profile) {
          await supabase
            .from('profiles')
            .update({
              balance: (profile.balance ?? 0) + payout,
              predictions_won: (profile.predictions_won ?? 0) + 1,
            })
            .eq('id', prediction.user_id);
        }
      }

      resolvedCount++;
    }

    return { resolved: resolvedCount, error: null };
  } catch (err) {
    console.error('[predictionService] resolvePredictions unexpected error:', err);
    return { resolved: 0, error: 'Unexpected error resolving predictions' };
  }
}

/**
 * Fetch all predictions for a specific match (admin view).
 */
export async function fetchPredictionsByMatch(
  matchId: string
): Promise<PredictionRow[]> {
  try {
    const { data, error } = await supabase
      .from('predictions')
      .select('*')
      .eq('match_id', matchId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[predictionService] fetchPredictionsByMatch error:', error.message);
      return [];
    }

    return (data as PredictionRow[]) ?? [];
  } catch (err) {
    console.error('[predictionService] fetchPredictionsByMatch unexpected error:', err);
    return [];
  }
}
