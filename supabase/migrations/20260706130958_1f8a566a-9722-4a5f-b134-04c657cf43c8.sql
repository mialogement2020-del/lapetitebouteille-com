-- Étape 5: Moteur de scoring anti-fraude automatique

CREATE OR REPLACE FUNCTION public.compute_order_risk_score(_order_id uuid)
RETURNS TABLE(score int, risk_level text, factors jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  o RECORD;
  r RECORD;
  total_score int := 0;
  factors_arr jsonb := '[]'::jsonb;
  velocity_count int;
  history_count int;
  computed_level text;
BEGIN
  SELECT * INTO o FROM orders WHERE id = _order_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  FOR r IN SELECT * FROM fraud_rules WHERE is_active = true LOOP
    CASE r.rule_key
      WHEN 'blocked_entity' THEN
        IF EXISTS (
          SELECT 1 FROM blocked_entities
          WHERE (entity_type = 'email' AND entity_value = COALESCE(o.guest_email, ''))
             OR (entity_type = 'phone' AND entity_value = COALESCE(o.guest_phone, ''))
        ) THEN
          total_score := total_score + r.weight;
          factors_arr := factors_arr || jsonb_build_object('rule', r.rule_key, 'weight', r.weight);
        END IF;

      WHEN 'velocity' THEN
        SELECT count(*) INTO velocity_count FROM orders
          WHERE created_at > now() - interval '1 hour'
            AND id <> o.id
            AND (
              (o.user_id IS NOT NULL AND user_id = o.user_id)
              OR (o.guest_email IS NOT NULL AND guest_email = o.guest_email)
              OR (o.guest_phone IS NOT NULL AND guest_phone = o.guest_phone)
            );
        IF velocity_count >= r.threshold THEN
          total_score := total_score + r.weight;
          factors_arr := factors_arr || jsonb_build_object('rule', r.rule_key, 'weight', r.weight, 'count', velocity_count);
        END IF;

      WHEN 'high_amount' THEN
        IF COALESCE(o.total, 0) >= r.threshold THEN
          total_score := total_score + r.weight;
          factors_arr := factors_arr || jsonb_build_object('rule', r.rule_key, 'weight', r.weight, 'value', o.total);
        END IF;

      WHEN 'guest_high_amount' THEN
        IF o.user_id IS NULL AND COALESCE(o.total, 0) >= r.threshold THEN
          total_score := total_score + r.weight;
          factors_arr := factors_arr || jsonb_build_object('rule', r.rule_key, 'weight', r.weight, 'value', o.total);
        END IF;

      WHEN 'no_history_high_value' THEN
        IF o.user_id IS NOT NULL AND COALESCE(o.total, 0) >= r.threshold THEN
          SELECT count(*) INTO history_count FROM orders
            WHERE user_id = o.user_id AND id <> o.id;
          IF history_count = 0 THEN
            total_score := total_score + r.weight;
            factors_arr := factors_arr || jsonb_build_object('rule', r.rule_key, 'weight', r.weight, 'value', o.total);
          END IF;
        END IF;

      ELSE NULL;
    END CASE;
  END LOOP;

  computed_level := CASE
    WHEN total_score >= 80 THEN 'critical'
    WHEN total_score >= 50 THEN 'high'
    WHEN total_score >= 25 THEN 'medium'
    ELSE 'low'
  END;

  RETURN QUERY SELECT total_score, computed_level, factors_arr;
END;
$$;

CREATE OR REPLACE FUNCTION public.score_order_risk(_order_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s int;
  lvl text;
  fac jsonb;
  auto_status text;
  row_id uuid;
BEGIN
  SELECT * FROM compute_order_risk_score(_order_id) INTO s, lvl, fac;
  IF s IS NULL THEN RETURN NULL; END IF;

  auto_status := CASE WHEN lvl = 'critical' THEN 'auto_blocked' ELSE 'pending' END;

  INSERT INTO order_risk_scores (order_id, score, risk_level, factors, review_status)
  VALUES (_order_id, s, lvl::risk_level, fac, auto_status::review_status)
  ON CONFLICT (order_id) DO UPDATE SET
    score = EXCLUDED.score,
    risk_level = EXCLUDED.risk_level,
    factors = EXCLUDED.factors,
    updated_at = now()
  RETURNING id INTO row_id;

  RETURN row_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_score_order_risk()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM score_order_risk(NEW.id);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

-- Ensure unique constraint for upsert
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'order_risk_scores_order_id_key'
  ) THEN
    ALTER TABLE order_risk_scores ADD CONSTRAINT order_risk_scores_order_id_key UNIQUE (order_id);
  END IF;
END $$;

DROP TRIGGER IF EXISTS trg_score_order_risk_after_insert ON orders;
CREATE TRIGGER trg_score_order_risk_after_insert
AFTER INSERT ON orders
FOR EACH ROW EXECUTE FUNCTION trg_score_order_risk();

GRANT EXECUTE ON FUNCTION public.compute_order_risk_score(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.score_order_risk(uuid) TO service_role, authenticated;
