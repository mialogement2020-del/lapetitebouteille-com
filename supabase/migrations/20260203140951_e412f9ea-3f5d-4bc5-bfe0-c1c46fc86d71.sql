
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Grant usage to postgres role
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- Schedule the stock trend alert to run daily at 8:00 AM UTC
SELECT cron.schedule(
  'daily-stock-trend-alert',
  '0 8 * * *',
  $$
  SELECT
    net.http_post(
        url:='https://bohtgmrlbaxtpwzbxhdq.supabase.co/functions/v1/send-stock-trend-alert',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJvaHRnbXJsYmF4dHB3emJ4aGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4NjQyMTQsImV4cCI6MjA4NTQ0MDIxNH0.2CE8-Bzu3s5Iilg0t776Cthws75ve-xjmHwBgFsIQEc"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);
