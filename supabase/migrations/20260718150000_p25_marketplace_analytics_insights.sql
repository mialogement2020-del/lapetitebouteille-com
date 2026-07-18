-- P2.5 Marketplace Analytics & Insights Engine.
-- Decision analytics only: no wallet, commission, order, payment, withdrawal, ledger, Revenue Engine, Commission Pool or P0 mutation.

ALTER TYPE public.admin_permission ADD VALUE IF NOT EXISTS 'marketplace_analytics';

CREATE OR REPLACE FUNCTION public.marketplace_analytics_is_admin()
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
          'marketplace_analytics',
          'catalogue_intelligence',
          'marketplace_seo',
          'marketplace_coach',
          'marketplace_image_studio',
          'products'
        )
    );
$$;

CREATE OR REPLACE FUNCTION public.marketplace_analytics_owns_shop(_shop_id uuid)
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

CREATE TABLE IF NOT EXISTS public.marketplace_analytics_daily_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date date NOT NULL DEFAULT CURRENT_DATE,
  vendor_shop_id uuid NOT NULL REFERENCES public.vendor_shops(id) ON DELETE CASCADE,
  vendor_owner_id uuid NOT NULL,
  shop_name text,
  product_count integer NOT NULL DEFAULT 0,
  active_product_count integer NOT NULL DEFAULT 0,
  new_products_count integer NOT NULL DEFAULT 0,
  avg_image_score numeric NOT NULL DEFAULT 0 CHECK (avg_image_score BETWEEN 0 AND 100),
  rejected_images_count integer NOT NULL DEFAULT 0,
  pending_image_reviews_count integer NOT NULL DEFAULT 0,
  avg_coach_score numeric NOT NULL DEFAULT 0 CHECK (avg_coach_score BETWEEN 0 AND 100),
  avg_seo_score numeric NOT NULL DEFAULT 0 CHECK (avg_seo_score BETWEEN 0 AND 100),
  avg_discoverability_score numeric NOT NULL DEFAULT 0 CHECK (avg_discoverability_score BETWEEN 0 AND 100),
  avg_catalogue_quality_score numeric NOT NULL DEFAULT 0 CHECK (avg_catalogue_quality_score BETWEEN 0 AND 100),
  avg_completeness_score numeric NOT NULL DEFAULT 0 CHECK (avg_completeness_score BETWEEN 0 AND 100),
  products_to_enrich_count integer NOT NULL DEFAULT 0,
  low_visibility_products_count integer NOT NULL DEFAULT 0,
  pending_recommendations_count integer NOT NULL DEFAULT 0,
  pending_seo_proposals_count integer NOT NULL DEFAULT 0,
  pending_catalogue_proposals_count integer NOT NULL DEFAULT 0,
  duplicate_candidates_count integer NOT NULL DEFAULT 0,
  approved_enrichments_count integer NOT NULL DEFAULT 0,
  visibility_score numeric NOT NULL DEFAULT 0 CHECK (visibility_score BETWEEN 0 AND 100),
  marketplace_health_score numeric NOT NULL DEFAULT 0 CHECK (marketplace_health_score BETWEEN 0 AND 100),
  top_categories jsonb NOT NULL DEFAULT '[]'::jsonb,
  top_brands jsonb NOT NULL DEFAULT '[]'::jsonb,
  low_visibility_products jsonb NOT NULL DEFAULT '[]'::jsonb,
  alerts jsonb NOT NULL DEFAULT '[]'::jsonb,
  source_counts jsonb NOT NULL DEFAULT '{}'::jsonb,
  engine_version text NOT NULL DEFAULT 'p2.5-marketplace-analytics-v1',
  calculated_by uuid DEFAULT auth.uid(),
  calculated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (vendor_shop_id, snapshot_date)
);

CREATE TABLE IF NOT EXISTS public.marketplace_analytics_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id uuid REFERENCES public.marketplace_analytics_daily_snapshots(id) ON DELETE SET NULL,
  vendor_shop_id uuid REFERENCES public.vendor_shops(id) ON DELETE CASCADE,
  vendor_owner_id uuid,
  alert_type text NOT NULL CHECK (alert_type IN (
    'quality_drop',
    'duplicate_spike',
    'image_rejection_increase',
    'category_review_needed',
    'persistent_incomplete_products',
    'pending_enrichments_backlog',
    'low_visibility_backlog'
  )),
  severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title text NOT NULL,
  description text NOT NULL,
  metric_value numeric,
  threshold_value numeric,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved', 'archived')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  engine_version text NOT NULL DEFAULT 'p2.5-marketplace-analytics-v1',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.marketplace_analytics_export_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_shop_id uuid REFERENCES public.vendor_shops(id) ON DELETE SET NULL,
  requested_by uuid DEFAULT auth.uid(),
  export_scope text NOT NULL CHECK (export_scope IN ('vendor_dashboard', 'vendor_trends', 'admin_overview', 'admin_alerts')),
  export_format text NOT NULL CHECK (export_format IN ('csv', 'xlsx', 'pdf')),
  row_count integer NOT NULL DEFAULT 0,
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_marketplace_analytics_daily_shop_date
  ON public.marketplace_analytics_daily_snapshots(vendor_shop_id, snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_analytics_daily_owner_date
  ON public.marketplace_analytics_daily_snapshots(vendor_owner_id, snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_analytics_alerts_shop_status
  ON public.marketplace_analytics_alerts(vendor_shop_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_analytics_alerts_type
  ON public.marketplace_analytics_alerts(alert_type, severity, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_analytics_exports_user
  ON public.marketplace_analytics_export_logs(requested_by, created_at DESC);

CREATE OR REPLACE FUNCTION public.marketplace_analytics_alerts_append_only()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'marketplace_analytics_alerts_append_only';
END;
$$;

DROP TRIGGER IF EXISTS trg_marketplace_analytics_alerts_no_update ON public.marketplace_analytics_alerts;
CREATE TRIGGER trg_marketplace_analytics_alerts_no_update
  BEFORE UPDATE OR DELETE ON public.marketplace_analytics_alerts
  FOR EACH ROW EXECUTE FUNCTION public.marketplace_analytics_alerts_append_only();

CREATE OR REPLACE FUNCTION public.calculate_marketplace_analytics_snapshot(
  _vendor_shop_id uuid DEFAULT NULL,
  _snapshot_date date DEFAULT CURRENT_DATE
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_shop public.vendor_shops%ROWTYPE;
  v_snapshot_id uuid;
  v_previous record;
  v_result jsonb;
  v_processed integer := 0;
  v_alert_count integer := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication_required';
  END IF;

  FOR v_shop IN
    SELECT *
    FROM public.vendor_shops vs
    WHERE (_vendor_shop_id IS NULL OR vs.id = _vendor_shop_id)
      AND (public.marketplace_analytics_is_admin() OR vs.owner_id = auth.uid())
  LOOP
    WITH product_base AS (
      SELECT p.*
      FROM public.products p
      WHERE p.vendor_id = v_shop.id
    ),
    latest_images AS (
      SELECT DISTINCT ON (j.product_id)
        j.product_id,
        j.compliance_score,
        j.status,
        j.decision,
        j.created_at
      FROM public.marketplace_image_studio_jobs j
      JOIN product_base p ON p.id = j.product_id
      ORDER BY j.product_id, j.created_at DESC
    ),
    latest_coach_products AS (
      SELECT DISTINCT ON (a.product_id)
        a.product_id,
        a.global_score,
        a.analyzed_at
      FROM public.marketplace_coach_product_analyses a
      JOIN product_base p ON p.id = a.product_id
      ORDER BY a.product_id, a.analyzed_at DESC
    ),
    latest_seo_products AS (
      SELECT DISTINCT ON (s.product_id)
        s.product_id,
        s.seo_score,
        s.discoverability_score,
        s.analyzed_at
      FROM public.marketplace_seo_product_scores s
      JOIN product_base p ON p.id = s.product_id
      ORDER BY s.product_id, s.analyzed_at DESC
    ),
    latest_catalogue AS (
      SELECT DISTINCT ON (c.product_id)
        c.product_id,
        c.catalogue_quality_score,
        c.completeness_score,
        c.missing_attributes,
        c.analyzed_at
      FROM public.catalogue_product_quality_snapshots c
      JOIN product_base p ON p.id = c.product_id
      ORDER BY c.product_id, c.analyzed_at DESC
    ),
    shop_metrics AS (
      SELECT
        count(*)::integer AS product_count,
        count(*) FILTER (WHERE COALESCE(p.is_active, false))::integer AS active_product_count,
        count(*) FILTER (WHERE p.created_at::date = _snapshot_date)::integer AS new_products_count,
        round(COALESCE(avg(li.compliance_score), 0), 2) AS avg_image_score,
        count(*) FILTER (WHERE li.status = 'rejected')::integer AS rejected_images_count,
        count(*) FILTER (WHERE li.status IN ('pending_admin_review', 'uploaded', 'needs_correction'))::integer AS pending_image_reviews_count,
        round(COALESCE(avg(lcp.global_score), 0), 2) AS avg_coach_score,
        round(COALESCE(avg(lsp.seo_score), 0), 2) AS avg_seo_score,
        round(COALESCE(avg(lsp.discoverability_score), 0), 2) AS avg_discoverability_score,
        round(COALESCE(avg(lc.catalogue_quality_score), 0), 2) AS avg_catalogue_quality_score,
        round(COALESCE(avg(lc.completeness_score), 0), 2) AS avg_completeness_score,
        count(*) FILTER (
          WHERE COALESCE(lc.catalogue_quality_score, 0) < 70
             OR cardinality(COALESCE(lc.missing_attributes, ARRAY[]::text[])) > 0
        )::integer AS products_to_enrich_count,
        count(*) FILTER (WHERE COALESCE(lsp.discoverability_score, 0) < 60)::integer AS low_visibility_products_count
      FROM product_base p
      LEFT JOIN latest_images li ON li.product_id = p.id
      LEFT JOIN latest_coach_products lcp ON lcp.product_id = p.id
      LEFT JOIN latest_seo_products lsp ON lsp.product_id = p.id
      LEFT JOIN latest_catalogue lc ON lc.product_id = p.id
    ),
    backlog AS (
      SELECT
        (SELECT count(*) FROM public.marketplace_coach_recommendations r WHERE r.vendor_shop_id = v_shop.id AND r.status = 'open')::integer AS pending_recommendations_count,
        (SELECT count(*) FROM public.marketplace_seo_content_proposals sp WHERE sp.vendor_shop_id = v_shop.id AND sp.status IN ('draft', 'pending'))::integer AS pending_seo_proposals_count,
        (SELECT count(*) FROM public.catalogue_ai_enrichment_proposals cp WHERE cp.vendor_shop_id = v_shop.id AND cp.status = 'pending')::integer AS pending_catalogue_proposals_count,
        (SELECT count(*) FROM public.catalogue_duplicate_candidates dc WHERE dc.vendor_shop_id = v_shop.id AND dc.status = 'candidate')::integer AS duplicate_candidates_count,
        (SELECT count(*) FROM public.catalogue_ai_enrichment_proposals cp WHERE cp.vendor_shop_id = v_shop.id AND cp.status IN ('approved', 'applied'))::integer AS approved_enrichments_count
    ),
    categories AS (
      SELECT COALESCE(jsonb_agg(item ORDER BY (item->>'product_count')::integer DESC), '[]'::jsonb) AS top_categories
      FROM (
        SELECT jsonb_build_object(
          'category_id', p.category_id,
          'category_name', COALESCE(c.name, 'Sans categorie'),
          'product_count', count(*)
        ) AS item
        FROM product_base p
        LEFT JOIN public.categories c ON c.id = p.category_id
        GROUP BY p.category_id, c.name
        LIMIT 8
      ) ranked
    ),
    brands AS (
      SELECT COALESCE(jsonb_agg(item ORDER BY (item->>'product_count')::integer DESC), '[]'::jsonb) AS top_brands
      FROM (
        SELECT jsonb_build_object(
          'brand', COALESCE(NULLIF(split_part(p.name, ' ', 1), ''), 'Non normalisee'),
          'product_count', count(*)
        ) AS item
        FROM product_base p
        GROUP BY COALESCE(NULLIF(split_part(p.name, ' ', 1), ''), 'Non normalisee')
        LIMIT 8
      ) ranked
    ),
    low_visibility AS (
      SELECT COALESCE(jsonb_agg(item ORDER BY (item->>'discoverability_score')::numeric ASC), '[]'::jsonb) AS low_visibility_products
      FROM (
        SELECT jsonb_build_object(
          'product_id', p.id,
          'name', p.name,
          'discoverability_score', COALESCE(lsp.discoverability_score, 0),
          'seo_score', COALESCE(lsp.seo_score, 0),
          'catalogue_quality_score', COALESCE(lc.catalogue_quality_score, 0)
        ) AS item
        FROM product_base p
        LEFT JOIN latest_seo_products lsp ON lsp.product_id = p.id
        LEFT JOIN latest_catalogue lc ON lc.product_id = p.id
        ORDER BY COALESCE(lsp.discoverability_score, 0) ASC, COALESCE(lc.catalogue_quality_score, 0) ASC
        LIMIT 10
      ) ranked
    ),
    final_metrics AS (
      SELECT
        sm.*,
        b.pending_recommendations_count,
        b.pending_seo_proposals_count,
        b.pending_catalogue_proposals_count,
        b.duplicate_candidates_count,
        b.approved_enrichments_count,
        round((sm.avg_seo_score * 0.45) + (sm.avg_discoverability_score * 0.35) + (sm.avg_image_score * 0.20), 2) AS visibility_score,
        round((
          sm.avg_catalogue_quality_score * 0.30
          + sm.avg_image_score * 0.20
          + sm.avg_seo_score * 0.20
          + sm.avg_coach_score * 0.15
          + sm.avg_completeness_score * 0.15
        ), 2) AS marketplace_health_score
      FROM shop_metrics sm
      CROSS JOIN backlog b
    )
    INSERT INTO public.marketplace_analytics_daily_snapshots (
      snapshot_date, vendor_shop_id, vendor_owner_id, shop_name,
      product_count, active_product_count, new_products_count,
      avg_image_score, rejected_images_count, pending_image_reviews_count,
      avg_coach_score, avg_seo_score, avg_discoverability_score,
      avg_catalogue_quality_score, avg_completeness_score,
      products_to_enrich_count, low_visibility_products_count,
      pending_recommendations_count, pending_seo_proposals_count, pending_catalogue_proposals_count,
      duplicate_candidates_count, approved_enrichments_count,
      visibility_score, marketplace_health_score,
      top_categories, top_brands, low_visibility_products, alerts, source_counts,
      calculated_by, calculated_at
    )
    SELECT
      _snapshot_date, v_shop.id, v_shop.owner_id, v_shop.name,
      fm.product_count, fm.active_product_count, fm.new_products_count,
      fm.avg_image_score, fm.rejected_images_count, fm.pending_image_reviews_count,
      fm.avg_coach_score, fm.avg_seo_score, fm.avg_discoverability_score,
      fm.avg_catalogue_quality_score, fm.avg_completeness_score,
      fm.products_to_enrich_count, fm.low_visibility_products_count,
      fm.pending_recommendations_count, fm.pending_seo_proposals_count, fm.pending_catalogue_proposals_count,
      fm.duplicate_candidates_count, fm.approved_enrichments_count,
      fm.visibility_score, fm.marketplace_health_score,
      categories.top_categories,
      brands.top_brands,
      low_visibility.low_visibility_products,
      '[]'::jsonb,
      jsonb_build_object(
        'products', fm.product_count,
        'p2_1_images', (SELECT count(*) FROM public.marketplace_image_studio_jobs j WHERE j.vendor_id = v_shop.owner_id),
        'p2_2_recommendations', fm.pending_recommendations_count,
        'p2_3_seo_proposals', fm.pending_seo_proposals_count,
        'p2_4_catalogue_proposals', fm.pending_catalogue_proposals_count,
        'p2_4_duplicates', fm.duplicate_candidates_count
      ),
      auth.uid(),
      now()
    FROM final_metrics fm
    CROSS JOIN categories
    CROSS JOIN brands
    CROSS JOIN low_visibility
    ON CONFLICT (vendor_shop_id, snapshot_date) DO UPDATE
    SET shop_name = EXCLUDED.shop_name,
        product_count = EXCLUDED.product_count,
        active_product_count = EXCLUDED.active_product_count,
        new_products_count = EXCLUDED.new_products_count,
        avg_image_score = EXCLUDED.avg_image_score,
        rejected_images_count = EXCLUDED.rejected_images_count,
        pending_image_reviews_count = EXCLUDED.pending_image_reviews_count,
        avg_coach_score = EXCLUDED.avg_coach_score,
        avg_seo_score = EXCLUDED.avg_seo_score,
        avg_discoverability_score = EXCLUDED.avg_discoverability_score,
        avg_catalogue_quality_score = EXCLUDED.avg_catalogue_quality_score,
        avg_completeness_score = EXCLUDED.avg_completeness_score,
        products_to_enrich_count = EXCLUDED.products_to_enrich_count,
        low_visibility_products_count = EXCLUDED.low_visibility_products_count,
        pending_recommendations_count = EXCLUDED.pending_recommendations_count,
        pending_seo_proposals_count = EXCLUDED.pending_seo_proposals_count,
        pending_catalogue_proposals_count = EXCLUDED.pending_catalogue_proposals_count,
        duplicate_candidates_count = EXCLUDED.duplicate_candidates_count,
        approved_enrichments_count = EXCLUDED.approved_enrichments_count,
        visibility_score = EXCLUDED.visibility_score,
        marketplace_health_score = EXCLUDED.marketplace_health_score,
        top_categories = EXCLUDED.top_categories,
        top_brands = EXCLUDED.top_brands,
        low_visibility_products = EXCLUDED.low_visibility_products,
        source_counts = EXCLUDED.source_counts,
        calculated_by = EXCLUDED.calculated_by,
        calculated_at = EXCLUDED.calculated_at
    RETURNING id INTO v_snapshot_id;

    SELECT *
    INTO v_previous
    FROM public.marketplace_analytics_daily_snapshots s
    WHERE s.vendor_shop_id = v_shop.id
      AND s.snapshot_date < _snapshot_date
    ORDER BY s.snapshot_date DESC
    LIMIT 1;

    INSERT INTO public.marketplace_analytics_alerts (
      snapshot_id, vendor_shop_id, vendor_owner_id, alert_type, severity, title, description, metric_value, threshold_value, metadata
    )
    SELECT v_snapshot_id, vendor_shop_id, vendor_owner_id, alert_type, severity, title, description, metric_value, threshold_value, metadata
    FROM (
      SELECT
        v_shop.id AS vendor_shop_id,
        v_shop.owner_id AS vendor_owner_id,
        'persistent_incomplete_products'::text AS alert_type,
        CASE WHEN products_to_enrich_count >= 20 THEN 'high' ELSE 'medium' END AS severity,
        'Produits incomplets persistants'::text AS title,
        'Plusieurs fiches Marketplace doivent être enrichies pour améliorer la qualité catalogue.'::text AS description,
        products_to_enrich_count::numeric AS metric_value,
        5::numeric AS threshold_value,
        jsonb_build_object('snapshot_id', v_snapshot_id) AS metadata
      FROM public.marketplace_analytics_daily_snapshots s
      WHERE s.id = v_snapshot_id AND s.products_to_enrich_count >= 5
      UNION ALL
      SELECT v_shop.id, v_shop.owner_id, 'duplicate_spike', 'high', 'Doublons à vérifier',
             'Des fiches semblent être des doublons et doivent être arbitrées par l’administration.',
             duplicate_candidates_count::numeric, 3::numeric, jsonb_build_object('snapshot_id', v_snapshot_id)
      FROM public.marketplace_analytics_daily_snapshots s
      WHERE s.id = v_snapshot_id AND s.duplicate_candidates_count >= 3
      UNION ALL
      SELECT v_shop.id, v_shop.owner_id, 'image_rejection_increase', 'medium', 'Images refusées ou faibles',
             'Le Studio Image détecte des visuels non conformes ou en attente.',
             (rejected_images_count + pending_image_reviews_count)::numeric, 2::numeric, jsonb_build_object('snapshot_id', v_snapshot_id)
      FROM public.marketplace_analytics_daily_snapshots s
      WHERE s.id = v_snapshot_id AND (s.rejected_images_count + s.pending_image_reviews_count) >= 2
      UNION ALL
      SELECT v_shop.id, v_shop.owner_id, 'pending_enrichments_backlog', 'medium', 'Enrichissements non validés',
             'Des propositions SEO/catalogue ou recommandations restent ouvertes.',
             (pending_recommendations_count + pending_seo_proposals_count + pending_catalogue_proposals_count)::numeric,
             10::numeric,
             jsonb_build_object('snapshot_id', v_snapshot_id)
      FROM public.marketplace_analytics_daily_snapshots s
      WHERE s.id = v_snapshot_id AND (s.pending_recommendations_count + s.pending_seo_proposals_count + s.pending_catalogue_proposals_count) >= 10
      UNION ALL
      SELECT v_shop.id, v_shop.owner_id, 'low_visibility_backlog', 'medium', 'Produits peu visibles',
             'Plusieurs produits ont un score de découvrabilité faible.',
             low_visibility_products_count::numeric, 5::numeric, jsonb_build_object('snapshot_id', v_snapshot_id)
      FROM public.marketplace_analytics_daily_snapshots s
      WHERE s.id = v_snapshot_id AND s.low_visibility_products_count >= 5
      UNION ALL
      SELECT v_shop.id, v_shop.owner_id, 'quality_drop', 'critical', 'Chute de qualité boutique',
             'Le score global Marketplace de la boutique a chuté depuis le précédent snapshot.',
             s.marketplace_health_score, COALESCE(v_previous.marketplace_health_score, 0),
             jsonb_build_object('previous_snapshot_date', v_previous.snapshot_date, 'snapshot_id', v_snapshot_id)
      FROM public.marketplace_analytics_daily_snapshots s
      WHERE s.id = v_snapshot_id
        AND v_previous.id IS NOT NULL
        AND COALESCE(v_previous.marketplace_health_score, 0) - s.marketplace_health_score >= 10
    ) alerts_to_insert;

    GET DIAGNOSTICS v_alert_count = ROW_COUNT;

    UPDATE public.marketplace_analytics_daily_snapshots s
    SET alerts = COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'alert_type', a.alert_type,
        'severity', a.severity,
        'title', a.title,
        'description', a.description,
        'metric_value', a.metric_value
      ) ORDER BY a.created_at DESC)
      FROM public.marketplace_analytics_alerts a
      WHERE a.snapshot_id = v_snapshot_id
    ), '[]'::jsonb)
    WHERE s.id = v_snapshot_id;

    v_processed := v_processed + 1;
  END LOOP;

  IF v_processed = 0 THEN
    RAISE EXCEPTION 'marketplace_analytics_no_accessible_shop';
  END IF;

  SELECT jsonb_build_object(
    'processed_shops', v_processed,
    'snapshot_date', _snapshot_date,
    'last_snapshot_id', v_snapshot_id,
    'alerts_created_last_shop', v_alert_count
  )
  INTO v_result;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.export_marketplace_analytics(
  _scope text DEFAULT 'vendor_dashboard',
  _format text DEFAULT 'csv',
  _vendor_shop_id uuid DEFAULT NULL,
  _days integer DEFAULT 30
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows jsonb;
  v_row_count integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication_required';
  END IF;

  IF _scope NOT IN ('vendor_dashboard', 'vendor_trends', 'admin_overview', 'admin_alerts') THEN
    RAISE EXCEPTION 'invalid_export_scope';
  END IF;

  IF _format NOT IN ('csv', 'xlsx', 'pdf') THEN
    RAISE EXCEPTION 'invalid_export_format';
  END IF;

  IF _scope LIKE 'admin_%' AND NOT public.marketplace_analytics_is_admin() THEN
    RAISE EXCEPTION 'admin_required';
  END IF;

  SELECT COALESCE(jsonb_agg(to_jsonb(row_data)), '[]'::jsonb), count(*)
  INTO v_rows, v_row_count
  FROM (
    SELECT
      snapshot_date,
      shop_name,
      product_count,
      active_product_count,
      marketplace_health_score,
      avg_catalogue_quality_score,
      avg_image_score,
      avg_seo_score,
      avg_discoverability_score,
      products_to_enrich_count,
      duplicate_candidates_count,
      pending_recommendations_count,
      pending_seo_proposals_count,
      pending_catalogue_proposals_count
    FROM public.marketplace_analytics_daily_snapshots s
    WHERE s.snapshot_date >= CURRENT_DATE - make_interval(days => LEAST(GREATEST(COALESCE(_days, 30), 1), 365))
      AND (
        public.marketplace_analytics_is_admin()
        OR s.vendor_owner_id = auth.uid()
      )
      AND (_vendor_shop_id IS NULL OR s.vendor_shop_id = _vendor_shop_id)
      AND (
        _scope IN ('vendor_dashboard', 'vendor_trends')
        OR public.marketplace_analytics_is_admin()
      )
    ORDER BY s.snapshot_date DESC, s.shop_name
    LIMIT 500
  ) row_data;

  INSERT INTO public.marketplace_analytics_export_logs (
    vendor_shop_id, requested_by, export_scope, export_format, row_count, filters
  )
  VALUES (
    _vendor_shop_id,
    auth.uid(),
    _scope,
    _format,
    v_row_count,
    jsonb_build_object('days', _days)
  );

  RETURN jsonb_build_object(
    'scope', _scope,
    'format', _format,
    'row_count', v_row_count,
    'generated_at', now(),
    'rows', v_rows
  );
END;
$$;

CREATE OR REPLACE VIEW public.my_marketplace_analytics_dashboard AS
SELECT DISTINCT ON (s.vendor_shop_id)
  s.*
FROM public.marketplace_analytics_daily_snapshots s
WHERE s.vendor_owner_id = auth.uid()
   OR public.marketplace_analytics_is_admin()
ORDER BY s.vendor_shop_id, s.snapshot_date DESC, s.calculated_at DESC;

CREATE OR REPLACE VIEW public.my_marketplace_analytics_trends AS
SELECT
  s.*
FROM public.marketplace_analytics_daily_snapshots s
WHERE (s.vendor_owner_id = auth.uid() OR public.marketplace_analytics_is_admin())
  AND s.snapshot_date >= CURRENT_DATE - INTERVAL '90 days'
ORDER BY s.snapshot_date ASC;

CREATE OR REPLACE VIEW public.my_marketplace_analytics_alerts AS
SELECT
  a.*,
  vs.name AS shop_name
FROM public.marketplace_analytics_alerts a
LEFT JOIN public.vendor_shops vs ON vs.id = a.vendor_shop_id
WHERE a.vendor_owner_id = auth.uid()
   OR public.marketplace_analytics_is_admin()
ORDER BY a.created_at DESC;

CREATE OR REPLACE VIEW public.admin_marketplace_analytics_overview AS
WITH latest AS (
  SELECT DISTINCT ON (s.vendor_shop_id)
    s.*
  FROM public.marketplace_analytics_daily_snapshots s
  ORDER BY s.vendor_shop_id, s.snapshot_date DESC, s.calculated_at DESC
)
SELECT
  count(*)::integer AS shops_analyzed,
  COALESCE(sum(product_count), 0)::integer AS product_count,
  COALESCE(sum(active_product_count), 0)::integer AS active_product_count,
  round(COALESCE(avg(marketplace_health_score), 0), 2) AS marketplace_health_score,
  round(COALESCE(avg(avg_catalogue_quality_score), 0), 2) AS catalogue_quality_score,
  round(COALESCE(avg(avg_image_score), 0), 2) AS image_score,
  round(COALESCE(avg(avg_seo_score), 0), 2) AS seo_score,
  round(COALESCE(avg(avg_discoverability_score), 0), 2) AS discoverability_score,
  COALESCE(sum(products_to_enrich_count), 0)::integer AS products_to_enrich_count,
  COALESCE(sum(duplicate_candidates_count), 0)::integer AS duplicate_candidates_count,
  COALESCE(sum(approved_enrichments_count), 0)::integer AS approved_enrichments_count,
  COALESCE(sum(pending_recommendations_count + pending_seo_proposals_count + pending_catalogue_proposals_count), 0)::integer AS pending_actions_count,
  COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'shop_name', shop_name,
      'score', marketplace_health_score,
      'product_count', product_count
    ) ORDER BY marketplace_health_score DESC)
    FROM latest
    LIMIT 10
  ), '[]'::jsonb) AS top_shops,
  COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'shop_name', shop_name,
      'score', marketplace_health_score,
      'products_to_enrich_count', products_to_enrich_count
    ) ORDER BY marketplace_health_score ASC)
    FROM latest
    LIMIT 10
  ), '[]'::jsonb) AS shops_to_support
FROM latest
WHERE public.marketplace_analytics_is_admin();

CREATE OR REPLACE VIEW public.admin_marketplace_analytics_shop_rankings AS
SELECT
  s.*
FROM public.my_marketplace_analytics_dashboard s
WHERE public.marketplace_analytics_is_admin()
ORDER BY s.marketplace_health_score DESC, s.product_count DESC;

CREATE OR REPLACE VIEW public.admin_marketplace_analytics_trends AS
SELECT
  snapshot_date,
  count(*)::integer AS shops_count,
  COALESCE(sum(product_count), 0)::integer AS product_count,
  round(COALESCE(avg(marketplace_health_score), 0), 2) AS marketplace_health_score,
  round(COALESCE(avg(avg_catalogue_quality_score), 0), 2) AS catalogue_quality_score,
  round(COALESCE(avg(avg_image_score), 0), 2) AS image_score,
  round(COALESCE(avg(avg_seo_score), 0), 2) AS seo_score,
  COALESCE(sum(duplicate_candidates_count), 0)::integer AS duplicate_candidates_count,
  COALESCE(sum(approved_enrichments_count), 0)::integer AS approved_enrichments_count
FROM public.marketplace_analytics_daily_snapshots
WHERE public.marketplace_analytics_is_admin()
  AND snapshot_date >= CURRENT_DATE - INTERVAL '180 days'
GROUP BY snapshot_date
ORDER BY snapshot_date ASC;

ALTER TABLE public.marketplace_analytics_daily_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_analytics_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_analytics_export_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendors read own marketplace analytics snapshots"
  ON public.marketplace_analytics_daily_snapshots FOR SELECT TO authenticated
  USING (vendor_owner_id = auth.uid() OR public.marketplace_analytics_is_admin());

CREATE POLICY "Vendors read own marketplace analytics alerts"
  ON public.marketplace_analytics_alerts FOR SELECT TO authenticated
  USING (vendor_owner_id = auth.uid() OR public.marketplace_analytics_is_admin());

CREATE POLICY "Users read own marketplace analytics export logs"
  ON public.marketplace_analytics_export_logs FOR SELECT TO authenticated
  USING (requested_by = auth.uid() OR public.marketplace_analytics_is_admin());

GRANT SELECT ON public.marketplace_analytics_daily_snapshots TO authenticated;
GRANT SELECT ON public.marketplace_analytics_alerts TO authenticated;
GRANT SELECT ON public.marketplace_analytics_export_logs TO authenticated;
GRANT SELECT ON public.my_marketplace_analytics_dashboard TO authenticated;
GRANT SELECT ON public.my_marketplace_analytics_trends TO authenticated;
GRANT SELECT ON public.my_marketplace_analytics_alerts TO authenticated;
GRANT SELECT ON public.admin_marketplace_analytics_overview TO authenticated;
GRANT SELECT ON public.admin_marketplace_analytics_shop_rankings TO authenticated;
GRANT SELECT ON public.admin_marketplace_analytics_trends TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_marketplace_analytics_snapshot(uuid, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.export_marketplace_analytics(text, text, uuid, integer) TO authenticated;

GRANT ALL ON public.marketplace_analytics_daily_snapshots TO service_role;
GRANT ALL ON public.marketplace_analytics_alerts TO service_role;
GRANT ALL ON public.marketplace_analytics_export_logs TO service_role;

NOTIFY pgrst, 'reload schema';
