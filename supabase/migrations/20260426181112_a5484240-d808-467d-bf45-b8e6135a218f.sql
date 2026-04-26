-- Recreate pg_net in a dedicated extensions schema (it doesn't support SET SCHEMA)
CREATE SCHEMA IF NOT EXISTS extensions;
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;

-- Unschedule existing job that depends on pg_net
DO $$
DECLARE
  jid bigint;
BEGIN
  SELECT jobid INTO jid FROM cron.job WHERE jobname = 'birthday-send-daily-hourly';
  IF jid IS NOT NULL THEN
    PERFORM cron.unschedule(jid);
  END IF;
END $$;

DROP EXTENSION IF EXISTS pg_net;
CREATE EXTENSION pg_net WITH SCHEMA extensions;

-- Re-schedule the hourly cron using the new extension path
SELECT cron.schedule(
  'birthday-send-daily-hourly',
  '0 * * * *',
  $$
  SELECT extensions.http_post(
    url := 'https://ixfbobzezfkliwqyudmq.supabase.co/functions/v1/birthday-send-daily',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- Revoke anon SELECT on all current and future tables/views in public so pg_graphql
-- introspection no longer exposes them. RLS already blocks data access; this also
-- hides table/column names from the public /graphql/v1 endpoint.
REVOKE SELECT ON ALL TABLES IN SCHEMA public FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE SELECT ON TABLES FROM anon;