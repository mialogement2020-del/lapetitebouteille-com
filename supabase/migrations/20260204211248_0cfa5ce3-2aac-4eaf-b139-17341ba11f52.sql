-- Update the referral notification trigger to also send push notification
CREATE OR REPLACE FUNCTION public.notify_new_referral()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'net', 'extensions'
AS $$
DECLARE
  referred_name TEXT;
  function_url TEXT := 'https://bohtgmrlbaxtpwzbxhdq.supabase.co/functions/v1/send-ambassador-push';
  anon_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJvaHRnbXJsYmF4dHB3emJ4aGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4NjQyMTQsImV4cCI6MjA4NTQ0MDIxNH0.2CE8-Bzu3s5Iilg0t776Cthws75ve-xjmHwBgFsIQEc';
  notif_title TEXT;
  notif_body TEXT;
BEGIN
  -- Get the referred user's name
  SELECT COALESCE(first_name || ' ' || last_name, email, 'Un nouveau membre')
  INTO referred_name
  FROM profiles
  WHERE id = NEW.referred_id;

  notif_title := '👥 Nouveau filleul !';
  notif_body := 'Félicitations ! ' || COALESCE(referred_name, 'Un nouveau membre') || ' a rejoint votre réseau.';

  -- Create in-app notification
  INSERT INTO user_notifications (user_id, type, title, message, reference_id, reference_type)
  VALUES (
    NEW.referrer_id,
    'referral',
    notif_title,
    notif_body,
    NEW.referred_id,
    'referral'
  );

  -- Send push notification via edge function
  PERFORM net.http_post(
    url := function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || anon_key
    ),
    body := jsonb_build_object(
      'userId', NEW.referrer_id,
      'type', 'referral',
      'title', notif_title,
      'body', notif_body,
      'data', jsonb_build_object('referredId', NEW.referred_id)
    )::jsonb
  );

  RETURN NEW;
END;
$$;

-- Update the rank change notification trigger to also send push notification
CREATE OR REPLACE FUNCTION public.notify_rank_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'net', 'extensions'
AS $$
DECLARE
  rank_display TEXT;
  rank_color TEXT;
  function_url TEXT := 'https://bohtgmrlbaxtpwzbxhdq.supabase.co/functions/v1/send-ambassador-push';
  anon_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJvaHRnbXJsYmF4dHB3emJ4aGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4NjQyMTQsImV4cCI6MjA4NTQ0MDIxNH0.2CE8-Bzu3s5Iilg0t776Cthws75ve-xjmHwBgFsIQEc';
  notif_title TEXT;
  notif_body TEXT;
BEGIN
  -- Only notify if rank actually changed
  IF OLD.current_rank IS DISTINCT FROM NEW.current_rank THEN
    -- Get rank display name
    SELECT display_name, badge_color
    INTO rank_display, rank_color
    FROM rank_config
    WHERE rank = NEW.current_rank;

    notif_title := '🏆 Nouveau rang atteint !';
    notif_body := 'Félicitations ! Vous êtes maintenant ' || COALESCE(rank_display, NEW.current_rank::text) || '. Continuez ainsi pour débloquer plus d''avantages !';

    -- Create in-app notification
    INSERT INTO user_notifications (user_id, type, title, message, reference_type)
    VALUES (
      NEW.user_id,
      'bonus',
      notif_title,
      notif_body,
      'rank_upgrade'
    );

    -- Send push notification
    PERFORM net.http_post(
      url := function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || anon_key
      ),
      body := jsonb_build_object(
        'userId', NEW.user_id,
        'type', 'rank',
        'title', notif_title,
        'body', notif_body,
        'data', jsonb_build_object('newRank', NEW.current_rank, 'oldRank', OLD.current_rank)
      )::jsonb
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Update the bonus notification trigger to also send push notification
CREATE OR REPLACE FUNCTION public.notify_new_bonus()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'net', 'extensions'
AS $$
DECLARE
  function_url TEXT := 'https://bohtgmrlbaxtpwzbxhdq.supabase.co/functions/v1/send-ambassador-push';
  anon_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJvaHRnbXJsYmF4dHB3emJ4aGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4NjQyMTQsImV4cCI6MjA4NTQ0MDIxNH0.2CE8-Bzu3s5Iilg0t776Cthws75ve-xjmHwBgFsIQEc';
  notif_title TEXT;
  notif_body TEXT;
BEGIN
  notif_title := '🎁 Bonus reçu !';
  notif_body := 'Vous avez reçu un bonus ' || NEW.bonus_name || ' de ' || NEW.amount || ' FCFA. ' || COALESCE(NEW.trigger_condition, '');

  -- Create in-app notification
  INSERT INTO user_notifications (user_id, type, title, message, reference_id, reference_type)
  VALUES (
    NEW.user_id,
    'bonus',
    notif_title,
    notif_body,
    NEW.id,
    'bonus'
  );

  -- Send push notification
  PERFORM net.http_post(
    url := function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || anon_key
    ),
    body := jsonb_build_object(
      'userId', NEW.user_id,
      'type', 'bonus',
      'title', notif_title,
      'body', notif_body,
      'data', jsonb_build_object('bonusId', NEW.id, 'amount', NEW.amount)
    )::jsonb
  );

  RETURN NEW;
END;
$$;