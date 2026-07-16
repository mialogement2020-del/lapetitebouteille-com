-- P1.6 - LPB Academy & Certification Engine.
-- Training and certification only: no wallet, commission, order, P0 or accounting mutation.

ALTER TYPE public.admin_permission ADD VALUE IF NOT EXISTS 'academy';

CREATE OR REPLACE FUNCTION public.academy_is_admin()
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
        AND ap.permission::text IN ('full_access', 'academy', 'commercial_assets', 'conversation_coach', 'ai_goals', 'commercial_calendar', 'crm')
    );
$$;

CREATE TABLE IF NOT EXISTS public.academy_learning_paths (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  target_roles text[] NOT NULL DEFAULT '{}',
  difficulty text NOT NULL DEFAULT 'beginner' CHECK (difficulty IN ('beginner', 'intermediate', 'advanced', 'expert')),
  estimated_minutes integer NOT NULL DEFAULT 30 CHECK (estimated_minutes >= 0),
  sort_order integer NOT NULL DEFAULT 100,
  is_active boolean NOT NULL DEFAULT true,
  is_published boolean NOT NULL DEFAULT false,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.academy_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  path_id uuid REFERENCES public.academy_learning_paths(id) ON DELETE SET NULL,
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  course_type text NOT NULL DEFAULT 'text' CHECK (course_type IN ('text', 'video', 'pdf', 'quiz', 'exercise', 'case_study', 'simulation', 'resource')),
  level text NOT NULL DEFAULT 'beginner' CHECK (level IN ('beginner', 'intermediate', 'advanced', 'expert')),
  estimated_minutes integer NOT NULL DEFAULT 15 CHECK (estimated_minutes >= 0),
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  skills text[] NOT NULL DEFAULT '{}',
  prerequisites uuid[] NOT NULL DEFAULT '{}',
  sort_order integer NOT NULL DEFAULT 100,
  pass_score numeric NOT NULL DEFAULT 70 CHECK (pass_score >= 0 AND pass_score <= 100),
  is_required boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  is_published boolean NOT NULL DEFAULT false,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.academy_lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.academy_courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  lesson_type text NOT NULL DEFAULT 'text' CHECK (lesson_type IN ('text', 'image', 'video', 'pdf', 'exercise', 'case_study', 'simulation', 'resource')),
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  resource_url text,
  sort_order integer NOT NULL DEFAULT 100,
  estimated_minutes integer NOT NULL DEFAULT 5 CHECK (estimated_minutes >= 0),
  is_required boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (course_id, title)
);

CREATE TABLE IF NOT EXISTS public.academy_quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.academy_courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  passing_score numeric NOT NULL DEFAULT 70 CHECK (passing_score >= 0 AND passing_score <= 100),
  max_attempts integer NOT NULL DEFAULT 3 CHECK (max_attempts > 0),
  is_final boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (course_id, title)
);

CREATE TABLE IF NOT EXISTS public.academy_quiz_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES public.academy_quizzes(id) ON DELETE CASCADE,
  question_type text NOT NULL CHECK (question_type IN ('multiple_choice', 'true_false', 'case_study', 'scenario', 'short_answer')),
  question text NOT NULL,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  correct_answers jsonb NOT NULL DEFAULT '[]'::jsonb,
  explanation text,
  points numeric NOT NULL DEFAULT 1 CHECK (points >= 0),
  sort_order integer NOT NULL DEFAULT 100,
  is_active boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.academy_user_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  path_id uuid REFERENCES public.academy_learning_paths(id) ON DELETE SET NULL,
  course_id uuid NOT NULL REFERENCES public.academy_courses(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed', 'failed', 'skipped')),
  progress_percent numeric NOT NULL DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  score numeric CHECK (score IS NULL OR (score >= 0 AND score <= 100)),
  started_at timestamptz,
  completed_at timestamptz,
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  skills_acquired text[] NOT NULL DEFAULT '{}',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (user_id, course_id)
);

CREATE TABLE IF NOT EXISTS public.academy_quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  quiz_id uuid NOT NULL REFERENCES public.academy_quizzes(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.academy_courses(id) ON DELETE CASCADE,
  attempt_number integer NOT NULL DEFAULT 1 CHECK (attempt_number > 0),
  status text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'passed', 'failed')),
  score numeric CHECK (score IS NULL OR (score >= 0 AND score <= 100)),
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  UNIQUE (user_id, quiz_id, attempt_number)
);

CREATE TABLE IF NOT EXISTS public.academy_certifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  required_course_ids uuid[] NOT NULL DEFAULT '{}',
  required_skill_tags text[] NOT NULL DEFAULT '{}',
  minimum_score numeric NOT NULL DEFAULT 80 CHECK (minimum_score >= 0 AND minimum_score <= 100),
  requires_manual_validation boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  is_published boolean NOT NULL DEFAULT false,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.academy_user_certifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  certification_id uuid NOT NULL REFERENCES public.academy_certifications(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'eligible' CHECK (status IN ('eligible', 'pending_validation', 'issued', 'revoked')),
  score numeric CHECK (score IS NULL OR (score >= 0 AND score <= 100)),
  issued_at timestamptz,
  validated_by uuid,
  certificate_code text UNIQUE,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, certification_id)
);

CREATE TABLE IF NOT EXISTS public.academy_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_academy_courses_path ON public.academy_courses(path_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_academy_progress_user ON public.academy_user_progress(user_id, status);
CREATE INDEX IF NOT EXISTS idx_academy_attempts_user ON public.academy_quiz_attempts(user_id, quiz_id);
CREATE INDEX IF NOT EXISTS idx_academy_user_certs_user ON public.academy_user_certifications(user_id, status);
CREATE INDEX IF NOT EXISTS idx_academy_activity_user ON public.academy_activity_log(user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.academy_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.academy_history_is_append_only()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'academy_activity_log_append_only';
END;
$$;

DROP TRIGGER IF EXISTS trg_academy_paths_touch ON public.academy_learning_paths;
CREATE TRIGGER trg_academy_paths_touch BEFORE UPDATE ON public.academy_learning_paths
FOR EACH ROW EXECUTE FUNCTION public.academy_touch_updated_at();

DROP TRIGGER IF EXISTS trg_academy_courses_touch ON public.academy_courses;
CREATE TRIGGER trg_academy_courses_touch BEFORE UPDATE ON public.academy_courses
FOR EACH ROW EXECUTE FUNCTION public.academy_touch_updated_at();

DROP TRIGGER IF EXISTS trg_academy_lessons_touch ON public.academy_lessons;
CREATE TRIGGER trg_academy_lessons_touch BEFORE UPDATE ON public.academy_lessons
FOR EACH ROW EXECUTE FUNCTION public.academy_touch_updated_at();

DROP TRIGGER IF EXISTS trg_academy_quizzes_touch ON public.academy_quizzes;
CREATE TRIGGER trg_academy_quizzes_touch BEFORE UPDATE ON public.academy_quizzes
FOR EACH ROW EXECUTE FUNCTION public.academy_touch_updated_at();

DROP TRIGGER IF EXISTS trg_academy_user_certs_touch ON public.academy_user_certifications;
CREATE TRIGGER trg_academy_user_certs_touch BEFORE UPDATE ON public.academy_user_certifications
FOR EACH ROW EXECUTE FUNCTION public.academy_touch_updated_at();

DROP TRIGGER IF EXISTS trg_academy_activity_no_update ON public.academy_activity_log;
CREATE TRIGGER trg_academy_activity_no_update BEFORE UPDATE OR DELETE ON public.academy_activity_log
FOR EACH ROW EXECUTE FUNCTION public.academy_history_is_append_only();

CREATE OR REPLACE FUNCTION public.academy_log_activity(
  _action text,
  _entity_type text,
  _entity_id uuid,
  _payload jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.academy_activity_log(user_id, action, entity_type, entity_id, payload)
  VALUES (auth.uid(), _action, _entity_type, _entity_id, COALESCE(_payload, '{}'::jsonb));
END;
$$;

CREATE OR REPLACE FUNCTION public.academy_start_course(_course_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_course public.academy_courses%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'auth_required';
  END IF;

  SELECT * INTO v_course
  FROM public.academy_courses
  WHERE id = _course_id
    AND is_active = true
    AND (is_published = true OR public.academy_is_admin());

  IF NOT FOUND THEN
    RAISE EXCEPTION 'academy_course_not_available';
  END IF;

  INSERT INTO public.academy_user_progress(user_id, path_id, course_id, status, progress_percent, started_at, last_activity_at)
  VALUES (auth.uid(), v_course.path_id, v_course.id, 'in_progress', 1, now(), now())
  ON CONFLICT (user_id, course_id) DO UPDATE
  SET status = CASE WHEN public.academy_user_progress.status = 'completed' THEN 'completed' ELSE 'in_progress' END,
      started_at = COALESCE(public.academy_user_progress.started_at, now()),
      last_activity_at = now();

  PERFORM public.academy_log_activity('course_started', 'academy_course', v_course.id, jsonb_build_object('path_id', v_course.path_id));

  RETURN jsonb_build_object('course_id', v_course.id, 'status', 'in_progress');
END;
$$;

CREATE OR REPLACE FUNCTION public.academy_evaluate_certifications(_user_id uuid DEFAULT auth.uid())
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c public.academy_certifications%ROWTYPE;
  v_required integer;
  v_completed integer;
  v_avg_score numeric;
  v_status text;
  v_issued integer := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'auth_required';
  END IF;

  IF _user_id <> auth.uid() AND NOT public.academy_is_admin() THEN
    RAISE EXCEPTION 'academy_permission_denied';
  END IF;

  FOR c IN
    SELECT * FROM public.academy_certifications
    WHERE is_active = true AND is_published = true
  LOOP
    v_required := COALESCE(cardinality(c.required_course_ids), 0);

    SELECT count(*), COALESCE(avg(COALESCE(p.score, 100)), 0)
    INTO v_completed, v_avg_score
    FROM unnest(c.required_course_ids) req(course_id)
    JOIN public.academy_user_progress p
      ON p.course_id = req.course_id
     AND p.user_id = _user_id
     AND p.status = 'completed'
     AND COALESCE(p.score, 100) >= c.minimum_score;

    IF v_required = 0 OR v_completed = v_required THEN
      v_status := CASE WHEN c.requires_manual_validation THEN 'pending_validation' ELSE 'issued' END;

      INSERT INTO public.academy_user_certifications(
        user_id, certification_id, status, score, issued_at, certificate_code, metadata
      )
      VALUES (
        _user_id,
        c.id,
        v_status,
        COALESCE(v_avg_score, 100),
        CASE WHEN v_status = 'issued' THEN now() ELSE NULL END,
        'LPB-' || upper(substr(md5(_user_id::text || c.id::text || now()::text), 1, 10)),
        jsonb_build_object('source', 'academy_evaluate_certifications', 'required_courses', c.required_course_ids)
      )
      ON CONFLICT (user_id, certification_id) DO UPDATE
      SET status = CASE
            WHEN public.academy_user_certifications.status = 'revoked' THEN 'revoked'
            ELSE EXCLUDED.status
          END,
          score = EXCLUDED.score,
          issued_at = COALESCE(public.academy_user_certifications.issued_at, EXCLUDED.issued_at),
          metadata = public.academy_user_certifications.metadata || EXCLUDED.metadata;

      v_issued := v_issued + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('evaluated_user_id', _user_id, 'certifications_matched', v_issued);
END;
$$;

CREATE OR REPLACE FUNCTION public.academy_complete_course(
  _course_id uuid,
  _score numeric DEFAULT NULL,
  _skills text[] DEFAULT '{}'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_course public.academy_courses%ROWTYPE;
  v_status text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'auth_required';
  END IF;

  SELECT * INTO v_course
  FROM public.academy_courses
  WHERE id = _course_id
    AND is_active = true
    AND (is_published = true OR public.academy_is_admin());

  IF NOT FOUND THEN
    RAISE EXCEPTION 'academy_course_not_available';
  END IF;

  v_status := CASE WHEN _score IS NULL OR _score >= v_course.pass_score THEN 'completed' ELSE 'failed' END;

  INSERT INTO public.academy_user_progress(
    user_id, path_id, course_id, status, progress_percent, score, started_at, completed_at, last_activity_at, skills_acquired
  )
  VALUES (
    auth.uid(), v_course.path_id, v_course.id, v_status,
    CASE WHEN v_status = 'completed' THEN 100 ELSE 50 END,
    _score, now(), CASE WHEN v_status = 'completed' THEN now() ELSE NULL END, now(),
    ARRAY(SELECT DISTINCT unnest(COALESCE(v_course.skills, '{}') || COALESCE(_skills, '{}')))
  )
  ON CONFLICT (user_id, course_id) DO UPDATE
  SET status = EXCLUDED.status,
      progress_percent = EXCLUDED.progress_percent,
      score = EXCLUDED.score,
      completed_at = EXCLUDED.completed_at,
      last_activity_at = now(),
      skills_acquired = ARRAY(
        SELECT DISTINCT unnest(public.academy_user_progress.skills_acquired || EXCLUDED.skills_acquired)
      );

  PERFORM public.academy_log_activity(
    CASE WHEN v_status = 'completed' THEN 'course_completed' ELSE 'course_failed' END,
    'academy_course',
    v_course.id,
    jsonb_build_object('score', _score, 'pass_score', v_course.pass_score, 'skills', v_course.skills)
  );

  IF v_status = 'completed' THEN
    PERFORM public.academy_evaluate_certifications(auth.uid());
  END IF;

  RETURN jsonb_build_object('course_id', v_course.id, 'status', v_status, 'score', _score);
END;
$$;

CREATE OR REPLACE FUNCTION public.academy_submit_quiz_attempt(_quiz_id uuid, _answers jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_quiz public.academy_quizzes%ROWTYPE;
  v_attempt integer;
  v_score numeric;
  v_status text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'auth_required';
  END IF;

  SELECT q.* INTO v_quiz
  FROM public.academy_quizzes q
  JOIN public.academy_courses c ON c.id = q.course_id
  WHERE q.id = _quiz_id
    AND q.is_active = true
    AND c.is_active = true
    AND (c.is_published = true OR public.academy_is_admin());

  IF NOT FOUND THEN
    RAISE EXCEPTION 'academy_quiz_not_available';
  END IF;

  SELECT COALESCE(max(attempt_number), 0) + 1
  INTO v_attempt
  FROM public.academy_quiz_attempts
  WHERE user_id = auth.uid() AND quiz_id = _quiz_id;

  IF v_attempt > v_quiz.max_attempts THEN
    RAISE EXCEPTION 'academy_quiz_attempt_limit_reached';
  END IF;

  v_score := LEAST(100, GREATEST(0, COALESCE((_answers->>'score')::numeric, 0)));
  v_status := CASE WHEN v_score >= v_quiz.passing_score THEN 'passed' ELSE 'failed' END;

  INSERT INTO public.academy_quiz_attempts(user_id, quiz_id, course_id, attempt_number, status, score, answers, completed_at)
  VALUES (auth.uid(), v_quiz.id, v_quiz.course_id, v_attempt, v_status, v_score, COALESCE(_answers, '{}'::jsonb), now());

  PERFORM public.academy_log_activity('quiz_submitted', 'academy_quiz', v_quiz.id, jsonb_build_object('score', v_score, 'status', v_status));
  PERFORM public.academy_complete_course(v_quiz.course_id, v_score, ARRAY[]::text[]);

  RETURN jsonb_build_object('quiz_id', v_quiz.id, 'attempt_number', v_attempt, 'status', v_status, 'score', v_score);
END;
$$;

CREATE OR REPLACE VIEW public.advisor_academy_dashboard AS
SELECT
  c.id AS course_id,
  c.path_id,
  p.title AS path_title,
  p.slug AS path_slug,
  c.title,
  c.slug,
  c.description,
  c.course_type,
  c.level,
  c.estimated_minutes,
  c.skills,
  c.pass_score,
  c.sort_order,
  COALESCE(up.status, 'not_started') AS user_status,
  COALESCE(up.progress_percent, 0) AS progress_percent,
  up.score,
  up.started_at,
  up.completed_at
FROM public.academy_courses c
LEFT JOIN public.academy_learning_paths p ON p.id = c.path_id
LEFT JOIN public.academy_user_progress up
  ON up.course_id = c.id AND up.user_id = auth.uid()
WHERE c.is_active = true
  AND (c.is_published = true OR public.academy_is_admin())
ORDER BY COALESCE(p.sort_order, 999), c.sort_order, c.title;

CREATE OR REPLACE VIEW public.advisor_academy_summary AS
SELECT
  auth.uid() AS user_id,
  count(*) FILTER (WHERE c.is_active = true AND c.is_published = true) AS total_courses,
  count(up.id) FILTER (WHERE up.status = 'completed') AS completed_courses,
  count(up.id) FILTER (WHERE up.status = 'in_progress') AS in_progress_courses,
  COALESCE(round(
    100.0 * count(up.id) FILTER (WHERE up.status = 'completed')
    / NULLIF(count(*) FILTER (WHERE c.is_active = true AND c.is_published = true), 0),
    2
  ), 0) AS global_progress_percent,
  COALESCE(array_agg(DISTINCT acquired_skill.skill) FILTER (WHERE acquired_skill.skill IS NOT NULL), '{}') AS skills_acquired,
  (
    SELECT count(*)
    FROM public.academy_user_certifications uc
    WHERE uc.user_id = auth.uid() AND uc.status = 'issued'
  ) AS issued_certifications,
  (
    SELECT count(*)
    FROM public.academy_user_certifications uc
    WHERE uc.user_id = auth.uid() AND uc.status = 'pending_validation'
  ) AS pending_certifications
FROM public.academy_courses c
LEFT JOIN public.academy_user_progress up
  ON up.course_id = c.id AND up.user_id = auth.uid()
LEFT JOIN LATERAL unnest(COALESCE(up.skills_acquired, '{}')) AS acquired_skill(skill) ON true
WHERE c.is_active = true
  AND (c.is_published = true OR public.academy_is_admin());

CREATE OR REPLACE VIEW public.advisor_academy_certifications AS
SELECT
  c.id AS certification_id,
  c.slug,
  c.title,
  c.description,
  c.minimum_score,
  c.requires_manual_validation,
  COALESCE(uc.status, 'not_eligible') AS user_status,
  uc.score,
  uc.issued_at,
  uc.certificate_code
FROM public.academy_certifications c
LEFT JOIN public.academy_user_certifications uc
  ON uc.certification_id = c.id AND uc.user_id = auth.uid()
WHERE c.is_active = true
  AND (c.is_published = true OR public.academy_is_admin())
ORDER BY c.title;

CREATE OR REPLACE VIEW public.admin_academy_report AS
SELECT
  c.id AS course_id,
  c.title,
  c.course_type,
  c.level,
  count(up.id) AS enrolled_users,
  count(up.id) FILTER (WHERE up.status = 'completed') AS completed_users,
  count(up.id) FILTER (WHERE up.status = 'failed') AS failed_users,
  COALESCE(round(avg(up.score) FILTER (WHERE up.score IS NOT NULL), 2), 0) AS average_score,
  COALESCE(round(
    100.0 * count(up.id) FILTER (WHERE up.status = 'completed') / NULLIF(count(up.id), 0),
    2
  ), 0) AS completion_rate
FROM public.academy_courses c
LEFT JOIN public.academy_user_progress up ON up.course_id = c.id
WHERE public.academy_is_admin()
GROUP BY c.id, c.title, c.course_type, c.level
ORDER BY c.title;

INSERT INTO public.academy_learning_paths(slug, title, description, target_roles, difficulty, estimated_minutes, sort_order, is_published)
VALUES
  ('lpb-foundations', 'Decouverte LPB', 'Comprendre la plateforme, le role de conseiller et les bases commerciales.', ARRAY['advisor', 'ambassador'], 'beginner', 90, 10, true),
  ('sales-performance', 'Vente et performance commerciale', 'Methodes de vente aux particuliers, entreprises, gros et marketplace.', ARRAY['advisor', 'vendor'], 'intermediate', 180, 20, true),
  ('responsible-commerce', 'Ethique et vente responsable', 'Bonnes pratiques, service client, fidelisation et vente responsable.', ARRAY['advisor', 'vendor'], 'beginner', 120, 30, true)
ON CONFLICT (slug) DO NOTHING;

WITH paths AS (
  SELECT slug, id FROM public.academy_learning_paths
)
INSERT INTO public.academy_courses(slug, path_id, title, description, course_type, level, estimated_minutes, skills, sort_order, pass_score, is_required, is_published, content)
SELECT *
FROM (
  VALUES
    ('premiers-pas-lpb', (SELECT id FROM paths WHERE slug = 'lpb-foundations'), 'Premiers pas LPB', 'Comprendre le catalogue, les commandes et la posture de conseiller.', 'text', 'beginner', 20, ARRAY['lpb_basics', 'catalogue'], 10, 70, true, true, '{"formats":["text","quiz"],"future_links":["crm","objectifs_ia"]}'::jsonb),
    ('programme-conseiller-lpb', (SELECT id FROM paths WHERE slug = 'lpb-foundations'), 'Programme Conseiller LPB', 'Role, statut, expertise, niveau et bonnes pratiques de recommandation.', 'case_study', 'beginner', 30, ARRAY['advisor_program', 'ethics'], 20, 75, true, true, '{"formats":["text","case_study","quiz"],"future_links":["career_framework","trust_score"]}'::jsonb),
    ('utiliser-crm-calendrier-ia', (SELECT id FROM paths WHERE slug = 'lpb-foundations'), 'Utiliser CRM, Calendrier IA et Objectifs IA', 'Transformer les opportunites commerciales en actions suivies.', 'simulation', 'intermediate', 35, ARRAY['crm', 'commercial_calendar', 'ai_goals'], 30, 75, false, true, '{"formats":["simulation","exercise"],"future_links":["crm","commercial_calendar","ai_goals"]}'::jsonb),
    ('vente-particuliers-objections', (SELECT id FROM paths WHERE slug = 'sales-performance'), 'Vente aux particuliers et gestion des objections', 'Scripts, objections courantes, relance et fidelisation.', 'case_study', 'intermediate', 45, ARRAY['b2c_sales', 'objection_handling', 'retention'], 10, 75, false, true, '{"formats":["case_study","scenario","quiz"],"future_links":["conversation_coach","crm"]}'::jsonb),
    ('vente-gros-entreprises', (SELECT id FROM paths WHERE slug = 'sales-performance'), 'Vente en gros et entreprises', 'Identifier les besoins B2B, proposer cartons, caisses, devis et suivi.', 'simulation', 'intermediate', 50, ARRAY['b2b_sales', 'wholesale', 'quotes'], 20, 80, false, true, '{"formats":["simulation","pdf","exercise"],"future_links":["business_score","commercial_assets"]}'::jsonb),
    ('marketplace-performance', (SELECT id FROM paths WHERE slug = 'sales-performance'), 'Marketplace et performance vendeur', 'Optimiser fiches, photos, stocks, prix et service vendeur.', 'resource', 'intermediate', 40, ARRAY['marketplace', 'product_quality', 'stock_management'], 30, 80, false, true, '{"formats":["text","image","exercise"],"future_links":["marketplace_coach","image_studio"]}'::jsonb),
    ('vente-responsable-alcool', (SELECT id FROM paths WHERE slug = 'responsible-commerce'), 'Vente responsable des boissons alcoolisees', 'Regles d age, moderation, messages responsables et refus de vente.', 'quiz', 'beginner', 30, ARRAY['responsible_sales', 'compliance'], 10, 85, true, true, '{"formats":["text","quiz"],"future_links":["trust_score","governance"]}'::jsonb),
    ('service-client-ethique', (SELECT id FROM paths WHERE slug = 'responsible-commerce'), 'Service client et ethique commerciale', 'Qualite de service, litiges, transparence et relation long terme.', 'case_study', 'beginner', 35, ARRAY['customer_service', 'ethics', 'loyalty'], 20, 80, true, true, '{"formats":["case_study","scenario"],"future_links":["crm","trust_score"]}'::jsonb)
) AS seeded(slug, path_id, title, description, course_type, level, estimated_minutes, skills, sort_order, pass_score, is_required, is_published, content)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.academy_lessons(course_id, title, lesson_type, content, sort_order, estimated_minutes)
SELECT c.id, 'Objectif du module', 'text', jsonb_build_object('summary', c.description), 10, 5
FROM public.academy_courses c
WHERE c.slug IN ('premiers-pas-lpb', 'programme-conseiller-lpb', 'vente-responsable-alcool')
ON CONFLICT DO NOTHING;

INSERT INTO public.academy_quizzes(course_id, title, description, passing_score, max_attempts, is_final)
SELECT c.id, c.title || ' - Quiz', 'Validation rapide du module.', c.pass_score, 3, c.is_required
FROM public.academy_courses c
WHERE c.is_published = true
ON CONFLICT DO NOTHING;

INSERT INTO public.academy_certifications(slug, title, description, required_course_ids, required_skill_tags, minimum_score, requires_manual_validation, is_published)
SELECT
  'conseiller-lpb-certifie',
  'Conseiller LPB Certifie',
  'Certification officielle pour conseiller capable de vendre, relancer et respecter les regles LPB.',
  ARRAY[
    (SELECT id FROM public.academy_courses WHERE slug = 'premiers-pas-lpb'),
    (SELECT id FROM public.academy_courses WHERE slug = 'programme-conseiller-lpb'),
    (SELECT id FROM public.academy_courses WHERE slug = 'vente-responsable-alcool')
  ]::uuid[],
  ARRAY['lpb_basics', 'advisor_program', 'responsible_sales'],
  80,
  false,
  true
WHERE NOT EXISTS (SELECT 1 FROM public.academy_certifications WHERE slug = 'conseiller-lpb-certifie');

INSERT INTO public.academy_certifications(slug, title, description, required_course_ids, required_skill_tags, minimum_score, requires_manual_validation, is_published)
VALUES
  ('expert-champagne', 'Expert Champagne', 'Specialisation commerciale Champagne et cadeaux premium.', '{}', ARRAY['champagne', 'premium_sales'], 85, true, true),
  ('expert-whisky', 'Expert Whisky', 'Specialisation conseil Whisky, spiritueux et accords.', '{}', ARRAY['whisky', 'spirits'], 85, true, true),
  ('conseiller-entreprises', 'Conseiller Entreprises', 'Specialisation B2B, cadeaux entreprises, devis et suivi.', '{}', ARRAY['b2b_sales', 'quotes'], 85, true, true),
  ('expert-marketplace', 'Expert Marketplace', 'Specialisation vendeur marketplace, fiches et performance.', '{}', ARRAY['marketplace', 'product_quality'], 85, true, true),
  ('formateur-lpb', 'Formateur LPB', 'Capacite a former et accompagner de nouveaux conseillers.', '{}', ARRAY['training', 'leadership'], 90, true, true)
ON CONFLICT (slug) DO NOTHING;

ALTER TABLE public.academy_learning_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_user_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Academy paths readable" ON public.academy_learning_paths;
CREATE POLICY "Academy paths readable" ON public.academy_learning_paths
FOR SELECT TO authenticated
USING ((is_active = true AND is_published = true) OR public.academy_is_admin());

DROP POLICY IF EXISTS "Academy paths admin manage" ON public.academy_learning_paths;
CREATE POLICY "Academy paths admin manage" ON public.academy_learning_paths
FOR ALL TO authenticated
USING (public.academy_is_admin())
WITH CHECK (public.academy_is_admin());

DROP POLICY IF EXISTS "Academy courses readable" ON public.academy_courses;
CREATE POLICY "Academy courses readable" ON public.academy_courses
FOR SELECT TO authenticated
USING ((is_active = true AND is_published = true) OR public.academy_is_admin());

DROP POLICY IF EXISTS "Academy courses admin manage" ON public.academy_courses;
CREATE POLICY "Academy courses admin manage" ON public.academy_courses
FOR ALL TO authenticated
USING (public.academy_is_admin())
WITH CHECK (public.academy_is_admin());

DROP POLICY IF EXISTS "Academy child content readable" ON public.academy_lessons;
CREATE POLICY "Academy child content readable" ON public.academy_lessons
FOR SELECT TO authenticated
USING (is_active = true OR public.academy_is_admin());

DROP POLICY IF EXISTS "Academy lessons admin manage" ON public.academy_lessons;
CREATE POLICY "Academy lessons admin manage" ON public.academy_lessons
FOR ALL TO authenticated
USING (public.academy_is_admin())
WITH CHECK (public.academy_is_admin());

DROP POLICY IF EXISTS "Academy quizzes readable" ON public.academy_quizzes;
CREATE POLICY "Academy quizzes readable" ON public.academy_quizzes
FOR SELECT TO authenticated
USING (is_active = true OR public.academy_is_admin());

DROP POLICY IF EXISTS "Academy quizzes admin manage" ON public.academy_quizzes;
CREATE POLICY "Academy quizzes admin manage" ON public.academy_quizzes
FOR ALL TO authenticated
USING (public.academy_is_admin())
WITH CHECK (public.academy_is_admin());

DROP POLICY IF EXISTS "Academy questions readable" ON public.academy_quiz_questions;
CREATE POLICY "Academy questions readable" ON public.academy_quiz_questions
FOR SELECT TO authenticated
USING (is_active = true OR public.academy_is_admin());

DROP POLICY IF EXISTS "Academy questions admin manage" ON public.academy_quiz_questions;
CREATE POLICY "Academy questions admin manage" ON public.academy_quiz_questions
FOR ALL TO authenticated
USING (public.academy_is_admin())
WITH CHECK (public.academy_is_admin());

DROP POLICY IF EXISTS "Academy own progress" ON public.academy_user_progress;
CREATE POLICY "Academy own progress" ON public.academy_user_progress
FOR ALL TO authenticated
USING (user_id = auth.uid() OR public.academy_is_admin())
WITH CHECK (user_id = auth.uid() OR public.academy_is_admin());

DROP POLICY IF EXISTS "Academy own quiz attempts" ON public.academy_quiz_attempts;
CREATE POLICY "Academy own quiz attempts" ON public.academy_quiz_attempts
FOR ALL TO authenticated
USING (user_id = auth.uid() OR public.academy_is_admin())
WITH CHECK (user_id = auth.uid() OR public.academy_is_admin());

DROP POLICY IF EXISTS "Academy certifications readable" ON public.academy_certifications;
CREATE POLICY "Academy certifications readable" ON public.academy_certifications
FOR SELECT TO authenticated
USING ((is_active = true AND is_published = true) OR public.academy_is_admin());

DROP POLICY IF EXISTS "Academy certifications admin manage" ON public.academy_certifications;
CREATE POLICY "Academy certifications admin manage" ON public.academy_certifications
FOR ALL TO authenticated
USING (public.academy_is_admin())
WITH CHECK (public.academy_is_admin());

DROP POLICY IF EXISTS "Academy own user certifications" ON public.academy_user_certifications;
CREATE POLICY "Academy own user certifications" ON public.academy_user_certifications
FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.academy_is_admin());

DROP POLICY IF EXISTS "Academy user certifications admin manage" ON public.academy_user_certifications;
CREATE POLICY "Academy user certifications admin manage" ON public.academy_user_certifications
FOR ALL TO authenticated
USING (public.academy_is_admin())
WITH CHECK (public.academy_is_admin());

DROP POLICY IF EXISTS "Academy own activity log" ON public.academy_activity_log;
CREATE POLICY "Academy own activity log" ON public.academy_activity_log
FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.academy_is_admin());

DROP POLICY IF EXISTS "Academy activity insert own" ON public.academy_activity_log;
CREATE POLICY "Academy activity insert own" ON public.academy_activity_log
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() OR public.academy_is_admin());

GRANT SELECT ON public.advisor_academy_dashboard TO authenticated, service_role;
GRANT SELECT ON public.advisor_academy_summary TO authenticated, service_role;
GRANT SELECT ON public.advisor_academy_certifications TO authenticated, service_role;
GRANT SELECT ON public.admin_academy_report TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON
  public.academy_learning_paths,
  public.academy_courses,
  public.academy_lessons,
  public.academy_quizzes,
  public.academy_quiz_questions,
  public.academy_user_progress,
  public.academy_quiz_attempts,
  public.academy_certifications,
  public.academy_user_certifications
TO authenticated, service_role;
GRANT SELECT, INSERT ON public.academy_activity_log TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.academy_start_course(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.academy_complete_course(uuid, numeric, text[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.academy_submit_quiz_attempt(uuid, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.academy_evaluate_certifications(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.academy_start_course(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.academy_complete_course(uuid, numeric, text[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.academy_submit_quiz_attempt(uuid, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.academy_evaluate_certifications(uuid) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
