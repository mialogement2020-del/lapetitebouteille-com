-- Make final order status transitions resilient.
-- Delivered and cancelled statuses trigger several secondary systems
-- (loyalty, trust score, MLM reversal, orchestration). Those systems must not
-- prevent the primary admin status update from succeeding.

CREATE OR REPLACE FUNCTION public.award_loyalty_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _config record;
  _current_balance integer;
  _points_to_award integer;
  _new_balance integer;
  _is_first_order boolean;
BEGIN
  IF NEW.status = 'delivered' AND OLD.status IS DISTINCT FROM 'delivered' AND NEW.user_id IS NOT NULL THEN
    BEGIN
      SELECT * INTO _config
      FROM public.loyalty_config
      WHERE is_active = true
      LIMIT 1;

      IF _config IS NULL THEN
        RETURN NEW;
      END IF;

      _points_to_award := FLOOR(NEW.total / _config.fcfa_per_point) * _config.points_per_fcfa;

      SELECT COUNT(*) = 1 INTO _is_first_order
      FROM public.orders
      WHERE user_id = NEW.user_id
        AND status = 'delivered';

      IF _is_first_order THEN
        _points_to_award := _points_to_award + _config.welcome_bonus;
      END IF;

      INSERT INTO public.user_loyalty (user_id, total_points, lifetime_points)
      VALUES (NEW.user_id, 0, 0)
      ON CONFLICT (user_id) DO NOTHING;

      SELECT total_points INTO _current_balance
      FROM public.user_loyalty
      WHERE user_id = NEW.user_id
      FOR UPDATE;

      _new_balance := COALESCE(_current_balance, 0) + _points_to_award;

      UPDATE public.user_loyalty
      SET
        total_points = _new_balance,
        lifetime_points = lifetime_points + _points_to_award,
        updated_at = now(),
        tier = CASE
          WHEN lifetime_points + _points_to_award >= 10000 THEN 'platinum'
          WHEN lifetime_points + _points_to_award >= 5000 THEN 'gold'
          WHEN lifetime_points + _points_to_award >= 2000 THEN 'silver'
          ELSE 'bronze'
        END
      WHERE user_id = NEW.user_id;

      INSERT INTO public.loyalty_transactions (
        user_id,
        points,
        type,
        description,
        reference_type,
        reference_id,
        balance_after
      ) VALUES (
        NEW.user_id,
        _points_to_award,
        CASE WHEN _is_first_order THEN 'welcome' ELSE 'purchase' END,
        CASE WHEN _is_first_order
          THEN format('Commande %s + Bonus bienvenue', NEW.order_number)
          ELSE format('Commande %s', NEW.order_number)
        END,
        'order',
        NEW.id,
        _new_balance
      );

      NEW.loyalty_points_earned := _points_to_award;
    EXCEPTION
      WHEN others THEN
        RAISE WARNING 'Loyalty award skipped for order %: %', NEW.id, SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trust_signal_on_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    IF NEW.status = 'delivered'
       AND OLD.status IS DISTINCT FROM 'delivered'
       AND NEW.user_id IS NOT NULL THEN
      PERFORM public.record_trust_signal(
        NEW.user_id,
        'customer',
        'order_completed',
        2,
        1,
        'orders',
        jsonb_build_object('order_id', NEW.id)
      );
    ELSIF NEW.status = 'cancelled'
       AND OLD.status IS DISTINCT FROM 'cancelled'
       AND NEW.user_id IS NOT NULL THEN
      PERFORM public.record_trust_signal(
        NEW.user_id,
        'customer',
        'order_cancelled',
        1,
        -1,
        'orders',
        jsonb_build_object('order_id', NEW.id)
      );
    END IF;
  EXCEPTION
    WHEN others THEN
      RAISE WARNING 'Trust signal skipped for order %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.event_order_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    IF TG_OP = 'INSERT' THEN
      PERFORM public.publish_event(
        'order.created',
        'order',
        NEW.id::text,
        jsonb_build_object(
          'order_number', NEW.order_number,
          'total', NEW.total,
          'user_id', NEW.user_id,
          'status', NEW.status,
          'payment_method', NEW.payment_method,
          'referrer_id', NEW.referrer_id
        ),
        'orders_table',
        NEW.user_id
      );
    ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
      PERFORM public.publish_event(
        'order.status_changed',
        'order',
        NEW.id::text,
        jsonb_build_object(
          'order_number', NEW.order_number,
          'previous_status', OLD.status,
          'new_status', NEW.status,
          'total', NEW.total,
          'user_id', NEW.user_id
        ),
        'orders_table',
        auth.uid()
      );
    END IF;
  EXCEPTION
    WHEN others THEN
      RAISE WARNING 'Domain event skipped for order %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_generate_commissions_on_paid_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.payment_status = 'completed'
     AND NEW.status <> 'cancelled'
     AND NEW.referrer_id IS NOT NULL
     AND (TG_OP = 'INSERT' OR OLD.payment_status IS DISTINCT FROM NEW.payment_status) THEN
    BEGIN
      PERFORM public.generate_mlm_commissions(NEW.id, NEW.referrer_id, NEW.total);
    EXCEPTION
      WHEN others THEN
        RAISE WARNING 'MLM commission generation skipped for order %: %', NEW.id, SQLERRM;
    END;
  END IF;

  IF (NEW.payment_status = 'refunded' OR NEW.status = 'cancelled')
     AND TG_OP = 'UPDATE'
     AND (OLD.payment_status IS DISTINCT FROM NEW.payment_status OR OLD.status IS DISTINCT FROM NEW.status) THEN
    BEGIN
      PERFORM public.reverse_mlm_commissions_for_order(NEW.id);
    EXCEPTION
      WHEN others THEN
        RAISE WARNING 'MLM commission reversal skipped for order %: %', NEW.id, SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_generate_commissions_on_paid_order ON public.orders;
CREATE TRIGGER trg_generate_commissions_on_paid_order
AFTER INSERT OR UPDATE OF payment_status, status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.trg_generate_commissions_on_paid_order();

NOTIFY pgrst, 'reload schema';
