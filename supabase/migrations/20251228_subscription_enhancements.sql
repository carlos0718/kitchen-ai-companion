-- =====================================================
-- SUBSCRIPTION SYSTEM ENHANCEMENTS
-- =====================================================
-- This migration enhances the subscription system with:
-- 1. Extended user_subscriptions table with new fields
-- 2. subscription_events table for Stripe webhook audit trail
-- 3. user_notifications table for in-app notifications

-- =====================================================
-- 1. EXTEND user_subscriptions TABLE
-- =====================================================

-- Drop old status constraint and add new one with more states
ALTER TABLE public.user_subscriptions
  DROP CONSTRAINT IF EXISTS user_subscriptions_status_check;

ALTER TABLE public.user_subscriptions
  ADD CONSTRAINT user_subscriptions_status_check
  CHECK (status IN ('active', 'canceled', 'past_due', 'trialing', 'unpaid', 'incomplete', 'incomplete_expired', 'paused'));

-- Add new fields for better subscription management
ALTER TABLE public.user_subscriptions
  ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS canceled_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS trial_end TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS latest_invoice_id TEXT;

-- Add comment
COMMENT ON COLUMN public.user_subscriptions.cancel_at_period_end IS 'Whether subscription will cancel at end of current period';
COMMENT ON COLUMN public.user_subscriptions.canceled_at IS 'Timestamp when subscription was canceled';
COMMENT ON COLUMN public.user_subscriptions.trial_end IS 'End date of trial period if applicable';
COMMENT ON COLUMN public.user_subscriptions.latest_invoice_id IS 'Most recent Stripe invoice ID';

-- =====================================================
-- 2. CREATE subscription_events TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.subscription_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  event_data JSONB NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscription_events_user
  ON public.subscription_events(user_id);

CREATE INDEX IF NOT EXISTS idx_subscription_events_type
  ON public.subscription_events(event_type);

CREATE INDEX IF NOT EXISTS idx_subscription_events_stripe
  ON public.subscription_events(stripe_event_id);

CREATE INDEX IF NOT EXISTS idx_subscription_events_created
  ON public.subscription_events(created_at DESC);

-- Add comment
COMMENT ON TABLE public.subscription_events IS 'Audit trail of all Stripe webhook events for debugging and analytics';

-- =====================================================
-- 3. CREATE user_notifications TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.user_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error')),
  read BOOLEAN NOT NULL DEFAULT false,
  action_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_notifications_user
  ON public.user_notifications(user_id);

CREATE INDEX IF NOT EXISTS idx_user_notifications_read
  ON public.user_notifications(user_id, read)
  WHERE read = false;

CREATE INDEX IF NOT EXISTS idx_user_notifications_created
  ON public.user_notifications(created_at DESC);

-- Add comment
COMMENT ON TABLE public.user_notifications IS 'In-app notifications for users about subscription events and other important updates';

-- =====================================================
-- 4. RLS POLICIES FOR NEW TABLES
-- =====================================================

-- Enable RLS
ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

-- Policies for subscription_events (read-only for users)
CREATE POLICY "Users can view own subscription events"
  ON public.subscription_events
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policies for user_notifications
CREATE POLICY "Users can view own notifications"
  ON public.user_notifications
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON public.user_notifications
  FOR UPDATE
  USING (auth.uid() = user_id);

-- =====================================================
-- 5. FUNCTION TO AUTO-UPDATE updated_at
-- =====================================================

-- Ensure update_updated_at_column function exists
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to user_subscriptions if not exists
DROP TRIGGER IF EXISTS update_user_subscriptions_updated_at ON public.user_subscriptions;

CREATE TRIGGER update_user_subscriptions_updated_at
  BEFORE UPDATE ON public.user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
