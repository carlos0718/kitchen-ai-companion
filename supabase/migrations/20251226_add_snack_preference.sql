-- Add snack_preference field to user_profiles table
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS snack_preference TEXT DEFAULT '3meals' CHECK (snack_preference IN ('3meals', '4meals', '5meals'));
