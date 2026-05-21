
-- Risk score levels enum
CREATE TYPE public.fraud_risk_level AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE public.fraud_review_status AS ENUM ('pending', 'approved', 'rejected', 'auto_blocked');

-- Order risk scores
CREATE TABLE public.order_risk_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL UNIQUE,
  score INTEGER NOT NULL DEFAULT 0,
  risk_level public.fraud_risk_level NOT NULL DEFAULT 'low',
  factors JSONB NOT NULL DEFAULT '[]'::jsonb,
  review_status public.fraud_review_status NOT NULL DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_order_risk_scores_level ON public.order_risk_scores(risk_level, review_status);
CREATE INDEX idx_order_risk_scores_order ON public.order_risk_scores(order_id);

ALTER TABLE public.order_risk_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage risk scores" ON public.order_risk_scores
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Fraud rules
CREATE TABLE public.fraud_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT,
  threshold NUMERIC NOT NULL DEFAULT 0,
  weight INTEGER NOT NULL DEFAULT 10,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.fraud_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage fraud rules" ON public.fraud_rules
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Default rules
INSERT INTO public.fraud_rules (rule_key, label, description, threshold, weight) VALUES
  ('high_amount', 'Montant élevé', 'Commande > seuil FCFA', 500000, 25),
  ('velocity', 'Vitesse de commande', 'Plus de N commandes en 1h', 3, 30),
  ('guest_high_amount', 'Invité montant élevé', 'Commande invité > seuil', 200000, 20),
  ('no_history_high_value', 'Premier achat élevé', 'Premier achat > seuil', 300000, 15),
  ('blocked_entity', 'Entité bloquée', 'Email/téléphone bloqué', 1, 100);

-- Blocked entities
CREATE TABLE public.blocked_entities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('email','phone','ip')),
  entity_value TEXT NOT NULL,
  reason TEXT,
  blocked_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (entity_type, entity_value)
);

CREATE INDEX idx_blocked_entities_lookup ON public.blocked_entities(entity_type, entity_value);

ALTER TABLE public.blocked_entities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage blocked entities" ON public.blocked_entities
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Trigger updated_at
CREATE TRIGGER trg_risk_scores_updated_at
  BEFORE UPDATE ON public.order_risk_scores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_fraud_rules_updated_at
  BEFORE UPDATE ON public.fraud_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Risk score calculation function
CREATE OR REPLACE FUNCTION public.calculate_order_risk_score(_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _o RECORD;
  _score INTEGER := 0;
  _factors JSONB := '[]'::jsonb;
  _level fraud_risk_level;
  _review fraud_review_status := 'pending';
  _r RECORD;
  _recent_count INTEGER;
  _prior_orders INTEGER;
  _blocked BOOLEAN;
BEGIN
  SELECT * INTO _o FROM public.orders WHERE id = _order_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error','order_not_found');
  END IF;

  -- Blocked entities (email or phone)
  SELECT EXISTS (
    SELECT 1 FROM public.blocked_entities
    WHERE (entity_type = 'email' AND entity_value = COALESCE(_o.guest_email, ''))
       OR (entity_type = 'phone' AND entity_value = COALESCE(_o.guest_phone, _o.shipping_phone, ''))
  ) INTO _blocked;

  IF _blocked THEN
    SELECT * INTO _r FROM public.fraud_rules WHERE rule_key = 'blocked_entity' AND is_active;
    IF FOUND THEN
      _score := _score + _r.weight;
      _factors := _factors || jsonb_build_object('rule','blocked_entity','weight',_r.weight);
    END IF;
  END IF;

  -- High amount
  SELECT * INTO _r FROM public.fraud_rules WHERE rule_key = 'high_amount' AND is_active;
  IF FOUND AND _o.total >= _r.threshold THEN
    _score := _score + _r.weight;
    _factors := _factors || jsonb_build_object('rule','high_amount','weight',_r.weight,'value',_o.total);
  END IF;

  -- Velocity: same phone/email in last hour
  SELECT * INTO _r FROM public.fraud_rules WHERE rule_key = 'velocity' AND is_active;
  IF FOUND THEN
    SELECT COUNT(*) INTO _recent_count FROM public.orders o2
    WHERE o2.id <> _order_id
      AND o2.created_at >= now() - interval '1 hour'
      AND (
        (o2.user_id IS NOT NULL AND o2.user_id = _o.user_id)
        OR (o2.guest_phone IS NOT NULL AND o2.guest_phone = _o.guest_phone)
        OR (o2.guest_email IS NOT NULL AND o2.guest_email = _o.guest_email)
      );
    IF _recent_count >= _r.threshold THEN
      _score := _score + _r.weight;
      _factors := _factors || jsonb_build_object('rule','velocity','weight',_r.weight,'count',_recent_count);
    END IF;
  END IF;

  -- Guest high amount
  SELECT * INTO _r FROM public.fraud_rules WHERE rule_key = 'guest_high_amount' AND is_active;
  IF FOUND AND _o.user_id IS NULL AND _o.total >= _r.threshold THEN
    _score := _score + _r.weight;
    _factors := _factors || jsonb_build_object('rule','guest_high_amount','weight',_r.weight,'value',_o.total);
  END IF;

  -- First high-value order
  SELECT * INTO _r FROM public.fraud_rules WHERE rule_key = 'no_history_high_value' AND is_active;
  IF FOUND AND _o.total >= _r.threshold THEN
    SELECT COUNT(*) INTO _prior_orders FROM public.orders o2
    WHERE o2.id <> _order_id
      AND (
        (o2.user_id IS NOT NULL AND o2.user_id = _o.user_id)
        OR (o2.guest_email IS NOT NULL AND o2.guest_email = _o.guest_email)
      );
    IF _prior_orders = 0 THEN
      _score := _score + _r.weight;
      _factors := _factors || jsonb_build_object('rule','no_history_high_value','weight',_r.weight);
    END IF;
  END IF;

  -- Cap score 0..100
  IF _score > 100 THEN _score := 100; END IF;

  -- Determine level
  _level := CASE
    WHEN _score >= 80 THEN 'critical'
    WHEN _score >= 50 THEN 'high'
    WHEN _score >= 25 THEN 'medium'
    ELSE 'low'
  END;

  IF _level = 'critical' THEN _review := 'auto_blocked'; END IF;

  INSERT INTO public.order_risk_scores (order_id, score, risk_level, factors, review_status)
  VALUES (_order_id, _score, _level, _factors, _review)
  ON CONFLICT (order_id) DO UPDATE
    SET score = EXCLUDED.score,
        risk_level = EXCLUDED.risk_level,
        factors = EXCLUDED.factors,
        review_status = EXCLUDED.review_status,
        updated_at = now();

  RETURN jsonb_build_object('score',_score,'level',_level,'factors',_factors);
END;
$$;

-- Trigger on new orders
CREATE OR REPLACE FUNCTION public.trg_score_new_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.calculate_order_risk_score(NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_orders_risk_score
  AFTER INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.trg_score_new_order();
