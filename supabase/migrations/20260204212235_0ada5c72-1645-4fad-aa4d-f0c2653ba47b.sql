-- Create function to notify commission with push notifications
CREATE OR REPLACE FUNCTION public.notify_new_commission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'net', 'extensions'
AS $function$
DECLARE
  purchaser_name TEXT;
  function_url TEXT := 'https://bohtgmrlbaxtpwzbxhdq.supabase.co/functions/v1/send-ambassador-push';
  anon_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJvaHRnbXJsYmF4dHB3emJ4aGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4NjQyMTQsImV4cCI6MjA4NTQ0MDIxNH0.2CE8-Bzu3s5Iilg0t776Cthws75ve-xjmHwBgFsIQEc';
  notif_title TEXT;
  notif_body TEXT;
  level_text TEXT;
BEGIN
  -- Get purchaser name if available
  IF NEW.purchaser_id IS NOT NULL THEN
    SELECT COALESCE(first_name || ' ' || last_name, email, 'Un client')
    INTO purchaser_name
    FROM profiles
    WHERE id = NEW.purchaser_id;
  ELSE
    purchaser_name := 'Un client';
  END IF;

  -- Set level text
  CASE NEW.level
    WHEN 1 THEN level_text := 'direct';
    WHEN 2 THEN level_text := 'niveau 2';
    WHEN 3 THEN level_text := 'niveau 3';
    ELSE level_text := 'niveau ' || NEW.level;
  END CASE;

  notif_title := '💰 Nouvelle commission !';
  notif_body := 'Vous avez gagné ' || NEW.commission_amount || ' FCFA (' || NEW.commission_rate || '%) sur une commande ' || level_text || '.';

  -- Create in-app notification
  INSERT INTO user_notifications (user_id, type, title, message, reference_id, reference_type)
  VALUES (
    NEW.beneficiary_id,
    'commission',
    notif_title,
    notif_body,
    NEW.id,
    'commission'
  );

  -- Send push notification via edge function
  PERFORM net.http_post(
    url := function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || anon_key
    ),
    body := jsonb_build_object(
      'userId', NEW.beneficiary_id,
      'type', 'commission',
      'title', notif_title,
      'body', notif_body,
      'data', jsonb_build_object(
        'commissionId', NEW.id,
        'amount', NEW.commission_amount,
        'level', NEW.level
      )
    )::jsonb
  );

  RETURN NEW;
END;
$function$;

-- Create the trigger on commissions table
DROP TRIGGER IF EXISTS on_new_commission ON public.commissions;
CREATE TRIGGER on_new_commission
  AFTER INSERT ON public.commissions
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_commission();