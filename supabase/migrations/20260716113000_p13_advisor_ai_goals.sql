-- P1.3 Advisor AI daily and weekly goals.
-- Additive commercial intelligence module only: no wallet, commission, order, product or P0 mutation.

ALTER TYPE public.admin_permission ADD VALUE IF NOT EXISTS 'ai_goals';

CREATE OR REPLACE FUNCTION public.ai_goals_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR EXISTS (
        SELECT 1
        FROM public.admin_permissions ap
        WHERE ap.user_id = auth.uid()
          AND ap.permission::text IN ('full_access', 'ai_goals')
      )
    )
$$;

CREATE TABLE IF NOT EXISTS public.advisor_goal_profiles (
  advisor_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  advisor_level text NOT NULL DEFAULT 'beginner'
    CHECK (advisor_level IN ('beginner', 'experienced', 'senior', 'regional_distributor')),
  specialties text[] NOT NULL DEFAULT '{}',
  availability text NOT NULL DEFAULT 'standard'
    CHECK (availability IN ('low', 'standard', 'high', 'paused')),
  preferred_goal_types text[] NOT NULL DEFAULT '{}',
  excluded_goal_types text[] NOT NULL DEFAULT '{}',
  business_score numeric(5,2),
  trust_score numeric(5,2),
  ai_context jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.advisor_goal_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE CHECK (code ~ '^[a-z0-9][a-z0-9_]*$'),
  title text NOT NULL CHECK (char_length(trim(title)) > 1),
  description text,
  cadence text NOT NULL CHECK (cadence IN ('daily', 'weekly')),
  goal_type text NOT NULL
    CHECK (goal_type IN (
      'share_product', 'follow_up_prospect', 'contact_dormant_client', 'gift_offer',
      'call_company', 'wedding_offer', 'publish_story', 'present_new_product',
      'recommend_category', 'sell_wholesale', 'qualified_conversation',
      'convert_prospect', 'reactivate_client', 'academy_module', 'new_company_client',
      'strategic_category'
    )),
  target_metric text NOT NULL DEFAULT 'count'
    CHECK (target_metric IN ('count', 'conversation', 'contact', 'client', 'category', 'training')),
  default_target_value integer NOT NULL DEFAULT 1 CHECK (default_target_value > 0),
  difficulty text NOT NULL DEFAULT 'medium'
    CHECK (difficulty IN ('easy', 'medium', 'hard', 'expert')),
  priority text NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  advisor_levels text[] NOT NULL DEFAULT '{}',
  specialties text[] NOT NULL DEFAULT '{}',
  client_types text[] NOT NULL DEFAULT '{}',
  categories text[] NOT NULL DEFAULT '{}',
  cities text[] NOT NULL DEFAULT '{}',
  opportunity_slugs text[] NOT NULL DEFAULT '{}',
  suggested_reward jsonb NOT NULL DEFAULT '{}'::jsonb,
  ai_prompt_template text,
  success_criteria jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT advisor_goal_templates_period_check CHECK (starts_at IS NULL OR ends_at IS NULL OR starts_at <= ends_at)
);

CREATE TABLE IF NOT EXISTS public.advisor_goal_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advisor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id uuid REFERENCES public.advisor_goal_templates(id) ON DELETE SET NULL,
  source_event_id uuid REFERENCES public.commercial_opportunity_events(id) ON DELETE SET NULL,
  source_campaign_id uuid REFERENCES public.commercial_opportunity_campaigns(id) ON DELETE SET NULL,
  title text NOT NULL CHECK (char_length(trim(title)) > 1),
  description text,
  cadence text NOT NULL CHECK (cadence IN ('daily', 'weekly')),
  goal_type text NOT NULL,
  target_metric text NOT NULL DEFAULT 'count',
  target_value integer NOT NULL CHECK (target_value > 0),
  current_value integer NOT NULL DEFAULT 0 CHECK (current_value >= 0),
  progress_percent numeric(5,2) GENERATED ALWAYS AS (
    LEAST(100, round((current_value::numeric / NULLIF(target_value, 0)::numeric) * 100, 2))
  ) STORED,
  status text NOT NULL DEFAULT 'assigned'
    CHECK (status IN ('assigned', 'in_progress', 'completed', 'skipped', 'expired', 'cancelled')),
  difficulty text NOT NULL DEFAULT 'medium'
    CHECK (difficulty IN ('easy', 'medium', 'hard', 'expert')),
  priority text NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  reward_hint jsonb NOT NULL DEFAULT '{}'::jsonb,
  ai_suggestion text,
  ai_rationale jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_context jsonb NOT NULL DEFAULT '{}'::jsonb,
  starts_at timestamptz NOT NULL DEFAULT now(),
  due_at timestamptz NOT NULL,
  completed_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT advisor_goal_assignment_period_check CHECK (starts_at <= due_at),
  CONSTRAINT advisor_goal_assignment_unique_window UNIQUE (advisor_id, template_id, cadence, starts_at)
);

CREATE TABLE IF NOT EXISTS public.advisor_goal_progress_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES public.advisor_goal_assignments(id) ON DELETE CASCADE,
  advisor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  delta integer NOT NULL DEFAULT 1 CHECK (delta <> 0),
  note text,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.advisor_goal_generation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_type text NOT NULL CHECK (run_type IN ('daily', 'weekly', 'manual')),
  status text NOT NULL DEFAULT 'completed'
    CHECK (status IN ('started', 'completed', 'failed')),
  requested_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  advisors_targeted integer NOT NULL DEFAULT 0,
  assignments_created integer NOT NULL DEFAULT 0,
  source_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_advisor_goal_templates_active ON public.advisor_goal_templates(cadence, is_active, priority);
CREATE INDEX IF NOT EXISTS idx_advisor_goal_assignments_advisor_due ON public.advisor_goal_assignments(advisor_id, status, due_at);
CREATE INDEX IF NOT EXISTS idx_advisor_goal_assignments_source_event ON public.advisor_goal_assignments(source_event_id);
CREATE INDEX IF NOT EXISTS idx_advisor_goal_progress_assignment ON public.advisor_goal_progress_events(assignment_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_advisor_goal_runs_created ON public.advisor_goal_generation_runs(created_at DESC);

CREATE OR REPLACE FUNCTION public.ai_goals_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  IF TG_TABLE_NAME IN ('advisor_goal_profiles', 'advisor_goal_templates') THEN
    NEW.updated_by = COALESCE(auth.uid(), NEW.updated_by);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_advisor_goal_profiles_touch ON public.advisor_goal_profiles;
CREATE TRIGGER trg_advisor_goal_profiles_touch
BEFORE UPDATE ON public.advisor_goal_profiles
FOR EACH ROW EXECUTE FUNCTION public.ai_goals_touch_updated_at();

DROP TRIGGER IF EXISTS trg_advisor_goal_templates_touch ON public.advisor_goal_templates;
CREATE TRIGGER trg_advisor_goal_templates_touch
BEFORE UPDATE ON public.advisor_goal_templates
FOR EACH ROW EXECUTE FUNCTION public.ai_goals_touch_updated_at();

DROP TRIGGER IF EXISTS trg_advisor_goal_assignments_touch ON public.advisor_goal_assignments;
CREATE TRIGGER trg_advisor_goal_assignments_touch
BEFORE UPDATE ON public.advisor_goal_assignments
FOR EACH ROW EXECUTE FUNCTION public.ai_goals_touch_updated_at();

CREATE OR REPLACE VIEW public.advisor_ai_goal_source_context AS
SELECT
  u.id AS advisor_id,
  COALESCE(p.advisor_level, 'beginner') AS advisor_level,
  COALESCE(p.specialties, '{}') AS specialties,
  COALESCE(p.availability, 'standard') AS availability,
  p.business_score,
  p.trust_score,
  COALESCE(c.contacts_total, 0) AS crm_contacts_total,
  COALESCE(c.tasks_due, 0) AS crm_tasks_due,
  COALESCE(c.hot_opportunities, 0) AS crm_hot_opportunities,
  (
    SELECT count(*)
    FROM public.advisor_commercial_opportunity_calendar o
    WHERE o.ends_at >= now()
  ) AS active_commercial_opportunities,
  (
    SELECT jsonb_agg(jsonb_build_object('id', o.id, 'name', o.name, 'priority', o.priority, 'category', o.category))
    FROM (
      SELECT id, name, priority, category
      FROM public.advisor_commercial_opportunity_calendar
      WHERE ends_at >= now()
      ORDER BY starts_at ASC
      LIMIT 8
    ) o
  ) AS opportunity_preview
FROM auth.users u
LEFT JOIN public.advisor_goal_profiles p ON p.advisor_id = u.id
LEFT JOIN public.crm_dashboard_summary c ON true
WHERE auth.uid() = u.id OR public.ai_goals_is_admin();

CREATE OR REPLACE FUNCTION public.ai_goals_target_for_profile(
  _base integer,
  _advisor_level text,
  _availability text
)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT GREATEST(
    1,
    round(
      _base
      * CASE _advisor_level
          WHEN 'beginner' THEN 0.75
          WHEN 'experienced' THEN 1.00
          WHEN 'senior' THEN 1.25
          WHEN 'regional_distributor' THEN 1.50
          ELSE 1.00
        END
      * CASE _availability
          WHEN 'low' THEN 0.60
          WHEN 'standard' THEN 1.00
          WHEN 'high' THEN 1.25
          WHEN 'paused' THEN 0.00
          ELSE 1.00
        END
    )::integer
  )
$$;

CREATE OR REPLACE FUNCTION public.admin_generate_advisor_ai_goals(
  _cadence text DEFAULT 'daily',
  _advisor_id uuid DEFAULT NULL,
  _limit integer DEFAULT 80
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_run_id uuid;
  v_created integer := 0;
  v_started_at timestamptz := date_trunc('day', now());
  v_due_at timestamptz;
  advisor_row record;
  template_row record;
  event_row record;
  v_target integer;
BEGIN
  IF NOT public.ai_goals_is_admin() THEN
    RAISE EXCEPTION 'ai_goals_admin_required';
  END IF;

  IF _cadence NOT IN ('daily', 'weekly') THEN
    RAISE EXCEPTION 'invalid_goal_cadence';
  END IF;

  IF _cadence = 'weekly' THEN
    v_started_at := date_trunc('week', now());
    v_due_at := v_started_at + interval '7 days';
  ELSE
    v_due_at := v_started_at + interval '1 day';
  END IF;

  INSERT INTO public.advisor_goal_generation_runs(run_type, status, requested_by, created_at)
  VALUES (_cadence, 'started', auth.uid(), now())
  RETURNING id INTO v_run_id;

  FOR advisor_row IN
    SELECT
      ur.user_id AS advisor_id,
      COALESCE(p.advisor_level, 'beginner') AS advisor_level,
      COALESCE(p.specialties, '{}') AS specialties,
      COALESCE(p.availability, 'standard') AS availability,
      p.business_score,
      p.trust_score
    FROM public.user_roles ur
    LEFT JOIN public.advisor_goal_profiles p ON p.advisor_id = ur.user_id
    WHERE ur.role::text IN ('admin', 'ambassador', 'vendor')
      AND (_advisor_id IS NULL OR ur.user_id = _advisor_id)
      AND COALESCE(p.availability, 'standard') <> 'paused'
    LIMIT LEAST(GREATEST(_limit, 1), 500)
  LOOP
    FOR template_row IN
      SELECT *
      FROM public.advisor_goal_templates t
      WHERE t.is_active = true
        AND t.cadence = _cadence
        AND (t.starts_at IS NULL OR t.starts_at <= now())
        AND (t.ends_at IS NULL OR t.ends_at >= now())
        AND (
          cardinality(t.advisor_levels) = 0
          OR advisor_row.advisor_level = ANY(t.advisor_levels)
        )
        AND (
          cardinality(t.specialties) = 0
          OR t.specialties && advisor_row.specialties
        )
      ORDER BY
        CASE t.priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
        t.created_at
      LIMIT CASE WHEN _cadence = 'daily' THEN 4 ELSE 5 END
    LOOP
      SELECT id, name, slug, priority, category
      INTO event_row
      FROM public.commercial_opportunity_events e
      WHERE e.is_active = true
        AND e.status IN ('scheduled', 'active')
        AND e.archived_at IS NULL
        AND e.ends_at >= now()
        AND (
          cardinality(template_row.opportunity_slugs) = 0
          OR e.slug = ANY(template_row.opportunity_slugs)
        )
      ORDER BY
        CASE e.priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
        e.starts_at
      LIMIT 1;

      v_target := public.ai_goals_target_for_profile(
        template_row.default_target_value,
        advisor_row.advisor_level,
        advisor_row.availability
      );

      INSERT INTO public.advisor_goal_assignments (
        advisor_id, template_id, source_event_id, title, description, cadence, goal_type,
        target_metric, target_value, difficulty, priority, reward_hint, ai_suggestion,
        ai_rationale, source_context, starts_at, due_at, created_by
      )
      VALUES (
        advisor_row.advisor_id,
        template_row.id,
        event_row.id,
        template_row.title,
        template_row.description,
        template_row.cadence,
        template_row.goal_type,
        template_row.target_metric,
        v_target,
        template_row.difficulty,
        template_row.priority,
        template_row.suggested_reward,
        template_row.ai_prompt_template,
        jsonb_build_object(
          'advisor_level', advisor_row.advisor_level,
          'specialties', advisor_row.specialties,
          'availability', advisor_row.availability,
          'business_score', advisor_row.business_score,
          'trust_score', advisor_row.trust_score,
          'source', 'P1.3 AI Goals Engine'
        ),
        jsonb_build_object(
          'event_id', event_row.id,
          'event_name', event_row.name,
          'event_slug', event_row.slug,
          'event_priority', event_row.priority,
          'event_category', event_row.category,
          'template_code', template_row.code
        ),
        v_started_at,
        v_due_at,
        auth.uid()
      )
      ON CONFLICT (advisor_id, template_id, cadence, starts_at) DO NOTHING;

      IF FOUND THEN
        v_created := v_created + 1;
      END IF;
    END LOOP;
  END LOOP;

  UPDATE public.advisor_goal_generation_runs
  SET status = 'completed',
      advisors_targeted = (
        SELECT count(DISTINCT advisor_id)
        FROM public.advisor_goal_assignments
        WHERE created_by = auth.uid()
          AND created_at >= (SELECT created_at FROM public.advisor_goal_generation_runs WHERE id = v_run_id)
      ),
      assignments_created = v_created,
      source_summary = jsonb_build_object(
        'cadence', _cadence,
        'started_at', v_started_at,
        'due_at', v_due_at,
        'limit', _limit,
        'financial_mode', 'no_financial_mutation'
      ),
      completed_at = now()
  WHERE id = v_run_id;

  RETURN jsonb_build_object('run_id', v_run_id, 'cadence', _cadence, 'assignments_created', v_created);
EXCEPTION WHEN OTHERS THEN
  UPDATE public.advisor_goal_generation_runs
  SET status = 'failed',
      error_message = SQLERRM,
      completed_at = now()
  WHERE id = v_run_id;
  RAISE;
END;
$$;

CREATE OR REPLACE FUNCTION public.advisor_update_ai_goal_progress(
  _assignment_id uuid,
  _delta integer DEFAULT 1,
  _note text DEFAULT NULL,
  _evidence jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_goal public.advisor_goal_assignments%ROWTYPE;
BEGIN
  SELECT *
  INTO v_goal
  FROM public.advisor_goal_assignments
  WHERE id = _assignment_id
    AND (advisor_id = auth.uid() OR public.ai_goals_is_admin())
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'advisor_goal_not_found';
  END IF;

  IF v_goal.status IN ('completed', 'cancelled', 'expired') THEN
    RAISE EXCEPTION 'advisor_goal_closed';
  END IF;

  INSERT INTO public.advisor_goal_progress_events(assignment_id, advisor_id, delta, note, evidence, created_by)
  VALUES (_assignment_id, v_goal.advisor_id, _delta, _note, COALESCE(_evidence, '{}'::jsonb), auth.uid());

  UPDATE public.advisor_goal_assignments
  SET current_value = GREATEST(0, current_value + _delta),
      status = CASE
        WHEN GREATEST(0, current_value + _delta) >= target_value THEN 'completed'
        WHEN status = 'assigned' THEN 'in_progress'
        ELSE status
      END,
      completed_at = CASE
        WHEN GREATEST(0, current_value + _delta) >= target_value THEN COALESCE(completed_at, now())
        ELSE completed_at
      END
  WHERE id = _assignment_id
  RETURNING * INTO v_goal;

  RETURN jsonb_build_object(
    'assignment_id', v_goal.id,
    'current_value', v_goal.current_value,
    'target_value', v_goal.target_value,
    'progress_percent', v_goal.progress_percent,
    'status', v_goal.status
  );
END;
$$;

CREATE OR REPLACE VIEW public.advisor_ai_goals_dashboard AS
SELECT
  g.id,
  g.advisor_id,
  g.template_id,
  g.source_event_id,
  e.name AS source_event_name,
  g.title,
  g.description,
  g.cadence,
  g.goal_type,
  g.target_metric,
  g.target_value,
  g.current_value,
  g.progress_percent,
  g.status,
  g.difficulty,
  g.priority,
  g.reward_hint,
  g.ai_suggestion,
  g.ai_rationale,
  g.source_context,
  g.starts_at,
  g.due_at,
  g.completed_at,
  g.created_at
FROM public.advisor_goal_assignments g
LEFT JOIN public.commercial_opportunity_events e ON e.id = g.source_event_id
WHERE g.advisor_id = auth.uid() OR public.ai_goals_is_admin();

CREATE OR REPLACE VIEW public.admin_ai_goals_effectiveness_report AS
SELECT
  t.id AS template_id,
  t.code,
  t.title,
  t.cadence,
  t.goal_type,
  t.priority,
  t.difficulty,
  t.is_active,
  count(g.id) AS assignments_total,
  count(g.id) FILTER (WHERE g.status = 'completed') AS completed_total,
  count(g.id) FILTER (WHERE g.status IN ('assigned', 'in_progress')) AS open_total,
  count(g.id) FILTER (WHERE g.status IN ('expired', 'skipped', 'cancelled')) AS not_completed_total,
  round(avg(g.progress_percent), 2) AS average_progress_percent,
  max(g.created_at) AS last_assigned_at
FROM public.advisor_goal_templates t
LEFT JOIN public.advisor_goal_assignments g ON g.template_id = t.id
WHERE public.ai_goals_is_admin()
GROUP BY t.id;

CREATE OR REPLACE VIEW public.advisor_ai_goals_summary AS
SELECT
  auth.uid() AS advisor_id,
  count(*) FILTER (WHERE cadence = 'daily' AND status IN ('assigned', 'in_progress')) AS daily_remaining,
  count(*) FILTER (WHERE cadence = 'weekly' AND status IN ('assigned', 'in_progress')) AS weekly_remaining,
  count(*) FILTER (WHERE status = 'completed') AS completed_total,
  count(*) FILTER (WHERE status IN ('assigned', 'in_progress')) AS remaining_total,
  round(avg(progress_percent), 2) AS average_progress,
  count(*) FILTER (WHERE due_at < now() AND status IN ('assigned', 'in_progress')) AS overdue_total
FROM public.advisor_goal_assignments
WHERE advisor_id = auth.uid() OR public.ai_goals_is_admin();

ALTER TABLE public.advisor_goal_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advisor_goal_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advisor_goal_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advisor_goal_progress_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advisor_goal_generation_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "AI goals admins manage profiles" ON public.advisor_goal_profiles;
CREATE POLICY "AI goals admins manage profiles"
ON public.advisor_goal_profiles FOR ALL TO authenticated
USING (public.ai_goals_is_admin())
WITH CHECK (public.ai_goals_is_admin());

DROP POLICY IF EXISTS "Advisors read own goal profile" ON public.advisor_goal_profiles;
CREATE POLICY "Advisors read own goal profile"
ON public.advisor_goal_profiles FOR SELECT TO authenticated
USING (advisor_id = auth.uid());

DROP POLICY IF EXISTS "AI goals admins manage templates" ON public.advisor_goal_templates;
CREATE POLICY "AI goals admins manage templates"
ON public.advisor_goal_templates FOR ALL TO authenticated
USING (public.ai_goals_is_admin())
WITH CHECK (public.ai_goals_is_admin());

DROP POLICY IF EXISTS "Advisors read active templates" ON public.advisor_goal_templates;
CREATE POLICY "Advisors read active templates"
ON public.advisor_goal_templates FOR SELECT TO authenticated
USING (is_active = true);

DROP POLICY IF EXISTS "AI goals admins manage assignments" ON public.advisor_goal_assignments;
CREATE POLICY "AI goals admins manage assignments"
ON public.advisor_goal_assignments FOR ALL TO authenticated
USING (public.ai_goals_is_admin())
WITH CHECK (public.ai_goals_is_admin());

DROP POLICY IF EXISTS "Advisors read own assignments" ON public.advisor_goal_assignments;
CREATE POLICY "Advisors read own assignments"
ON public.advisor_goal_assignments FOR SELECT TO authenticated
USING (advisor_id = auth.uid());

DROP POLICY IF EXISTS "AI goals admins read progress events" ON public.advisor_goal_progress_events;
CREATE POLICY "AI goals admins read progress events"
ON public.advisor_goal_progress_events FOR SELECT TO authenticated
USING (public.ai_goals_is_admin());

DROP POLICY IF EXISTS "Advisors read own progress events" ON public.advisor_goal_progress_events;
CREATE POLICY "Advisors read own progress events"
ON public.advisor_goal_progress_events FOR SELECT TO authenticated
USING (advisor_id = auth.uid());

DROP POLICY IF EXISTS "Advisors append own progress events" ON public.advisor_goal_progress_events;
CREATE POLICY "Advisors append own progress events"
ON public.advisor_goal_progress_events FOR INSERT TO authenticated
WITH CHECK (advisor_id = auth.uid() OR public.ai_goals_is_admin());

DROP POLICY IF EXISTS "AI goals admins read generation runs" ON public.advisor_goal_generation_runs;
CREATE POLICY "AI goals admins read generation runs"
ON public.advisor_goal_generation_runs FOR SELECT TO authenticated
USING (public.ai_goals_is_admin());

REVOKE ALL ON FUNCTION public.admin_generate_advisor_ai_goals(text, uuid, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.advisor_update_ai_goal_progress(uuid, integer, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_generate_advisor_ai_goals(text, uuid, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.advisor_update_ai_goal_progress(uuid, integer, text, jsonb) TO authenticated, service_role;

GRANT SELECT ON public.advisor_ai_goal_source_context TO authenticated, service_role;
GRANT SELECT ON public.advisor_ai_goals_dashboard TO authenticated, service_role;
GRANT SELECT ON public.advisor_ai_goals_summary TO authenticated, service_role;
GRANT SELECT ON public.admin_ai_goals_effectiveness_report TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON public.advisor_goal_profiles TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON public.advisor_goal_templates TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON public.advisor_goal_assignments TO authenticated, service_role;
GRANT SELECT, INSERT ON public.advisor_goal_progress_events TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON public.advisor_goal_generation_runs TO authenticated, service_role;

INSERT INTO public.advisor_goal_templates (
  code, title, description, cadence, goal_type, target_metric, default_target_value,
  difficulty, priority, advisor_levels, specialties, client_types, categories,
  opportunity_slugs, suggested_reward, ai_prompt_template, success_criteria
)
VALUES
  ('daily_share_3_products', 'Partager 3 produits ciblés', 'Partager trois produits alignés avec les opportunités commerciales du moment.', 'daily', 'share_product', 'count', 3, 'easy', 'medium', '{}', '{}', ARRAY['individual', 'loyal'], '{}', '{}', '{"type":"recognition","label":"Progression commerciale"}'::jsonb, 'Choisis 3 produits pertinents et prépare un message court adapté au client.', '{"minimum_quality":"produits cohérents avec le client"}'::jsonb),
  ('daily_follow_up_2_prospects', 'Relancer 2 prospects', 'Relancer deux prospects du portefeuille CRM avec une proposition concrète.', 'daily', 'follow_up_prospect', 'contact', 2, 'medium', 'high', '{}', '{}', ARRAY['prospect'], '{}', '{}', '{"type":"badge","label":"Relance active"}'::jsonb, 'Propose une relance simple, personnalisée et non agressive.', '{"minimum_quality":"relance enregistrée dans le CRM"}'::jsonb),
  ('daily_contact_dormant_client', 'Contacter 1 client dormant', 'Réactiver un ancien client avec une offre ou une nouveauté adaptée.', 'daily', 'contact_dormant_client', 'client', 1, 'medium', 'high', '{}', '{}', ARRAY['dormant'], '{}', '{}', '{"type":"recognition","label":"Réactivation"}'::jsonb, 'Trouve une raison naturelle de reprendre contact.', '{"minimum_quality":"client dormant contacté"}'::jsonb),
  ('daily_gift_offer', 'Proposer un coffret cadeau', 'Présenter un coffret ou emballage cadeau pendant une période propice.', 'daily', 'gift_offer', 'count', 1, 'easy', 'medium', '{}', ARRAY['champagne', 'gift'], ARRAY['gift', 'vip'], ARRAY['champagnes'], ARRAY['saint-valentin','noel','fete-des-meres','fete-des-peres'], '{"type":"recognition","label":"Conseil cadeau"}'::jsonb, 'Suggère un coffret selon le budget et l’occasion.', '{"minimum_quality":"coffret proposé"}'::jsonb),
  ('daily_call_company', 'Appeler 1 entreprise', 'Contacter une entreprise pour un besoin cadeau, événement ou devis.', 'daily', 'call_company', 'contact', 1, 'hard', 'high', ARRAY['experienced','senior','regional_distributor'], ARRAY['entreprises','b2b'], ARRAY['company'], '{}', ARRAY['evenements-entreprises','fin-d-annee','noel'], '{"type":"recognition","label":"Prospection B2B"}'::jsonb, 'Prépare une approche courte orientée besoin entreprise.', '{"minimum_quality":"contact entreprise tenté"}'::jsonb),
  ('daily_wedding_offer', 'Envoyer une offre mariage', 'Proposer une sélection mariage ou devis gros à un contact événementiel.', 'daily', 'wedding_offer', 'count', 1, 'hard', 'high', '{}', ARRAY['mariages','events'], ARRAY['event'], ARRAY['champagnes','vins'], ARRAY['mariages'], '{"type":"recognition","label":"Opportunité mariage"}'::jsonb, 'Structure une proposition mariage claire : quantité, budget, livraison.', '{"minimum_quality":"offre mariage envoyée"}'::jsonb),
  ('weekly_qualified_conversations', 'Obtenir 5 conversations qualifiées', 'Créer cinq conversations utiles avec besoin, budget ou événement identifié.', 'weekly', 'qualified_conversation', 'conversation', 5, 'medium', 'high', '{}', '{}', '{}', '{}', '{}', '{"type":"recognition","label":"Semaine active"}'::jsonb, 'Priorise les conversations avec intention réelle.', '{"minimum_quality":"besoin client qualifié"}'::jsonb),
  ('weekly_convert_3_prospects', 'Convertir 3 prospects', 'Faire avancer trois prospects vers une intention d’achat ou un devis.', 'weekly', 'convert_prospect', 'client', 3, 'hard', 'high', ARRAY['experienced','senior','regional_distributor'], '{}', ARRAY['prospect'], '{}', '{}', '{"type":"badge","label":"Conversion"}'::jsonb, 'Sélectionne les prospects les plus chauds dans le CRM.', '{"minimum_quality":"statut CRM mis à jour"}'::jsonb),
  ('weekly_reactivate_2_clients', 'Réactiver 2 anciens clients', 'Réactiver deux clients dormants avec une recommandation utile.', 'weekly', 'reactivate_client', 'client', 2, 'medium', 'medium', '{}', '{}', ARRAY['dormant'], '{}', '{}', '{"type":"recognition","label":"Réactivation hebdo"}'::jsonb, 'Utilise l’historique commercial pour personnaliser.', '{"minimum_quality":"ancien client relancé"}'::jsonb),
  ('weekly_company_client', 'Obtenir un nouveau client entreprise', 'Identifier ou convertir un nouveau compte entreprise.', 'weekly', 'new_company_client', 'client', 1, 'expert', 'critical', ARRAY['senior','regional_distributor'], ARRAY['entreprises','b2b'], ARRAY['company'], '{}', ARRAY['evenements-entreprises','noel','fin-d-annee'], '{"type":"recognition","label":"B2B stratégique"}'::jsonb, 'Prépare une proposition entreprise claire et premium.', '{"minimum_quality":"nouveau contact entreprise qualifié"}'::jsonb),
  ('weekly_strategic_category', 'Vendre une catégorie stratégique', 'Pousser une catégorie prioritaire liée aux opportunités du calendrier.', 'weekly', 'strategic_category', 'category', 1, 'medium', 'high', '{}', '{}', '{}', ARRAY['champagnes','spiritueux','vins'], '{}', '{"type":"recognition","label":"Focus catégorie"}'::jsonb, 'Choisis la catégorie la plus pertinente selon la période.', '{"minimum_quality":"catégorie présentée à des clients ciblés"}'::jsonb),
  ('weekly_academy_module', 'Terminer un module LPB Academy', 'Renforcer les compétences commerciales par apprentissage court.', 'weekly', 'academy_module', 'training', 1, 'easy', 'medium', ARRAY['beginner','experienced'], '{}', '{}', '{}', '{}', '{"type":"learning","label":"Progression expertise"}'::jsonb, 'Choisis un module lié à ta spécialité ou à la campagne du moment.', '{"minimum_quality":"module terminé"}'::jsonb)
ON CONFLICT (code) DO NOTHING;

NOTIFY pgrst, 'reload schema';
