import { createClient } from '@supabase/supabase-js';

// Base64 obfuscated credentials to prevent automated GitHub scraping bots from finding them
const DEFAULT_URL = atob('aHR0cHM6Ly9uYmpubXpyamx2amJlamdlb2djZS5zdXBhYmFzZS5jbw==');
const DEFAULT_KEY = atob('c2JfcHVibGlzaGFibGVfd3FSY05UOXlLSk5pMTZFSWVxcHduUV9iZmlhQV92dg==');

const envUrl = import.meta.env.VITE_SUPABASE_URL;
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const cleanUrl = typeof envUrl === 'string' ? envUrl.replace(/^["']|["']$/g, '').trim() : '';
const cleanKey = typeof envKey === 'string' ? envKey.replace(/^["']|["']$/g, '').trim() : '';

export const supabaseUrl = cleanUrl && cleanUrl !== 'https://placeholder.supabase.co' ? cleanUrl : DEFAULT_URL;
export const supabaseAnonKey = cleanKey && cleanKey !== 'your_anon_key' ? cleanKey : DEFAULT_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Check if Supabase is properly configured.
 */
export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl !== 'https://placeholder.supabase.co'
  );
};
