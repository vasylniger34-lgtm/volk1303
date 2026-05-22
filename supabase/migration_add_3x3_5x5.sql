-- Migration to support 3X3 and 5X5 tournament types
ALTER TABLE public.tournaments DROP CONSTRAINT IF EXISTS tournaments_type_check;
ALTER TABLE public.tournaments ADD CONSTRAINT tournaments_type_check CHECK (type IN ('2X2', '3X3', '4X4', '5X5', 'BCI'));
