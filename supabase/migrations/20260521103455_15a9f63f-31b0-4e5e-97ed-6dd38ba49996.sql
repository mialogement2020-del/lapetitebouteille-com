
-- Cohort retention by acquisition month
CREATE OR REPLACE FUNCTION public.analytics_customer_cohorts(_months_back INTEGER DEFAULT 12)
RETURNS TABLE (
  cohort_month DATE,
  cohort_size BIGINT,
  retained_m1 BIGINT,
  retained_m3 BIGINT,
  retained_m6 BIGINT,
  total_revenue NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  WITH first_orders AS (
    SELECT
      COALESCE(user_id::text, guest_email) AS customer_key,
      MIN(created_at) AS first_order_at
    FROM public.orders
    WHERE status NOT IN ('cancelled')
      AND COALESCE(user_id::text, guest_email) IS NOT NULL
    GROUP BY 1
  ),
  cohorts AS (
    SELECT
      date_trunc('month', first_order_at)::date AS cohort_month,
      customer_key
    FROM first_orders
    WHERE first_order_at >= now() - (_months_back || ' months')::interval
  ),
  with_orders AS (
    SELECT
      c.cohort_month,
      c.customer_key,
      o.created_at,
      o.total,
      EXTRACT(MONTH FROM age(o.created_at, c.cohort_month::timestamptz))::int +
      EXTRACT(YEAR FROM age(o.created_at, c.cohort_month::timestamptz))::int * 12 AS months_since
    FROM cohorts c
    LEFT JOIN public.orders o
      ON COALESCE(o.user_id::text, o.guest_email) = c.customer_key
     AND o.status NOT IN ('cancelled')
  )
  SELECT
    w.cohort_month,
    COUNT(DISTINCT w.customer_key) FILTER (WHERE w.months_since = 0) AS cohort_size,
    COUNT(DISTINCT w.customer_key) FILTER (WHERE w.months_since >= 1) AS retained_m1,
    COUNT(DISTINCT w.customer_key) FILTER (WHERE w.months_since >= 3) AS retained_m3,
    COUNT(DISTINCT w.customer_key) FILTER (WHERE w.months_since >= 6) AS retained_m6,
    COALESCE(SUM(w.total), 0) AS total_revenue
  FROM with_orders w
  GROUP BY w.cohort_month
  ORDER BY w.cohort_month DESC;
END;
$$;

-- LTV per customer
CREATE OR REPLACE FUNCTION public.analytics_customer_ltv(_limit INTEGER DEFAULT 100)
RETURNS TABLE (
  customer_key TEXT,
  customer_label TEXT,
  user_id UUID,
  order_count BIGINT,
  total_spent NUMERIC,
  avg_order_value NUMERIC,
  first_order_at TIMESTAMPTZ,
  last_order_at TIMESTAMPTZ,
  days_active INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT
    COALESCE(o.user_id::text, o.guest_email) AS customer_key,
    COALESCE(
      NULLIF(TRIM(CONCAT_WS(' ', p.first_name, p.last_name)), ''),
      p.email,
      o.guest_email,
      o.shipping_full_name,
      'Anonyme'
    ) AS customer_label,
    o.user_id,
    COUNT(*) AS order_count,
    SUM(o.total) AS total_spent,
    AVG(o.total) AS avg_order_value,
    MIN(o.created_at) AS first_order_at,
    MAX(o.created_at) AS last_order_at,
    GREATEST(1, EXTRACT(DAY FROM (MAX(o.created_at) - MIN(o.created_at)))::int) AS days_active
  FROM public.orders o
  LEFT JOIN public.profiles p ON p.id = o.user_id
  WHERE o.status NOT IN ('cancelled')
    AND COALESCE(o.user_id::text, o.guest_email) IS NOT NULL
  GROUP BY COALESCE(o.user_id::text, o.guest_email), o.user_id, p.first_name, p.last_name, p.email, o.guest_email, o.shipping_full_name
  ORDER BY total_spent DESC NULLS LAST
  LIMIT _limit;
END;
$$;

-- MLM attribution by level
CREATE OR REPLACE FUNCTION public.analytics_mlm_attribution(_days INTEGER DEFAULT 90)
RETURNS TABLE (
  level INTEGER,
  ambassador_count BIGINT,
  commission_count BIGINT,
  total_commissions NUMERIC,
  total_attributed_revenue NUMERIC,
  avg_commission NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT
    c.level,
    COUNT(DISTINCT c.beneficiary_id) AS ambassador_count,
    COUNT(*) AS commission_count,
    COALESCE(SUM(c.commission_amount), 0) AS total_commissions,
    COALESCE(SUM(c.order_amount), 0) AS total_attributed_revenue,
    COALESCE(AVG(c.commission_amount), 0) AS avg_commission
  FROM public.commissions c
  WHERE c.created_at >= now() - (_days || ' days')::interval
  GROUP BY c.level
  ORDER BY c.level;
END;
$$;

-- Daily revenue with source breakdown
CREATE OR REPLACE FUNCTION public.analytics_revenue_breakdown(_days INTEGER DEFAULT 30)
RETURNS TABLE (
  day DATE,
  total_revenue NUMERIC,
  order_count BIGINT,
  referral_revenue NUMERIC,
  marketplace_revenue NUMERIC,
  direct_revenue NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT
    date_trunc('day', o.created_at)::date AS day,
    SUM(o.total) AS total_revenue,
    COUNT(*) AS order_count,
    COALESCE(SUM(o.total) FILTER (WHERE o.referrer_id IS NOT NULL), 0) AS referral_revenue,
    COALESCE(SUM(oi_agg.marketplace_total), 0) AS marketplace_revenue,
    COALESCE(SUM(o.total) FILTER (WHERE o.referrer_id IS NULL), 0) AS direct_revenue
  FROM public.orders o
  LEFT JOIN LATERAL (
    SELECT COALESCE(SUM(total_price), 0) AS marketplace_total
    FROM public.order_items oi
    WHERE oi.order_id = o.id AND oi.vendor_id IS NOT NULL
  ) oi_agg ON true
  WHERE o.created_at >= now() - (_days || ' days')::interval
    AND o.status NOT IN ('cancelled')
  GROUP BY date_trunc('day', o.created_at)::date
  ORDER BY day;
END;
$$;

-- Top ambassadors by revenue generated
CREATE OR REPLACE FUNCTION public.analytics_top_ambassadors(_days INTEGER DEFAULT 90, _limit INTEGER DEFAULT 20)
RETURNS TABLE (
  ambassador_id UUID,
  ambassador_name TEXT,
  ambassador_email TEXT,
  referral_count BIGINT,
  total_commissions NUMERIC,
  attributed_revenue NUMERIC,
  conversion_rate NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT
    c.beneficiary_id AS ambassador_id,
    COALESCE(
      NULLIF(TRIM(CONCAT_WS(' ', p.first_name, p.last_name)), ''),
      p.email,
      'Ambassadeur'
    ) AS ambassador_name,
    COALESCE(p.email, '') AS ambassador_email,
    COUNT(DISTINCT c.order_id) AS referral_count,
    SUM(c.commission_amount) AS total_commissions,
    SUM(c.order_amount) AS attributed_revenue,
    CASE
      WHEN COALESCE(rc.total_clicks, 0) = 0 THEN 0
      ELSE ROUND((COUNT(DISTINCT c.order_id)::numeric / rc.total_clicks::numeric) * 100, 2)
    END AS conversion_rate
  FROM public.commissions c
  LEFT JOIN public.profiles p ON p.id = c.beneficiary_id
  LEFT JOIN public.referral_codes rc ON rc.user_id = c.beneficiary_id
  WHERE c.created_at >= now() - (_days || ' days')::interval
  GROUP BY c.beneficiary_id, p.first_name, p.last_name, p.email, rc.total_clicks
  ORDER BY attributed_revenue DESC NULLS LAST
  LIMIT _limit;
END;
$$;
