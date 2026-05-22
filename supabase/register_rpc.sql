-- ============================================================
-- VOLKI 13:03 — REGISTER TELEGRAM USER RPC FUNCTION
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- Enable pgcrypto for crypt password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.register_telegram_user(
  tg_id text,
  tg_username text,
  tg_first_name text
)
RETURNS jsonb AS $$
DECLARE
  new_user_id uuid;
  email_str text;
  pw_hash text;
  result jsonb;
  username_clean text;
  final_username text;
  counter integer := 1;
  profile_rec record;
BEGIN
  -- Generate email and check if user already exists
  email_str := tg_id || '@telegram.volki.app';
  
  SELECT id INTO new_user_id FROM auth.users WHERE email = email_str;
  
  IF new_user_id IS NOT NULL THEN
    -- User already exists, check if profile exists
    SELECT * INTO profile_rec FROM public.profiles WHERE id = new_user_id;
    IF NOT FOUND THEN
      -- If auth user exists but profile got lost, recreate it
      username_clean := REGEXP_REPLACE(COALESCE(tg_username, tg_first_name, 'player'), '[^a-zA-Z0-9_]', '', 'g');
      IF username_clean = '' THEN
        username_clean := 'player';
      END IF;
      final_username := username_clean;
      WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) LOOP
        final_username := username_clean || counter;
        counter := counter + 1;
      END LOOP;
      
      INSERT INTO public.profiles (id, username, telegram_id, telegram_username, balance)
      VALUES (new_user_id, final_username, tg_id, tg_username, 5000);
    END IF;
    
    SELECT jsonb_build_object('ok', true, 'status', 'exists', 'user_id', new_user_id) INTO result;
    RETURN result;
  END IF;

  -- Create a deterministic UUID for the user based on telegram ID
  -- Pad the telegram ID to fit 32 characters for UUID casting
  new_user_id := cast(lpad(tg_id, 32, '0') as uuid);
  
  -- Generate bcrypt/blowfish password hash for 'volki_tg_{tg_id}_secure'
  pw_hash := crypt('volki_tg_' || tg_id || '_secure', gen_salt('bf'));

  -- Insert into auth.users
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    aud,
    role,
    created_at,
    updated_at
  )
  VALUES (
    new_user_id,
    '00000000-0000-0000-0000-000000000000',
    email_str,
    pw_hash,
    now(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    jsonb_build_object(
      'username', COALESCE(tg_username, tg_first_name, 'player'),
      'telegram_id', tg_id,
      'telegram_username', COALESCE(tg_username, '')
    ),
    'authenticated',
    'authenticated',
    now(),
    now()
  );

  -- The trigger on_auth_user_created automatically runs and inserts into public.profiles
  -- which in turn automatically inserts into public.user_coins.
  
  SELECT jsonb_build_object('ok', true, 'status', 'created', 'user_id', new_user_id) INTO result;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
