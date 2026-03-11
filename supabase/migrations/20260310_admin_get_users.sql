-- RPC function for admin: returns all users with email from auth.users
-- SECURITY DEFINER allows reading auth.users; is_admin() check prevents non-admin access
CREATE OR REPLACE FUNCTION public.get_admin_users()
RETURNS TABLE (
  user_id       UUID,
  email         TEXT,
  name          TEXT,
  last_name     TEXT,
  country       TEXT,
  created_at    TIMESTAMPTZ
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
    up.created_at
  FROM public.user_profiles up
  JOIN auth.users au ON au.id = up.user_id
  ORDER BY up.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
