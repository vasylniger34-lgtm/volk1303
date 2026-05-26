-- ============================================================
-- FINAL VOLK DB UPDATE: FIX SYNC, RLS, AND COINS
-- ============================================================

-- 1. FIX COINS RPC FUNCTIONS
-- All functions accept target_user_id and amount (matching frontend)
-- and update the balance in the profiles table directly.

CREATE OR REPLACE FUNCTION public.increment_coins(
    target_user_id UUID,
    amount INTEGER
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.profiles 
    SET balance = COALESCE(balance, 0) + amount 
    WHERE id = target_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.decrement_coins(
    target_user_id UUID,
    amount INTEGER
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.profiles 
    SET balance = COALESCE(balance, 0) - amount 
    WHERE id = target_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_coins(
    target_user_id UUID,
    amount INTEGER
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.profiles 
    SET balance = amount 
    WHERE id = target_user_id;
END;
$$;

-- Grant execution to all roles
GRANT EXECUTE ON FUNCTION public.increment_coins(UUID, INTEGER) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.decrement_coins(UUID, INTEGER) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_coins(UUID, INTEGER) TO anon, authenticated, service_role;

-- 2. DISABLE ROW LEVEL SECURITY (RLS) ON EXISTING TABLES FOR TESTING AND SEAMLESS SYNC
-- This bypasses any select/insert/update/delete restrictions for both admin & web app
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournaments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_invites DISABLE ROW LEVEL SECURITY;

-- 3. ENSURE REALTIME SUBSCRIPTIONS WORK
-- We check if publication exists and add tables if they aren't already included
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    -- Try to add tables one by one (safely handling cases if they are already in publication)
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.tournaments;
    EXCEPTION WHEN others THEN NULL;
    END;
    
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.teams;
    EXCEPTION WHEN others THEN NULL;
    END;
    
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;
    EXCEPTION WHEN others THEN NULL;
    END;
    
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
    EXCEPTION WHEN others THEN NULL;
    END;
  END IF;
END;
$$;

-- 4. SET ADMIN ROLE FOR TELEGRAM ADMIN PROFILE
UPDATE public.profiles 
SET role = 'admin' 
WHERE id = (SELECT id FROM auth.users WHERE email = '11111111@telegram.volki.app');
