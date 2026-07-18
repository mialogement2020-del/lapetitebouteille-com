-- P3.1 Marketplace Governance & Automation Engine.
-- Decision-support only: no wallets, commissions, orders, payments, withdrawals,
-- Revenue Engine, Commission Pool, ledger or financial snapshot mutation.

ALTER TYPE public.admin_permission ADD VALUE IF NOT EXISTS 'marketplace_governance';

CREATE OR REPLACE FUNCTION public.marketplace_governance_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1
      FROM public.admin_permissions ap
      WHERE ap.user_id = auth.uid()
        AND ap.permission::text IN (
          'full_access',
          'marketplace_governance',
          'marketplace_analytics',
          'catalogue_intelligence',
          'marketplace_seo',
          'marketplace_coach',
          'marketplace_image_studio',
          'business_scores'
        )
    ),
    false
  );
$$;

CREATE OR REPLACE FUNCTION public.marketplace_governance_owns_shop(_shop_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    EXISTS (
      SELECT 1
      FROM public.vendor_shops vs
      WHERE vs.id = _shop_id
        AND vs.owner_id = auth.uid()
    ),
    false
  );
$$;

CREATE TABLE IF NOT EXISTS public.marketplace_governance_case_types (
  code text PRIMARY KEY,
  label text NOT NULL,
  description text,
  default_priority text NOT NULL DEFAULT 'normal' CHECK (default_priority IN ('critical', 'high', 'normal', 'low')),
  source_modules text[] NOT NULL DEFAULT ARRAY[]::text[],
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.marketplace_governance_case_types(code, label, description, default_priority, source_modules)
VALUES
  ('non_compliant_image', 'Image non conforme', 'Image Marketplace ne respectant pas les standards LPB.', 'high', ARRAY['marketplace_image_studio', 'marketplace_analytics']),
  ('incomplete_listing', 'Fiche incomplete', 'Produit ou fiche boutique necessitant des informations complementaires.', 'normal', ARRAY['marketplace_coach', 'catalogue_intelligence', 'marketplace_analytics']),
  ('probable_duplicate', 'Doublon probable', 'Produit potentiellement duplique ou a fusionner.', 'high', ARRAY['catalogue_intelligence']),
  ('category_mismatch', 'Categorie incoherente', 'Categorie produit suspecte ou incoherente avec les signaux catalogue.', 'normal', ARRAY['catalogue_intelligence', 'marketplace_seo']),
  ('brand_mismatch', 'Marque incoherente', 'Marque ou libelle produit potentiellement incoherent.', 'normal', ARRAY['catalogue_intelligence']),
  ('weak_seo', 'SEO faible', 'Score SEO ou visibilite insuffisante.', 'normal', ARRAY['marketplace_seo', 'marketplace_analytics']),
  ('low_quality_score', 'Score qualite faible', 'Qualite catalogue globale insuffisante.', 'high', ARRAY['marketplace_analytics', 'marketplace_coach']),
  ('seller_support_needed', 'Boutique a accompagner', 'Boutique necessitant accompagnement ou revue manuelle.', 'normal', ARRAY['marketplace_analytics', 'business_scores']),
  ('enrichment_recommended', 'Enrichissement recommande', 'Proposition d enrichissement a valider.', 'normal', ARRAY['catalogue_intelligence', 'marketplace_coach']),
  ('manual_review', 'Revision manuelle', 'Dossier cree manuellement par un administrateur.', 'normal', ARRAY['admin']),
  ('merge_proposed', 'Fusion proposee', 'Fusion ou rapprochement de fiches propose.', 'high', ARRAY['catalogue_intelligence']),
  ('archive_proposed', 'Archivage propose', 'Archivage ou retrait editorial propose, sans execution automatique.', 'low', ARRAY['marketplace_analytics'])
ON CONFLICT (code) DO UPDATE
SET label = EXCLUDED.label,
    description = EXCLUDED.description,
    default_priority = EXCLUDED.default_priority,
    source_modules = EXCLUDED.source_modules,
    is_active = true;

CREATE TABLE IF NOT EXISTS public.marketplace_governance_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_number text NOT NULL UNIQUE DEFAULT (
    'MG-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(gen_random_uuid()::text, 1, 8))
  ),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  created_by_type text NOT NULL DEFAULT 'ai' CHECK (created_by_type IN ('ai', 'admin')),
  case_type text NOT NULL REFERENCES public.marketplace_governance_case_types(code),
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('critical', 'high', 'normal', 'low')),
  confidence_score numeric NOT NULL DEFAULT 0 CHECK (confidence_score BETWEEN 0 AND 100),
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'waiting', 'validated', 'refused', 'archived')),
  source_module text NOT NULL DEFAULT 'admin',
  source_ref_id uuid,
  vendor_shop_id uuid REFERENCES public.vendor_shops(id) ON DELETE SET NULL,
  vendor_owner_id uuid,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  assigned_to uuid,
  is_vendor_visible boolean NOT NULL DEFAULT false,
  problem text NOT NULL,
  explanation text NOT NULL,
  data_used jsonb NOT NULL DEFAULT '{}'::jsonb,
  potential_impacts jsonb NOT NULL DEFAULT '{}'::jsonb,
  recommended_actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  final_decision text,
  decided_by uuid,
  decided_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE(source_module, source_ref_id)
);

CREATE TABLE IF NOT EXISTS public.marketplace_governance_case_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.marketplace_governance_cases(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  actor_id uuid,
  actor_type text NOT NULL DEFAULT 'system' CHECK (actor_type IN ('system', 'ai', 'admin', 'vendor')),
  action_type text NOT NULL CHECK (action_type IN ('created', 'status_changed', 'priority_changed', 'commented', 'validated', 'refused', 'archived', 'ai_recommendation', 'admin_action', 'vendor_reply')),
  old_status text,
  new_status text,
  old_priority text,
  new_priority text,
  comment text,
  explanation text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.marketplace_governance_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES public.marketplace_governance_cases(id) ON DELETE CASCADE,
  recipient_id uuid,
  recipient_role text NOT NULL DEFAULT 'admin' CHECK (recipient_role IN ('admin', 'vendor')),
  notification_type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  severity text NOT NULL DEFAULT 'normal' CHECK (severity IN ('critical', 'high', 'normal', 'low')),
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.marketplace_governance_notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  notification_type text NOT NULL,
  is_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, notification_type)
);

CREATE INDEX IF NOT EXISTS idx_marketplace_governance_cases_status_priority
  ON public.marketplace_governance_cases(status, priority, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_governance_cases_vendor
  ON public.marketplace_governance_cases(vendor_shop_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_governance_cases_product
  ON public.marketplace_governance_cases(product_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_governance_cases_type
  ON public.marketplace_governance_cases(case_type, priority, status);
CREATE INDEX IF NOT EXISTS idx_marketplace_governance_history_case
  ON public.marketplace_governance_case_history(case_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_governance_notifications_recipient
  ON public.marketplace_governance_notifications(recipient_id, read_at, created_at DESC);

CREATE OR REPLACE FUNCTION public.marketplace_governance_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.marketplace_governance_history_append_only()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'marketplace_governance_history_is_append_only';
END;
$$;

CREATE OR REPLACE FUNCTION public.marketplace_governance_case_created_history()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.marketplace_governance_case_history(
    case_id, actor_id, actor_type, action_type, new_status, new_priority, explanation, metadata
  )
  VALUES (
    NEW.id,
    NEW.created_by,
    CASE WHEN NEW.created_by_type = 'admin' THEN 'admin' ELSE 'ai' END,
    'created',
    NEW.status,
    NEW.priority,
    NEW.explanation,
    jsonb_build_object(
      'case_type', NEW.case_type,
      'source_module', NEW.source_module,
      'source_ref_id', NEW.source_ref_id,
      'data_used', NEW.data_used,
      'recommended_actions', NEW.recommended_actions
    )
  );

  INSERT INTO public.marketplace_governance_notifications(
    case_id, recipient_id, recipient_role, notification_type, title, message, severity, metadata
  )
  VALUES (
    NEW.id,
    NULL,
    'admin',
    'new_governance_case',
    CASE WHEN NEW.priority = 'critical' THEN 'Dossier critique Marketplace' ELSE 'Nouveau dossier Marketplace' END,
    NEW.problem,
    NEW.priority,
    jsonb_build_object('case_number', NEW.case_number, 'case_type', NEW.case_type)
  );

  IF NEW.is_vendor_visible AND NEW.vendor_owner_id IS NOT NULL THEN
    INSERT INTO public.marketplace_governance_notifications(
      case_id, recipient_id, recipient_role, notification_type, title, message, severity, metadata
    )
    VALUES (
      NEW.id,
      NEW.vendor_owner_id,
      'vendor',
      'marketplace_review_needed',
      'Revision Marketplace necessaire',
      NEW.problem,
      NEW.priority,
      jsonb_build_object('case_number', NEW.case_number, 'case_type', NEW.case_type)
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_marketplace_governance_cases_touch ON public.marketplace_governance_cases;
CREATE TRIGGER trg_marketplace_governance_cases_touch
  BEFORE UPDATE ON public.marketplace_governance_cases
  FOR EACH ROW EXECUTE FUNCTION public.marketplace_governance_touch_updated_at();

DROP TRIGGER IF EXISTS trg_marketplace_governance_history_append_only ON public.marketplace_governance_case_history;
CREATE TRIGGER trg_marketplace_governance_history_append_only
  BEFORE UPDATE OR DELETE ON public.marketplace_governance_case_history
  FOR EACH ROW EXECUTE FUNCTION public.marketplace_governance_history_append_only();

DROP TRIGGER IF EXISTS trg_marketplace_governance_case_created_history ON public.marketplace_governance_cases;
CREATE TRIGGER trg_marketplace_governance_case_created_history
  AFTER INSERT ON public.marketplace_governance_cases
  FOR EACH ROW EXECUTE FUNCTION public.marketplace_governance_case_created_history();

CREATE OR REPLACE FUNCTION public.create_marketplace_governance_case(
  _case_type text,
  _priority text,
  _confidence_score numeric,
  _vendor_shop_id uuid,
  _product_id uuid,
  _problem text,
  _explanation text,
  _data_used jsonb DEFAULT '{}'::jsonb,
  _potential_impacts jsonb DEFAULT '{}'::jsonb,
  _recommended_actions jsonb DEFAULT '[]'::jsonb,
  _is_vendor_visible boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_shop public.vendor_shops%ROWTYPE;
  v_case_id uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT public.marketplace_governance_is_admin() THEN
    RAISE EXCEPTION 'marketplace_governance_admin_required';
  END IF;

  IF _case_type IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.marketplace_governance_case_types WHERE code = _case_type AND is_active = true
  ) THEN
    RAISE EXCEPTION 'marketplace_governance_invalid_case_type';
  END IF;

  IF _priority NOT IN ('critical', 'high', 'normal', 'low') THEN
    RAISE EXCEPTION 'marketplace_governance_invalid_priority';
  END IF;

  IF _vendor_shop_id IS NOT NULL THEN
    SELECT * INTO v_shop FROM public.vendor_shops WHERE id = _vendor_shop_id;
  END IF;

  INSERT INTO public.marketplace_governance_cases(
    created_by, created_by_type, case_type, priority, confidence_score,
    vendor_shop_id, vendor_owner_id, product_id, is_vendor_visible,
    source_module, problem, explanation, data_used, potential_impacts, recommended_actions
  )
  VALUES (
    auth.uid(), 'admin', _case_type, _priority, LEAST(100, GREATEST(0, COALESCE(_confidence_score, 0))),
    _vendor_shop_id, v_shop.owner_id, _product_id, COALESCE(_is_vendor_visible, false),
    'admin', _problem, _explanation, COALESCE(_data_used, '{}'::jsonb),
    COALESCE(_potential_impacts, '{}'::jsonb), COALESCE(_recommended_actions, '[]'::jsonb)
  )
  RETURNING id INTO v_case_id;

  RETURN jsonb_build_object('case_id', v_case_id, 'created', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.scan_marketplace_governance_cases(_limit integer DEFAULT 100)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  v_created integer := 0;
  v_limit integer := LEAST(GREATEST(COALESCE(_limit, 100), 1), 500);
  v_case_type text;
  v_priority text;
  v_confidence numeric;
BEGIN
  IF auth.uid() IS NULL OR NOT public.marketplace_governance_is_admin() THEN
    RAISE EXCEPTION 'marketplace_governance_admin_required';
  END IF;

  FOR r IN
    SELECT a.*
    FROM public.marketplace_analytics_alerts a
    WHERE a.status = 'open'
      AND NOT EXISTS (
        SELECT 1 FROM public.marketplace_governance_cases c
        WHERE c.source_module = 'marketplace_analytics'
          AND c.source_ref_id = a.id
      )
    ORDER BY
      CASE a.severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'normal' THEN 3 ELSE 4 END,
      a.created_at DESC
    LIMIT v_limit
  LOOP
    v_case_type := CASE
      WHEN r.alert_type ILIKE '%image%' THEN 'non_compliant_image'
      WHEN r.alert_type ILIKE '%seo%' OR r.alert_type ILIKE '%visibility%' THEN 'weak_seo'
      WHEN r.alert_type ILIKE '%duplicate%' THEN 'probable_duplicate'
      WHEN r.alert_type ILIKE '%quality%' THEN 'low_quality_score'
      WHEN r.alert_type ILIKE '%enrichment%' THEN 'enrichment_recommended'
      ELSE 'seller_support_needed'
    END;
    v_priority := CASE r.severity WHEN 'critical' THEN 'critical' WHEN 'high' THEN 'high' WHEN 'low' THEN 'low' ELSE 'normal' END;
    v_confidence := CASE v_priority WHEN 'critical' THEN 92 WHEN 'high' THEN 86 WHEN 'normal' THEN 78 ELSE 65 END;

    INSERT INTO public.marketplace_governance_cases(
      created_by_type, case_type, priority, confidence_score, source_module, source_ref_id,
      vendor_shop_id, vendor_owner_id, problem, explanation, data_used, potential_impacts,
      recommended_actions, is_vendor_visible, metadata
    )
    VALUES (
      'ai',
      v_case_type,
      v_priority,
      v_confidence,
      'marketplace_analytics',
      r.id,
      r.vendor_shop_id,
      r.vendor_owner_id,
      r.title,
      r.description || ' Decision automatique interdite : validation admin requise.',
      jsonb_build_object(
        'alert_type', r.alert_type,
        'metric_value', r.metric_value,
        'threshold_value', r.threshold_value,
        'source', 'P2.5 Marketplace Analytics'
      ),
      jsonb_build_object(
        'commercial', 'Risque de baisse de qualite, visibilite ou conversion Marketplace.',
        'seller', 'Accompagnement vendeur potentiellement necessaire.',
        'platform', 'Decision humaine requise avant action.'
      ),
      jsonb_build_array(
        'Verifier les donnees source',
        'Contacter le vendeur si necessaire',
        'Valider, refuser ou archiver le dossier',
        'Ne pas executer automatiquement de modification produit'
      ),
      r.severity IN ('critical', 'high'),
      jsonb_build_object('automation_version', 'p3.1-observation', 'source_alert_id', r.id)
    )
    ON CONFLICT (source_module, source_ref_id) DO NOTHING;

    IF FOUND THEN
      v_created := v_created + 1;
    END IF;
  END LOOP;

  FOR r IN
    SELECT dc.id, dc.vendor_shop_id, vs.owner_id AS vendor_owner_id, dc.product_id, dc.candidate_product_id,
           dc.confidence_score, dc.signals, dc.details
    FROM public.catalogue_duplicate_candidates dc
    LEFT JOIN public.vendor_shops vs ON vs.id = dc.vendor_shop_id
    WHERE dc.status = 'candidate'
      AND NOT EXISTS (
        SELECT 1 FROM public.marketplace_governance_cases c
        WHERE c.source_module = 'catalogue_intelligence'
          AND c.source_ref_id = dc.id
      )
    ORDER BY dc.confidence_score DESC, dc.created_at DESC
    LIMIT v_limit
  LOOP
    INSERT INTO public.marketplace_governance_cases(
      created_by_type, case_type, priority, confidence_score, source_module, source_ref_id,
      vendor_shop_id, vendor_owner_id, product_id, problem, explanation, data_used,
      potential_impacts, recommended_actions, is_vendor_visible, metadata
    )
    VALUES (
      'ai',
      CASE WHEN COALESCE(r.confidence_score, 0) >= 90 THEN 'merge_proposed' ELSE 'probable_duplicate' END,
      CASE WHEN COALESCE(r.confidence_score, 0) >= 90 THEN 'high' ELSE 'normal' END,
      LEAST(100, GREATEST(0, COALESCE(r.confidence_score, 0))),
      'catalogue_intelligence',
      r.id,
      r.vendor_shop_id,
      r.vendor_owner_id,
      r.product_id,
      'Doublon catalogue probable',
      'Catalogue Intelligence signale un doublon potentiel. Aucune fusion automatique : validation admin obligatoire.',
      jsonb_build_object(
        'product_id', r.product_id,
        'candidate_product_id', r.candidate_product_id,
        'signals', r.signals,
        'details', r.details,
        'source', 'P2.4 Catalogue Intelligence'
      ),
      jsonb_build_object(
        'catalogue', 'Risque de dilution SEO, confusion client et qualite de catalogue reduite.',
        'platform', 'Fusion ou refus uniquement apres revue humaine.'
      ),
      jsonb_build_array('Comparer les deux fiches', 'Verifier image, marque, volume et prix', 'Valider fusion ou refuser le signal'),
      false,
      jsonb_build_object('automation_version', 'p3.1-observation', 'duplicate_candidate_id', r.id)
    )
    ON CONFLICT (source_module, source_ref_id) DO NOTHING;

    IF FOUND THEN
      v_created := v_created + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'created_cases', v_created,
    'limit', v_limit,
    'mode', 'decision_support_only',
    'final_decision', 'admin_required'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.update_marketplace_governance_case(
  _case_id uuid,
  _status text DEFAULT NULL,
  _priority text DEFAULT NULL,
  _comment text DEFAULT NULL,
  _final_decision text DEFAULT NULL,
  _is_vendor_visible boolean DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old public.marketplace_governance_cases%ROWTYPE;
  v_new_status text;
  v_new_priority text;
BEGIN
  IF auth.uid() IS NULL OR NOT public.marketplace_governance_is_admin() THEN
    RAISE EXCEPTION 'marketplace_governance_admin_required';
  END IF;

  SELECT * INTO v_old
  FROM public.marketplace_governance_cases
  WHERE id = _case_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'marketplace_governance_case_not_found';
  END IF;

  v_new_status := COALESCE(_status, v_old.status);
  v_new_priority := COALESCE(_priority, v_old.priority);

  IF v_new_status NOT IN ('new', 'in_progress', 'waiting', 'validated', 'refused', 'archived') THEN
    RAISE EXCEPTION 'marketplace_governance_invalid_status';
  END IF;
  IF v_new_priority NOT IN ('critical', 'high', 'normal', 'low') THEN
    RAISE EXCEPTION 'marketplace_governance_invalid_priority';
  END IF;

  UPDATE public.marketplace_governance_cases
  SET status = v_new_status,
      priority = v_new_priority,
      final_decision = CASE WHEN v_new_status IN ('validated', 'refused', 'archived') THEN COALESCE(_final_decision, _comment, final_decision) ELSE COALESCE(_final_decision, final_decision) END,
      decided_by = CASE WHEN v_new_status IN ('validated', 'refused', 'archived') THEN auth.uid() ELSE decided_by END,
      decided_at = CASE WHEN v_new_status IN ('validated', 'refused', 'archived') THEN now() ELSE decided_at END,
      is_vendor_visible = COALESCE(_is_vendor_visible, is_vendor_visible)
  WHERE id = _case_id;

  IF v_new_status <> v_old.status THEN
    INSERT INTO public.marketplace_governance_case_history(
      case_id, actor_id, actor_type, action_type, old_status, new_status, comment, explanation
    )
    VALUES (
      _case_id,
      auth.uid(),
      'admin',
      CASE v_new_status WHEN 'validated' THEN 'validated' WHEN 'refused' THEN 'refused' WHEN 'archived' THEN 'archived' ELSE 'status_changed' END,
      v_old.status,
      v_new_status,
      _comment,
      'Changement de statut par administrateur. Aucune execution automatique hors dossier.'
    );
  END IF;

  IF v_new_priority <> v_old.priority THEN
    INSERT INTO public.marketplace_governance_case_history(
      case_id, actor_id, actor_type, action_type, old_priority, new_priority, comment, explanation
    )
    VALUES (_case_id, auth.uid(), 'admin', 'priority_changed', v_old.priority, v_new_priority, _comment, 'Priorite ajustee par administrateur.');
  END IF;

  IF COALESCE(_comment, '') <> '' AND v_new_status = v_old.status AND v_new_priority = v_old.priority THEN
    INSERT INTO public.marketplace_governance_case_history(
      case_id, actor_id, actor_type, action_type, comment, explanation
    )
    VALUES (_case_id, auth.uid(), 'admin', 'commented', _comment, 'Commentaire admin ajoute au dossier.');
  END IF;

  IF COALESCE(_is_vendor_visible, v_old.is_vendor_visible) AND v_old.vendor_owner_id IS NOT NULL THEN
    INSERT INTO public.marketplace_governance_notifications(
      case_id, recipient_id, recipient_role, notification_type, title, message, severity, metadata
    )
    VALUES (
      _case_id,
      v_old.vendor_owner_id,
      'vendor',
      'governance_case_updated',
      'Dossier Marketplace mis a jour',
      COALESCE(_comment, 'Un dossier de gouvernance concernant votre boutique a ete mis a jour.'),
      v_new_priority,
      jsonb_build_object('old_status', v_old.status, 'new_status', v_new_status)
    );
  END IF;

  RETURN jsonb_build_object('case_id', _case_id, 'status', v_new_status, 'priority', v_new_priority);
END;
$$;

CREATE OR REPLACE FUNCTION public.comment_marketplace_governance_case(
  _case_id uuid,
  _comment text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_case public.marketplace_governance_cases%ROWTYPE;
  v_actor text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'marketplace_governance_auth_required';
  END IF;

  SELECT * INTO v_case
  FROM public.marketplace_governance_cases
  WHERE id = _case_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'marketplace_governance_case_not_found';
  END IF;

  IF public.marketplace_governance_is_admin() THEN
    v_actor := 'admin';
  ELSIF v_case.is_vendor_visible AND v_case.vendor_owner_id = auth.uid() THEN
    v_actor := 'vendor';
  ELSE
    RAISE EXCEPTION 'marketplace_governance_case_forbidden';
  END IF;

  INSERT INTO public.marketplace_governance_case_history(
    case_id, actor_id, actor_type, action_type, comment, explanation
  )
  VALUES (
    _case_id,
    auth.uid(),
    v_actor,
    CASE WHEN v_actor = 'vendor' THEN 'vendor_reply' ELSE 'commented' END,
    _comment,
    CASE WHEN v_actor = 'vendor' THEN 'Reponse vendeur ajoutee au dossier.' ELSE 'Commentaire admin ajoute au dossier.' END
  );

  IF v_actor = 'vendor' THEN
    INSERT INTO public.marketplace_governance_notifications(
      case_id, recipient_id, recipient_role, notification_type, title, message, severity, metadata
    )
    VALUES (_case_id, NULL, 'admin', 'vendor_reply', 'Reponse vendeur recue', _comment, v_case.priority, jsonb_build_object('case_number', v_case.case_number));
  END IF;

  RETURN jsonb_build_object('case_id', _case_id, 'commented', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_marketplace_governance_notification_read(_notification_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'marketplace_governance_auth_required';
  END IF;

  UPDATE public.marketplace_governance_notifications n
  SET read_at = now()
  WHERE n.id = _notification_id
    AND (
      n.recipient_id = auth.uid()
      OR (n.recipient_role = 'admin' AND public.marketplace_governance_is_admin())
    );

  RETURN jsonb_build_object('notification_id', _notification_id, 'read', true);
END;
$$;

CREATE OR REPLACE VIEW public.admin_marketplace_governance_overview AS
SELECT
  count(*) FILTER (WHERE status IN ('new', 'in_progress', 'waiting'))::integer AS open_cases,
  count(*) FILTER (WHERE priority = 'critical' AND status IN ('new', 'in_progress', 'waiting'))::integer AS critical_cases,
  count(*) FILTER (WHERE status = 'waiting')::integer AS waiting_cases,
  count(*) FILTER (WHERE status IN ('validated', 'refused', 'archived'))::integer AS closed_cases,
  round(COALESCE(avg(EXTRACT(EPOCH FROM (decided_at - created_at)) / 3600) FILTER (WHERE decided_at IS NOT NULL), 0), 2) AS avg_resolution_hours,
  count(*) FILTER (WHERE created_at >= now() - interval '7 days')::integer AS cases_7d,
  count(*) FILTER (WHERE created_at >= now() - interval '30 days')::integer AS cases_30d,
  COALESCE(jsonb_agg(DISTINCT case_type) FILTER (WHERE status IN ('new', 'in_progress', 'waiting')), '[]'::jsonb) AS active_case_types
FROM public.marketplace_governance_cases
WHERE public.marketplace_governance_is_admin();

CREATE OR REPLACE VIEW public.admin_marketplace_governance_queue AS
SELECT
  c.*,
  vs.name AS shop_name,
  p.name AS product_name,
  p.slug AS product_slug,
  t.label AS case_type_label,
  (
    SELECT count(*)
    FROM public.marketplace_governance_case_history h
    WHERE h.case_id = c.id
  )::integer AS history_count,
  (
    SELECT max(h.created_at)
    FROM public.marketplace_governance_case_history h
    WHERE h.case_id = c.id
  ) AS last_activity_at
FROM public.marketplace_governance_cases c
LEFT JOIN public.vendor_shops vs ON vs.id = c.vendor_shop_id
LEFT JOIN public.products p ON p.id = c.product_id
LEFT JOIN public.marketplace_governance_case_types t ON t.code = c.case_type
WHERE public.marketplace_governance_is_admin()
ORDER BY
  CASE c.priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'normal' THEN 3 ELSE 4 END,
  CASE c.status WHEN 'new' THEN 1 WHEN 'in_progress' THEN 2 WHEN 'waiting' THEN 3 ELSE 4 END,
  c.created_at DESC;

CREATE OR REPLACE VIEW public.admin_marketplace_governance_trends AS
SELECT
  date_trunc('day', created_at)::date AS day,
  count(*)::integer AS total_cases,
  count(*) FILTER (WHERE priority = 'critical')::integer AS critical_cases,
  count(*) FILTER (WHERE status IN ('validated', 'refused', 'archived'))::integer AS closed_cases,
  count(*) FILTER (WHERE created_by_type = 'ai')::integer AS ai_created_cases
FROM public.marketplace_governance_cases
WHERE public.marketplace_governance_is_admin()
GROUP BY 1
ORDER BY 1 DESC;

CREATE OR REPLACE VIEW public.admin_marketplace_governance_notifications AS
SELECT n.*
FROM public.marketplace_governance_notifications n
WHERE n.recipient_role = 'admin'
  AND public.marketplace_governance_is_admin()
ORDER BY n.created_at DESC;

CREATE OR REPLACE VIEW public.my_marketplace_governance_cases AS
SELECT
  c.id,
  c.case_number,
  c.created_at,
  c.updated_at,
  c.case_type,
  t.label AS case_type_label,
  c.priority,
  c.confidence_score,
  c.status,
  c.vendor_shop_id,
  c.product_id,
  p.name AS product_name,
  c.problem,
  c.explanation,
  c.recommended_actions,
  c.final_decision
FROM public.marketplace_governance_cases c
LEFT JOIN public.products p ON p.id = c.product_id
LEFT JOIN public.marketplace_governance_case_types t ON t.code = c.case_type
WHERE c.is_vendor_visible = true
  AND c.vendor_owner_id = auth.uid()
ORDER BY
  CASE c.priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'normal' THEN 3 ELSE 4 END,
  c.created_at DESC;

CREATE OR REPLACE VIEW public.my_marketplace_governance_notifications AS
SELECT n.*
FROM public.marketplace_governance_notifications n
WHERE n.recipient_id = auth.uid()
ORDER BY n.created_at DESC;

CREATE OR REPLACE VIEW public.my_marketplace_governance_case_history AS
SELECT h.*
FROM public.marketplace_governance_case_history h
JOIN public.marketplace_governance_cases c ON c.id = h.case_id
WHERE public.marketplace_governance_is_admin()
   OR (c.is_vendor_visible = true AND c.vendor_owner_id = auth.uid())
ORDER BY h.created_at DESC;

ALTER TABLE public.marketplace_governance_case_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_governance_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_governance_case_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_governance_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_governance_notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Governance case types readable" ON public.marketplace_governance_case_types;
CREATE POLICY "Governance case types readable"
  ON public.marketplace_governance_case_types FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Governance cases scoped read" ON public.marketplace_governance_cases;
CREATE POLICY "Governance cases scoped read"
  ON public.marketplace_governance_cases FOR SELECT TO authenticated
  USING (
    public.marketplace_governance_is_admin()
    OR (is_vendor_visible = true AND vendor_owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Governance history scoped read" ON public.marketplace_governance_case_history;
CREATE POLICY "Governance history scoped read"
  ON public.marketplace_governance_case_history FOR SELECT TO authenticated
  USING (
    public.marketplace_governance_is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.marketplace_governance_cases c
      WHERE c.id = marketplace_governance_case_history.case_id
        AND c.is_vendor_visible = true
        AND c.vendor_owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Governance notifications scoped read" ON public.marketplace_governance_notifications;
CREATE POLICY "Governance notifications scoped read"
  ON public.marketplace_governance_notifications FOR SELECT TO authenticated
  USING (
    (recipient_role = 'admin' AND public.marketplace_governance_is_admin())
    OR recipient_id = auth.uid()
  );

DROP POLICY IF EXISTS "Governance notification preferences owner" ON public.marketplace_governance_notification_preferences;
CREATE POLICY "Governance notification preferences owner"
  ON public.marketplace_governance_notification_preferences FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.marketplace_governance_is_admin())
  WITH CHECK (user_id = auth.uid() OR public.marketplace_governance_is_admin());

GRANT SELECT ON public.marketplace_governance_case_types TO authenticated;
GRANT SELECT ON public.marketplace_governance_cases TO authenticated;
GRANT SELECT ON public.marketplace_governance_case_history TO authenticated;
GRANT SELECT ON public.marketplace_governance_notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.marketplace_governance_notification_preferences TO authenticated;
GRANT SELECT ON public.admin_marketplace_governance_overview TO authenticated;
GRANT SELECT ON public.admin_marketplace_governance_queue TO authenticated;
GRANT SELECT ON public.admin_marketplace_governance_trends TO authenticated;
GRANT SELECT ON public.admin_marketplace_governance_notifications TO authenticated;
GRANT SELECT ON public.my_marketplace_governance_cases TO authenticated;
GRANT SELECT ON public.my_marketplace_governance_notifications TO authenticated;
GRANT SELECT ON public.my_marketplace_governance_case_history TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_marketplace_governance_case(text, text, numeric, uuid, uuid, text, text, jsonb, jsonb, jsonb, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.scan_marketplace_governance_cases(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_marketplace_governance_case(uuid, text, text, text, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.comment_marketplace_governance_case(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_marketplace_governance_notification_read(uuid) TO authenticated;

GRANT ALL ON public.marketplace_governance_case_types TO service_role;
GRANT ALL ON public.marketplace_governance_cases TO service_role;
GRANT ALL ON public.marketplace_governance_case_history TO service_role;
GRANT ALL ON public.marketplace_governance_notifications TO service_role;
GRANT ALL ON public.marketplace_governance_notification_preferences TO service_role;

NOTIFY pgrst, 'reload schema';
