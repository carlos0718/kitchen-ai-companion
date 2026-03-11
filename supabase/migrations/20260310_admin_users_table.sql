-- Dedicated admin_users table
-- Only the service role (Supabase dashboard) can INSERT/UPDATE/DELETE
-- Authenticated users can only check their own admin status via SELECT
CREATE TABLE IF NOT EXISTS public.admin_users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Users can only SELECT their own row (to check if they are admin)
CREATE POLICY "Users can check their own admin status"
  ON public.admin_users
  FOR SELECT
  USING (auth.uid() = user_id);

-- No INSERT / UPDATE / DELETE policies → only service role can manage admins
-- Add admins via Supabase dashboard > Table editor > admin_users

COMMENT ON TABLE public.admin_users IS
  'Admin whitelist. Only modifiable via service role (Supabase dashboard). No RLS insert/update/delete policies.';
