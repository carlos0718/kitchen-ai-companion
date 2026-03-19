-- Weekly Digest Cron Job
-- Runs every Sunday at 20:00 UTC (= 17:00 Argentina time)
-- Requires pg_cron and pg_net extensions (already available in Supabase)

-- NOTE: Replace <SUPABASE_URL> and <CRON_SECRET> with your actual values,
-- OR configure in Supabase Dashboard > Database > Cron Jobs (recommended)

-- Remove existing job if present
SELECT cron.unschedule('agent-weekly-digest') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'agent-weekly-digest'
);

-- Schedule: every Sunday at 20:00 UTC
SELECT cron.schedule(
  'agent-weekly-digest',
  '0 20 * * 0',
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url', true) || '/functions/v1/agent-weekly-digest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.cron_secret', true)
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- To set the config variables, run:
-- ALTER DATABASE postgres SET app.supabase_url = 'https://YOUR_PROJECT.supabase.co';
-- ALTER DATABASE postgres SET app.cron_secret = 'YOUR_CRON_SECRET';
