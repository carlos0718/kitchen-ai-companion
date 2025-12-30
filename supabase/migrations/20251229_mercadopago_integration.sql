-- Migration: Mercado Pago Integration - Dual Gateway Support
-- Created: 2025-12-29
-- Purpose: Extend existing schema to support both Stripe and Mercado Pago payment gateways

-- ============================================================================
-- 1. Extend user_subscriptions table for dual gateway support
-- ============================================================================

ALTER TABLE public.user_subscriptions
  ADD COLUMN IF NOT EXISTS payment_gateway TEXT DEFAULT 'stripe'
    CHECK (payment_gateway IN ('stripe', 'mercadopago')),
  ADD COLUMN IF NOT EXISTS mercadopago_payment_id TEXT,
  ADD COLUMN IF NOT EXISTS mercadopago_preference_id TEXT,
  ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS expiration_notified BOOLEAN DEFAULT false;

-- Add comments for documentation
COMMENT ON COLUMN public.user_subscriptions.payment_gateway IS 'Payment gateway used: stripe for international users, mercadopago for Argentina';
COMMENT ON COLUMN public.user_subscriptions.mercadopago_payment_id IS 'Mercado Pago payment ID (only for mercadopago gateway)';
COMMENT ON COLUMN public.user_subscriptions.mercadopago_preference_id IS 'Mercado Pago preference ID used to create the payment';
COMMENT ON COLUMN public.user_subscriptions.is_recurring IS 'Whether the subscription renews automatically (true for Stripe, false for Mercado Pago)';
COMMENT ON COLUMN public.user_subscriptions.expiration_notified IS 'Whether user has been notified about upcoming expiration (for non-recurring subscriptions)';

-- ============================================================================
-- 2. Create indexes for performance
-- ============================================================================

-- Index for filtering by payment gateway
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_gateway
  ON public.user_subscriptions(payment_gateway);

-- Index for looking up Mercado Pago payments
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_mp_payment
  ON public.user_subscriptions(mercadopago_payment_id)
  WHERE mercadopago_payment_id IS NOT NULL;

-- Index for finding expiring Mercado Pago subscriptions (used by cron jobs)
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_expiration
  ON public.user_subscriptions(current_period_end)
  WHERE payment_gateway = 'mercadopago' AND status = 'active';

-- Index for finding subscriptions that need expiration notification
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_notify_expiration
  ON public.user_subscriptions(current_period_end, expiration_notified)
  WHERE payment_gateway = 'mercadopago' AND status = 'active' AND expiration_notified = false;

-- ============================================================================
-- 3. Create or extend subscription_events for both gateways
-- ============================================================================

-- Create subscription_events table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.subscription_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_event_id TEXT,
  mercadopago_event_id TEXT,
  event_type TEXT NOT NULL,
  event_data JSONB NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT check_event_id_present CHECK (stripe_event_id IS NOT NULL OR mercadopago_event_id IS NOT NULL)
);

-- If table already exists, extend it
DO $$
BEGIN
  -- Add mercadopago_event_id column if it doesn't exist
  IF EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'subscription_events'
  ) AND NOT EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'subscription_events' AND column_name = 'mercadopago_event_id'
  ) THEN
    ALTER TABLE public.subscription_events
      ADD COLUMN mercadopago_event_id TEXT;
  END IF;

  -- Make stripe_event_id nullable if it isn't already
  IF EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'subscription_events'
    AND column_name = 'stripe_event_id' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.subscription_events
      ALTER COLUMN stripe_event_id DROP NOT NULL;
  END IF;

  -- Add constraint if it doesn't exist
  IF EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'subscription_events'
  ) AND NOT EXISTS (
    SELECT FROM pg_constraint
    WHERE conname = 'check_event_id_present'
  ) THEN
    ALTER TABLE public.subscription_events
      ADD CONSTRAINT check_event_id_present
      CHECK (stripe_event_id IS NOT NULL OR mercadopago_event_id IS NOT NULL);
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscription_events_user
  ON public.subscription_events(user_id);

CREATE INDEX IF NOT EXISTS idx_subscription_events_type
  ON public.subscription_events(event_type);

CREATE INDEX IF NOT EXISTS idx_subscription_events_stripe
  ON public.subscription_events(stripe_event_id)
  WHERE stripe_event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_subscription_events_mp_event
  ON public.subscription_events(mercadopago_event_id)
  WHERE mercadopago_event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_subscription_events_created
  ON public.subscription_events(created_at DESC);

-- Enable RLS
ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;

-- Create RLS policy if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'subscription_events'
    AND policyname = 'Users can view own subscription events'
  ) THEN
    CREATE POLICY "Users can view own subscription events"
      ON public.subscription_events
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Add comments
COMMENT ON TABLE public.subscription_events IS 'Audit trail of all payment gateway webhook events (Stripe and Mercado Pago) for debugging and analytics';
COMMENT ON COLUMN public.subscription_events.stripe_event_id IS 'Stripe webhook event ID for idempotency (nullable for MP events)';
COMMENT ON COLUMN public.subscription_events.mercadopago_event_id IS 'Mercado Pago webhook event ID for idempotency (nullable for Stripe events)';

-- ============================================================================
-- 4. Create user_notifications table if it doesn't exist
-- ============================================================================

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

-- Enable RLS
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_notifications'
    AND policyname = 'Users can view own notifications'
  ) THEN
    CREATE POLICY "Users can view own notifications"
      ON public.user_notifications
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_notifications'
    AND policyname = 'Users can update own notifications'
  ) THEN
    CREATE POLICY "Users can update own notifications"
      ON public.user_notifications
      FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Add comment
COMMENT ON TABLE public.user_notifications IS 'In-app notifications for users about subscription events and other important updates';

-- ============================================================================
-- 5. Extend user_profiles for payment preferences
-- ============================================================================

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS preferred_gateway TEXT
    CHECK (preferred_gateway IS NULL OR preferred_gateway IN ('stripe', 'mercadopago')),
  ADD COLUMN IF NOT EXISTS preferred_currency TEXT DEFAULT 'USD'
    CHECK (preferred_currency IN ('USD', 'ARS'));

COMMENT ON COLUMN public.user_profiles.preferred_gateway IS 'Auto-detected or user-preferred payment gateway based on country';
COMMENT ON COLUMN public.user_profiles.preferred_currency IS 'Preferred currency: USD for international, ARS for Argentina';

-- Index for quick lookup of user payment preferences
CREATE INDEX IF NOT EXISTS idx_user_profiles_gateway
  ON public.user_profiles(preferred_gateway)
  WHERE preferred_gateway IS NOT NULL;

-- ============================================================================
-- 6. Update RLS policies (if needed)
-- ============================================================================

-- Verify existing RLS policies still work with new columns
-- No changes needed - new columns are part of existing tables with RLS already configured

-- ============================================================================
-- 7. Data migration for existing records
-- ============================================================================

-- Ensure all existing subscriptions are marked as Stripe and recurring
UPDATE public.user_subscriptions
SET
  payment_gateway = 'stripe',
  is_recurring = true
WHERE payment_gateway IS NULL OR is_recurring IS NULL;

-- ============================================================================
-- Migration complete
-- ============================================================================

-- Verification query (for testing):
-- SELECT
--   user_id,
--   plan,
--   status,
--   payment_gateway,
--   is_recurring,
--   current_period_end,
--   expiration_notified
-- FROM public.user_subscriptions;
