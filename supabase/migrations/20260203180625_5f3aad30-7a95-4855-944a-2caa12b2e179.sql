-- Create a scheduled job to send weekly stock report every Monday at 8:00 AM
SELECT cron.schedule(
  'send-weekly-stock-report',
  '0 8 * * 1', -- Every Monday at 8:00 AM
  $$
  SELECT net.http_post(
    url := 'https://bohtgmrlbaxtpwzbxhdq.supabase.co/functions/v1/send-weekly-stock-report',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJvaHRnbXJsYmF4dHB3emJ4aGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4NjQyMTQsImV4cCI6MjA4NTQ0MDIxNH0.2CE8-Bzu3s5Iilg0t776Cthws75ve-xjmHwBgFsIQEc'
    ),
    body := '{}'::jsonb
  );
  $$
);