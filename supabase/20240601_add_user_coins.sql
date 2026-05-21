CREATE TABLE IF NOT EXISTS public.user_coins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  registration_number bigint UNIQUE NOT NULL,
  coins bigint NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

-- Auto-increment registration number starting at 1001
CREATE SEQUENCE IF NOT EXISTS public.registration_seq START 1001;

ALTER TABLE public.user_coins ALTER COLUMN registration_number SET DEFAULT nextval('public.registration_seq');

-- Function to add user_coins for a new user
CREATE OR REPLACE FUNCTION public.handle_new_user_coins()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_coins (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user_coins entry when profile is created
DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;
CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_coins();

-- Backfill for existing users
INSERT INTO public.user_coins (user_id)
SELECT id FROM public.profiles WHERE id NOT IN (SELECT user_id FROM public.user_coins);

-- RPC Functions
CREATE OR REPLACE FUNCTION increment_coins(target_user_id uuid, amount bigint)
RETURNS void AS $$
BEGIN
  UPDATE public.user_coins
  SET coins = coins + amount
  WHERE user_id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION decrement_coins(target_user_id uuid, amount bigint)
RETURNS void AS $$
BEGIN
  UPDATE public.user_coins
  SET coins = coins - amount
  WHERE user_id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION set_coins(target_user_id uuid, amount bigint)
RETURNS void AS $$
BEGIN
  UPDATE public.user_coins
  SET coins = amount
  WHERE user_id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
