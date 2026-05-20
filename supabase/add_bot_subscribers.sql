-- ============================================================
-- VOLKI 13:03 — Bot Subscribers Table Migration
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- Create the bot_subscribers table to persist Telegram subscribers
CREATE TABLE IF NOT EXISTS bot_subscribers (
  chat_id BIGINT PRIMARY KEY,              -- Telegram chat_id (integer)
  first_name TEXT DEFAULT '',              -- User's first name
  username TEXT DEFAULT '',               -- Telegram username (@handle)
  subscribed_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL  -- Can be set to false if user blocked the bot
);

-- Enable Row Level Security
ALTER TABLE bot_subscribers ENABLE ROW LEVEL SECURITY;

-- Allow full public read/write via anon key (bot uses anon key)
CREATE POLICY "bot_subscribers_select_all" ON bot_subscribers
  FOR SELECT USING (true);

CREATE POLICY "bot_subscribers_insert_all" ON bot_subscribers
  FOR INSERT WITH CHECK (true);

CREATE POLICY "bot_subscribers_update_all" ON bot_subscribers
  FOR UPDATE USING (true);

-- Index for fast active subscriber lookups
CREATE INDEX IF NOT EXISTS idx_bot_subscribers_active ON bot_subscribers(is_active);
