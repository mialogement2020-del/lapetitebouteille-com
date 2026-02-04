-- Function to notify referrer when a new referral is created
CREATE OR REPLACE FUNCTION public.notify_new_referral()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  referred_name TEXT;
BEGIN
  -- Get the referred user's name
  SELECT COALESCE(first_name || ' ' || last_name, email, 'Un nouveau membre')
  INTO referred_name
  FROM profiles
  WHERE id = NEW.referred_id;

  -- Create notification for the referrer
  INSERT INTO user_notifications (user_id, type, title, message, reference_id, reference_type)
  VALUES (
    NEW.referrer_id,
    'referral',
    '👥 Nouveau filleul !',
    'Félicitations ! ' || COALESCE(referred_name, 'Un nouveau membre') || ' a rejoint votre réseau.',
    NEW.referred_id,
    'referral'
  );

  RETURN NEW;
END;
$$;

-- Trigger for new referrals
DROP TRIGGER IF EXISTS trigger_notify_new_referral ON referral_relationships;
CREATE TRIGGER trigger_notify_new_referral
AFTER INSERT ON referral_relationships
FOR EACH ROW
EXECUTE FUNCTION notify_new_referral();

-- Function to notify user when their rank changes
CREATE OR REPLACE FUNCTION public.notify_rank_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  rank_display TEXT;
  rank_color TEXT;
BEGIN
  -- Only notify if rank actually changed
  IF OLD.current_rank IS DISTINCT FROM NEW.current_rank THEN
    -- Get rank display name
    SELECT display_name, badge_color
    INTO rank_display, rank_color
    FROM rank_config
    WHERE rank = NEW.current_rank;

    -- Create notification for rank upgrade
    INSERT INTO user_notifications (user_id, type, title, message, reference_type)
    VALUES (
      NEW.user_id,
      'bonus',
      '🏆 Nouveau rang atteint !',
      'Félicitations ! Vous êtes maintenant ' || COALESCE(rank_display, NEW.current_rank::text) || '. Continuez ainsi pour débloquer plus d''avantages !',
      'rank_upgrade'
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger for rank changes
DROP TRIGGER IF EXISTS trigger_notify_rank_change ON user_ranks;
CREATE TRIGGER trigger_notify_rank_change
AFTER UPDATE ON user_ranks
FOR EACH ROW
EXECUTE FUNCTION notify_rank_change();

-- Function to notify user when they receive a bonus
CREATE OR REPLACE FUNCTION public.notify_new_bonus()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Create notification for the bonus
  INSERT INTO user_notifications (user_id, type, title, message, reference_id, reference_type)
  VALUES (
    NEW.user_id,
    'bonus',
    '🎁 Bonus reçu !',
    'Vous avez reçu un bonus ' || NEW.bonus_name || ' de ' || NEW.amount || ' FCFA. ' || COALESCE(NEW.trigger_condition, ''),
    NEW.id,
    'bonus'
  );

  RETURN NEW;
END;
$$;

-- Trigger for new bonuses
DROP TRIGGER IF EXISTS trigger_notify_new_bonus ON mlm_bonuses;
CREATE TRIGGER trigger_notify_new_bonus
AFTER INSERT ON mlm_bonuses
FOR EACH ROW
EXECUTE FUNCTION notify_new_bonus();