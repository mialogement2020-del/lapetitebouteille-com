
CREATE TABLE public.perf_metrics (
  id BIGSERIAL PRIMARY KEY,
  metric TEXT NOT NULL,
  value DOUBLE PRECISION NOT NULL,
  rating TEXT,
  route TEXT NOT NULL,
  navigation_type TEXT,
  user_id UUID,
  session_id TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX perf_metrics_created_at_idx ON public.perf_metrics (created_at DESC);
CREATE INDEX perf_metrics_metric_route_idx ON public.perf_metrics (metric, route, created_at DESC);

GRANT INSERT ON public.perf_metrics TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.perf_metrics_id_seq TO anon, authenticated;
GRANT SELECT ON public.perf_metrics TO authenticated;
GRANT ALL ON public.perf_metrics TO service_role;

ALTER TABLE public.perf_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can insert perf metrics"
ON public.perf_metrics FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "admins can read perf metrics"
ON public.perf_metrics FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Auto-purge old metrics (keep 30 days) via simple function callable by cron later
CREATE OR REPLACE FUNCTION public.purge_old_perf_metrics()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.perf_metrics WHERE created_at < now() - INTERVAL '30 days';
$$;
