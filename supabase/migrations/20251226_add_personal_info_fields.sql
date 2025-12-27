-- Add personal information fields to user_profiles table
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS last_name TEXT,
ADD COLUMN IF NOT EXISTS birth_date DATE,
ADD COLUMN IF NOT EXISTS country TEXT;
