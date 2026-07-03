
-- 1. customer_segments
CREATE TABLE public.customer_segments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  recency_days INTEGER NOT NULL DEFAULT 9999,
  frequency INTEGER NOT NULL DEFAULT 0,
  monetary NUMERIC NOT NULL DEFAULT 0,
  r_score SMALLINT NOT NULL DEFAULT 1,
  f_score SMALLINT NOT NULL DEFAULT 1,
  m_score SMALLINT NOT NULL DEFAULT 1,
  segment TEXT NOT NULL DEFAULT 'new',
  last_order_at TIMESTAMPTZ,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.customer_segments TO authenticated;
GRANT ALL ON public.customer_segments TO service_role;

ALTER TABLE public.customer_segments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own segment" ON public.customer_segments
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins manage segments" ON public.customer_segments
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_customer_segments_segment ON public.customer_segments(segment);

-- 2. retention_campaigns
CREATE TABLE public.retention_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  target_segment TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'notification',
  subject TEXT,
  message TEXT NOT NULL,
  cta_label TEXT,
  cta_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  scheduled_at TIMESTAMPTZ,
  last_run_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.retention_campaigns TO authenticated;
GRANT ALL ON public.retention_campaigns TO service_role;

ALTER TABLE public.retention_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage campaigns" ON public.retention_campaigns
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3. campaign_deliveries
CREATE TABLE public.campaign_deliveries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.retention_campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent',
  error TEXT,
  delivered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.campaign_deliveries TO authenticated;
GRANT ALL ON public.campaign_deliveries TO service_role;

ALTER TABLE public.campaign_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view deliveries" ON public.campaign_deliveries
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert deliveries" ON public.campaign_deliveries
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_campaign_deliveries_campaign ON public.campaign_deliveries(campaign_id);
CREATE INDEX idx_campaign_deliveries_user ON public.campaign_deliveries(user_id);

-- updated_at triggers
CREATE TRIGGER trg_customer_segments_updated
  BEFORE UPDATE ON public.customer_segments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_retention_campaigns_updated
  BEFORE UPDATE ON public.retention_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. RFM label helper
CREATE OR REPLACE FUNCTION public.label_rfm_segment(_r SMALLINT, _f SMALLINT, _m SMALLINT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  IF _r >= 4 AND _f >= 4 AND _m >= 4 THEN RETURN 'champions'; END IF;
  IF _r >= 3 AND _f >= 3 THEN RETURN 'loyal'; END IF;
  IF _r >= 4 AND _f <= 2 THEN RETURN 'new'; END IF;
  IF _r >= 3 AND _m >= 4 THEN RETURN 'promising'; END IF;
  IF _r <= 2 AND _f >= 3 THEN RETURN 'at_risk'; END IF;
  IF _r <= 2 AND _f <= 2 AND _m >= 3 THEN RETURN 'hibernating'; END IF;
  IF _r = 1 AND _f = 1 THEN RETURN 'lost'; END IF;
  RETURN 'regular';
END;
$$;

-- 5. Recompute all customer segments
CREATE OR REPLACE FUNCTION public.recompute_customer_segments()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  WITH base AS (
    SELECT
      o.user_id,
      MAX(o.created_at) AS last_order_at,
      COUNT(*)::INTEGER AS frequency,
      COALESCE(SUM(o.total_amount), 0)::NUMERIC AS monetary
    FROM public.orders o
    WHERE o.user_id IS NOT NULL
      AND o.status IN ('delivered','completed','paid','shipped')
    GROUP BY o.user_id
  ),
  scored AS (
    SELECT
      b.user_id,
      GREATEST(0, EXTRACT(DAY FROM (now() - b.last_order_at))::INTEGER) AS recency_days,
      b.frequency,
      b.monetary,
      b.last_order_at,
      NTILE(5) OVER (ORDER BY b.last_order_at DESC NULLS LAST)::SMALLINT AS r_score,
      NTILE(5) OVER (ORDER BY b.frequency ASC)::SMALLINT AS f_score,
      NTILE(5) OVER (ORDER BY b.monetary ASC)::SMALLINT AS m_score
    FROM base b
  )
  INSERT INTO public.customer_segments
    (user_id, recency_days, frequency, monetary, r_score, f_score, m_score, segment, last_order_at, computed_at)
  SELECT
    s.user_id,
    s.recency_days,
    s.frequency,
    s.monetary,
    s.r_score,
    s.f_score,
    s.m_score,
    public.label_rfm_segment(s.r_score, s.f_score, s.m_score),
    s.last_order_at,
    now()
  FROM scored s
  ON CONFLICT (user_id) DO UPDATE SET
    recency_days = EXCLUDED.recency_days,
    frequency = EXCLUDED.frequency,
    monetary = EXCLUDED.monetary,
    r_score = EXCLUDED.r_score,
    f_score = EXCLUDED.f_score,
    m_score = EXCLUDED.m_score,
    segment = EXCLUDED.segment,
    last_order_at = EXCLUDED.last_order_at,
    computed_at = now(),
    updated_at = now();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.recompute_customer_segments() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.recompute_customer_segments() TO authenticated;
