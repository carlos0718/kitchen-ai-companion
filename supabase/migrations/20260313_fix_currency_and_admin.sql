-- ============================================
-- 1. preferred_currency: auto-set based on country
-- ============================================

-- Update existing rows: AR → ARS, everything else → USD
UPDATE public.user_profiles
SET preferred_currency = CASE WHEN country = 'AR' THEN 'ARS' ELSE 'USD' END;

-- Trigger function: keep preferred_currency in sync with country
CREATE OR REPLACE FUNCTION public.sync_preferred_currency()
RETURNS TRIGGER AS $$
BEGIN
  NEW.preferred_currency := CASE WHEN NEW.country = 'AR' THEN 'ARS' ELSE 'USD' END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_preferred_currency ON public.user_profiles;
CREATE TRIGGER trg_sync_preferred_currency
  BEFORE INSERT OR UPDATE OF country ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_preferred_currency();

-- ============================================
-- 2. is_admin: drop from user_profiles (admin is managed via admin_users table)
-- ============================================
ALTER TABLE public.user_profiles DROP COLUMN IF EXISTS is_admin;
