-- Promo codes for discounts and free trials (marketing)
CREATE TABLE IF NOT EXISTS public.promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('free_trial', 'discount_percent')),
  -- free_trial: number of free days (e.g. 7); discount_percent: percentage off (e.g. 50)
  value INTEGER NOT NULL CHECK (value > 0),
  -- NULL means applicable to any plan
  applicable_plan TEXT CHECK (applicable_plan IN ('weekly', 'monthly')),
  max_uses INTEGER NOT NULL DEFAULT 100,
  current_uses INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  description TEXT, -- internal admin note
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Track which users have used which codes (prevents abuse: 1 use per user per code)
CREATE TABLE IF NOT EXISTS public.promo_code_uses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code_id UUID NOT NULL REFERENCES public.promo_codes(id),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  used_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  granted_plan TEXT,
  granted_days INTEGER,
  UNIQUE (promo_code_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON public.promo_codes (UPPER(code));
CREATE INDEX IF NOT EXISTS idx_promo_code_uses_user ON public.promo_code_uses (user_id, promo_code_id);

-- RLS
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_code_uses ENABLE ROW LEVEL SECURITY;

-- Admins can manage promo codes
CREATE POLICY "Admins manage promo codes"
  ON public.promo_codes FOR ALL
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));

-- Users can see their own promo code uses
CREATE POLICY "Users see own promo uses"
  ON public.promo_code_uses FOR SELECT
  USING (user_id = auth.uid());

-- Edge functions use service role (bypasses RLS) for validation and application
