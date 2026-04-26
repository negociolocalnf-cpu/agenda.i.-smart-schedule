SELECT cron.schedule(
  'birthday-send-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://ixfbobzezfkliwqyudmq.supabase.co/functions/v1/birthday-send-daily',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml4ZmJvYnplemZrbGl3cXl1ZG1xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NTY5MDcsImV4cCI6MjA5MjUzMjkwN30.A2zqshKVkWElqu8-VKmplHznrlPhrVsRt72GkhCI0yI"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);