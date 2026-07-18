-- P3.2 Workflow & Case Resolution Engine.
-- Extends P3.1 governance cases with resolution workflow, assignment, comments,
-- checklists, deadlines and escalation proposals.
-- No P0 financial mutation: no wallets, commissions, orders, payments,
-- withdrawals, Revenue Engine, ledger or financial snapshots are touched.

CREATE OR REPLACE FUNCTION public.marketplace_workflow_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.marketplace_governance_is_admin();
$$;

ALTER TABLE public.marketplace_governance_cases
  ADD COLUMN IF NOT EXISTS workflow_status_code text NOT NULL DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS responsible_team_id uuid,
  ADD COLUMN IF NOT EXISTS due_at timestamptz,
  ADD COLUMN IF NOT EXISTS first_assigned_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_assigned_at timestamptz,
  ADD COLUMN IF NOT EXISTS resolution_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz,
  ADD COLUMN IF NOT EXISTS closed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reopened_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS time_spent_minutes integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS workflow_metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS public.marketplace_workflow_statuses (
  code text PRIMARY KEY,
  label text NOT NULL,
  description text,
  stage_order integer NOT NULL,
  maps_to_governance_status text NOT NULL DEFAULT 'in_progress'
    CHECK (maps_to_governance_status IN ('new', 'in_progress', 'waiting', 'validated', 'refused', 'archived')),
  is_terminal boolean NOT NULL DEFAULT false,
  is_vendor_waiting boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.marketplace_workflow_statuses(
  code, label, description, stage_order, maps_to_governance_status, is_terminal, is_vendor_waiting
)
VALUES
  ('new', 'Nouveau', 'Dossier recu, pas encore qualifie.', 10, 'new', false, false),
  ('to_analyze', 'A analyser', 'Dossier pret pour analyse humaine.', 20, 'in_progress', false, false),
  ('in_progress', 'En cours', 'Traitement en cours par l equipe.', 30, 'in_progress', false, false),
  ('info_requested', 'Informations demandees', 'Demande d information preparee ou envoyee.', 40, 'waiting', false, true),
  ('waiting_vendor', 'En attente vendeur', 'Attente d une reponse ou justificatif vendeur.', 50, 'waiting', false, true),
  ('vendor_replied', 'Reponse recue', 'Le vendeur a repondu, une revue admin est necessaire.', 60, 'in_progress', false, false),
  ('to_validate', 'A valider', 'Resolution proposee, validation finale requise.', 70, 'in_progress', false, false),
  ('resolved', 'Resolu', 'Dossier resolu, pret pour cloture.', 80, 'validated', true, false),
  ('closed', 'Cloture', 'Dossier cloture.', 90, 'archived', true, false),
  ('reopened', 'Reouvert', 'Dossier reouvert apres cloture ou resolution.', 100, 'in_progress', false, false)
ON CONFLICT (code) DO UPDATE
SET label = EXCLUDED.label,
    description = EXCLUDED.description,
    stage_order = EXCLUDED.stage_order,
    maps_to_governance_status = EXCLUDED.maps_to_governance_status,
    is_terminal = EXCLUDED.is_terminal,
    is_vendor_waiting = EXCLUDED.is_vendor_waiting,
    is_active = true;

CREATE TABLE IF NOT EXISTS public.marketplace_resolution_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  skills text[] NOT NULL DEFAULT ARRAY[]::text[],
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.marketplace_resolution_teams(name, description, skills)
VALUES
  ('Qualite Catalogue', 'Controle qualite, doublons, categories et enrichissements.', ARRAY['catalogue_intelligence', 'duplicates', 'quality']),
  ('SEO Marketplace', 'Optimisation SEO, decouvrabilite et contenus.', ARRAY['marketplace_seo', 'discoverability']),
  ('Studio Image', 'Images Marketplace, conformite et normalisation.', ARRAY['marketplace_image_studio', 'visual_quality']),
  ('Accompagnement Vendeur', 'Relation vendeur, demandes d information et suivi.', ARRAY['seller_support', 'vendor_reply'])
ON CONFLICT (name) DO UPDATE
SET description = EXCLUDED.description,
    skills = EXCLUDED.skills,
    is_active = true,
    updated_at = now();

CREATE TABLE IF NOT EXISTS public.marketplace_case_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.marketplace_governance_cases(id) ON DELETE CASCADE,
  assignee_id uuid,
  team_id uuid REFERENCES public.marketplace_resolution_teams(id) ON DELETE SET NULL,
  assigned_by uuid,
  role text NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'observer')),
  is_active boolean NOT NULL DEFAULT true,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  unassigned_at timestamptz,
  note text,
  UNIQUE(case_id, assignee_id, team_id, role, is_active)
);

CREATE TABLE IF NOT EXISTS public.marketplace_case_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.marketplace_governance_cases(id) ON DELETE CASCADE,
  author_id uuid,
  author_type text NOT NULL DEFAULT 'admin' CHECK (author_type IN ('admin', 'vendor', 'system')),
  comment_type text NOT NULL DEFAULT 'comment' CHECK (comment_type IN ('comment', 'information_request', 'evidence', 'decision_note', 'internal_note')),
  visibility text NOT NULL DEFAULT 'internal' CHECK (visibility IN ('internal', 'vendor')),
  body text NOT NULL,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.marketplace_case_checklist_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_type text NOT NULL REFERENCES public.marketplace_governance_case_types(code),
  label text NOT NULL,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(case_type)
);

INSERT INTO public.marketplace_case_checklist_templates(case_type, label, items)
VALUES
  ('non_compliant_image', 'Checklist image Marketplace', '["Image originale consultee","Produit entierement visible","Fond et format verifies","Decision image documentee"]'::jsonb),
  ('weak_seo', 'Checklist SEO Marketplace', '["Titre controle","Meta et mots cles controles","Categorie verifiee","Recommandation documentee"]'::jsonb),
  ('probable_duplicate', 'Checklist doublon', '["Produit source verifie","Produit candidat verifie","Marque volume et image compares","Decision fusion/refus documentee"]'::jsonb),
  ('merge_proposed', 'Checklist fusion', '["Fiches comparees","Impact SEO verifie","Impact vendeur verifie","Validation finale effectuee"]'::jsonb),
  ('seller_support_needed', 'Checklist accompagnement vendeur', '["Probleme explique","Vendeur contacte si necessaire","Reponse analysee","Suite documentee"]'::jsonb),
  ('incomplete_listing', 'Checklist fiche incomplete', '["Champs manquants identifies","Qualite description controlee","Image et categorie controlees","Correction demandee ou validee"]'::jsonb)
ON CONFLICT (case_type) DO UPDATE
SET label = EXCLUDED.label,
    items = EXCLUDED.items,
    is_active = true;

CREATE TABLE IF NOT EXISTS public.marketplace_case_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.marketplace_governance_cases(id) ON DELETE CASCADE,
  template_id uuid REFERENCES public.marketplace_case_checklist_templates(id) ON DELETE SET NULL,
  label text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  is_completed boolean NOT NULL DEFAULT false,
  completed_by uuid,
  completed_at timestamptz,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(case_id, label)
);

CREATE TABLE IF NOT EXISTS public.marketplace_case_escalations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.marketplace_governance_cases(id) ON DELETE CASCADE,
  escalation_type text NOT NULL CHECK (escalation_type IN ('blocked', 'overdue', 'critical_priority', 'vendor_no_response')),
  severity text NOT NULL DEFAULT 'normal' CHECK (severity IN ('critical', 'high', 'normal', 'low')),
  status text NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed', 'acknowledged', 'dismissed', 'resolved')),
  reason text NOT NULL,
  recommended_action text NOT NULL,
  detected_at timestamptz NOT NULL DEFAULT now(),
  acknowledged_by uuid,
  acknowledged_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE(case_id, escalation_type, status)
);

CREATE TABLE IF NOT EXISTS public.marketplace_case_workflow_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES public.marketplace_governance_cases(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  actor_id uuid,
  actor_type text NOT NULL DEFAULT 'system' CHECK (actor_type IN ('system', 'admin', 'vendor')),
  event_type text NOT NULL,
  previous_value jsonb,
  new_value jsonb,
  comment text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_marketplace_cases_workflow_status
  ON public.marketplace_governance_cases(workflow_status_code, due_at, priority);
CREATE INDEX IF NOT EXISTS idx_marketplace_case_assignments_case
  ON public.marketplace_case_assignments(case_id, is_active, assigned_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_case_comments_case
  ON public.marketplace_case_comments(case_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_case_checklist_case
  ON public.marketplace_case_checklist_items(case_id, is_completed, position);
CREATE INDEX IF NOT EXISTS idx_marketplace_case_escalations_case
  ON public.marketplace_case_escalations(case_id, status, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_case_workflow_events_case
  ON public.marketplace_case_workflow_events(case_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.marketplace_workflow_append_only()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'marketplace_workflow_event_is_append_only';
END;
$$;

DROP TRIGGER IF EXISTS trg_marketplace_workflow_events_append_only ON public.marketplace_case_workflow_events;
CREATE TRIGGER trg_marketplace_workflow_events_append_only
  BEFORE UPDATE OR DELETE ON public.marketplace_case_workflow_events
  FOR EACH ROW EXECUTE FUNCTION public.marketplace_workflow_append_only();

DROP TRIGGER IF EXISTS trg_marketplace_case_comments_append_only ON public.marketplace_case_comments;
CREATE TRIGGER trg_marketplace_case_comments_append_only
  BEFORE UPDATE OR DELETE ON public.marketplace_case_comments
  FOR EACH ROW EXECUTE FUNCTION public.marketplace_workflow_append_only();

CREATE OR REPLACE FUNCTION public.initialize_marketplace_case_resolution(_case_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_case public.marketplace_governance_cases%ROWTYPE;
  v_template public.marketplace_case_checklist_templates%ROWTYPE;
  v_index integer := 0;
  v_item text;
  v_created integer := 0;
BEGIN
  IF auth.uid() IS NULL OR NOT public.marketplace_workflow_is_admin() THEN
    RAISE EXCEPTION 'marketplace_workflow_admin_required';
  END IF;

  SELECT * INTO v_case FROM public.marketplace_governance_cases WHERE id = _case_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'marketplace_workflow_case_not_found';
  END IF;

  SELECT * INTO v_template
  FROM public.marketplace_case_checklist_templates
  WHERE case_type = v_case.case_type
    AND is_active = true;

  IF FOUND THEN
    FOR v_item IN SELECT jsonb_array_elements_text(v_template.items)
    LOOP
      v_index := v_index + 1;
      INSERT INTO public.marketplace_case_checklist_items(case_id, template_id, label, position)
      VALUES (_case_id, v_template.id, v_item, v_index)
      ON CONFLICT (case_id, label) DO NOTHING;
      IF FOUND THEN
        v_created := v_created + 1;
      END IF;
    END LOOP;
  END IF;

  UPDATE public.marketplace_governance_cases
  SET workflow_status_code = CASE WHEN workflow_status_code = 'new' THEN 'to_analyze' ELSE workflow_status_code END,
      resolution_started_at = COALESCE(resolution_started_at, now())
  WHERE id = _case_id;

  INSERT INTO public.marketplace_case_workflow_events(case_id, actor_id, actor_type, event_type, new_value, comment)
  VALUES (_case_id, auth.uid(), 'admin', 'resolution_initialized', jsonb_build_object('created_checklist_items', v_created), 'Initialisation du traitement P3.2');

  RETURN jsonb_build_object('case_id', _case_id, 'created_checklist_items', v_created);
END;
$$;

CREATE OR REPLACE FUNCTION public.suggest_marketplace_case_assignees(_case_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_case public.marketplace_governance_cases%ROWTYPE;
  v_skills text[];
  v_teams jsonb;
  v_users jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT public.marketplace_workflow_is_admin() THEN
    RAISE EXCEPTION 'marketplace_workflow_admin_required';
  END IF;

  SELECT * INTO v_case FROM public.marketplace_governance_cases WHERE id = _case_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'marketplace_workflow_case_not_found';
  END IF;

  v_skills := CASE
    WHEN v_case.case_type IN ('non_compliant_image') THEN ARRAY['marketplace_image_studio', 'visual_quality']
    WHEN v_case.case_type IN ('weak_seo') THEN ARRAY['marketplace_seo', 'discoverability']
    WHEN v_case.case_type IN ('probable_duplicate', 'merge_proposed', 'category_mismatch', 'brand_mismatch') THEN ARRAY['catalogue_intelligence', 'duplicates', 'quality']
    ELSE ARRAY['seller_support', 'vendor_reply']
  END;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('team_id', id, 'name', name, 'skills', skills)), '[]'::jsonb)
  INTO v_teams
  FROM public.marketplace_resolution_teams
  WHERE is_active = true
    AND skills && v_skills;

  SELECT COALESCE(jsonb_agg(DISTINCT jsonb_build_object('user_id', ap.user_id, 'permission', ap.permission::text)), '[]'::jsonb)
  INTO v_users
  FROM public.admin_permissions ap
  WHERE ap.permission::text IN ('full_access', 'marketplace_governance', 'marketplace_analytics', 'catalogue_intelligence', 'marketplace_seo', 'marketplace_coach', 'marketplace_image_studio');

  RETURN jsonb_build_object(
    'case_id', _case_id,
    'suggested_skills', v_skills,
    'teams', v_teams,
    'users', v_users,
    'requires_admin_validation', true
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.assign_marketplace_governance_case(
  _case_id uuid,
  _assignee_id uuid DEFAULT NULL,
  _team_id uuid DEFAULT NULL,
  _observer_ids uuid[] DEFAULT ARRAY[]::uuid[],
  _note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_case public.marketplace_governance_cases%ROWTYPE;
  v_observer uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT public.marketplace_workflow_is_admin() THEN
    RAISE EXCEPTION 'marketplace_workflow_admin_required';
  END IF;

  SELECT * INTO v_case FROM public.marketplace_governance_cases WHERE id = _case_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'marketplace_workflow_case_not_found';
  END IF;

  UPDATE public.marketplace_case_assignments
  SET is_active = false,
      unassigned_at = now()
  WHERE case_id = _case_id
    AND role = 'owner'
    AND is_active = true;

  IF _assignee_id IS NOT NULL OR _team_id IS NOT NULL THEN
    INSERT INTO public.marketplace_case_assignments(case_id, assignee_id, team_id, assigned_by, role, note)
    VALUES (_case_id, _assignee_id, _team_id, auth.uid(), 'owner', _note);
  END IF;

  FOREACH v_observer IN ARRAY COALESCE(_observer_ids, ARRAY[]::uuid[])
  LOOP
    INSERT INTO public.marketplace_case_assignments(case_id, assignee_id, assigned_by, role, note)
    VALUES (_case_id, v_observer, auth.uid(), 'observer', _note)
    ON CONFLICT DO NOTHING;
  END LOOP;

  UPDATE public.marketplace_governance_cases
  SET assigned_to = _assignee_id,
      responsible_team_id = _team_id,
      first_assigned_at = COALESCE(first_assigned_at, now()),
      last_assigned_at = now(),
      workflow_status_code = CASE WHEN workflow_status_code = 'new' THEN 'to_analyze' ELSE workflow_status_code END
  WHERE id = _case_id;

  INSERT INTO public.marketplace_case_workflow_events(case_id, actor_id, actor_type, event_type, previous_value, new_value, comment)
  VALUES (
    _case_id,
    auth.uid(),
    'admin',
    'assignment_changed',
    jsonb_build_object('assigned_to', v_case.assigned_to, 'team_id', v_case.responsible_team_id),
    jsonb_build_object('assigned_to', _assignee_id, 'team_id', _team_id, 'observers', _observer_ids),
    _note
  );

  INSERT INTO public.marketplace_governance_notifications(case_id, recipient_id, recipient_role, notification_type, title, message, severity, metadata)
  VALUES (_case_id, _assignee_id, 'admin', 'case_assigned', 'Dossier Marketplace assigne', COALESCE(_note, 'Un dossier vous a ete assigne.'), v_case.priority, jsonb_build_object('case_number', v_case.case_number));

  RETURN jsonb_build_object('case_id', _case_id, 'assigned_to', _assignee_id, 'team_id', _team_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.transition_marketplace_governance_case(
  _case_id uuid,
  _workflow_status_code text,
  _comment text DEFAULT NULL,
  _vendor_visible boolean DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_case public.marketplace_governance_cases%ROWTYPE;
  v_status public.marketplace_workflow_statuses%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR NOT public.marketplace_workflow_is_admin() THEN
    RAISE EXCEPTION 'marketplace_workflow_admin_required';
  END IF;

  SELECT * INTO v_case FROM public.marketplace_governance_cases WHERE id = _case_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'marketplace_workflow_case_not_found';
  END IF;

  SELECT * INTO v_status FROM public.marketplace_workflow_statuses WHERE code = _workflow_status_code AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'marketplace_workflow_invalid_status';
  END IF;

  UPDATE public.marketplace_governance_cases
  SET workflow_status_code = _workflow_status_code,
      status = v_status.maps_to_governance_status,
      is_vendor_visible = COALESCE(_vendor_visible, is_vendor_visible),
      resolution_started_at = CASE WHEN resolution_started_at IS NULL AND _workflow_status_code <> 'new' THEN now() ELSE resolution_started_at END,
      resolved_at = CASE WHEN _workflow_status_code = 'resolved' THEN now() ELSE resolved_at END,
      closed_at = CASE WHEN _workflow_status_code = 'closed' THEN now() ELSE closed_at END,
      reopened_count = CASE WHEN _workflow_status_code = 'reopened' THEN reopened_count + 1 ELSE reopened_count END,
      final_decision = CASE WHEN v_status.is_terminal THEN COALESCE(_comment, final_decision) ELSE final_decision END,
      decided_by = CASE WHEN v_status.is_terminal THEN auth.uid() ELSE decided_by END,
      decided_at = CASE WHEN v_status.is_terminal THEN now() ELSE decided_at END
  WHERE id = _case_id;

  INSERT INTO public.marketplace_case_workflow_events(case_id, actor_id, actor_type, event_type, previous_value, new_value, comment)
  VALUES (
    _case_id,
    auth.uid(),
    'admin',
    'workflow_status_changed',
    jsonb_build_object('workflow_status_code', v_case.workflow_status_code, 'status', v_case.status),
    jsonb_build_object('workflow_status_code', _workflow_status_code, 'status', v_status.maps_to_governance_status),
    _comment
  );

  INSERT INTO public.marketplace_governance_notifications(case_id, recipient_id, recipient_role, notification_type, title, message, severity, metadata)
  VALUES (
    _case_id,
    CASE WHEN COALESCE(_vendor_visible, v_case.is_vendor_visible) THEN v_case.vendor_owner_id ELSE NULL END,
    CASE WHEN COALESCE(_vendor_visible, v_case.is_vendor_visible) THEN 'vendor' ELSE 'admin' END,
    CASE WHEN _workflow_status_code IN ('info_requested', 'waiting_vendor') THEN 'information_requested' WHEN _workflow_status_code IN ('closed', 'resolved') THEN 'case_closed' WHEN _workflow_status_code = 'reopened' THEN 'case_reopened' ELSE 'status_changed' END,
    'Statut de dossier Marketplace mis a jour',
    COALESCE(_comment, 'Le statut du dossier a ete mis a jour.'),
    v_case.priority,
    jsonb_build_object('old_workflow_status', v_case.workflow_status_code, 'new_workflow_status', _workflow_status_code)
  );

  RETURN jsonb_build_object('case_id', _case_id, 'workflow_status_code', _workflow_status_code, 'status', v_status.maps_to_governance_status);
END;
$$;

CREATE OR REPLACE FUNCTION public.add_marketplace_case_comment(
  _case_id uuid,
  _body text,
  _visibility text DEFAULT 'internal',
  _comment_type text DEFAULT 'comment',
  _attachments jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_case public.marketplace_governance_cases%ROWTYPE;
  v_author text;
  v_comment_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'marketplace_workflow_auth_required';
  END IF;

  SELECT * INTO v_case FROM public.marketplace_governance_cases WHERE id = _case_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'marketplace_workflow_case_not_found';
  END IF;

  IF public.marketplace_workflow_is_admin() THEN
    v_author := 'admin';
  ELSIF v_case.is_vendor_visible AND v_case.vendor_owner_id = auth.uid() THEN
    v_author := 'vendor';
    _visibility := 'vendor';
    _comment_type := 'evidence';
  ELSE
    RAISE EXCEPTION 'marketplace_workflow_case_forbidden';
  END IF;

  IF _visibility NOT IN ('internal', 'vendor') THEN
    RAISE EXCEPTION 'marketplace_workflow_invalid_visibility';
  END IF;

  INSERT INTO public.marketplace_case_comments(case_id, author_id, author_type, comment_type, visibility, body, attachments)
  VALUES (_case_id, auth.uid(), v_author, _comment_type, _visibility, _body, COALESCE(_attachments, '[]'::jsonb))
  RETURNING id INTO v_comment_id;

  INSERT INTO public.marketplace_case_workflow_events(case_id, actor_id, actor_type, event_type, new_value, comment)
  VALUES (_case_id, auth.uid(), v_author, 'comment_added', jsonb_build_object('comment_id', v_comment_id, 'visibility', _visibility, 'comment_type', _comment_type), _body);

  IF v_author = 'vendor' THEN
    UPDATE public.marketplace_governance_cases
    SET workflow_status_code = CASE WHEN workflow_status_code IN ('waiting_vendor', 'info_requested') THEN 'vendor_replied' ELSE workflow_status_code END,
        status = CASE WHEN workflow_status_code IN ('waiting_vendor', 'info_requested') THEN 'in_progress' ELSE status END
    WHERE id = _case_id;

    INSERT INTO public.marketplace_governance_notifications(case_id, recipient_id, recipient_role, notification_type, title, message, severity, metadata)
    VALUES (_case_id, NULL, 'admin', 'vendor_reply', 'Reponse vendeur recue', _body, v_case.priority, jsonb_build_object('comment_id', v_comment_id));
  END IF;

  RETURN jsonb_build_object('case_id', _case_id, 'comment_id', v_comment_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.update_marketplace_case_checklist_item(
  _item_id uuid,
  _is_completed boolean,
  _note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item public.marketplace_case_checklist_items%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR NOT public.marketplace_workflow_is_admin() THEN
    RAISE EXCEPTION 'marketplace_workflow_admin_required';
  END IF;

  SELECT * INTO v_item FROM public.marketplace_case_checklist_items WHERE id = _item_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'marketplace_workflow_checklist_item_not_found';
  END IF;

  UPDATE public.marketplace_case_checklist_items
  SET is_completed = _is_completed,
      completed_by = CASE WHEN _is_completed THEN auth.uid() ELSE NULL END,
      completed_at = CASE WHEN _is_completed THEN now() ELSE NULL END,
      note = COALESCE(_note, note)
  WHERE id = _item_id;

  INSERT INTO public.marketplace_case_workflow_events(case_id, actor_id, actor_type, event_type, previous_value, new_value, comment)
  VALUES (
    v_item.case_id,
    auth.uid(),
    'admin',
    'checklist_item_updated',
    jsonb_build_object('item_id', _item_id, 'is_completed', v_item.is_completed),
    jsonb_build_object('item_id', _item_id, 'is_completed', _is_completed),
    _note
  );

  RETURN jsonb_build_object('item_id', _item_id, 'is_completed', _is_completed);
END;
$$;

CREATE OR REPLACE FUNCTION public.scan_marketplace_case_escalations(_limit integer DEFAULT 100)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  v_created integer := 0;
  v_limit integer := LEAST(GREATEST(COALESCE(_limit, 100), 1), 500);
  v_type text;
  v_reason text;
BEGIN
  IF auth.uid() IS NULL OR NOT public.marketplace_workflow_is_admin() THEN
    RAISE EXCEPTION 'marketplace_workflow_admin_required';
  END IF;

  FOR r IN
    SELECT c.*
    FROM public.marketplace_governance_cases c
    WHERE c.workflow_status_code NOT IN ('resolved', 'closed')
      AND (
        c.priority = 'critical'
        OR (c.due_at IS NOT NULL AND c.due_at < now())
        OR (c.workflow_status_code = 'waiting_vendor' AND c.updated_at < now() - interval '72 hours')
      )
    ORDER BY c.priority, c.due_at NULLS LAST, c.updated_at
    LIMIT v_limit
  LOOP
    v_type := CASE
      WHEN r.priority = 'critical' THEN 'critical_priority'
      WHEN r.due_at IS NOT NULL AND r.due_at < now() THEN 'overdue'
      WHEN r.workflow_status_code = 'waiting_vendor' THEN 'vendor_no_response'
      ELSE 'blocked'
    END;
    v_reason := CASE v_type
      WHEN 'critical_priority' THEN 'Dossier critique necessitant revue prioritaire.'
      WHEN 'overdue' THEN 'Echeance depassee.'
      WHEN 'vendor_no_response' THEN 'Absence de reponse vendeur au-dela du delai de suivi.'
      ELSE 'Dossier potentiellement bloque.'
    END;

    INSERT INTO public.marketplace_case_escalations(case_id, escalation_type, severity, reason, recommended_action, metadata)
    VALUES (
      r.id,
      v_type,
      CASE WHEN r.priority = 'critical' THEN 'critical' ELSE 'high' END,
      v_reason,
      'Revoir le dossier et choisir manuellement la suite. Aucune action automatique.',
      jsonb_build_object('workflow_status_code', r.workflow_status_code, 'due_at', r.due_at, 'priority', r.priority)
    )
    ON CONFLICT (case_id, escalation_type, status) DO NOTHING;

    IF FOUND THEN
      v_created := v_created + 1;
      INSERT INTO public.marketplace_case_workflow_events(case_id, actor_type, event_type, new_value, comment)
      VALUES (r.id, 'system', 'escalation_proposed', jsonb_build_object('escalation_type', v_type), v_reason);
    END IF;
  END LOOP;

  RETURN jsonb_build_object('created_escalations', v_created, 'limit', v_limit, 'mode', 'proposal_only');
END;
$$;

CREATE OR REPLACE VIEW public.admin_marketplace_case_resolution_queue AS
SELECT
  c.*,
  ws.label AS workflow_status_label,
  ws.stage_order,
  ws.is_vendor_waiting,
  ws.is_terminal,
  vs.name AS shop_name,
  p.name AS product_name,
  t.label AS case_type_label,
  rt.name AS responsible_team_name,
  (
    SELECT count(*)
    FROM public.marketplace_case_comments cc
    WHERE cc.case_id = c.id
  )::integer AS comments_count,
  (
    SELECT count(*)
    FROM public.marketplace_case_checklist_items ci
    WHERE ci.case_id = c.id
  )::integer AS checklist_count,
  (
    SELECT count(*)
    FROM public.marketplace_case_checklist_items ci
    WHERE ci.case_id = c.id AND ci.is_completed
  )::integer AS checklist_completed_count,
  (
    SELECT count(*)
    FROM public.marketplace_case_escalations e
    WHERE e.case_id = c.id AND e.status = 'proposed'
  )::integer AS open_escalations_count,
  (
    SELECT max(e.detected_at)
    FROM public.marketplace_case_escalations e
    WHERE e.case_id = c.id
  ) AS last_escalation_at
FROM public.marketplace_governance_cases c
LEFT JOIN public.marketplace_workflow_statuses ws ON ws.code = c.workflow_status_code
LEFT JOIN public.vendor_shops vs ON vs.id = c.vendor_shop_id
LEFT JOIN public.products p ON p.id = c.product_id
LEFT JOIN public.marketplace_governance_case_types t ON t.code = c.case_type
LEFT JOIN public.marketplace_resolution_teams rt ON rt.id = c.responsible_team_id
WHERE public.marketplace_workflow_is_admin()
ORDER BY
  CASE c.priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'normal' THEN 3 ELSE 4 END,
  COALESCE(ws.stage_order, 999),
  c.due_at NULLS LAST,
  c.created_at DESC;

CREATE OR REPLACE VIEW public.admin_marketplace_case_resolution_overview AS
SELECT
  count(*) FILTER (WHERE c.workflow_status_code NOT IN ('resolved', 'closed'))::integer AS active_cases,
  count(*) FILTER (WHERE c.assigned_to IS NULL AND c.workflow_status_code NOT IN ('resolved', 'closed'))::integer AS unassigned_cases,
  count(*) FILTER (WHERE c.due_at IS NOT NULL AND c.due_at < now() AND c.workflow_status_code NOT IN ('resolved', 'closed'))::integer AS overdue_cases,
  count(*) FILTER (WHERE c.workflow_status_code = 'waiting_vendor')::integer AS waiting_vendor_cases,
  count(*) FILTER (WHERE c.workflow_status_code = 'vendor_replied')::integer AS vendor_replied_cases,
  count(*) FILTER (WHERE e.status = 'proposed')::integer AS proposed_escalations,
  round(COALESCE(avg(EXTRACT(EPOCH FROM (COALESCE(c.resolved_at, c.closed_at) - c.created_at)) / 3600) FILTER (WHERE c.resolved_at IS NOT NULL OR c.closed_at IS NOT NULL), 0), 2) AS avg_resolution_hours
FROM public.marketplace_governance_cases c
LEFT JOIN public.marketplace_case_escalations e ON e.case_id = c.id
WHERE public.marketplace_workflow_is_admin();

CREATE OR REPLACE VIEW public.admin_marketplace_case_comments AS
SELECT cc.*
FROM public.marketplace_case_comments cc
WHERE public.marketplace_workflow_is_admin()
ORDER BY cc.created_at DESC;

CREATE OR REPLACE VIEW public.admin_marketplace_case_checklist_items AS
SELECT ci.*
FROM public.marketplace_case_checklist_items ci
WHERE public.marketplace_workflow_is_admin()
ORDER BY ci.position, ci.created_at;

CREATE OR REPLACE VIEW public.admin_marketplace_case_escalations AS
SELECT e.*
FROM public.marketplace_case_escalations e
WHERE public.marketplace_workflow_is_admin()
ORDER BY e.detected_at DESC;

CREATE OR REPLACE VIEW public.my_marketplace_case_resolution_cases AS
SELECT
  c.id,
  c.case_number,
  c.created_at,
  c.updated_at,
  c.workflow_status_code,
  ws.label AS workflow_status_label,
  c.priority,
  c.due_at,
  c.vendor_shop_id,
  c.product_id,
  p.name AS product_name,
  c.problem,
  c.explanation,
  c.recommended_actions,
  c.final_decision,
  (
    SELECT count(*)
    FROM public.marketplace_case_comments cc
    WHERE cc.case_id = c.id AND cc.visibility = 'vendor'
  )::integer AS visible_comments_count,
  (
    SELECT count(*)
    FROM public.marketplace_case_checklist_items ci
    WHERE ci.case_id = c.id
  )::integer AS checklist_count,
  (
    SELECT count(*)
    FROM public.marketplace_case_checklist_items ci
    WHERE ci.case_id = c.id AND ci.is_completed
  )::integer AS checklist_completed_count
FROM public.marketplace_governance_cases c
LEFT JOIN public.marketplace_workflow_statuses ws ON ws.code = c.workflow_status_code
LEFT JOIN public.products p ON p.id = c.product_id
WHERE c.is_vendor_visible = true
  AND c.vendor_owner_id = auth.uid()
ORDER BY COALESCE(ws.stage_order, 999), c.created_at DESC;

CREATE OR REPLACE VIEW public.my_marketplace_case_comments AS
SELECT cc.*
FROM public.marketplace_case_comments cc
JOIN public.marketplace_governance_cases c ON c.id = cc.case_id
WHERE cc.visibility = 'vendor'
  AND c.is_vendor_visible = true
  AND c.vendor_owner_id = auth.uid()
ORDER BY cc.created_at DESC;

CREATE OR REPLACE VIEW public.my_marketplace_case_checklist_items AS
SELECT ci.*
FROM public.marketplace_case_checklist_items ci
JOIN public.marketplace_governance_cases c ON c.id = ci.case_id
WHERE c.is_vendor_visible = true
  AND c.vendor_owner_id = auth.uid()
ORDER BY ci.position, ci.created_at;

ALTER TABLE public.marketplace_workflow_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_resolution_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_case_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_case_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_case_checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_case_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_case_escalations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_case_workflow_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workflow statuses readable" ON public.marketplace_workflow_statuses;
CREATE POLICY "Workflow statuses readable"
  ON public.marketplace_workflow_statuses FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Resolution teams admin readable" ON public.marketplace_resolution_teams;
CREATE POLICY "Resolution teams admin readable"
  ON public.marketplace_resolution_teams FOR SELECT TO authenticated
  USING (public.marketplace_workflow_is_admin());

DROP POLICY IF EXISTS "Case assignments admin readable" ON public.marketplace_case_assignments;
CREATE POLICY "Case assignments admin readable"
  ON public.marketplace_case_assignments FOR SELECT TO authenticated
  USING (public.marketplace_workflow_is_admin());

DROP POLICY IF EXISTS "Case comments scoped read" ON public.marketplace_case_comments;
CREATE POLICY "Case comments scoped read"
  ON public.marketplace_case_comments FOR SELECT TO authenticated
  USING (
    public.marketplace_workflow_is_admin()
    OR (
      visibility = 'vendor'
      AND EXISTS (
        SELECT 1 FROM public.marketplace_governance_cases c
        WHERE c.id = marketplace_case_comments.case_id
          AND c.is_vendor_visible = true
          AND c.vendor_owner_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Checklist templates admin readable" ON public.marketplace_case_checklist_templates;
CREATE POLICY "Checklist templates admin readable"
  ON public.marketplace_case_checklist_templates FOR SELECT TO authenticated
  USING (public.marketplace_workflow_is_admin());

DROP POLICY IF EXISTS "Checklist items scoped read" ON public.marketplace_case_checklist_items;
CREATE POLICY "Checklist items scoped read"
  ON public.marketplace_case_checklist_items FOR SELECT TO authenticated
  USING (
    public.marketplace_workflow_is_admin()
    OR EXISTS (
      SELECT 1 FROM public.marketplace_governance_cases c
      WHERE c.id = marketplace_case_checklist_items.case_id
        AND c.is_vendor_visible = true
        AND c.vendor_owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Escalations admin readable" ON public.marketplace_case_escalations;
CREATE POLICY "Escalations admin readable"
  ON public.marketplace_case_escalations FOR SELECT TO authenticated
  USING (public.marketplace_workflow_is_admin());

DROP POLICY IF EXISTS "Workflow events scoped read" ON public.marketplace_case_workflow_events;
CREATE POLICY "Workflow events scoped read"
  ON public.marketplace_case_workflow_events FOR SELECT TO authenticated
  USING (
    public.marketplace_workflow_is_admin()
    OR EXISTS (
      SELECT 1 FROM public.marketplace_governance_cases c
      WHERE c.id = marketplace_case_workflow_events.case_id
        AND c.is_vendor_visible = true
        AND c.vendor_owner_id = auth.uid()
    )
  );

GRANT SELECT ON public.marketplace_workflow_statuses TO authenticated;
GRANT SELECT ON public.marketplace_resolution_teams TO authenticated;
GRANT SELECT ON public.marketplace_case_assignments TO authenticated;
GRANT SELECT ON public.marketplace_case_comments TO authenticated;
GRANT SELECT ON public.marketplace_case_checklist_templates TO authenticated;
GRANT SELECT ON public.marketplace_case_checklist_items TO authenticated;
GRANT SELECT ON public.marketplace_case_escalations TO authenticated;
GRANT SELECT ON public.marketplace_case_workflow_events TO authenticated;
GRANT SELECT ON public.admin_marketplace_case_resolution_queue TO authenticated;
GRANT SELECT ON public.admin_marketplace_case_resolution_overview TO authenticated;
GRANT SELECT ON public.admin_marketplace_case_comments TO authenticated;
GRANT SELECT ON public.admin_marketplace_case_checklist_items TO authenticated;
GRANT SELECT ON public.admin_marketplace_case_escalations TO authenticated;
GRANT SELECT ON public.my_marketplace_case_resolution_cases TO authenticated;
GRANT SELECT ON public.my_marketplace_case_comments TO authenticated;
GRANT SELECT ON public.my_marketplace_case_checklist_items TO authenticated;
GRANT EXECUTE ON FUNCTION public.initialize_marketplace_case_resolution(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.suggest_marketplace_case_assignees(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_marketplace_governance_case(uuid, uuid, uuid, uuid[], text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.transition_marketplace_governance_case(uuid, text, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_marketplace_case_comment(uuid, text, text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_marketplace_case_checklist_item(uuid, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.scan_marketplace_case_escalations(integer) TO authenticated;

GRANT ALL ON public.marketplace_workflow_statuses TO service_role;
GRANT ALL ON public.marketplace_resolution_teams TO service_role;
GRANT ALL ON public.marketplace_case_assignments TO service_role;
GRANT ALL ON public.marketplace_case_comments TO service_role;
GRANT ALL ON public.marketplace_case_checklist_templates TO service_role;
GRANT ALL ON public.marketplace_case_checklist_items TO service_role;
GRANT ALL ON public.marketplace_case_escalations TO service_role;
GRANT ALL ON public.marketplace_case_workflow_events TO service_role;

NOTIFY pgrst, 'reload schema';
