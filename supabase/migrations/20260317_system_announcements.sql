-- System announcements: admin-created notifications for all users (new features, maintenance, etc.)
CREATE TABLE IF NOT EXISTS public.system_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  action_url TEXT,
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'success', 'error')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Track which announcements each user has dismissed
CREATE TABLE IF NOT EXISTS public.user_announcement_reads (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  announcement_id UUID NOT NULL REFERENCES public.system_announcements(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, announcement_id)
);

-- RLS
ALTER TABLE public.system_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_announcement_reads ENABLE ROW LEVEL SECURITY;

-- Admins can manage announcements
CREATE POLICY "Admins manage announcements"
  ON public.system_announcements FOR ALL
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));

-- Authenticated users can read active announcements
CREATE POLICY "Users read active announcements"
  ON public.system_announcements FOR SELECT
  TO authenticated
  USING (
    is_active = true
    AND published_at <= now()
    AND (expires_at IS NULL OR expires_at > now())
  );

-- Users manage their own reads
CREATE POLICY "Users manage own reads"
  ON public.user_announcement_reads FOR ALL
  USING (user_id = auth.uid());
