-- Add support for Mercado Pago recurring subscriptions
-- This migration adds fields to support MP's Preapproval API (subscriptions)

-- Add mercadopago_subscription_id to user_subscriptions table
ALTER TABLE public.user_subscriptions
  ADD COLUMN IF NOT EXISTS mercadopago_subscription_id TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_mp_subscription_id
  ON public.user_subscriptions(mercadopago_subscription_id)
  WHERE mercadopago_subscription_id IS NOT NULL;

-- Add comment
COMMENT ON COLUMN public.user_subscriptions.mercadopago_subscription_id IS 'Mercado Pago subscription ID (preapproval_id) for recurring payments';

-- Update existing MP subscriptions that are one-time payments
-- Set is_recurring to false for those using preference_id only
UPDATE public.user_subscriptions
SET is_recurring = false
WHERE payment_gateway = 'mercadopago'
  AND mercadopago_preference_id IS NOT NULL
  AND mercadopago_subscription_id IS NULL;

-- Set is_recurring to true for those with subscription_id
UPDATE public.user_subscriptions
SET is_recurring = true
WHERE payment_gateway = 'mercadopago'
  AND mercadopago_subscription_id IS NOT NULL;
