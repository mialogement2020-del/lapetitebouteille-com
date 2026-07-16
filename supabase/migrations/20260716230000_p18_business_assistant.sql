-- P1.8 - LPB Business Assistant IA.
-- Advisory orchestration only: never mutates wallets, commissions, orders, Commission Pool, Revenue Engine or P0.

ALTER TYPE public.admin_permission ADD VALUE IF NOT EXISTS 'business_assistant';

CREATE OR REPLACE FUNCTION public.business_assistant_is_admin()
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
        AND ap.permission::text IN (
          'full_access',
          'business_assistant',
          'business_scores',
          'academy',
          'commercial_assets',
          'conversation_coach',
          'ai_goals',
          'commercial_calendar',
          'crm'
        )
    );
$$;

CREATE TABLE IF NOT EXISTS public.business_assistant_context_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  period text NOT NULL DEFAULT 'daily' CHECK (period IN ('daily', 'weekly', 'monthly', 'personal', 'personal_review')),
  summary_title text NOT NULL DEFAULT 'Business Assistant Snapshot',
  summary_text text NOT NULL,
  data_used jsonb NOT NULL DEFAULT '{}'::jsonb,
  rules_applied jsonb NOT NULL DEFAULT '{}'::jsonb,
  strengths text[] NOT NULL DEFAULT '{}',
  weaknesses text[] NOT NULL DEFAULT '{}',
  next_best_actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  recommended_products jsonb NOT NULL DEFAULT '[]'::jsonb,
  recommended_campaigns jsonb NOT NULL DEFAULT '[]'::jsonb,
  recommended_courses jsonb NOT NULL DEFAULT '[]'::jsonb,
  source_versions jsonb NOT NULL DEFAULT '{}'::jsonb,
  assistant_version text NOT NULL DEFAULT 'p1.8-business-assistant-v1',
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.business_assistant_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  snapshot_id uuid REFERENCES public.business_assistant_context_snapshots(id) ON DELETE SET NULL,
  recommendation_type text NOT NULL CHECK (recommendation_type IN (
    'crm_follow_up', 'goal_priority', 'product_recommendation', 'campaign',
    'academy', 'asset', 'score_improvement', 'marketplace', 'general'
  )),
  title text NOT NULL,
  description text NOT NULL,
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'accepted', 'completed', 'dismissed')),
  explanation jsonb NOT NULL DEFAULT '{}'::jsonb,
  data_used jsonb NOT NULL DEFAULT '{}'::jsonb,
  rules_applied jsonb NOT NULL DEFAULT '{}'::jsonb,
  expected_impact jsonb NOT NULL DEFAULT '{}'::jsonb,
  due_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.business_assistant_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  alert_type text NOT NULL CHECK (alert_type IN (
    'inactive_client', 'missed_opportunity', 'campaign_ending',
    'goal_late', 'activity_drop', 'exceptional_progress',
    'new_certification', 'product_fit', 'trust_risk', 'business_score_drop'
  )),
  severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('info', 'low', 'medium', 'high', 'critical')),
  title text NOT NULL,
  description text NOT NULL,
  explanation jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved', 'dismissed')),
  source_entity_type text,
  source_entity_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.business_assistant_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  question text NOT NULL CHECK (char_length(trim(question)) >= 3),
  answer text NOT NULL,
  intent text NOT NULL DEFAULT 'general',
  confidence numeric NOT NULL DEFAULT 0 CHECK (confidence >= 0 AND confidence <= 100),
  data_used jsonb NOT NULL DEFAULT '{}'::jsonb,
  rules_applied jsonb NOT NULL DEFAULT '{}'::jsonb,
  recommended_actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.business_assistant_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  summary_type text NOT NULL CHECK (summary_type IN ('daily', 'weekly', 'monthly', 'personal_review')),
  period_start date NOT NULL,
  period_end date NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  recommendations jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, summary_type, period_start, period_end)
);

CREATE INDEX IF NOT EXISTS idx_business_assistant_snapshots_user ON public.business_assistant_context_snapshots(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_business_assistant_recommendations_user ON public.business_assistant_recommendations(user_id, status, priority);
CREATE INDEX IF NOT EXISTS idx_business_assistant_alerts_user ON public.business_assistant_alerts(user_id, status, severity);
CREATE INDEX IF NOT EXISTS idx_business_assistant_questions_user ON public.business_assistant_questions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_business_assistant_summaries_user ON public.business_assistant_summaries(user_id, summary_type, period_start DESC);

CREATE OR REPLACE FUNCTION public.business_assistant_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.business_assistant_history_is_append_only()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'business_assistant_history_append_only';
END;
$$;

DROP TRIGGER IF EXISTS trg_business_assistant_recommendations_touch ON public.business_assistant_recommendations;
CREATE TRIGGER trg_business_assistant_recommendations_touch
BEFORE UPDATE ON public.business_assistant_recommendations
FOR EACH ROW EXECUTE FUNCTION public.business_assistant_touch_updated_at();

DROP TRIGGER IF EXISTS trg_business_assistant_alerts_touch ON public.business_assistant_alerts;
CREATE TRIGGER trg_business_assistant_alerts_touch
BEFORE UPDATE ON public.business_assistant_alerts
FOR EACH ROW EXECUTE FUNCTION public.business_assistant_touch_updated_at();

DROP TRIGGER IF EXISTS trg_business_assistant_snapshots_append_only ON public.business_assistant_context_snapshots;
CREATE TRIGGER trg_business_assistant_snapshots_append_only
BEFORE UPDATE OR DELETE ON public.business_assistant_context_snapshots
FOR EACH ROW EXECUTE FUNCTION public.business_assistant_history_is_append_only();

DROP TRIGGER IF EXISTS trg_business_assistant_questions_append_only ON public.business_assistant_questions;
CREATE TRIGGER trg_business_assistant_questions_append_only
BEFORE UPDATE OR DELETE ON public.business_assistant_questions
FOR EACH ROW EXECUTE FUNCTION public.business_assistant_history_is_append_only();

CREATE OR REPLACE VIEW public.business_assistant_source_context AS
SELECT
  auth.uid() AS user_id,
  COALESCE(c.contacts_total, 0)::integer AS crm_contacts_total,
  COALESCE(c.prospects_active, 0)::integer AS prospects_active,
  COALESCE(c.customers_active, 0)::integer AS customers_active,
  COALESCE(c.dormant_contacts, 0)::integer AS dormant_contacts,
  COALESCE(c.tasks_due, 0)::integer AS crm_tasks_due,
  COALESCE(c.hot_opportunities, 0)::integer AS hot_opportunities,
  COALESCE(g.daily_remaining, 0)::integer AS daily_goals_remaining,
  COALESCE(g.weekly_remaining, 0)::integer AS weekly_goals_remaining,
  COALESCE(g.completed_total, 0)::integer AS goals_completed_total,
  COALESCE(g.overdue_total, 0)::integer AS overdue_goals,
  COALESCE(s.business_score, 0)::numeric AS business_score,
  COALESCE(s.trust_score, 0)::numeric AS trust_score,
  COALESCE(s.global_score, 0)::numeric AS global_score,
  s.score_level,
  s.strengths,
  s.improvement_areas,
  COALESCE(a.academy_completed_total, 0)::integer AS academy_completed_total,
  COALESCE(a.academy_in_progress_total, 0)::integer AS academy_in_progress_total,
  COALESCE(a.certifications_total, 0)::integer AS certifications_total,
  COALESCE(asset.generated_7d, 0)::integer AS assets_generated_7d,
  COALESCE(asset.shares_7d, 0)::integer AS asset_shares_7d,
  COALESCE(o.active_opportunities, 0)::integer AS active_commercial_opportunities,
  COALESCE(o.priority_opportunities, 0)::integer AS priority_opportunities,
  COALESCE(p.featured_products, 0)::integer AS featured_products,
  COALESCE(p.available_products, 0)::integer AS available_products,
  now() AS generated_at
FROM (SELECT 1) base
LEFT JOIN public.crm_dashboard_summary c ON true
LEFT JOIN public.advisor_ai_goals_summary g ON true
LEFT JOIN public.my_business_trust_score_dashboard s ON s.user_id = auth.uid()
LEFT JOIN LATERAL (
  SELECT
    count(*) FILTER (WHERE up.status = 'completed') AS academy_completed_total,
    count(*) FILTER (WHERE up.status = 'in_progress') AS academy_in_progress_total,
    (
      SELECT count(*)
      FROM public.academy_user_certifications uc
      WHERE uc.user_id = auth.uid()
        AND uc.status IN ('eligible', 'pending_validation', 'issued')
    ) AS certifications_total
  FROM public.academy_user_progress up
  WHERE up.user_id = auth.uid()
) a ON true
LEFT JOIN LATERAL (
  SELECT
    count(*) FILTER (WHERE g.created_at >= now() - interval '7 days') AS generated_7d,
    (
      SELECT count(*)
      FROM public.commercial_asset_events e
      WHERE e.owner_id = auth.uid()
        AND e.event_type = 'shared'
        AND e.created_at >= now() - interval '7 days'
    ) AS shares_7d
  FROM public.commercial_asset_generations g
  WHERE g.owner_id = auth.uid()
) asset ON true
LEFT JOIN LATERAL (
  SELECT
    count(*) AS active_opportunities,
    count(*) FILTER (WHERE priority IN ('high', 'critical')) AS priority_opportunities
  FROM public.advisor_commercial_opportunity_calendar
  WHERE ends_at >= now()
) o ON true
LEFT JOIN LATERAL (
  SELECT
    count(*) FILTER (WHERE COALESCE(is_featured, false) = true) AS featured_products,
    count(*) FILTER (WHERE COALESCE(stock_quantity, 0) > 0) AS available_products
  FROM public.products
  WHERE COALESCE(is_active, true) = true
) p ON true
WHERE auth.uid() IS NOT NULL;

CREATE OR REPLACE FUNCTION public.generate_business_assistant_snapshot(_period text DEFAULT 'daily', _user_id uuid DEFAULT auth.uid())
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_context record;
  v_snapshot_id uuid;
  v_strengths text[] := '{}';
  v_weaknesses text[] := '{}';
  v_actions jsonb := '[]'::jsonb;
  v_recommended_products jsonb := '[]'::jsonb;
  v_recommended_campaigns jsonb := '[]'::jsonb;
  v_recommended_courses jsonb := '[]'::jsonb;
  v_summary text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'auth_required';
  END IF;

  IF _user_id <> auth.uid() AND NOT public.business_assistant_is_admin() THEN
    RAISE EXCEPTION 'business_assistant_permission_denied';
  END IF;

  SELECT * INTO v_context
  FROM public.business_assistant_source_context
  WHERE user_id = _user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'business_assistant_context_unavailable';
  END IF;

  IF COALESCE(v_context.business_score, 0) >= 70 THEN
    v_strengths := array_append(v_strengths, 'business_score_solide');
  ELSE
    v_weaknesses := array_append(v_weaknesses, 'business_score_a_ameliorer');
  END IF;

  IF COALESCE(v_context.trust_score, 0) >= 75 THEN
    v_strengths := array_append(v_strengths, 'trust_score_solide');
  ELSE
    v_weaknesses := array_append(v_weaknesses, 'trust_score_a_surveillance');
  END IF;

  IF COALESCE(v_context.crm_tasks_due, 0) > 0 THEN
    v_actions := v_actions || jsonb_build_array(jsonb_build_object(
      'type', 'crm_follow_up',
      'title', 'Traiter les relances CRM dues',
      'priority', CASE WHEN v_context.crm_tasks_due >= 5 THEN 'high' ELSE 'medium' END,
      'reason', 'crm_tasks_due',
      'value', v_context.crm_tasks_due
    ));
    v_weaknesses := array_append(v_weaknesses, 'relances_crm_en_retard');
  END IF;

  IF COALESCE(v_context.overdue_goals, 0) > 0 THEN
    v_actions := v_actions || jsonb_build_array(jsonb_build_object(
      'type', 'goal_priority',
      'title', 'Rattraper les objectifs IA en retard',
      'priority', 'high',
      'reason', 'overdue_goals',
      'value', v_context.overdue_goals
    ));
  END IF;

  IF COALESCE(v_context.active_commercial_opportunities, 0) > 0 THEN
    v_strengths := array_append(v_strengths, 'opportunites_commerciales_disponibles');
    v_actions := v_actions || jsonb_build_array(jsonb_build_object(
      'type', 'campaign',
      'title', 'Utiliser les campagnes actives du calendrier IA',
      'priority', CASE WHEN v_context.priority_opportunities > 0 THEN 'high' ELSE 'medium' END,
      'reason', 'active_commercial_opportunities',
      'value', v_context.active_commercial_opportunities
    ));
  END IF;

  IF COALESCE(v_context.academy_completed_total, 0) = 0 THEN
    v_actions := v_actions || jsonb_build_array(jsonb_build_object(
      'type', 'academy',
      'title', 'Commencer une formation Academy',
      'priority', 'medium',
      'reason', 'no_academy_completion'
    ));
    v_weaknesses := array_append(v_weaknesses, 'formation_academy_a_completer');
  END IF;

  IF COALESCE(v_context.assets_generated_7d, 0) = 0 THEN
    v_actions := v_actions || jsonb_build_array(jsonb_build_object(
      'type', 'asset',
      'title', 'Generer un support commercial partageable',
      'priority', 'medium',
      'reason', 'no_recent_asset'
    ));
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'product_id', p.id,
    'name', p.name,
    'slug', p.slug,
    'price', p.price,
    'stock_quantity', p.stock_quantity,
    'image_url', p.image_url,
    'reason', CASE WHEN COALESCE(p.is_featured, false) THEN 'featured_product' ELSE 'available_product' END
  ) ORDER BY COALESCE(p.is_featured, false) DESC, p.created_at DESC), '[]'::jsonb)
  INTO v_recommended_products
  FROM (
    SELECT id, name, slug, price, stock_quantity, image_url, is_featured, created_at
    FROM public.products
    WHERE COALESCE(is_active, true) = true
      AND COALESCE(stock_quantity, 0) > 0
    ORDER BY COALESCE(is_featured, false) DESC, created_at DESC
    LIMIT 8
  ) p;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', o.id,
    'name', o.name,
    'priority', o.priority,
    'category', o.category,
    'starts_at', o.starts_at,
    'ends_at', o.ends_at,
    'reason', 'commercial_calendar'
  ) ORDER BY o.starts_at ASC), '[]'::jsonb)
  INTO v_recommended_campaigns
  FROM (
    SELECT id, name, priority, category, starts_at, ends_at
    FROM public.advisor_commercial_opportunity_calendar
    WHERE ends_at >= now()
    ORDER BY CASE priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END, starts_at ASC
    LIMIT 6
  ) o;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'course_id', c.id,
    'title', c.title,
    'level', c.level,
    'course_type', c.course_type,
    'reason', 'academy_recommendation'
  ) ORDER BY c.sort_order ASC), '[]'::jsonb)
  INTO v_recommended_courses
  FROM (
    SELECT c.id, c.title, c.level, c.course_type, c.sort_order
    FROM public.academy_courses c
    LEFT JOIN public.academy_user_progress up ON up.course_id = c.id AND up.user_id = _user_id
    WHERE c.is_active = true
      AND c.is_published = true
      AND COALESCE(up.status, 'not_started') <> 'completed'
    ORDER BY c.is_required DESC, c.sort_order ASC
    LIMIT 5
  ) c;

  v_summary := format(
    'Aujourd hui: %s relances CRM dues, %s objectifs en retard, %s opportunites commerciales actives, Business Score %s, Trust Score %s.',
    COALESCE(v_context.crm_tasks_due, 0),
    COALESCE(v_context.overdue_goals, 0),
    COALESCE(v_context.active_commercial_opportunities, 0),
    COALESCE(v_context.business_score, 0),
    COALESCE(v_context.trust_score, 0)
  );

  INSERT INTO public.business_assistant_context_snapshots(
    user_id, period, summary_title, summary_text, data_used, rules_applied,
    strengths, weaknesses, next_best_actions, recommended_products,
    recommended_campaigns, recommended_courses, source_versions
  )
  VALUES (
    _user_id,
    COALESCE(NULLIF(_period, ''), 'daily'),
    'Resume Business Assistant',
    v_summary,
    to_jsonb(v_context),
    jsonb_build_object(
      'no_financial_mutation', true,
      'source_modules', ARRAY['crm', 'commercial_calendar', 'ai_goals', 'coach', 'commercial_assets', 'academy', 'business_scores', 'catalogue'],
      'recommendation_policy', 'explainable_advisory_only'
    ),
    v_strengths,
    v_weaknesses,
    v_actions,
    v_recommended_products,
    v_recommended_campaigns,
    v_recommended_courses,
    jsonb_build_object('business_assistant', 'p1.8', 'p0_access', 'forbidden')
  )
  RETURNING id INTO v_snapshot_id;

  INSERT INTO public.business_assistant_recommendations(user_id, snapshot_id, recommendation_type, title, description, priority, explanation, data_used, rules_applied, expected_impact)
  SELECT
    _user_id,
    v_snapshot_id,
    action->>'type',
    action->>'title',
    'Action conseillee par le Business Assistant a partir des signaux P1 disponibles.',
    COALESCE(action->>'priority', 'medium'),
    jsonb_build_object('why', action->>'reason', 'value', action->'value'),
    jsonb_build_object('snapshot_id', v_snapshot_id, 'source_context', to_jsonb(v_context)),
    jsonb_build_object('mode', 'advisory_only', 'financial_impact', 'none'),
    jsonb_build_object('sales', 'positive', 'platform_revenue', 'indirect', 'p0_impact', 'none')
  FROM jsonb_array_elements(v_actions) action;

  IF COALESCE(v_context.crm_tasks_due, 0) > 0 THEN
    INSERT INTO public.business_assistant_alerts(user_id, alert_type, severity, title, description, explanation)
    VALUES (
      _user_id,
      'inactive_client',
      CASE WHEN v_context.crm_tasks_due >= 5 THEN 'high' ELSE 'medium' END,
      'Relances CRM a traiter',
      'Des clients ou prospects attendent une relance.',
      jsonb_build_object('data_used', 'crm_tasks_due', 'value', v_context.crm_tasks_due)
    );
  END IF;

  IF COALESCE(v_context.overdue_goals, 0) > 0 THEN
    INSERT INTO public.business_assistant_alerts(user_id, alert_type, severity, title, description, explanation)
    VALUES (
      _user_id,
      'goal_late',
      'high',
      'Objectifs IA en retard',
      'Certains objectifs doivent etre priorises pour maintenir la progression.',
      jsonb_build_object('data_used', 'overdue_goals', 'value', v_context.overdue_goals)
    );
  END IF;

  RETURN jsonb_build_object(
    'snapshot_id', v_snapshot_id,
    'summary', v_summary,
    'actions_created', jsonb_array_length(v_actions),
    'financial_impact', 'none'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.ask_business_assistant(_question text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_context record;
  v_intent text := 'general';
  v_answer text;
  v_actions jsonb := '[]'::jsonb;
  v_question_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'auth_required';
  END IF;

  IF char_length(trim(COALESCE(_question, ''))) < 3 THEN
    RAISE EXCEPTION 'business_assistant_question_required';
  END IF;

  SELECT * INTO v_context
  FROM public.business_assistant_source_context
  WHERE user_id = auth.uid();

  IF lower(_question) LIKE '%aujourd%' OR lower(_question) LIKE '%priorit%' THEN
    v_intent := 'daily_plan';
    v_answer := format(
      'Priorite: traiter %s relances CRM dues, puis rattraper %s objectifs en retard. Ensuite, utilisez les %s opportunites commerciales actives.',
      COALESCE(v_context.crm_tasks_due, 0),
      COALESCE(v_context.overdue_goals, 0),
      COALESCE(v_context.active_commercial_opportunities, 0)
    );
    v_actions := jsonb_build_array(
      jsonb_build_object('type', 'crm_follow_up', 'label', 'Relancer les contacts dus'),
      jsonb_build_object('type', 'goal_priority', 'label', 'Avancer les objectifs en retard')
    );
  ELSIF lower(_question) LIKE '%client%' OR lower(_question) LIKE '%relanc%' THEN
    v_intent := 'crm_follow_up';
    v_answer := format(
      'Le CRM indique %s relances dues, %s prospects actifs et %s clients dormants. Commencez par les relances les plus anciennes et les opportunites chaudes.',
      COALESCE(v_context.crm_tasks_due, 0),
      COALESCE(v_context.prospects_active, 0),
      COALESCE(v_context.dormant_contacts, 0)
    );
    v_actions := jsonb_build_array(jsonb_build_object('type', 'crm', 'label', 'Ouvrir les relances CRM'));
  ELSIF lower(_question) LIKE '%score%' OR lower(_question) LIKE '%niveau%' OR lower(_question) LIKE '%baisse%' THEN
    v_intent := 'score_explanation';
    v_answer := format(
      'Votre Business Score est %s et votre Trust Score est %s. Les axes detectes sont: %s. Les donnees utilisees viennent des objectifs, du CRM, de l Academy, des outils IA et des signaux de confiance.',
      COALESCE(v_context.business_score, 0),
      COALESCE(v_context.trust_score, 0),
      COALESCE(array_to_string(v_context.improvement_areas, ', '), 'aucun axe critique')
    );
    v_actions := jsonb_build_array(jsonb_build_object('type', 'score_improvement', 'label', 'Consulter Scores IA'));
  ELSIF lower(_question) LIKE '%cours%' OR lower(_question) LIKE '%academy%' OR lower(_question) LIKE '%formation%' THEN
    v_intent := 'academy';
    v_answer := format(
      'Vous avez %s formations terminees et %s en cours. Priorisez une formation liee a votre objectif commercial de la semaine.',
      COALESCE(v_context.academy_completed_total, 0),
      COALESCE(v_context.academy_in_progress_total, 0)
    );
    v_actions := jsonb_build_array(jsonb_build_object('type', 'academy', 'label', 'Continuer Academy'));
  ELSE
    v_answer := format(
      'Je vous conseille de commencer par les signaux les plus urgents: %s relances CRM dues, %s objectifs en retard, %s opportunites commerciales actives. Cette reponse est explicable et ne modifie aucune donnee financiere.',
      COALESCE(v_context.crm_tasks_due, 0),
      COALESCE(v_context.overdue_goals, 0),
      COALESCE(v_context.active_commercial_opportunities, 0)
    );
    v_actions := jsonb_build_array(jsonb_build_object('type', 'general', 'label', 'Generer un resume Business Assistant'));
  END IF;

  INSERT INTO public.business_assistant_questions(question, answer, intent, confidence, data_used, rules_applied, recommended_actions)
  VALUES (
    trim(_question),
    v_answer,
    v_intent,
    84,
    to_jsonb(v_context),
    jsonb_build_object('mode', 'explainable_advisory_only', 'p0_access', 'forbidden', 'financial_impact', 'none'),
    v_actions
  )
  RETURNING id INTO v_question_id;

  RETURN jsonb_build_object(
    'question_id', v_question_id,
    'intent', v_intent,
    'answer', v_answer,
    'recommended_actions', v_actions,
    'financial_impact', 'none'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_business_assistant_summary(_summary_type text DEFAULT 'daily')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start date;
  v_end date;
  v_snapshot jsonb;
  v_summary_id uuid;
  v_content text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'auth_required';
  END IF;

  IF _summary_type = 'weekly' THEN
    v_start := date_trunc('week', now())::date;
    v_end := (date_trunc('week', now()) + interval '6 days')::date;
  ELSIF _summary_type = 'monthly' THEN
    v_start := date_trunc('month', now())::date;
    v_end := (date_trunc('month', now()) + interval '1 month - 1 day')::date;
  ELSIF _summary_type = 'personal_review' THEN
    v_start := (now() - interval '30 days')::date;
    v_end := now()::date;
  ELSE
    v_start := now()::date;
    v_end := now()::date;
  END IF;

  v_snapshot := public.generate_business_assistant_snapshot(_summary_type, auth.uid());
  v_content := COALESCE(v_snapshot->>'summary', 'Resume genere par le Business Assistant.');

  INSERT INTO public.business_assistant_summaries(user_id, summary_type, period_start, period_end, title, content, metrics, recommendations)
  VALUES (
    auth.uid(),
    COALESCE(NULLIF(_summary_type, ''), 'daily'),
    v_start,
    v_end,
    'Resume ' || COALESCE(NULLIF(_summary_type, ''), 'daily'),
    v_content,
    jsonb_build_object('snapshot_id', v_snapshot->>'snapshot_id'),
    jsonb_build_array(jsonb_build_object('type', 'next_best_action', 'source', 'business_assistant'))
  )
  ON CONFLICT (user_id, summary_type, period_start, period_end) DO UPDATE
  SET content = EXCLUDED.content,
      metrics = EXCLUDED.metrics,
      recommendations = EXCLUDED.recommendations
  RETURNING id INTO v_summary_id;

  RETURN jsonb_build_object('summary_id', v_summary_id, 'period_start', v_start, 'period_end', v_end, 'financial_impact', 'none');
END;
$$;

CREATE OR REPLACE VIEW public.my_business_assistant_dashboard AS
SELECT DISTINCT ON (s.user_id)
  s.id,
  s.user_id,
  s.period,
  s.summary_title,
  s.summary_text,
  s.data_used,
  s.rules_applied,
  s.strengths,
  s.weaknesses,
  s.next_best_actions,
  s.recommended_products,
  s.recommended_campaigns,
  s.recommended_courses,
  s.assistant_version,
  s.created_at
FROM public.business_assistant_context_snapshots s
WHERE s.user_id = auth.uid() OR public.business_assistant_is_admin()
ORDER BY s.user_id, s.created_at DESC;

CREATE OR REPLACE VIEW public.my_business_assistant_recommendations AS
SELECT *
FROM public.business_assistant_recommendations
WHERE user_id = auth.uid() OR public.business_assistant_is_admin()
ORDER BY
  CASE priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
  created_at DESC;

CREATE OR REPLACE VIEW public.my_business_assistant_alerts AS
SELECT *
FROM public.business_assistant_alerts
WHERE user_id = auth.uid() OR public.business_assistant_is_admin()
ORDER BY
  CASE severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 WHEN 'low' THEN 4 ELSE 5 END,
  created_at DESC;

CREATE OR REPLACE VIEW public.my_business_assistant_qa_history AS
SELECT *
FROM public.business_assistant_questions
WHERE user_id = auth.uid() OR public.business_assistant_is_admin()
ORDER BY created_at DESC;

CREATE OR REPLACE VIEW public.my_business_assistant_summaries AS
SELECT *
FROM public.business_assistant_summaries
WHERE user_id = auth.uid() OR public.business_assistant_is_admin()
ORDER BY period_start DESC, created_at DESC;

CREATE OR REPLACE VIEW public.admin_business_assistant_overview AS
SELECT
  COALESCE(s.user_id, r.user_id, a.user_id) AS user_id,
  max(s.created_at) AS last_snapshot_at,
  count(DISTINCT s.id) AS snapshots_total,
  count(DISTINCT r.id) FILTER (WHERE r.status = 'open') AS open_recommendations,
  count(DISTINCT a.id) FILTER (WHERE a.status = 'open') AS open_alerts,
  count(DISTINCT a.id) FILTER (WHERE a.severity IN ('high', 'critical') AND a.status = 'open') AS high_alerts,
  count(DISTINCT q.id) AS questions_total
FROM public.business_assistant_context_snapshots s
FULL JOIN public.business_assistant_recommendations r ON r.user_id = s.user_id
FULL JOIN public.business_assistant_alerts a ON a.user_id = COALESCE(s.user_id, r.user_id)
LEFT JOIN public.business_assistant_questions q ON q.user_id = COALESCE(s.user_id, r.user_id, a.user_id)
WHERE public.business_assistant_is_admin()
GROUP BY COALESCE(s.user_id, r.user_id, a.user_id);

ALTER TABLE public.business_assistant_context_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_assistant_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_assistant_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_assistant_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_assistant_summaries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Business assistant own snapshots" ON public.business_assistant_context_snapshots;
CREATE POLICY "Business assistant own snapshots" ON public.business_assistant_context_snapshots
FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.business_assistant_is_admin());

DROP POLICY IF EXISTS "Business assistant insert own snapshots" ON public.business_assistant_context_snapshots;
CREATE POLICY "Business assistant insert own snapshots" ON public.business_assistant_context_snapshots
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() OR public.business_assistant_is_admin());

DROP POLICY IF EXISTS "Business assistant own recommendations" ON public.business_assistant_recommendations;
CREATE POLICY "Business assistant own recommendations" ON public.business_assistant_recommendations
FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.business_assistant_is_admin());

DROP POLICY IF EXISTS "Business assistant manage own recommendations" ON public.business_assistant_recommendations;
CREATE POLICY "Business assistant manage own recommendations" ON public.business_assistant_recommendations
FOR UPDATE TO authenticated
USING (user_id = auth.uid() OR public.business_assistant_is_admin())
WITH CHECK (user_id = auth.uid() OR public.business_assistant_is_admin());

DROP POLICY IF EXISTS "Business assistant insert recommendations" ON public.business_assistant_recommendations;
CREATE POLICY "Business assistant insert recommendations" ON public.business_assistant_recommendations
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() OR public.business_assistant_is_admin());

DROP POLICY IF EXISTS "Business assistant own alerts" ON public.business_assistant_alerts;
CREATE POLICY "Business assistant own alerts" ON public.business_assistant_alerts
FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.business_assistant_is_admin());

DROP POLICY IF EXISTS "Business assistant manage own alerts" ON public.business_assistant_alerts;
CREATE POLICY "Business assistant manage own alerts" ON public.business_assistant_alerts
FOR UPDATE TO authenticated
USING (user_id = auth.uid() OR public.business_assistant_is_admin())
WITH CHECK (user_id = auth.uid() OR public.business_assistant_is_admin());

DROP POLICY IF EXISTS "Business assistant insert alerts" ON public.business_assistant_alerts;
CREATE POLICY "Business assistant insert alerts" ON public.business_assistant_alerts
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() OR public.business_assistant_is_admin());

DROP POLICY IF EXISTS "Business assistant own questions" ON public.business_assistant_questions;
CREATE POLICY "Business assistant own questions" ON public.business_assistant_questions
FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.business_assistant_is_admin());

DROP POLICY IF EXISTS "Business assistant insert own questions" ON public.business_assistant_questions;
CREATE POLICY "Business assistant insert own questions" ON public.business_assistant_questions
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() OR public.business_assistant_is_admin());

DROP POLICY IF EXISTS "Business assistant own summaries" ON public.business_assistant_summaries;
CREATE POLICY "Business assistant own summaries" ON public.business_assistant_summaries
FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.business_assistant_is_admin());

DROP POLICY IF EXISTS "Business assistant insert own summaries" ON public.business_assistant_summaries;
CREATE POLICY "Business assistant insert own summaries" ON public.business_assistant_summaries
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() OR public.business_assistant_is_admin());

DROP POLICY IF EXISTS "Business assistant update own summaries" ON public.business_assistant_summaries;
CREATE POLICY "Business assistant update own summaries" ON public.business_assistant_summaries
FOR UPDATE TO authenticated
USING (user_id = auth.uid() OR public.business_assistant_is_admin())
WITH CHECK (user_id = auth.uid() OR public.business_assistant_is_admin());

GRANT SELECT, INSERT ON public.business_assistant_context_snapshots TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON public.business_assistant_recommendations TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON public.business_assistant_alerts TO authenticated, service_role;
GRANT SELECT, INSERT ON public.business_assistant_questions TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON public.business_assistant_summaries TO authenticated, service_role;
GRANT SELECT ON
  public.business_assistant_source_context,
  public.my_business_assistant_dashboard,
  public.my_business_assistant_recommendations,
  public.my_business_assistant_alerts,
  public.my_business_assistant_qa_history,
  public.my_business_assistant_summaries,
  public.admin_business_assistant_overview
TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.generate_business_assistant_snapshot(text, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ask_business_assistant(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.generate_business_assistant_summary(text) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
