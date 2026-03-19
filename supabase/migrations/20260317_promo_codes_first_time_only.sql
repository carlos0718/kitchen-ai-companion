-- Add first_time_only flag to promo_codes
ALTER TABLE public.promo_codes
  ADD COLUMN IF NOT EXISTS first_time_only BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.promo_codes.first_time_only IS
  'Si es true, solo usuarios que nunca tuvieron una suscripción pueden canjear este cupón';
