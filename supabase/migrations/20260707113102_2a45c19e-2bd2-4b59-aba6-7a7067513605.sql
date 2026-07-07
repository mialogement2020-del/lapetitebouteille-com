
-- 1) Fix ERROR: monthly_leaderboard view uses SECURITY DEFINER by default
ALTER VIEW public.monthly_leaderboard SET (security_invoker = true);

-- 2) CRITICAL data leak: orders table had "Allow all selects" USING true for anon+authenticated
--    which exposes every order to any visitor. Drop redundant permissive policies;
--    proper scoped policies already exist.
DROP POLICY IF EXISTS "Allow all selects" ON public.orders;
DROP POLICY IF EXISTS "Allow all inserts" ON public.orders;

-- 3) Tighten back_in_stock_alerts: an authenticated user must only insert alerts
--    tied to their own uid (or as guest with NULL user_id).
DROP POLICY IF EXISTS "Anyone can create alerts" ON public.back_in_stock_alerts;
CREATE POLICY "Anyone can create alerts"
  ON public.back_in_stock_alerts
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (user_id IS NULL OR auth.uid() = user_id);

-- 4) Tighten quote_requests: dedup permissive policy that allowed any authenticated
--    user to spoof user_id. Keep anon-guest INSERT policy; add scoped auth INSERT.
DROP POLICY IF EXISTS "Anyone can create quote requests" ON public.quote_requests;
CREATE POLICY "Authenticated can create own quote requests"
  ON public.quote_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
