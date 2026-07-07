
-- 1) back_in_stock_alerts: remove NULL bypass, admin-only for guest alerts
DROP POLICY IF EXISTS "Users can view their own alerts" ON public.back_in_stock_alerts;
CREATE POLICY "Users can view their own alerts"
  ON public.back_in_stock_alerts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all alerts"
  ON public.back_in_stock_alerts FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 2) order_items: drop open guest read
DROP POLICY IF EXISTS "Guests can view order items for guest orders" ON public.order_items;

-- 3) Storage: drop broad SELECT policies on public buckets
--    (bucket public=true still lets Supabase serve individual files via public URL)
DROP POLICY IF EXISTS "Avatars are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Public read product images" ON storage.objects;

-- 4) Admin analytics functions: revoke from anon/authenticated
DO $$
DECLARE
  fn text;
  admin_fns text[] := ARRAY[
    'public.analytics_customer_cohorts(integer)',
    'public.analytics_customer_ltv(integer)',
    'public.analytics_mlm_attribution(integer)',
    'public.analytics_revenue_breakdown(integer)',
    'public.analytics_top_ambassadors(integer,integer)'
  ];
BEGIN
  FOREACH fn IN ARRAY admin_fns LOOP
    BEGIN
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn);
    EXCEPTION WHEN undefined_function THEN NULL;
    END;
  END LOOP;
END $$;
