
-- =============================================================
-- P4.5.1 — Pricing Management System
-- Portée : prix catalogue uniquement. Aucun impact P0 financier.
-- =============================================================

-- Enums
DO $$ BEGIN
  CREATE TYPE public.pricing_scope AS ENUM ('global','category','brand','supplier','product');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.pricing_action AS ENUM ('margin_update','price_recalc','rollback','simulation');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =============================================================
-- Table : pricing_margin_rules
-- =============================================================
CREATE TABLE IF NOT EXISTS public.pricing_margin_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope public.pricing_scope NOT NULL,
  scope_id UUID,
  margin_retail_percent NUMERIC(6,2) NOT NULL DEFAULT 0,
  margin_wholesale_percent NUMERIC(6,2) NOT NULL DEFAULT 0,
  priority INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT pricing_margin_rules_scope_id_check CHECK (
    (scope = 'global' AND scope_id IS NULL)
    OR (scope <> 'global' AND scope_id IS NOT NULL)
  ),
  CONSTRAINT pricing_margin_rules_unique_active UNIQUE (scope, scope_id)
);

CREATE INDEX IF NOT EXISTS idx_pricing_margin_rules_scope ON public.pricing_margin_rules(scope, scope_id);
CREATE INDEX IF NOT EXISTS idx_pricing_margin_rules_active ON public.pricing_margin_rules(is_active) WHERE is_active;

GRANT SELECT ON public.pricing_margin_rules TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.pricing_margin_rules TO authenticated;
GRANT ALL ON public.pricing_margin_rules TO service_role;

ALTER TABLE public.pricing_margin_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pricing_rules_read" ON public.pricing_margin_rules;
CREATE POLICY "pricing_rules_read" ON public.pricing_margin_rules
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "pricing_rules_write_admin" ON public.pricing_margin_rules;
CREATE POLICY "pricing_rules_write_admin" ON public.pricing_margin_rules
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Priority trigger
CREATE OR REPLACE FUNCTION public.pricing_margin_rules_set_priority()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.priority := CASE NEW.scope
    WHEN 'product' THEN 5
    WHEN 'brand' THEN 4
    WHEN 'supplier' THEN 3
    WHEN 'category' THEN 2
    ELSE 1
  END;
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_pricing_margin_rules_priority ON public.pricing_margin_rules;
CREATE TRIGGER trg_pricing_margin_rules_priority
  BEFORE INSERT OR UPDATE ON public.pricing_margin_rules
  FOR EACH ROW EXECUTE FUNCTION public.pricing_margin_rules_set_priority();

-- =============================================================
-- Table : pricing_history (append-only)
-- =============================================================
CREATE TABLE IF NOT EXISTS public.pricing_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action public.pricing_action NOT NULL,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  scope public.pricing_scope,
  scope_id UUID,
  old_margin_retail NUMERIC(6,2),
  new_margin_retail NUMERIC(6,2),
  old_margin_wholesale NUMERIC(6,2),
  new_margin_wholesale NUMERIC(6,2),
  affected_products JSONB NOT NULL DEFAULT '[]'::jsonb,
  affected_count INTEGER NOT NULL DEFAULT 0,
  avg_old_price NUMERIC(12,2),
  avg_new_price NUMERIC(12,2),
  total_impact NUMERIC(14,2),
  reason TEXT,
  parent_history_id UUID REFERENCES public.pricing_history(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pricing_history_created_at ON public.pricing_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pricing_history_actor ON public.pricing_history(actor_id);
CREATE INDEX IF NOT EXISTS idx_pricing_history_scope ON public.pricing_history(scope, scope_id);

GRANT SELECT ON public.pricing_history TO authenticated;
GRANT ALL ON public.pricing_history TO service_role;

ALTER TABLE public.pricing_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pricing_history_read_admin" ON public.pricing_history;
CREATE POLICY "pricing_history_read_admin" ON public.pricing_history
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Append-only: no INSERT/UPDATE/DELETE policies for anyone. Only service_role via SECURITY DEFINER functions can insert.

-- =============================================================
-- Table : pricing_simulations
-- =============================================================
CREATE TABLE IF NOT EXISTS public.pricing_simulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  rules_snapshot JSONB NOT NULL,
  results JSONB NOT NULL DEFAULT '{}'::jsonb,
  affected_count INTEGER NOT NULL DEFAULT 0,
  total_impact NUMERIC(14,2),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  applied_at TIMESTAMPTZ,
  applied_history_id UUID REFERENCES public.pricing_history(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pricing_simulations TO authenticated;
GRANT ALL ON public.pricing_simulations TO service_role;

ALTER TABLE public.pricing_simulations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pricing_simulations_admin" ON public.pricing_simulations;
CREATE POLICY "pricing_simulations_admin" ON public.pricing_simulations
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- =============================================================
-- Pricing Engine — resolve margin (product, mode)
-- =============================================================
CREATE OR REPLACE FUNCTION public.resolve_product_margin(_product_id UUID, _mode TEXT DEFAULT 'retail')
RETURNS NUMERIC
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _cat UUID;
  _margin NUMERIC;
BEGIN
  SELECT category_id INTO _cat FROM public.products WHERE id = _product_id;

  SELECT CASE WHEN _mode = 'wholesale' THEN margin_wholesale_percent ELSE margin_retail_percent END
    INTO _margin
  FROM public.pricing_margin_rules
  WHERE is_active
    AND (
      (scope = 'product'  AND scope_id = _product_id)
      OR (scope = 'category' AND scope_id = _cat)
      OR (scope = 'global')
    )
  ORDER BY priority DESC
  LIMIT 1;

  RETURN COALESCE(_margin, 0);
END $$;

-- =============================================================
-- Simulate margin change
-- Input: jsonb { scope, scope_id, margin_retail_percent, margin_wholesale_percent }
-- =============================================================
CREATE OR REPLACE FUNCTION public.simulate_margin_change(_rule JSONB)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _scope TEXT := _rule->>'scope';
  _scope_id UUID := NULLIF(_rule->>'scope_id','')::UUID;
  _mr NUMERIC := COALESCE((_rule->>'margin_retail_percent')::NUMERIC, 0);
  _mw NUMERIC := COALESCE((_rule->>'margin_wholesale_percent')::NUMERIC, 0);
  _items JSONB := '[]'::jsonb;
  _count INTEGER := 0;
  _sum_old NUMERIC := 0;
  _sum_new NUMERIC := 0;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  WITH targets AS (
    SELECT p.id, p.name, p.price AS old_price, p.purchase_price,
           ROUND(COALESCE(p.purchase_price,0) * (1 + _mr/100.0)) AS new_price
    FROM public.products p
    WHERE p.is_active
      AND p.purchase_price IS NOT NULL
      AND p.purchase_price > 0
      AND (
        _scope = 'global'
        OR (_scope = 'category' AND p.category_id = _scope_id)
        OR (_scope = 'product'  AND p.id = _scope_id)
      )
  )
  SELECT
    COALESCE(jsonb_agg(jsonb_build_object(
      'product_id', id, 'name', name,
      'old_price', old_price, 'new_price', new_price,
      'delta', new_price - old_price
    )), '[]'::jsonb),
    COUNT(*), COALESCE(SUM(old_price),0), COALESCE(SUM(new_price),0)
  INTO _items, _count, _sum_old, _sum_new
  FROM targets;

  RETURN jsonb_build_object(
    'scope', _scope,
    'scope_id', _scope_id,
    'margin_retail_percent', _mr,
    'margin_wholesale_percent', _mw,
    'affected_count', _count,
    'avg_old_price', CASE WHEN _count>0 THEN ROUND(_sum_old/_count,2) ELSE 0 END,
    'avg_new_price', CASE WHEN _count>0 THEN ROUND(_sum_new/_count,2) ELSE 0 END,
    'total_impact', ROUND(_sum_new - _sum_old, 2),
    'items', _items
  );
END $$;

-- =============================================================
-- Apply margin change
-- =============================================================
CREATE OR REPLACE FUNCTION public.apply_margin_change(_rule JSONB, _reason TEXT DEFAULT NULL)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _scope public.pricing_scope := (_rule->>'scope')::public.pricing_scope;
  _scope_id UUID := NULLIF(_rule->>'scope_id','')::UUID;
  _mr NUMERIC := COALESCE((_rule->>'margin_retail_percent')::NUMERIC, 0);
  _mw NUMERIC := COALESCE((_rule->>'margin_wholesale_percent')::NUMERIC, 0);
  _sim JSONB;
  _hist_id UUID;
  _old_mr NUMERIC; _old_mw NUMERIC;
  _t0 TIMESTAMPTZ := clock_timestamp();
BEGIN
  IF NOT public.has_role(auth.uid(),'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT margin_retail_percent, margin_wholesale_percent
    INTO _old_mr, _old_mw
  FROM public.pricing_margin_rules
  WHERE scope = _scope AND scope_id IS NOT DISTINCT FROM _scope_id;

  _sim := public.simulate_margin_change(_rule);

  -- Upsert rule
  INSERT INTO public.pricing_margin_rules (scope, scope_id, margin_retail_percent, margin_wholesale_percent, created_by)
  VALUES (_scope, _scope_id, _mr, _mw, auth.uid())
  ON CONFLICT (scope, scope_id) DO UPDATE
    SET margin_retail_percent = EXCLUDED.margin_retail_percent,
        margin_wholesale_percent = EXCLUDED.margin_wholesale_percent,
        is_active = true,
        updated_at = now();

  -- Recalculate retail prices for affected products
  UPDATE public.products p
  SET price = ROUND(p.purchase_price * (1 + _mr/100.0)),
      updated_at = now()
  WHERE p.is_active
    AND p.purchase_price IS NOT NULL
    AND p.purchase_price > 0
    AND (
      _scope = 'global'
      OR (_scope = 'category' AND p.category_id = _scope_id)
      OR (_scope = 'product'  AND p.id = _scope_id)
    );

  -- History
  INSERT INTO public.pricing_history (
    action, actor_id, scope, scope_id,
    old_margin_retail, new_margin_retail,
    old_margin_wholesale, new_margin_wholesale,
    affected_products, affected_count,
    avg_old_price, avg_new_price, total_impact,
    reason, metadata
  ) VALUES (
    'margin_update', auth.uid(), _scope, _scope_id,
    _old_mr, _mr, _old_mw, _mw,
    _sim->'items', COALESCE((_sim->>'affected_count')::INTEGER,0),
    NULLIF(_sim->>'avg_old_price','')::NUMERIC,
    NULLIF(_sim->>'avg_new_price','')::NUMERIC,
    NULLIF(_sim->>'total_impact','')::NUMERIC,
    _reason,
    jsonb_build_object('duration_ms', EXTRACT(EPOCH FROM (clock_timestamp()-_t0))*1000)
  )
  RETURNING id INTO _hist_id;

  RETURN _hist_id;
END $$;

-- =============================================================
-- Rollback
-- =============================================================
CREATE OR REPLACE FUNCTION public.rollback_pricing_change(_history_id UUID)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _h public.pricing_history;
  _item JSONB;
  _new_hist UUID;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT * INTO _h FROM public.pricing_history WHERE id = _history_id;
  IF _h.id IS NULL THEN RAISE EXCEPTION 'History entry not found'; END IF;

  -- Restore old margin rule
  IF _h.scope IS NOT NULL THEN
    IF _h.old_margin_retail IS NULL AND _h.old_margin_wholesale IS NULL THEN
      DELETE FROM public.pricing_margin_rules WHERE scope = _h.scope AND scope_id IS NOT DISTINCT FROM _h.scope_id;
    ELSE
      INSERT INTO public.pricing_margin_rules (scope, scope_id, margin_retail_percent, margin_wholesale_percent, created_by)
      VALUES (_h.scope, _h.scope_id, COALESCE(_h.old_margin_retail,0), COALESCE(_h.old_margin_wholesale,0), auth.uid())
      ON CONFLICT (scope, scope_id) DO UPDATE
        SET margin_retail_percent = EXCLUDED.margin_retail_percent,
            margin_wholesale_percent = EXCLUDED.margin_wholesale_percent,
            updated_at = now();
    END IF;
  END IF;

  -- Restore product prices
  FOR _item IN SELECT * FROM jsonb_array_elements(_h.affected_products) LOOP
    UPDATE public.products
    SET price = (_item->>'old_price')::NUMERIC, updated_at = now()
    WHERE id = (_item->>'product_id')::UUID;
  END LOOP;

  INSERT INTO public.pricing_history (
    action, actor_id, scope, scope_id, reason, parent_history_id,
    affected_products, affected_count
  ) VALUES (
    'rollback', auth.uid(), _h.scope, _h.scope_id,
    'Rollback of ' || _history_id::text, _history_id,
    _h.affected_products, _h.affected_count
  ) RETURNING id INTO _new_hist;

  RETURN _new_hist;
END $$;

GRANT EXECUTE ON FUNCTION public.resolve_product_margin(UUID,TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.simulate_margin_change(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_margin_change(JSONB,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rollback_pricing_change(UUID) TO authenticated;

-- Seed a global default rule if none exists (idempotent)
INSERT INTO public.pricing_margin_rules (scope, scope_id, margin_retail_percent, margin_wholesale_percent)
SELECT 'global', NULL, 30, 20
WHERE NOT EXISTS (SELECT 1 FROM public.pricing_margin_rules WHERE scope='global');
