-- P2.1 - Marketplace Image Compliance AI.
-- Visual quality pipeline only: never mutates wallets, commissions, orders or P0 finance tables.

ALTER TYPE public.admin_permission ADD VALUE IF NOT EXISTS 'marketplace_image_studio';

CREATE OR REPLACE FUNCTION public.marketplace_image_studio_is_admin()
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
        AND ap.permission::text IN ('full_access', 'marketplace_image_studio', 'products')
    );
$$;

CREATE TABLE IF NOT EXISTS public.marketplace_image_studio_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_version text NOT NULL UNIQUE DEFAULT 'p2.1-lpb-visual-standard-v1',
  is_active boolean NOT NULL DEFAULT true,
  official_format text NOT NULL DEFAULT 'vertical_catalogue_lpb',
  target_width integer NOT NULL DEFAULT 900,
  target_height integer NOT NULL DEFAULT 1200,
  background_hex text NOT NULL DEFAULT '#FFFFFF',
  auto_publish_min_score numeric NOT NULL DEFAULT 90 CHECK (auto_publish_min_score BETWEEN 0 AND 100),
  auto_correct_publish_min_score numeric NOT NULL DEFAULT 75 CHECK (auto_correct_publish_min_score BETWEEN 0 AND 100),
  manual_review_min_score numeric NOT NULL DEFAULT 50 CHECK (manual_review_min_score BETWEEN 0 AND 100),
  prohibited_elements text[] NOT NULL DEFAULT ARRAY[
    'decor',
    'watermark',
    'logo_non_lpb',
    'qr_code',
    'numero_whatsapp',
    'personne',
    'texte_ajoute',
    'objet_parasite'
  ],
  required_rules jsonb NOT NULL DEFAULT jsonb_build_object(
    'fond_blanc_pur', true,
    'format_vertical_officiel', true,
    'produit_entierement_visible', true,
    'produit_centre', true,
    'marges_regulieres', true,
    'aucune_deformation', true,
    'resolution_homogene', true,
    'etiquette_lisible', true,
    'coffret_seulement_si_vendu', true
  ),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.marketplace_image_studio_rules (
  rule_version, is_active, official_format, target_width, target_height, background_hex
)
VALUES ('p2.1-lpb-visual-standard-v1', true, 'vertical_catalogue_lpb', 900, 1200, '#FFFFFF')
ON CONFLICT (rule_version) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.marketplace_image_studio_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  vendor_id uuid DEFAULT auth.uid(),
  submitted_by uuid DEFAULT auth.uid(),
  original_image_url text NOT NULL,
  original_storage_path text,
  corrected_image_url text,
  corrected_storage_path text,
  published_image_url text,
  thumbnail_urls jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'uploaded' CHECK (status IN (
    'uploaded',
    'analyzing',
    'needs_correction',
    'corrected',
    'auto_published',
    'pending_admin_review',
    'approved',
    'rejected',
    'new_image_requested',
    'failed'
  )),
  decision text NOT NULL DEFAULT 'pending' CHECK (decision IN (
    'pending',
    'auto_publish',
    'auto_correct_publish',
    'manual_review',
    'reject'
  )),
  compliance_score numeric CHECK (compliance_score IS NULL OR compliance_score BETWEEN 0 AND 100),
  product_detected text,
  issues text[] NOT NULL DEFAULT '{}',
  corrections text[] NOT NULL DEFAULT '{}',
  visual_rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  ai_analysis jsonb NOT NULL DEFAULT '{}'::jsonb,
  engine_version text NOT NULL DEFAULT 'p2.1-marketplace-image-studio-v1',
  reviewed_by uuid,
  reviewed_at timestamptz,
  admin_notes text,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_marketplace_image_studio_jobs_product
  ON public.marketplace_image_studio_jobs(product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_image_studio_jobs_vendor
  ON public.marketplace_image_studio_jobs(vendor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_image_studio_jobs_status
  ON public.marketplace_image_studio_jobs(status, decision, created_at DESC);

CREATE TABLE IF NOT EXISTS public.marketplace_image_studio_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.marketplace_image_studio_jobs(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN (
    'uploaded',
    'analysis_recorded',
    'auto_published',
    'manual_approved',
    'manual_rejected',
    'new_image_requested',
    'reprocess_requested',
    'failed'
  )),
  actor_id uuid DEFAULT auth.uid(),
  product_id uuid,
  vendor_id uuid,
  previous_status text,
  new_status text,
  compliance_score numeric,
  decision text,
  explanation text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  engine_version text NOT NULL DEFAULT 'p2.1-marketplace-image-studio-v1',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_marketplace_image_studio_events_job
  ON public.marketplace_image_studio_events(job_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_image_studio_events_product
  ON public.marketplace_image_studio_events(product_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.marketplace_image_studio_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.marketplace_image_studio_events_append_only()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'marketplace_image_studio_events_append_only';
END;
$$;

DROP TRIGGER IF EXISTS trg_marketplace_image_studio_jobs_touch ON public.marketplace_image_studio_jobs;
CREATE TRIGGER trg_marketplace_image_studio_jobs_touch
BEFORE UPDATE ON public.marketplace_image_studio_jobs
FOR EACH ROW EXECUTE FUNCTION public.marketplace_image_studio_touch_updated_at();

DROP TRIGGER IF EXISTS trg_marketplace_image_studio_events_append_only_update ON public.marketplace_image_studio_events;
CREATE TRIGGER trg_marketplace_image_studio_events_append_only_update
BEFORE UPDATE ON public.marketplace_image_studio_events
FOR EACH ROW EXECUTE FUNCTION public.marketplace_image_studio_events_append_only();

DROP TRIGGER IF EXISTS trg_marketplace_image_studio_events_append_only_delete ON public.marketplace_image_studio_events;
CREATE TRIGGER trg_marketplace_image_studio_events_append_only_delete
BEFORE DELETE ON public.marketplace_image_studio_events
FOR EACH ROW EXECUTE FUNCTION public.marketplace_image_studio_events_append_only();

CREATE OR REPLACE FUNCTION public.marketplace_image_studio_score_decision(_score numeric)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN _score >= 90 THEN 'auto_publish'
    WHEN _score >= 75 THEN 'auto_correct_publish'
    WHEN _score >= 50 THEN 'manual_review'
    ELSE 'reject'
  END;
$$;

CREATE OR REPLACE FUNCTION public.marketplace_image_studio_create_job(
  _product_id uuid,
  _original_image_url text,
  _original_storage_path text DEFAULT NULL,
  _vendor_id uuid DEFAULT auth.uid()
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job_id uuid;
  v_product_vendor uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication_required';
  END IF;

  IF _original_image_url IS NULL OR length(trim(_original_image_url)) < 8 THEN
    RAISE EXCEPTION 'image_url_required';
  END IF;

  IF _product_id IS NOT NULL THEN
    SELECT vendor_id INTO v_product_vendor
    FROM public.products
    WHERE id = _product_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'product_not_found';
    END IF;

    IF NOT public.marketplace_image_studio_is_admin()
       AND v_product_vendor IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'product_not_owned_by_vendor';
    END IF;
  END IF;

  INSERT INTO public.marketplace_image_studio_jobs (
    product_id,
    vendor_id,
    submitted_by,
    original_image_url,
    original_storage_path,
    visual_rules
  )
  SELECT
    _product_id,
    COALESCE(_vendor_id, auth.uid()),
    auth.uid(),
    trim(_original_image_url),
    _original_storage_path,
    jsonb_build_object(
      'rule_version', r.rule_version,
      'official_format', r.official_format,
      'target_width', r.target_width,
      'target_height', r.target_height,
      'background_hex', r.background_hex,
      'required_rules', r.required_rules,
      'prohibited_elements', r.prohibited_elements
    )
  FROM public.marketplace_image_studio_rules r
  WHERE r.is_active = true
  ORDER BY r.created_at DESC
  LIMIT 1
  RETURNING id INTO v_job_id;

  INSERT INTO public.marketplace_image_studio_events (
    job_id, event_type, actor_id, product_id, vendor_id, new_status, explanation
  )
  VALUES (
    v_job_id, 'uploaded', auth.uid(), _product_id, COALESCE(_vendor_id, auth.uid()), 'uploaded',
    'Image vendeur recue dans le Studio Image Marketplace LPB. Elle reste en controle avant publication.'
  );

  RETURN v_job_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.marketplace_image_studio_record_analysis(
  _job_id uuid,
  _compliance_score numeric,
  _issues text[] DEFAULT '{}',
  _corrections text[] DEFAULT '{}',
  _corrected_image_url text DEFAULT NULL,
  _corrected_storage_path text DEFAULT NULL,
  _thumbnail_urls jsonb DEFAULT '[]'::jsonb,
  _product_detected text DEFAULT NULL,
  _ai_analysis jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job public.marketplace_image_studio_jobs%ROWTYPE;
  v_decision text;
  v_status text;
  v_publish_url text;
  v_previous_image text;
BEGIN
  IF NOT public.marketplace_image_studio_is_admin() THEN
    RAISE EXCEPTION 'admin_required';
  END IF;

  IF _compliance_score < 0 OR _compliance_score > 100 THEN
    RAISE EXCEPTION 'invalid_compliance_score';
  END IF;

  SELECT * INTO v_job
  FROM public.marketplace_image_studio_jobs
  WHERE id = _job_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'image_job_not_found';
  END IF;

  v_decision := public.marketplace_image_studio_score_decision(_compliance_score);
  v_publish_url := COALESCE(NULLIF(_corrected_image_url, ''), v_job.original_image_url);
  v_status := CASE
    WHEN v_decision IN ('auto_publish', 'auto_correct_publish') THEN 'auto_published'
    WHEN v_decision = 'manual_review' THEN 'pending_admin_review'
    ELSE 'rejected'
  END;

  UPDATE public.marketplace_image_studio_jobs
  SET compliance_score = _compliance_score,
      decision = v_decision,
      status = v_status,
      issues = COALESCE(_issues, '{}'),
      corrections = COALESCE(_corrections, '{}'),
      corrected_image_url = _corrected_image_url,
      corrected_storage_path = _corrected_storage_path,
      thumbnail_urls = COALESCE(_thumbnail_urls, '[]'::jsonb),
      product_detected = _product_detected,
      ai_analysis = COALESCE(_ai_analysis, '{}'::jsonb),
      published_image_url = CASE WHEN v_status = 'auto_published' THEN v_publish_url ELSE published_image_url END,
      reviewed_by = CASE WHEN v_status IN ('auto_published', 'rejected') THEN auth.uid() ELSE reviewed_by END,
      reviewed_at = CASE WHEN v_status IN ('auto_published', 'rejected') THEN now() ELSE reviewed_at END,
      rejection_reason = CASE WHEN v_status = 'rejected' THEN array_to_string(COALESCE(_issues, '{}'), ', ') ELSE rejection_reason END
  WHERE id = _job_id;

  IF v_status = 'auto_published' AND v_job.product_id IS NOT NULL THEN
    SELECT image_url INTO v_previous_image
    FROM public.products
    WHERE id = v_job.product_id
    FOR UPDATE;

    UPDATE public.products
    SET image_url = v_publish_url,
        moderation_status = 'approved',
        updated_at = now()
    WHERE id = v_job.product_id;

    INSERT INTO public.product_image_history (
      product_id, previous_image_url, new_image_url, batch_id, source, replaced_by
    )
    VALUES (
      v_job.product_id, v_previous_image, v_publish_url, _job_id, 'marketplace_image_studio', auth.uid()
    );
  END IF;

  INSERT INTO public.marketplace_image_studio_events (
    job_id, event_type, actor_id, product_id, vendor_id, previous_status, new_status,
    compliance_score, decision, explanation, metadata
  )
  VALUES (
    _job_id,
    CASE WHEN v_status = 'auto_published' THEN 'auto_published'
         WHEN v_status = 'rejected' THEN 'manual_rejected'
         ELSE 'analysis_recorded' END,
    auth.uid(),
    v_job.product_id,
    v_job.vendor_id,
    v_job.status,
    v_status,
    _compliance_score,
    v_decision,
    CASE
      WHEN v_decision = 'auto_publish' THEN 'Score 90-100: publication automatique conforme au standard visuel LPB.'
      WHEN v_decision = 'auto_correct_publish' THEN 'Score 75-89: correction automatique acceptee puis publication.'
      WHEN v_decision = 'manual_review' THEN 'Score 50-74: validation admin requise avant publication.'
      ELSE 'Score 0-49: refus ou nouvelle image requise.'
    END,
    jsonb_build_object('issues', COALESCE(_issues, '{}'), 'corrections', COALESCE(_corrections, '{}'))
  );

  RETURN jsonb_build_object(
    'job_id', _job_id,
    'score', _compliance_score,
    'decision', v_decision,
    'status', v_status,
    'published_image_url', CASE WHEN v_status = 'auto_published' THEN v_publish_url ELSE NULL END
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.marketplace_image_studio_review_job(
  _job_id uuid,
  _action text,
  _note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job public.marketplace_image_studio_jobs%ROWTYPE;
  v_new_status text;
  v_event text;
  v_publish_url text;
  v_previous_image text;
BEGIN
  IF NOT public.marketplace_image_studio_is_admin() THEN
    RAISE EXCEPTION 'admin_required';
  END IF;

  IF _action NOT IN ('approve', 'reject', 'request_new_image', 'reprocess') THEN
    RAISE EXCEPTION 'invalid_review_action';
  END IF;

  SELECT * INTO v_job
  FROM public.marketplace_image_studio_jobs
  WHERE id = _job_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'image_job_not_found';
  END IF;

  v_new_status := CASE
    WHEN _action = 'approve' THEN 'approved'
    WHEN _action = 'reject' THEN 'rejected'
    WHEN _action = 'request_new_image' THEN 'new_image_requested'
    ELSE 'analyzing'
  END;

  v_event := CASE
    WHEN _action = 'approve' THEN 'manual_approved'
    WHEN _action = 'reject' THEN 'manual_rejected'
    WHEN _action = 'request_new_image' THEN 'new_image_requested'
    ELSE 'reprocess_requested'
  END;

  v_publish_url := COALESCE(NULLIF(v_job.corrected_image_url, ''), v_job.original_image_url);

  IF _action = 'approve' AND v_job.product_id IS NOT NULL THEN
    SELECT image_url INTO v_previous_image
    FROM public.products
    WHERE id = v_job.product_id
    FOR UPDATE;

    UPDATE public.products
    SET image_url = v_publish_url,
        moderation_status = 'approved',
        updated_at = now()
    WHERE id = v_job.product_id;

    INSERT INTO public.product_image_history (
      product_id, previous_image_url, new_image_url, batch_id, source, replaced_by
    )
    VALUES (
      v_job.product_id, v_previous_image, v_publish_url, _job_id, 'marketplace_image_studio_manual', auth.uid()
    );
  END IF;

  UPDATE public.marketplace_image_studio_jobs
  SET status = v_new_status,
      published_image_url = CASE WHEN _action = 'approve' THEN v_publish_url ELSE published_image_url END,
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      admin_notes = _note,
      rejection_reason = CASE WHEN _action IN ('reject', 'request_new_image') THEN _note ELSE rejection_reason END
  WHERE id = _job_id;

  INSERT INTO public.marketplace_image_studio_events (
    job_id, event_type, actor_id, product_id, vendor_id, previous_status, new_status,
    compliance_score, decision, explanation, metadata
  )
  VALUES (
    _job_id, v_event, auth.uid(), v_job.product_id, v_job.vendor_id, v_job.status, v_new_status,
    v_job.compliance_score, v_job.decision,
    COALESCE(_note, 'Decision admin enregistree dans le Studio Image Marketplace LPB.'),
    jsonb_build_object('action', _action)
  );

  RETURN jsonb_build_object('job_id', _job_id, 'status', v_new_status, 'published_image_url', CASE WHEN _action = 'approve' THEN v_publish_url ELSE NULL END);
END;
$$;

CREATE OR REPLACE VIEW public.seller_marketplace_image_studio_jobs AS
SELECT
  j.*
FROM public.marketplace_image_studio_jobs j
WHERE j.vendor_id = auth.uid()
   OR j.submitted_by = auth.uid()
   OR public.marketplace_image_studio_is_admin();

CREATE OR REPLACE VIEW public.admin_marketplace_image_studio_queue AS
SELECT
  j.id,
  j.product_id,
  p.name AS product_name,
  p.slug AS product_slug,
  p.vendor_id AS product_vendor_id,
  j.vendor_id,
  j.original_image_url,
  j.corrected_image_url,
  j.published_image_url,
  j.status,
  j.decision,
  j.compliance_score,
  j.product_detected,
  j.issues,
  j.corrections,
  j.ai_analysis,
  j.admin_notes,
  j.created_at,
  j.updated_at,
  j.reviewed_at
FROM public.marketplace_image_studio_jobs j
LEFT JOIN public.products p ON p.id = j.product_id
WHERE public.marketplace_image_studio_is_admin();

CREATE OR REPLACE VIEW public.marketplace_image_studio_dashboard AS
SELECT
  count(*)::integer AS total_jobs,
  count(*) FILTER (WHERE status IN ('uploaded', 'analyzing', 'needs_correction'))::integer AS in_pipeline,
  count(*) FILTER (WHERE status = 'pending_admin_review')::integer AS pending_admin_review,
  count(*) FILTER (WHERE status IN ('auto_published', 'approved'))::integer AS published,
  count(*) FILTER (WHERE status IN ('rejected', 'new_image_requested', 'failed'))::integer AS blocked,
  round(COALESCE(avg(compliance_score), 0), 2) AS average_compliance_score,
  count(*) FILTER (WHERE decision = 'auto_publish')::integer AS auto_publish_decisions,
  count(*) FILTER (WHERE decision = 'auto_correct_publish')::integer AS auto_correct_publish_decisions,
  count(*) FILTER (WHERE decision = 'manual_review')::integer AS manual_review_decisions,
  count(*) FILTER (WHERE decision = 'reject')::integer AS reject_decisions
FROM public.marketplace_image_studio_jobs
WHERE public.marketplace_image_studio_is_admin();

ALTER TABLE public.marketplace_image_studio_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_image_studio_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_image_studio_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Marketplace image rules visible to authenticated"
  ON public.marketplace_image_studio_rules
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Marketplace image rules managed by admins"
  ON public.marketplace_image_studio_rules
  FOR ALL
  TO authenticated
  USING (public.marketplace_image_studio_is_admin())
  WITH CHECK (public.marketplace_image_studio_is_admin());

CREATE POLICY "Sellers view own marketplace image jobs"
  ON public.marketplace_image_studio_jobs
  FOR SELECT
  TO authenticated
  USING (
    vendor_id = auth.uid()
    OR submitted_by = auth.uid()
    OR public.marketplace_image_studio_is_admin()
  );

CREATE POLICY "Sellers create own marketplace image jobs"
  ON public.marketplace_image_studio_jobs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    submitted_by = auth.uid()
    AND (vendor_id = auth.uid() OR public.marketplace_image_studio_is_admin())
  );

CREATE POLICY "Admins manage marketplace image jobs"
  ON public.marketplace_image_studio_jobs
  FOR ALL
  TO authenticated
  USING (public.marketplace_image_studio_is_admin())
  WITH CHECK (public.marketplace_image_studio_is_admin());

CREATE POLICY "Sellers view own marketplace image events"
  ON public.marketplace_image_studio_events
  FOR SELECT
  TO authenticated
  USING (
    vendor_id = auth.uid()
    OR actor_id = auth.uid()
    OR public.marketplace_image_studio_is_admin()
  );

CREATE POLICY "Admins insert marketplace image events"
  ON public.marketplace_image_studio_events
  FOR INSERT
  TO authenticated
  WITH CHECK (public.marketplace_image_studio_is_admin());

GRANT SELECT ON public.marketplace_image_studio_rules TO authenticated;
GRANT SELECT, INSERT ON public.marketplace_image_studio_jobs TO authenticated;
GRANT SELECT ON public.marketplace_image_studio_events TO authenticated;
GRANT SELECT ON public.seller_marketplace_image_studio_jobs TO authenticated;
GRANT SELECT ON public.admin_marketplace_image_studio_queue TO authenticated;
GRANT SELECT ON public.marketplace_image_studio_dashboard TO authenticated;
GRANT EXECUTE ON FUNCTION public.marketplace_image_studio_create_job(uuid, text, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.marketplace_image_studio_record_analysis(uuid, numeric, text[], text[], text, text, jsonb, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.marketplace_image_studio_review_job(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.marketplace_image_studio_score_decision(numeric) TO authenticated;
GRANT ALL ON public.marketplace_image_studio_rules TO service_role;
GRANT ALL ON public.marketplace_image_studio_jobs TO service_role;
GRANT ALL ON public.marketplace_image_studio_events TO service_role;

NOTIFY pgrst, 'reload schema';
