-- P2-S1 Marketplace Integrity Hardening.
-- Security-only pass: no wallet, commission, order, payment, withdrawal, ledger or P0 mutation.

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
  v_is_admin boolean := public.marketplace_image_studio_is_admin();
  v_effective_vendor_id uuid;
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

    IF NOT v_is_admin AND v_product_vendor IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'product_not_owned_by_vendor';
    END IF;
  END IF;

  v_effective_vendor_id := CASE
    WHEN v_is_admin THEN COALESCE(_vendor_id, v_product_vendor, auth.uid())
    ELSE auth.uid()
  END;

  IF NOT v_is_admin AND _vendor_id IS NOT NULL AND _vendor_id <> auth.uid() THEN
    RAISE EXCEPTION 'vendor_id_must_match_authenticated_user';
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
    v_effective_vendor_id,
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
    v_job_id, 'uploaded', auth.uid(), _product_id, v_effective_vendor_id, 'uploaded',
    'Image vendeur recue dans le Studio Image Marketplace LPB. Elle reste en controle avant publication.'
  );

  RETURN v_job_id;
END;
$$;

-- P2.2: vendors read their computed data, but cannot insert/update computed scores directly.
DROP POLICY IF EXISTS "Vendors create own marketplace coach analyses" ON public.marketplace_coach_product_analyses;
DROP POLICY IF EXISTS "Vendors create own marketplace coach snapshots" ON public.marketplace_coach_shop_snapshots;
DROP POLICY IF EXISTS "Vendors insert own marketplace coach events" ON public.marketplace_coach_events;
DROP POLICY IF EXISTS "Admins insert marketplace coach recommendations" ON public.marketplace_coach_recommendations;
DROP POLICY IF EXISTS "Vendors update own marketplace coach recommendation status" ON public.marketplace_coach_recommendations;

REVOKE INSERT ON public.marketplace_coach_product_analyses FROM authenticated;
REVOKE INSERT ON public.marketplace_coach_shop_snapshots FROM authenticated;
REVOKE INSERT ON public.marketplace_coach_events FROM authenticated;
REVOKE INSERT, UPDATE ON public.marketplace_coach_recommendations FROM authenticated;

-- P2.3: vendors read their SEO/discoverability results, but write only via audited RPCs.
DROP POLICY IF EXISTS "Vendors insert own marketplace seo product scores" ON public.marketplace_seo_product_scores;
DROP POLICY IF EXISTS "Vendors insert own marketplace seo shop scores" ON public.marketplace_seo_shop_scores;
DROP POLICY IF EXISTS "Admins insert marketplace seo proposals" ON public.marketplace_seo_content_proposals;
DROP POLICY IF EXISTS "Vendors update own marketplace seo proposal status" ON public.marketplace_seo_content_proposals;
DROP POLICY IF EXISTS "Authenticated insert marketplace seo proposal events" ON public.marketplace_seo_proposal_events;
DROP POLICY IF EXISTS "Authenticated records discoverability events" ON public.marketplace_discoverability_events;
DROP POLICY IF EXISTS "Admins manage duplicate candidates" ON public.marketplace_duplicate_candidates;

REVOKE INSERT ON public.marketplace_seo_product_scores FROM authenticated;
REVOKE INSERT ON public.marketplace_seo_shop_scores FROM authenticated;
REVOKE INSERT, UPDATE ON public.marketplace_seo_content_proposals FROM authenticated;
REVOKE INSERT ON public.marketplace_seo_proposal_events FROM authenticated;
REVOKE INSERT ON public.marketplace_discoverability_events FROM authenticated;
REVOKE INSERT, UPDATE ON public.marketplace_duplicate_candidates FROM authenticated;

CREATE POLICY "RPC records marketplace discoverability events"
  ON public.marketplace_discoverability_events FOR INSERT TO authenticated
  WITH CHECK (actor_id = auth.uid() OR public.marketplace_seo_is_admin());

CREATE POLICY "Admins manage duplicate candidates"
  ON public.marketplace_duplicate_candidates FOR ALL TO authenticated
  USING (public.marketplace_seo_is_admin())
  WITH CHECK (public.marketplace_seo_is_admin());

CREATE OR REPLACE FUNCTION public.record_marketplace_discoverability_event(
  _event_type text,
  _query text DEFAULT NULL,
  _product_id uuid DEFAULT NULL,
  _vendor_shop_id uuid DEFAULT NULL,
  _position integer DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_product public.products%ROWTYPE;
  v_sanitized_metadata jsonb := COALESCE(_metadata, '{}'::jsonb);
  v_recent_count integer := 0;
  v_duplicate_count integer := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'auth_required';
  END IF;

  IF _event_type NOT IN (
    'search',
    'shop_view',
    'product_view',
    'impression',
    'click',
    'share',
    'contact',
    'add_to_cart'
  ) THEN
    RAISE EXCEPTION 'marketplace_discoverability_invalid_event_type';
  END IF;

  IF jsonb_typeof(v_sanitized_metadata) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'marketplace_discoverability_invalid_metadata';
  END IF;

  IF length(v_sanitized_metadata::text) > 2000 THEN
    RAISE EXCEPTION 'marketplace_discoverability_metadata_too_large';
  END IF;

  v_sanitized_metadata := v_sanitized_metadata
    - 'authorization'
    - 'access_token'
    - 'refresh_token'
    - 'service_role'
    - 'password'
    - 'secret'
    - 'raw_payload';

  IF _product_id IS NOT NULL THEN
    SELECT * INTO v_product
    FROM public.products
    WHERE id = _product_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'marketplace_discoverability_product_not_found';
    END IF;

    IF v_product.vendor_id IS NULL THEN
      RAISE EXCEPTION 'marketplace_discoverability_product_not_marketplace';
    END IF;

    IF _vendor_shop_id IS NOT NULL AND v_product.vendor_id <> _vendor_shop_id THEN
      RAISE EXCEPTION 'marketplace_discoverability_product_shop_mismatch';
    END IF;

    IF NOT COALESCE(v_product.is_active, false) AND NOT public.marketplace_seo_is_admin() THEN
      RAISE EXCEPTION 'marketplace_discoverability_product_not_public';
    END IF;
  END IF;

  IF _vendor_shop_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.vendor_shops WHERE id = _vendor_shop_id) THEN
    RAISE EXCEPTION 'marketplace_discoverability_shop_not_found';
  END IF;

  SELECT count(*)::integer INTO v_recent_count
  FROM public.marketplace_discoverability_events
  WHERE actor_id = auth.uid()
    AND created_at >= now() - interval '1 minute';

  IF v_recent_count >= 60 AND NOT public.marketplace_seo_is_admin() THEN
    RAISE EXCEPTION 'marketplace_discoverability_rate_limited';
  END IF;

  SELECT count(*)::integer INTO v_duplicate_count
  FROM public.marketplace_discoverability_events
  WHERE actor_id = auth.uid()
    AND event_type = _event_type
    AND COALESCE(query, '') = COALESCE(_query, '')
    AND product_id IS NOT DISTINCT FROM _product_id
    AND vendor_shop_id IS NOT DISTINCT FROM _vendor_shop_id
    AND created_at >= now() - interval '10 seconds';

  IF v_duplicate_count >= 5 AND NOT public.marketplace_seo_is_admin() THEN
    RAISE EXCEPTION 'marketplace_discoverability_duplicate_rate_limited';
  END IF;

  INSERT INTO public.marketplace_discoverability_events(
    event_type, query, product_id, vendor_shop_id, position, actor_id, metadata
  )
  VALUES (
    _event_type,
    left(NULLIF(trim(COALESCE(_query, '')), ''), 160),
    _product_id,
    COALESCE(_vendor_shop_id, v_product.vendor_id),
    CASE WHEN _position IS NULL THEN NULL ELSE GREATEST(1, LEAST(_position, 500)) END,
    auth.uid(),
    v_sanitized_metadata
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.marketplace_image_studio_create_job(uuid, text, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_marketplace_discoverability_event(text, text, uuid, uuid, integer, jsonb) TO authenticated;

NOTIFY pgrst, 'reload schema';
