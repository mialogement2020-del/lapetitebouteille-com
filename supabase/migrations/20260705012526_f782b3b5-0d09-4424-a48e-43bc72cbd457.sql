
-- 1) currency_rates
CREATE TABLE IF NOT EXISTS public.currency_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  base_currency TEXT NOT NULL,
  quote_currency TEXT NOT NULL,
  rate NUMERIC(18,8) NOT NULL CHECK (rate > 0),
  source TEXT NOT NULL DEFAULT 'manual',
  valid_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_to TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (base_currency <> quote_currency)
);

CREATE INDEX IF NOT EXISTS idx_currency_rates_pair ON public.currency_rates(base_currency, quote_currency, valid_from DESC);

GRANT SELECT ON public.currency_rates TO anon, authenticated;
GRANT ALL ON public.currency_rates TO service_role;

ALTER TABLE public.currency_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read currency rates"
  ON public.currency_rates FOR SELECT
  USING (true);

CREATE POLICY "Admins manage currency rates"
  ON public.currency_rates FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_currency_rates_updated_at
  BEFORE UPDATE ON public.currency_rates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Functions
CREATE OR REPLACE FUNCTION public.get_active_rate(_from TEXT, _to TEXT)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rate NUMERIC;
BEGIN
  IF _from = _to THEN
    RETURN 1;
  END IF;

  SELECT rate INTO v_rate
  FROM public.currency_rates
  WHERE base_currency = _from
    AND quote_currency = _to
    AND valid_from <= now()
    AND (valid_to IS NULL OR valid_to > now())
  ORDER BY valid_from DESC
  LIMIT 1;

  IF v_rate IS NULL THEN
    -- try inverse
    SELECT 1/rate INTO v_rate
    FROM public.currency_rates
    WHERE base_currency = _to
      AND quote_currency = _from
      AND valid_from <= now()
      AND (valid_to IS NULL OR valid_to > now())
    ORDER BY valid_from DESC
    LIMIT 1;
  END IF;

  IF v_rate IS NULL THEN
    RAISE EXCEPTION 'No exchange rate found for % -> %', _from, _to;
  END IF;

  RETURN v_rate;
END;
$$;

CREATE OR REPLACE FUNCTION public.convert_currency(_amount NUMERIC, _from TEXT, _to TEXT)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN _amount * public.get_active_rate(_from, _to);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_active_rate(TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.convert_currency(NUMERIC, TEXT, TEXT) TO anon, authenticated, service_role;

-- 3) Add currency columns
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'XAF',
  ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(18,8) NOT NULL DEFAULT 1;

ALTER TABLE public.payment_intents
  ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(18,8) NOT NULL DEFAULT 1;

-- 4) Seed reference rates (XAF base, CEMAC peg to EUR)
INSERT INTO public.currency_rates (base_currency, quote_currency, rate, source) VALUES
  ('XAF', 'EUR', 0.00152449, 'seed'),
  ('EUR', 'XAF', 655.957, 'seed'),
  ('XAF', 'USD', 0.00165289, 'seed'),
  ('USD', 'XAF', 605.00, 'seed'),
  ('EUR', 'USD', 1.0850, 'seed'),
  ('USD', 'EUR', 0.9217, 'seed')
ON CONFLICT DO NOTHING;
