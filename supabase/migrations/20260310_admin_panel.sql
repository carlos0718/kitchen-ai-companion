-- Add admin columns to support_tickets
ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS admin_response TEXT,
  ADD COLUMN IF NOT EXISTS admin_id UUID REFERENCES auth.users(id);

-- Add admin columns to suggestions
ALTER TABLE public.suggestions
  ADD COLUMN IF NOT EXISTS admin_notes TEXT,
  ADD COLUMN IF NOT EXISTS admin_id UUID REFERENCES auth.users(id);

-- Helper function: check admin via admin_users table (not user_profiles)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = auth.uid()
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- -------------------------------------------------------
-- RLS ADMIN POLICIES (DROP IF EXISTS to avoid conflicts)
-- -------------------------------------------------------

-- user_profiles
DROP POLICY IF EXISTS "Admins can view all user profiles" ON public.user_profiles;
CREATE POLICY "Admins can view all user profiles"
  ON public.user_profiles FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can update any user profile" ON public.user_profiles;
CREATE POLICY "Admins can update any user profile"
  ON public.user_profiles FOR UPDATE USING (public.is_admin());

-- user_subscriptions
DROP POLICY IF EXISTS "Admins can view all subscriptions" ON public.user_subscriptions;
CREATE POLICY "Admins can view all subscriptions"
  ON public.user_subscriptions FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can update any subscription" ON public.user_subscriptions;
CREATE POLICY "Admins can update any subscription"
  ON public.user_subscriptions FOR UPDATE USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can insert subscriptions" ON public.user_subscriptions;
CREATE POLICY "Admins can insert subscriptions"
  ON public.user_subscriptions FOR INSERT WITH CHECK (public.is_admin());

-- support_tickets
DROP POLICY IF EXISTS "Admins can view all support tickets" ON public.support_tickets;
CREATE POLICY "Admins can view all support tickets"
  ON public.support_tickets FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can update any support ticket" ON public.support_tickets;
CREATE POLICY "Admins can update any support ticket"
  ON public.support_tickets FOR UPDATE USING (public.is_admin());

-- suggestions
DROP POLICY IF EXISTS "Admins can update any suggestion" ON public.suggestions;
CREATE POLICY "Admins can update any suggestion"
  ON public.suggestions FOR UPDATE USING (public.is_admin());

-- usage_tracking
DROP POLICY IF EXISTS "Admins can view all usage tracking" ON public.usage_tracking;
CREATE POLICY "Admins can view all usage tracking"
  ON public.usage_tracking FOR SELECT USING (public.is_admin());
