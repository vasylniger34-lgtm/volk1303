/**
 * authService.ts — Telegram-based authentication for VOLK 1303
 *
 * Uses Supabase Auth with OTP, mapping Telegram IDs to synthetic emails.
 * Manages user sessions, profiles, and auth state changes.
 */

import { supabase } from '../lib/supabase';
import type { ProfileRow } from '../types/database';

// ─── Types ───

interface TelegramAuthData {
  id: string;
  username: string;
  first_name?: string;
  photo_url?: string;
}

// ─── Auth Functions ───

/**
 * Sign in (or sign up) a user via Telegram identity.
 * Maps telegram ID → synthetic email for Supabase Auth OTP flow.
 * Stores Telegram metadata in the user's app_metadata.
 */
export async function signInWithTelegram(
  telegramData: TelegramAuthData
): Promise<{ session: Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session']; error: string | null }> {
  try {
    const syntheticEmail = `${telegramData.id}@telegram.volki.app`;

    const { error } = await supabase.auth.signInWithOtp({
      email: syntheticEmail,
      options: {
        data: {
          telegram_id: telegramData.id,
          telegram_username: telegramData.username,
          first_name: telegramData.first_name ?? null,
          avatar_url: telegramData.photo_url ?? null,
        },
        shouldCreateUser: true,
      },
    });

    if (error) {
      console.error('[authService] signInWithTelegram error:', error.message);
      return { session: null, error: error.message };
    }

    // OTP was sent — for Telegram flow the session may come after verification.
    // Return current session state (may be null until OTP is confirmed).
    const { data: sessionData } = await supabase.auth.getSession();
    return { session: sessionData.session, error: null };
  } catch (err) {
    console.error('[authService] signInWithTelegram unexpected error:', err);
    return { session: null, error: 'Unexpected authentication error' };
  }
}

/**
 * Sign out the current user and clear the session.
 */
export async function signOut(): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('[authService] signOut error:', error.message);
      return { error: error.message };
    }
    return { error: null };
  } catch (err) {
    console.error('[authService] signOut unexpected error:', err);
    return { error: 'Unexpected sign-out error' };
  }
}

/**
 * Get the current active session, or null if not authenticated.
 */
export async function getSession() {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error('[authService] getSession error:', error.message);
      return null;
    }
    return data.session;
  } catch (err) {
    console.error('[authService] getSession unexpected error:', err);
    return null;
  }
}

// ─── Profile Functions ───

/**
 * Fetch a user's profile from the `profiles` table.
 */
export async function getProfile(userId: string): Promise<ProfileRow | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('[authService] getProfile error:', error.message);
      return null;
    }

    return data as ProfileRow;
  } catch (err) {
    console.error('[authService] getProfile unexpected error:', err);
    return null;
  }
}

/**
 * Update a user's profile with partial data.
 * Only the provided fields are overwritten.
 */
export async function updateProfile(
  userId: string,
  data: Partial<ProfileRow>
): Promise<ProfileRow | null> {
  try {
    const { data: updated, error } = await supabase
      .from('profiles')
      .update(data)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('[authService] updateProfile error:', error.message);
      return null;
    }

    return updated as ProfileRow;
  } catch (err) {
    console.error('[authService] updateProfile unexpected error:', err);
    return null;
  }
}

// ─── Auth State Listener ───

/**
 * Subscribe to authentication state changes (sign-in, sign-out, token refresh).
 * Returns an unsubscribe function for cleanup.
 */
export function onAuthStateChange(
  callback: Parameters<typeof supabase.auth.onAuthStateChange>[0]
) {
  const { data } = supabase.auth.onAuthStateChange(callback);
  return data.subscription;
}
