
-- Subject types
CREATE TYPE public.trust_subject_type AS ENUM ('customer','vendor','ambassador','wholesaler');

-- Trust signals (append-only)
CREATE TABLE public.trust_signals (
  id BIGSERIAL PRIMARY KEY,
  subject_id UUID NOT NULL,
  subject_type public.trust_subject_type NOT NULL,
  signal_type TEXT NOT NULL,
  weight NUMERIC NOT NULL DEFAULT 1,
  polarity SMALLINT NOT NULL DEFAULT 1, -- +1 positive, -1 negative
  source TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_trust_signals_subject ON public.trust_signals(subject_id, subject_type);
CREATE INDEX idx_trust_signals_occurred_at ON public.trust_signals(occurred_at DESC);

GRANT SELECT ON public.trust_signals TO authenticated;
GRANT ALL ON public.trust_signals TO service_role;
ALTER TABLE public.trust_signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read all trust signals"
  ON public.trust_signals FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users read own trust signals"
  ON public.trust_signals FOR SELECT TO authenticated
  USING (subject_id = auth.uid());

-- Aggregated trust scores
CREATE TABLE public.trust_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL,
  subject_type public.trust_subject_type NOT NULL,
  score NUMERIC NOT NULL DEFAULT 50,
  tier TEXT NOT NULL DEFAULT 'bronze',
  positive_count INTEGER NOT NULL DEFAULT 0,
  negative_count INTEGER NOT NULL DEFAULT 0,
  breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (subject_id, subject_type)
);
CREATE INDEX idx_trust_scores_score ON public.trust_scores(score DESC);

GRANT SELECT ON public.trust_scores TO authenticated;
GRANT ALL ON public.trust_scores TO service_role;
ALTER TABLE public.trust_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read all trust scores"
  ON public.trust_scores FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users read own trust score"
  ON public.trust_scores FOR SELECT TO authenticated
  USING (subject_id = auth.uid());

-- Record a signal (callable from triggers or app)
CREATE OR REPLACE FUNCTION public.record_trust_signal(
  _subject_id UUID,
  _subject_type public.trust_subject_type,
  _signal_type TEXT,
  _weight NUMERIC DEFAULT 1,
  _polarity SMALLINT DEFAULT 1,
  _source TEXT DEFAULT NULL,
  _metadata JSONB DEFAULT '{}'::jsonb
) RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id BIGINT;
BEGIN
  INSERT INTO public.trust_signals (subject_id, subject_type, signal_type, weight, polarity, source, metadata)
  VALUES (_subject_id, _subject_type, _signal_type, _weight, _polarity, _source, COALESCE(_metadata,'{}'::jsonb))
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;

-- Compute (recompute) a trust score from signals — last 12 months
CREATE OR REPLACE FUNCTION public.compute_trust_score(
  _subject_id UUID,
  _subject_type public.trust_subject_type
) RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pos NUMERIC := 0;
  neg NUMERIC := 0;
  raw NUMERIC;
  final_score NUMERIC;
  new_tier TEXT;
  bd JSONB;
  pos_cnt INTEGER;
  neg_cnt INTEGER;
BEGIN
  SELECT
    COALESCE(SUM(CASE WHEN polarity > 0 THEN weight ELSE 0 END),0),
    COALESCE(SUM(CASE WHEN polarity < 0 THEN weight ELSE 0 END),0),
    COUNT(*) FILTER (WHERE polarity > 0),
    COUNT(*) FILTER (WHERE polarity < 0)
  INTO pos, neg, pos_cnt, neg_cnt
  FROM public.trust_signals
  WHERE subject_id = _subject_id
    AND subject_type = _subject_type
    AND occurred_at > now() - INTERVAL '12 months';

  -- Base 50 + weighted positive - 2x weighted negative, clamped [0,100]
  raw := 50 + pos - (neg * 2);
  final_score := GREATEST(0, LEAST(100, raw));

  new_tier := CASE
    WHEN final_score >= 90 THEN 'diamond'
    WHEN final_score >= 75 THEN 'platinum'
    WHEN final_score >= 60 THEN 'gold'
    WHEN final_score >= 40 THEN 'silver'
    ELSE 'bronze'
  END;

  -- breakdown by signal type
  SELECT jsonb_object_agg(signal_type, total)
  INTO bd
  FROM (
    SELECT signal_type, SUM(weight * polarity) AS total
    FROM public.trust_signals
    WHERE subject_id = _subject_id AND subject_type = _subject_type
      AND occurred_at > now() - INTERVAL '12 months'
    GROUP BY signal_type
  ) t;

  INSERT INTO public.trust_scores (subject_id, subject_type, score, tier, positive_count, negative_count, breakdown, computed_at)
  VALUES (_subject_id, _subject_type, final_score, new_tier, pos_cnt, neg_cnt, COALESCE(bd,'{}'::jsonb), now())
  ON CONFLICT (subject_id, subject_type) DO UPDATE
    SET score = EXCLUDED.score,
        tier = EXCLUDED.tier,
        positive_count = EXCLUDED.positive_count,
        negative_count = EXCLUDED.negative_count,
        breakdown = EXCLUDED.breakdown,
        computed_at = EXCLUDED.computed_at;

  RETURN final_score;
END;
$$;

-- Recompute all subjects that have signals (batch)
CREATE OR REPLACE FUNCTION public.recompute_all_trust_scores()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  n INTEGER := 0;
BEGIN
  FOR r IN
    SELECT DISTINCT subject_id, subject_type
    FROM public.trust_signals
    WHERE occurred_at > now() - INTERVAL '12 months'
  LOOP
    PERFORM public.compute_trust_score(r.subject_id, r.subject_type);
    n := n + 1;
  END LOOP;
  RETURN n;
END;
$$;

-- Auto-record signals from existing domain events
-- Delivered order -> positive customer signal
CREATE OR REPLACE FUNCTION public.trust_signal_on_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'delivered' AND (OLD.status IS DISTINCT FROM 'delivered') AND NEW.user_id IS NOT NULL THEN
    PERFORM public.record_trust_signal(NEW.user_id, 'customer', 'order_completed', 2, 1, 'orders', jsonb_build_object('order_id', NEW.id));
  ELSIF NEW.status = 'cancelled' AND (OLD.status IS DISTINCT FROM 'cancelled') AND NEW.user_id IS NOT NULL THEN
    PERFORM public.record_trust_signal(NEW.user_id, 'customer', 'order_cancelled', 1, -1, 'orders', jsonb_build_object('order_id', NEW.id));
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_trust_signal_order
AFTER UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.trust_signal_on_order();

-- Review -> vendor signal (if product has vendor) / customer as author
CREATE OR REPLACE FUNCTION public.trust_signal_on_review()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.rating >= 4 THEN
    PERFORM public.record_trust_signal(NEW.user_id, 'customer', 'review_positive', 0.5, 1, 'reviews', jsonb_build_object('review_id', NEW.id));
  ELSIF NEW.rating <= 2 THEN
    PERFORM public.record_trust_signal(NEW.user_id, 'customer', 'review_negative_authored', 0.2, 1, 'reviews', jsonb_build_object('review_id', NEW.id));
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_trust_signal_review
AFTER INSERT ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.trust_signal_on_review();

-- Commission paid -> ambassador positive
CREATE OR REPLACE FUNCTION public.trust_signal_on_commission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'paid' AND (OLD.status IS DISTINCT FROM 'paid') THEN
    PERFORM public.record_trust_signal(NEW.ambassador_id, 'ambassador', 'commission_paid', 1, 1, 'mlm', jsonb_build_object('commission_id', NEW.id, 'amount', NEW.amount));
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_trust_signal_commission
AFTER UPDATE ON public.commissions
FOR EACH ROW EXECUTE FUNCTION public.trust_signal_on_commission();
