-- Update get_admin_users RPC to include last_sign_in_at from auth.users
CREATE OR REPLACE FUNCTION public.get_admin_users()
RETURNS TABLE (
  user_id         UUID,
  email           TEXT,
  name            TEXT,
  last_name       TEXT,
  country         TEXT,
  created_at      TIMESTAMPTZ,
  last_sign_in_at TIMESTAMPTZ
) AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acceso denegado';
  END IF;

  RETURN QUERY
  SELECT
    up.user_id,
    au.email::TEXT,
    up.name,
    up.last_name,
    up.country,
    up.created_at,
    au.last_sign_in_at
  FROM public.user_profiles up
  JOIN auth.users au ON au.id = up.user_id
  ORDER BY up.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
