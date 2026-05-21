-- 1. Reset balances and update default to 0
UPDATE public.profiles SET balance = 0;
ALTER TABLE public.profiles ALTER COLUMN balance SET DEFAULT 0;

-- 2. Create sequential reg numbers starting at 1001
CREATE SEQUENCE IF NOT EXISTS user_reg_num_seq START WITH 1001;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS reg_num INTEGER UNIQUE;

-- Backfill existing profiles sequentially by creation date
WITH ordered_profiles AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) - 1 + 1001 as num
  FROM public.profiles
)
UPDATE public.profiles p
SET reg_num = o.num
FROM ordered_profiles o
WHERE p.id = o.id AND p.reg_num IS NULL;

ALTER TABLE public.profiles ALTER COLUMN reg_num SET DEFAULT nextval('user_reg_num_seq');
ALTER TABLE public.profiles ALTER COLUMN reg_num SET NOT NULL;

-- 3. Modify predictions table rules
-- Make match_id nullable so users can place tournament-wide predictions
ALTER TABLE public.predictions ALTER COLUMN match_id DROP NOT NULL;

-- Drop check constraint and recreate it to allow 'tournament_winner' prediction type
ALTER TABLE public.predictions DROP CONSTRAINT IF EXISTS predictions_prediction_type_check;
ALTER TABLE public.predictions ADD CONSTRAINT predictions_prediction_type_check CHECK (prediction_type IN ('winner', 'total_rounds', 'tournament_winner'));
