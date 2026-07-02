
-- ============ AFFINITIES ============
CREATE TABLE public.product_affinities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_a uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  product_b uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  co_count integer NOT NULL DEFAULT 0,
  score numeric NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(product_a, product_b),
  CHECK (product_a <> product_b)
);
CREATE INDEX idx_affinities_a_score ON public.product_affinities(product_a, score DESC);
CREATE INDEX idx_affinities_b_score ON public.product_affinities(product_b, score DESC);

GRANT SELECT ON public.product_affinities TO anon, authenticated;
GRANT ALL ON public.product_affinities TO service_role;
ALTER TABLE public.product_affinities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "affinities readable by all"
  ON public.product_affinities FOR SELECT
  USING (true);

CREATE POLICY "affinities managed by admins"
  ON public.product_affinities FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ USER RECOMMENDATIONS ============
CREATE TABLE public.user_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  score numeric NOT NULL DEFAULT 0,
  reason text NOT NULL DEFAULT 'affinity',
  computed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id)
);
CREATE INDEX idx_user_recos_user_score ON public.user_recommendations(user_id, score DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_recommendations TO authenticated;
GRANT ALL ON public.user_recommendations TO service_role;
ALTER TABLE public.user_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own recos"
  ON public.user_recommendations FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins manage recos"
  ON public.user_recommendations FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ REFRESH AFFINITIES ============
CREATE OR REPLACE FUNCTION public.refresh_product_affinities()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted_count integer := 0;
BEGIN
  -- Wipe & rebuild from last 180 days of orders
  DELETE FROM public.product_affinities;

  WITH pairs AS (
    SELECT
      LEAST(oi1.product_id, oi2.product_id) AS pa,
      GREATEST(oi1.product_id, oi2.product_id) AS pb,
      COUNT(*) AS c
    FROM public.order_items oi1
    JOIN public.order_items oi2
      ON oi1.order_id = oi2.order_id
     AND oi1.product_id < oi2.product_id
    JOIN public.orders o ON o.id = oi1.order_id
    WHERE o.created_at > now() - interval '180 days'
    GROUP BY 1, 2
  )
  INSERT INTO public.product_affinities (product_a, product_b, co_count, score)
  SELECT pa, pb, c, LEAST(1.0, c::numeric / 10.0)
  FROM pairs
  WHERE c >= 2;

  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count;
END;
$$;

-- ============ COMPUTE USER RECOMMENDATIONS ============
CREATE OR REPLACE FUNCTION public.compute_user_recommendations(_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cnt integer := 0;
BEGIN
  DELETE FROM public.user_recommendations WHERE user_id = _user_id;

  WITH purchased AS (
    SELECT DISTINCT oi.product_id
    FROM public.order_items oi
    JOIN public.orders o ON o.id = oi.order_id
    WHERE o.user_id = _user_id
  ),
  reco AS (
    SELECT
      CASE WHEN pa.product_a = p.product_id THEN pa.product_b ELSE pa.product_a END AS product_id,
      MAX(pa.score) AS score
    FROM purchased p
    JOIN public.product_affinities pa
      ON pa.product_a = p.product_id OR pa.product_b = p.product_id
    GROUP BY 1
  )
  INSERT INTO public.user_recommendations (user_id, product_id, score, reason)
  SELECT _user_id, r.product_id, r.score, 'affinity'
  FROM reco r
  WHERE r.product_id NOT IN (SELECT product_id FROM purchased)
    AND EXISTS (SELECT 1 FROM public.products pr WHERE pr.id = r.product_id AND pr.is_active = true)
  ORDER BY r.score DESC
  LIMIT 24;

  GET DIAGNOSTICS cnt = ROW_COUNT;
  RETURN cnt;
END;
$$;

-- ============ GET RECOMMENDATIONS (with trending fallback) ============
CREATE OR REPLACE FUNCTION public.get_user_recommendations(_user_id uuid, _limit integer DEFAULT 8)
RETURNS TABLE (
  product_id uuid,
  score numeric,
  reason text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT ur.product_id, ur.score, ur.reason
  FROM public.user_recommendations ur
  WHERE ur.user_id = _user_id
  ORDER BY ur.score DESC
  LIMIT _limit;

  IF NOT FOUND THEN
    RETURN QUERY
    SELECT p.id, 0.5::numeric, 'trending'::text
    FROM public.products p
    LEFT JOIN public.order_items oi ON oi.product_id = p.id
    LEFT JOIN public.orders o ON o.id = oi.order_id AND o.created_at > now() - interval '30 days'
    WHERE p.is_active = true
    GROUP BY p.id
    ORDER BY COUNT(oi.id) DESC, p.created_at DESC
    LIMIT _limit;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.refresh_product_affinities() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.compute_user_recommendations(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_recommendations(uuid, integer) TO anon, authenticated, service_role;
