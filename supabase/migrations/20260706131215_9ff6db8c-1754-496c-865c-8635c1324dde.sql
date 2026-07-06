-- Étape 6: Automation escrows (mise en attente, capture, remboursement, libération auto)

-- 1) Créer un escrow automatiquement quand un paiement réussit
CREATE OR REPLACE FUNCTION public.create_escrow_from_payment(_intent_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pi RECORD;
  o RECORD;
  rs RECORD;
  new_status text;
  new_reason text;
  escrow_id uuid;
BEGIN
  SELECT * INTO pi FROM payment_intents WHERE id = _intent_id;
  IF NOT FOUND OR pi.status <> 'succeeded' OR pi.order_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT * INTO o FROM orders WHERE id = pi.order_id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  -- Skip if escrow already exists for this order
  SELECT id INTO escrow_id FROM order_escrows WHERE order_id = pi.order_id LIMIT 1;
  IF FOUND THEN RETURN escrow_id; END IF;

  -- Décision hold vs captured selon risk score
  SELECT * INTO rs FROM order_risk_scores WHERE order_id = pi.order_id;

  IF rs.risk_level IN ('critical','high') OR rs.review_status = 'auto_blocked' THEN
    new_status := 'held';
    new_reason := 'risk_' || COALESCE(rs.risk_level::text, 'unknown');
  ELSE
    new_status := 'held'; -- Toujours held jusqu'à livraison
    new_reason := 'awaiting_delivery';
  END IF;

  INSERT INTO order_escrows (
    order_id, buyer_id, amount, currency, status, hold_reason, held_at, metadata
  ) VALUES (
    pi.order_id, o.user_id, pi.amount, COALESCE(pi.currency, 'XAF'),
    new_status, new_reason, now(),
    jsonb_build_object('payment_intent_id', pi.id, 'risk_level', rs.risk_level)
  )
  RETURNING id INTO escrow_id;

  RETURN escrow_id;
END;
$$;

-- 2) Capturer (libérer au vendeur) un escrow
CREATE OR REPLACE FUNCTION public.capture_escrow(_escrow_id uuid, _reason text DEFAULT 'delivered')
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  e RECORD;
BEGIN
  SELECT * INTO e FROM order_escrows WHERE id = _escrow_id FOR UPDATE;
  IF NOT FOUND OR e.status NOT IN ('held','pending') THEN RETURN false; END IF;

  UPDATE order_escrows SET
    status = 'captured',
    captured_amount = amount - COALESCE(refunded_amount, 0),
    captured_at = now(),
    release_reason = _reason,
    updated_at = now()
  WHERE id = _escrow_id;

  RETURN true;
END;
$$;

-- 3) Rembourser (total/partiel)
CREATE OR REPLACE FUNCTION public.refund_escrow(_escrow_id uuid, _amount numeric, _reason text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  e RECORD;
  new_refund numeric;
BEGIN
  SELECT * INTO e FROM order_escrows WHERE id = _escrow_id FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  IF e.status = 'refunded' THEN RETURN false; END IF;

  new_refund := COALESCE(e.refunded_amount, 0) + _amount;
  IF new_refund > e.amount THEN RETURN false; END IF;

  UPDATE order_escrows SET
    refunded_amount = new_refund,
    refunded_at = now(),
    status = CASE WHEN new_refund >= amount THEN 'refunded' ELSE status END,
    release_reason = COALESCE(release_reason, '') || ' | refund:' || _reason,
    updated_at = now()
  WHERE id = _escrow_id;

  RETURN true;
END;
$$;

-- 4) Libération auto des escrows livrés depuis > 7 jours
CREATE OR REPLACE FUNCTION public.auto_release_delivered_escrows()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  released int := 0;
  e RECORD;
BEGIN
  FOR e IN
    SELECT esc.id FROM order_escrows esc
    JOIN orders o ON o.id = esc.order_id
    WHERE esc.status = 'held'
      AND o.status = 'delivered'
      AND o.updated_at < now() - interval '7 days'
    LIMIT 500
  LOOP
    IF capture_escrow(e.id, 'auto_release_after_delivery') THEN
      released := released + 1;
    END IF;
  END LOOP;
  RETURN released;
END;
$$;

-- 5) Trigger: création escrow quand payment_intent passe à succeeded
CREATE OR REPLACE FUNCTION public.trg_create_escrow_on_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'succeeded' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    PERFORM create_escrow_from_payment(NEW.id);
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_escrow_on_payment ON payment_intents;
CREATE TRIGGER trg_create_escrow_on_payment
AFTER INSERT OR UPDATE OF status ON payment_intents
FOR EACH ROW EXECUTE FUNCTION trg_create_escrow_on_payment();

-- 6) Trigger: libération auto quand order passe à delivered (sans attente 7j si admin veut immédiat, ici on marque juste)
-- La libération immédiate se fait via auto_release_delivered_escrows() en cron.

GRANT EXECUTE ON FUNCTION public.create_escrow_from_payment(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.capture_escrow(uuid, text) TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.refund_escrow(uuid, numeric, text) TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.auto_release_delivered_escrows() TO service_role;
