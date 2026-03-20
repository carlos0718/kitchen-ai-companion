-- Welcome notification trigger + BIENVENIDO7 promo code seed
-- Fires when a user completes onboarding (onboarding_completed flips to true)

-- =====================================================
-- 1. Seed BIENVENIDO7 promo code (idempotent)
-- =====================================================
INSERT INTO public.promo_codes (code, type, value, applicable_plan, max_uses, is_active, description)
VALUES (
  'BIENVENIDO7',
  'free_trial',
  7,
  NULL,          -- applicable to any plan
  99999,         -- effectively unlimited for a welcome code
  true,
  'Código de bienvenida — 7 días gratis de Premium para nuevos usuarios'
)
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- 2. Trigger: send welcome notification on onboarding complete
-- =====================================================

CREATE OR REPLACE FUNCTION public.notify_onboarding_complete()
RETURNS TRIGGER AS $$
BEGIN
  -- Fire on INSERT with onboarding_completed = true
  -- OR on UPDATE when onboarding_completed flips from false/null to true
  IF (TG_OP = 'INSERT' AND NEW.onboarding_completed = true)
  OR (TG_OP = 'UPDATE' AND (OLD.onboarding_completed IS DISTINCT FROM true) AND NEW.onboarding_completed = true)
  THEN
    INSERT INTO public.user_notifications (user_id, type, title, message, severity, action_url)
    VALUES (
      NEW.user_id,
      'welcome',
      '¡Bienvenido/a a Chef AI! 🎁',
      'Para celebrar tu llegada, tenés 7 días gratis de Premium. Usá el código BIENVENIDO7 en la sección de planes. ¡Disfrutá todas las funcionalidades!',
      'success',
      '/chat'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_onboarding_complete ON public.user_profiles;

CREATE TRIGGER trg_notify_onboarding_complete
  AFTER INSERT OR UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_onboarding_complete();
