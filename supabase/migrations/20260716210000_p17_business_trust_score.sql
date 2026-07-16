-- P1.7 - Business Score & Trust Score Engine.
-- Analytics and decision support only: never mutates wallets, commissions, orders, Commission Pool, Revenue Engine or P0.

ALTER TYPE public.admin_permission ADD VALUE IF NOT EXISTS 'business_scores';

CREATE OR REPLACE FUNCTION public.business_score_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(public.has_role(auth.uid(), 'admin'::public.app_role), false)
    OR EXISTS (
      SELECT 1
      FROM public.admin_permissions ap
      WHERE ap.user_id = auth.uid()
        AND ap.permission::text IN ('full_access', 'business_scores', 'academy', 'commercial_assets', 'conversation_coach', 'ai_goals', 'commercial_calendar', 'crm')
    );
$$;

CREATE TABLE IF NOT EXISTS public.business_score_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  profile_type text NOT NULL DEFAULT 'advisor' CHECK (profile_type IN ('advisor', 'ambassador', 'marketplace_vendor', 'partner', 'distributor', 'trainer', 'admin')),
  display_name text,
  role_tags text[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.business_score_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  profile_type text NOT NULL DEFAULT 'advisor',
  business_score numeric NOT NULL DEFAULT 0 CHECK (business_score >= 0 AND business_score <= 100),
  trust_score numeric NOT NULL DEFAULT 0 CHECK (trust_score >= 0 AND trust_score <= 100),
  global_score numeric NOT NULL DEFAULT 0 CHECK (global_score >= 0 AND global_score <= 100),
  score_level text NOT NULL DEFAULT 'starter',
  strengths text[] NOT NULL DEFAULT '{}',
  improvement_areas text[] NOT NULL DEFAULT '{}',
  recommendations jsonb NOT NULL DEFAULT '[]'::jsonb,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  scoring_version text NOT NULL DEFAULT 'p1.7-observation-v1',
  rule_version text NOT NULL DEFAULT '2026-07-16',
  calculated_by uuid DEFAULT auth.uid(),
  calculated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.business_score_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event_type text NOT NULL,
  event_source text NOT NULL DEFAULT 'manual',
  score_dimension text NOT NULL CHECK (score_dimension IN ('business', 'trust', 'global')),
  impact numeric NOT NULL DEFAULT 0,
  weight numeric NOT NULL DEFAULT 1,
  reason text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.business_score_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  badge_type text NOT NULL DEFAULT 'business' CHECK (badge_type IN ('business', 'trust', 'expertise', 'engagement', 'marketplace')),
  min_business_score numeric NOT NULL DEFAULT 0 CHECK (min_business_score >= 0 AND min_business_score <= 100),
  min_trust_score numeric NOT NULL DEFAULT 0 CHECK (min_trust_score >= 0 AND min_trust_score <= 100),
  required_metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.business_score_user_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  badge_id uuid NOT NULL REFERENCES public.business_score_badges(id) ON DELETE CASCADE,
  snapshot_id uuid REFERENCES public.business_score_snapshots(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'earned' CHECK (status IN ('earned', 'revoked')),
  reason text,
  earned_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  UNIQUE (user_id, badge_id)
);

CREATE TABLE IF NOT EXISTS public.business_score_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  snapshot_id uuid REFERENCES public.business_score_snapshots(id) ON DELETE SET NULL,
  recommendation_type text NOT NULL CHECK (recommendation_type IN ('training', 'crm', 'campaign', 'marketplace', 'trust', 'coaching', 'opportunity')),
  title text NOT NULL,
  description text NOT NULL,
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'accepted', 'completed', 'dismissed')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_business_score_profiles_user ON public.business_score_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_business_score_snapshots_user ON public.business_score_snapshots(user_id, calculated_at DESC);
CREATE INDEX IF NOT EXISTS idx_business_score_events_user ON public.business_score_events(user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_business_score_recommendations_user ON public.business_score_recommendations(user_id, status);
CREATE INDEX IF NOT EXISTS idx_business_score_user_badges_user ON public.business_score_user_badges(user_id, status);

CREATE OR REPLACE FUNCTION public.business_score_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.business_score_history_is_append_only()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'business_score_history_append_only';
END;
$$;

DROP TRIGGER IF EXISTS trg_business_score_profiles_touch ON public.business_score_profiles;
CREATE TRIGGER trg_business_score_profiles_touch BEFORE UPDATE ON public.business_score_profiles
FOR EACH ROW EXECUTE FUNCTION public.business_score_touch_updated_at();

DROP TRIGGER IF EXISTS trg_business_score_badges_touch ON public.business_score_badges;
CREATE TRIGGER trg_business_score_badges_touch BEFORE UPDATE ON public.business_score_badges
FOR EACH ROW EXECUTE FUNCTION public.business_score_touch_updated_at();

DROP TRIGGER IF EXISTS trg_business_score_recommendations_touch ON public.business_score_recommendations;
CREATE TRIGGER trg_business_score_recommendations_touch BEFORE UPDATE ON public.business_score_recommendations
FOR EACH ROW EXECUTE FUNCTION public.business_score_touch_updated_at();

DROP TRIGGER IF EXISTS trg_business_score_snapshots_append_only ON public.business_score_snapshots;
CREATE TRIGGER trg_business_score_snapshots_append_only BEFORE UPDATE OR DELETE ON public.business_score_snapshots
FOR EACH ROW EXECUTE FUNCTION public.business_score_history_is_append_only();

DROP TRIGGER IF EXISTS trg_business_score_events_append_only ON public.business_score_events;
CREATE TRIGGER trg_business_score_events_append_only BEFORE UPDATE OR DELETE ON public.business_score_events
FOR EACH ROW EXECUTE FUNCTION public.business_score_history_is_append_only();

CREATE OR REPLACE FUNCTION public.calculate_business_trust_score(_user_id uuid DEFAULT auth.uid())
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile public.business_score_profiles%ROWTYPE;
  v_orders_total integer := 0;
  v_orders_cancelled integer := 0;
  v_orders_refunded integer := 0;
  v_orders_completed integer := 0;
  v_crm_contacts integer := 0;
  v_crm_interactions integer := 0;
  v_goal_total integer := 0;
  v_goal_completed integer := 0;
  v_academy_total integer := 0;
  v_academy_completed integer := 0;
  v_certifications integer := 0;
  v_assets integer := 0;
  v_reviews integer := 0;
  v_avg_rating numeric := 0;
  v_product_count integer := 0;
  v_product_quality integer := 0;
  v_fraud_signals integer := 0;
  v_activity_score numeric;
  v_regular_score numeric;
  v_goal_score numeric;
  v_training_score numeric;
  v_tools_score numeric;
  v_marketplace_score numeric;
  v_satisfaction_score numeric;
  v_business_score numeric;
  v_trust_score numeric;
  v_global_score numeric;
  v_strengths text[] := '{}';
  v_improvements text[] := '{}';
  v_recommendations jsonb := '[]'::jsonb;
  v_metrics jsonb;
  v_snapshot_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'auth_required';
  END IF;

  IF _user_id <> auth.uid() AND NOT public.business_score_is_admin() THEN
    RAISE EXCEPTION 'business_score_permission_denied';
  END IF;

  INSERT INTO public.business_score_profiles(user_id, profile_type, display_name)
  SELECT
    _user_id,
    CASE
      WHEN public.has_role(_user_id, 'vendor'::public.app_role) THEN 'marketplace_vendor'
      WHEN public.has_role(_user_id, 'ambassador'::public.app_role) THEN 'ambassador'
      ELSE 'advisor'
    END,
    COALESCE(p.first_name || ' ' || p.last_name, p.email)
  FROM public.profiles p
  WHERE p.id = _user_id
  ON CONFLICT (user_id) DO UPDATE
  SET display_name = EXCLUDED.display_name,
      profile_type = EXCLUDED.profile_type
  RETURNING * INTO v_profile;

  IF v_profile.id IS NULL THEN
    INSERT INTO public.business_score_profiles(user_id, profile_type, display_name)
    VALUES (_user_id, 'advisor', _user_id::text)
    ON CONFLICT (user_id) DO UPDATE
    SET updated_at = now()
    RETURNING * INTO v_profile;
  END IF;

  SELECT
    count(*),
    count(*) FILTER (WHERE status = 'cancelled'),
    count(*) FILTER (WHERE payment_status = 'refunded' OR COALESCE(refunded_amount, 0) > 0),
    count(*) FILTER (WHERE status = 'delivered' OR payment_status = 'completed')
  INTO v_orders_total, v_orders_cancelled, v_orders_refunded, v_orders_completed
  FROM public.orders
  WHERE user_id = _user_id
    AND created_at >= now() - interval '180 days';

  SELECT count(*) INTO v_crm_contacts
  FROM public.crm_contacts
  WHERE owner_advisor_id = _user_id
    AND archived_at IS NULL;

  SELECT count(*) INTO v_crm_interactions
  FROM public.crm_activity_log
  WHERE advisor_id = _user_id
    AND occurred_at >= now() - interval '60 days';

  SELECT count(*), count(*) FILTER (WHERE status = 'completed')
  INTO v_goal_total, v_goal_completed
  FROM public.advisor_goal_assignments
  WHERE advisor_id = _user_id
    AND created_at >= now() - interval '90 days';

  SELECT count(*), count(*) FILTER (WHERE status = 'completed')
  INTO v_academy_total, v_academy_completed
  FROM public.academy_user_progress
  WHERE user_id = _user_id;

  SELECT count(*) INTO v_certifications
  FROM public.academy_user_certifications
  WHERE user_id = _user_id
    AND status = 'issued';

  SELECT count(*) INTO v_assets
  FROM public.commercial_asset_generations
  WHERE owner_id = _user_id
    AND created_at >= now() - interval '90 days';

  SELECT count(*), COALESCE(avg(rating), 0)
  INTO v_reviews, v_avg_rating
  FROM public.reviews
  WHERE user_id = _user_id
    AND is_approved = true;

  SELECT count(*),
         count(*) FILTER (
           WHERE is_active = true
             AND image_url IS NOT NULL
             AND length(COALESCE(description, '')) >= 60
         )
  INTO v_product_count, v_product_quality
  FROM public.products
  WHERE vendor_id = _user_id;

  SELECT count(*) INTO v_fraud_signals
  FROM public.fraud_risk_signals
  WHERE user_id = _user_id
    AND created_at >= now() - interval '180 days';

  v_activity_score := LEAST(100, (v_orders_completed * 12) + (v_crm_interactions * 2) + (v_assets * 4));
  v_regular_score := LEAST(100, (v_crm_contacts * 3) + (v_crm_interactions * 3));
  v_goal_score := CASE WHEN v_goal_total = 0 THEN 35 ELSE round(100.0 * v_goal_completed / NULLIF(v_goal_total, 0), 2) END;
  v_training_score := LEAST(100, (v_academy_completed * 12) + (v_certifications * 20));
  v_tools_score := LEAST(100, (v_assets * 10) + (v_crm_interactions * 2));
  v_marketplace_score := CASE WHEN v_product_count = 0 THEN 50 ELSE round(100.0 * v_product_quality / NULLIF(v_product_count, 0), 2) END;
  v_satisfaction_score := CASE WHEN v_reviews = 0 THEN 60 ELSE LEAST(100, round(v_avg_rating * 20, 2)) END;

  v_business_score := round(
    (v_activity_score * 0.22)
    + (v_regular_score * 0.14)
    + (v_goal_score * 0.16)
    + (v_training_score * 0.16)
    + (v_tools_score * 0.14)
    + (v_marketplace_score * 0.10)
    + (v_satisfaction_score * 0.08),
    2
  );

  v_trust_score := round(
    GREATEST(
      0,
      LEAST(
        100,
        100
        - (CASE WHEN v_orders_total = 0 THEN 0 ELSE (100.0 * v_orders_cancelled / NULLIF(v_orders_total, 0)) * 0.45 END)
        - (CASE WHEN v_orders_total = 0 THEN 0 ELSE (100.0 * v_orders_refunded / NULLIF(v_orders_total, 0)) * 0.35 END)
        - (v_fraud_signals * 12)
        + (CASE WHEN v_certifications > 0 THEN 5 ELSE 0 END)
        + (CASE WHEN v_marketplace_score >= 80 THEN 5 ELSE 0 END)
      )
    ),
    2
  );

  v_global_score := round((v_business_score * 0.6) + (v_trust_score * 0.4), 2);

  IF v_business_score >= 75 THEN
    v_strengths := v_strengths || 'activite_commerciale_solide';
  ELSE
    v_improvements := v_improvements || 'renforcer_activite_commerciale';
    v_recommendations := v_recommendations || jsonb_build_array(jsonb_build_object(
      'type', 'coaching',
      'title', 'Renforcer votre activite commerciale',
      'description', 'Planifiez des relances CRM et utilisez les objectifs IA chaque semaine.'
    ));
  END IF;

  IF v_training_score >= 70 THEN
    v_strengths := v_strengths || 'formation_active';
  ELSE
    v_improvements := v_improvements || 'completer_formations_lpb';
    v_recommendations := v_recommendations || jsonb_build_array(jsonb_build_object(
      'type', 'training',
      'title', 'Completer les formations LPB',
      'description', 'Terminez les modules Academy pour renforcer votre credibilite commerciale.'
    ));
  END IF;

  IF v_trust_score >= 90 THEN
    v_strengths := v_strengths || 'fiabilite_elevee';
  ELSE
    v_improvements := v_improvements || 'ameliorer_fiabilite_operationnelle';
    v_recommendations := v_recommendations || jsonb_build_array(jsonb_build_object(
      'type', 'trust',
      'title', 'Ameliorer la fiabilite',
      'description', 'Reduisez les annulations, gardez des descriptions conformes et traitez les alertes rapidement.'
    ));
  END IF;

  IF v_goal_score >= 80 THEN
    v_strengths := v_strengths || 'objectifs_ia_maitrises';
  ELSE
    v_improvements := v_improvements || 'suivre_objectifs_ia';
  END IF;

  v_metrics := jsonb_build_object(
    'orders_total_180d', v_orders_total,
    'orders_completed_180d', v_orders_completed,
    'orders_cancelled_180d', v_orders_cancelled,
    'orders_refunded_180d', v_orders_refunded,
    'crm_contacts', v_crm_contacts,
    'crm_interactions_60d', v_crm_interactions,
    'ai_goals_total_90d', v_goal_total,
    'ai_goals_completed_90d', v_goal_completed,
    'academy_courses_total', v_academy_total,
    'academy_courses_completed', v_academy_completed,
    'certifications_issued', v_certifications,
    'commercial_assets_90d', v_assets,
    'reviews_count', v_reviews,
    'average_rating', v_avg_rating,
    'marketplace_products', v_product_count,
    'marketplace_quality_products', v_product_quality,
    'fraud_signals_180d', v_fraud_signals,
    'activity_score', v_activity_score,
    'regularity_score', v_regular_score,
    'goal_score', v_goal_score,
    'training_score', v_training_score,
    'tools_score', v_tools_score,
    'marketplace_score', v_marketplace_score,
    'satisfaction_score', v_satisfaction_score
  );

  INSERT INTO public.business_score_snapshots(
    user_id, profile_type, business_score, trust_score, global_score, score_level,
    strengths, improvement_areas, recommendations, metrics
  )
  VALUES (
    _user_id,
    v_profile.profile_type,
    v_business_score,
    v_trust_score,
    v_global_score,
    CASE
      WHEN v_global_score >= 90 THEN 'elite'
      WHEN v_global_score >= 75 THEN 'confirmed'
      WHEN v_global_score >= 55 THEN 'progressing'
      ELSE 'starter'
    END,
    v_strengths,
    v_improvements,
    v_recommendations,
    v_metrics
  )
  RETURNING id INTO v_snapshot_id;

  INSERT INTO public.business_score_recommendations(user_id, snapshot_id, recommendation_type, title, description, priority, metadata)
  SELECT
    _user_id,
    v_snapshot_id,
    COALESCE(item->>'type', 'coaching'),
    item->>'title',
    item->>'description',
    CASE WHEN v_global_score < 50 THEN 'high' ELSE 'medium' END,
    jsonb_build_object('source', 'calculate_business_trust_score')
  FROM jsonb_array_elements(v_recommendations) AS item;

  INSERT INTO public.business_score_user_badges(user_id, badge_id, snapshot_id, reason)
  SELECT _user_id, b.id, v_snapshot_id, 'automatic_score_threshold'
  FROM public.business_score_badges b
  WHERE b.is_active = true
    AND v_business_score >= b.min_business_score
    AND v_trust_score >= b.min_trust_score
  ON CONFLICT (user_id, badge_id) DO UPDATE
  SET status = 'earned',
      snapshot_id = EXCLUDED.snapshot_id,
      earned_at = now(),
      revoked_at = NULL,
      reason = EXCLUDED.reason;

  INSERT INTO public.business_score_events(user_id, event_type, event_source, score_dimension, impact, reason, payload)
  VALUES (
    _user_id,
    'score_calculated',
    'business_score_engine',
    'global',
    v_global_score,
    'Business Score and Trust Score calculated in P1.7 observation mode',
    jsonb_build_object('snapshot_id', v_snapshot_id, 'metrics', v_metrics)
  );

  RETURN jsonb_build_object(
    'snapshot_id', v_snapshot_id,
    'business_score', v_business_score,
    'trust_score', v_trust_score,
    'global_score', v_global_score,
    'score_level', CASE
      WHEN v_global_score >= 90 THEN 'elite'
      WHEN v_global_score >= 75 THEN 'confirmed'
      WHEN v_global_score >= 55 THEN 'progressing'
      ELSE 'starter'
    END,
    'financial_impact', 'none'
  );
END;
$$;

CREATE OR REPLACE VIEW public.my_business_trust_score_dashboard AS
SELECT DISTINCT ON (s.user_id)
  s.user_id,
  p.profile_type,
  p.display_name,
  s.business_score,
  s.trust_score,
  s.global_score,
  s.score_level,
  s.strengths,
  s.improvement_areas,
  s.recommendations,
  s.metrics,
  s.scoring_version,
  s.rule_version,
  s.calculated_at
FROM public.business_score_snapshots s
LEFT JOIN public.business_score_profiles p ON p.user_id = s.user_id
WHERE s.user_id = auth.uid() OR public.business_score_is_admin()
ORDER BY s.user_id, s.calculated_at DESC;

CREATE OR REPLACE VIEW public.my_business_score_badges AS
SELECT
  ub.user_id,
  b.slug,
  b.title,
  b.description,
  b.badge_type,
  ub.status,
  ub.reason,
  ub.earned_at
FROM public.business_score_user_badges ub
JOIN public.business_score_badges b ON b.id = ub.badge_id
WHERE ub.user_id = auth.uid() OR public.business_score_is_admin()
ORDER BY ub.earned_at DESC;

CREATE OR REPLACE VIEW public.my_business_score_recommendations AS
SELECT
  id,
  user_id,
  recommendation_type,
  title,
  description,
  priority,
  status,
  metadata,
  created_at,
  updated_at
FROM public.business_score_recommendations
WHERE user_id = auth.uid() OR public.business_score_is_admin()
ORDER BY
  CASE priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
  created_at DESC;

CREATE OR REPLACE VIEW public.admin_business_score_leaderboard AS
SELECT DISTINCT ON (s.user_id)
  s.user_id,
  p.display_name,
  p.profile_type,
  s.business_score,
  s.trust_score,
  s.global_score,
  s.score_level,
  s.strengths,
  s.improvement_areas,
  s.calculated_at
FROM public.business_score_snapshots s
LEFT JOIN public.business_score_profiles p ON p.user_id = s.user_id
WHERE public.business_score_is_admin()
ORDER BY s.user_id, s.calculated_at DESC;

CREATE OR REPLACE VIEW public.admin_business_score_alerts AS
SELECT DISTINCT ON (s.user_id)
  s.user_id,
  p.display_name,
  p.profile_type,
  s.business_score,
  s.trust_score,
  s.global_score,
  s.improvement_areas,
  CASE
    WHEN s.trust_score < 50 THEN 'critical_trust'
    WHEN s.business_score < 40 THEN 'low_business_activity'
    WHEN s.global_score < 55 THEN 'needs_support'
    ELSE 'watch'
  END AS alert_type,
  s.calculated_at
FROM public.business_score_snapshots s
LEFT JOIN public.business_score_profiles p ON p.user_id = s.user_id
WHERE public.business_score_is_admin()
  AND (s.trust_score < 70 OR s.business_score < 55 OR s.global_score < 60)
ORDER BY s.user_id, s.calculated_at DESC;

INSERT INTO public.business_score_badges(slug, title, description, badge_type, min_business_score, min_trust_score, required_metrics)
VALUES
  ('conseiller-actif', 'Conseiller Actif', 'Activite commerciale reguliere et suivi CRM visible.', 'business', 60, 60, '{"signals":["crm","orders","goals"]}'::jsonb),
  ('expert-champagne', 'Expert Champagne', 'Profil pret a conseiller les ventes Champagne et cadeaux premium.', 'expertise', 70, 75, '{"signals":["academy","certification"]}'::jsonb),
  ('expert-entreprises', 'Expert Entreprises', 'Capacite a traiter les opportunites B2B et vente en gros.', 'expertise', 75, 75, '{"signals":["b2b","wholesale","quotes"]}'::jsonb),
  ('relance-master', 'Relance Master', 'Relances CRM et conversations suivies avec regularite.', 'engagement', 70, 70, '{"signals":["crm_interactions"]}'::jsonb),
  ('marketplace-premium', 'Marketplace Premium', 'Fiches produits, images et conformite marketplace solides.', 'marketplace', 65, 80, '{"signals":["product_quality"]}'::jsonb),
  ('client-fidelise', 'Client Fidelise', 'Satisfaction et retention client positives.', 'business', 70, 80, '{"signals":["reviews","retention"]}'::jsonb),
  ('formation-complete', 'Formation Complete', 'Progression Academy et certifications en avance.', 'engagement', 65, 75, '{"signals":["academy"]}'::jsonb),
  ('ia-expert', 'IA Expert', 'Utilisation active des outils IA LPB.', 'engagement', 70, 70, '{"signals":["ai_goals","coach","assets"]}'::jsonb),
  ('top-conseiller', 'Top Conseiller', 'Performance globale elevee et confiance forte.', 'business', 85, 85, '{"signals":["global_score"]}'::jsonb),
  ('partenaire-verifie', 'Partenaire Verifie', 'Fiabilite durable et conformite operationnelle.', 'trust', 50, 90, '{"signals":["trust_score"]}'::jsonb)
ON CONFLICT (slug) DO NOTHING;

ALTER TABLE public.business_score_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_score_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_score_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_score_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_score_user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_score_recommendations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Business score own profile" ON public.business_score_profiles;
CREATE POLICY "Business score own profile" ON public.business_score_profiles
FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.business_score_is_admin());

DROP POLICY IF EXISTS "Business score admin profiles manage" ON public.business_score_profiles;
CREATE POLICY "Business score admin profiles manage" ON public.business_score_profiles
FOR ALL TO authenticated
USING (public.business_score_is_admin())
WITH CHECK (public.business_score_is_admin());

DROP POLICY IF EXISTS "Business score own snapshots" ON public.business_score_snapshots;
CREATE POLICY "Business score own snapshots" ON public.business_score_snapshots
FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.business_score_is_admin());

DROP POLICY IF EXISTS "Business score insert own snapshots" ON public.business_score_snapshots;
CREATE POLICY "Business score insert own snapshots" ON public.business_score_snapshots
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() OR public.business_score_is_admin());

DROP POLICY IF EXISTS "Business score own events" ON public.business_score_events;
CREATE POLICY "Business score own events" ON public.business_score_events
FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.business_score_is_admin());

DROP POLICY IF EXISTS "Business score insert own events" ON public.business_score_events;
CREATE POLICY "Business score insert own events" ON public.business_score_events
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() OR public.business_score_is_admin());

DROP POLICY IF EXISTS "Business score badges readable" ON public.business_score_badges;
CREATE POLICY "Business score badges readable" ON public.business_score_badges
FOR SELECT TO authenticated
USING (is_active = true OR public.business_score_is_admin());

DROP POLICY IF EXISTS "Business score badges admin manage" ON public.business_score_badges;
CREATE POLICY "Business score badges admin manage" ON public.business_score_badges
FOR ALL TO authenticated
USING (public.business_score_is_admin())
WITH CHECK (public.business_score_is_admin());

DROP POLICY IF EXISTS "Business score own user badges" ON public.business_score_user_badges;
CREATE POLICY "Business score own user badges" ON public.business_score_user_badges
FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.business_score_is_admin());

DROP POLICY IF EXISTS "Business score insert own badges" ON public.business_score_user_badges;
CREATE POLICY "Business score insert own badges" ON public.business_score_user_badges
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() OR public.business_score_is_admin());

DROP POLICY IF EXISTS "Business score update own badges" ON public.business_score_user_badges;
CREATE POLICY "Business score update own badges" ON public.business_score_user_badges
FOR UPDATE TO authenticated
USING (user_id = auth.uid() OR public.business_score_is_admin())
WITH CHECK (user_id = auth.uid() OR public.business_score_is_admin());

DROP POLICY IF EXISTS "Business score own recommendations" ON public.business_score_recommendations;
CREATE POLICY "Business score own recommendations" ON public.business_score_recommendations
FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.business_score_is_admin());

DROP POLICY IF EXISTS "Business score insert own recommendations" ON public.business_score_recommendations;
CREATE POLICY "Business score insert own recommendations" ON public.business_score_recommendations
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() OR public.business_score_is_admin());

DROP POLICY IF EXISTS "Business score update own recommendations" ON public.business_score_recommendations;
CREATE POLICY "Business score update own recommendations" ON public.business_score_recommendations
FOR UPDATE TO authenticated
USING (user_id = auth.uid() OR public.business_score_is_admin())
WITH CHECK (user_id = auth.uid() OR public.business_score_is_admin());

GRANT SELECT ON public.my_business_trust_score_dashboard TO authenticated, service_role;
GRANT SELECT ON public.my_business_score_badges TO authenticated, service_role;
GRANT SELECT ON public.my_business_score_recommendations TO authenticated, service_role;
GRANT SELECT ON public.admin_business_score_leaderboard TO authenticated, service_role;
GRANT SELECT ON public.admin_business_score_alerts TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON
  public.business_score_profiles,
  public.business_score_badges,
  public.business_score_user_badges,
  public.business_score_recommendations
TO authenticated, service_role;
GRANT SELECT, INSERT ON public.business_score_snapshots, public.business_score_events TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.calculate_business_trust_score(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.calculate_business_trust_score(uuid) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
