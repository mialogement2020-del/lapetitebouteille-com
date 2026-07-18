-- P2.4 Catalogue Intelligence Engine.
-- Catalogue quality and normalization only: no wallet, commission, order, payment, withdrawal, ledger or P0 mutation.

ALTER TYPE public.admin_permission ADD VALUE IF NOT EXISTS 'catalogue_intelligence';

CREATE OR REPLACE FUNCTION public.catalogue_intelligence_is_admin()
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
          'catalogue_intelligence',
          'marketplace_seo',
          'marketplace_coach',
          'products',
          'categories'
        )
    );
$$;

CREATE OR REPLACE FUNCTION public.catalogue_intelligence_owns_product(_product_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    EXISTS (
      SELECT 1
      FROM public.products p
      JOIN public.vendor_shops vs ON vs.id = p.vendor_id
      WHERE p.id = _product_id
        AND vs.owner_id = auth.uid()
    ),
    false
  );
$$;

CREATE TABLE IF NOT EXISTS public.catalogue_attribute_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  label text NOT NULL,
  data_type text NOT NULL CHECK (data_type IN ('text', 'number', 'boolean', 'date', 'enum', 'json')),
  official_unit text,
  allowed_values jsonb NOT NULL DEFAULT '[]'::jsonb,
  synonyms text[] NOT NULL DEFAULT ARRAY[]::text[],
  validation_rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  applies_to_categories uuid[] NOT NULL DEFAULT ARRAY[]::uuid[],
  is_required boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.catalogue_brand_references (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_name text NOT NULL UNIQUE,
  normalized_name text NOT NULL UNIQUE,
  aliases text[] NOT NULL DEFAULT ARRAY[]::text[],
  country text,
  producer text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.catalogue_category_taxonomy (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid REFERENCES public.catalogue_category_taxonomy(id) ON DELETE SET NULL,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  level text NOT NULL CHECK (level IN ('category', 'subcategory', 'family', 'type', 'variant')),
  label text NOT NULL,
  slug text NOT NULL,
  aliases text[] NOT NULL DEFAULT ARRAY[]::text[],
  sort_order integer NOT NULL DEFAULT 100,
  is_public boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(parent_id, slug, level)
);

CREATE TABLE IF NOT EXISTS public.catalogue_product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  parent_product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  variant_type text NOT NULL CHECK (variant_type IN ('volume', 'format', 'packaging', 'vintage', 'case', 'coffret', 'other')),
  variant_label text NOT NULL,
  normalized_value text,
  unit text,
  bottle_quantity integer,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_primary boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.catalogue_product_quality_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  vendor_shop_id uuid REFERENCES public.vendor_shops(id) ON DELETE SET NULL,
  vendor_owner_id uuid,
  catalogue_quality_score numeric NOT NULL DEFAULT 0 CHECK (catalogue_quality_score BETWEEN 0 AND 100),
  completeness_score numeric NOT NULL DEFAULT 0 CHECK (completeness_score BETWEEN 0 AND 100),
  attribute_score numeric NOT NULL DEFAULT 0 CHECK (attribute_score BETWEEN 0 AND 100),
  brand_score numeric NOT NULL DEFAULT 0 CHECK (brand_score BETWEEN 0 AND 100),
  category_score numeric NOT NULL DEFAULT 0 CHECK (category_score BETWEEN 0 AND 100),
  variant_score numeric NOT NULL DEFAULT 0 CHECK (variant_score BETWEEN 0 AND 100),
  image_score numeric NOT NULL DEFAULT 0 CHECK (image_score BETWEEN 0 AND 100),
  seo_score numeric NOT NULL DEFAULT 0 CHECK (seo_score BETWEEN 0 AND 100),
  consistency_score numeric NOT NULL DEFAULT 0 CHECK (consistency_score BETWEEN 0 AND 100),
  missing_attributes text[] NOT NULL DEFAULT ARRAY[]::text[],
  normalization_issues text[] NOT NULL DEFAULT ARRAY[]::text[],
  duplicate_signals jsonb NOT NULL DEFAULT '[]'::jsonb,
  suggested_attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  suggested_brand_id uuid REFERENCES public.catalogue_brand_references(id) ON DELETE SET NULL,
  suggested_taxonomy_id uuid REFERENCES public.catalogue_category_taxonomy(id) ON DELETE SET NULL,
  engine_version text NOT NULL DEFAULT 'p2.4-catalogue-intelligence-v1',
  analyzed_by uuid DEFAULT auth.uid(),
  analyzed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.catalogue_ai_enrichment_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quality_snapshot_id uuid REFERENCES public.catalogue_product_quality_snapshots(id) ON DELETE SET NULL,
  vendor_shop_id uuid REFERENCES public.vendor_shops(id) ON DELETE SET NULL,
  vendor_owner_id uuid,
  proposal_type text NOT NULL CHECK (proposal_type IN (
    'brand',
    'category',
    'attribute',
    'description',
    'summary',
    'faq',
    'pairing',
    'serving_temperature',
    'tasting_note',
    'variant',
    'keyword'
  )),
  current_value jsonb NOT NULL DEFAULT '{}'::jsonb,
  proposed_value jsonb NOT NULL DEFAULT '{}'::jsonb,
  confidence_score numeric NOT NULL DEFAULT 0 CHECK (confidence_score BETWEEN 0 AND 100),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'applied', 'archived')),
  explanation text NOT NULL,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.catalogue_duplicate_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  candidate_product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  vendor_shop_id uuid REFERENCES public.vendor_shops(id) ON DELETE SET NULL,
  confidence_score numeric NOT NULL DEFAULT 0 CHECK (confidence_score BETWEEN 0 AND 100),
  signals text[] NOT NULL DEFAULT ARRAY[]::text[],
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'candidate' CHECK (status IN ('candidate', 'confirmed_duplicate', 'not_duplicate', 'merged_externally', 'archived')),
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(product_id, candidate_product_id)
);

CREATE TABLE IF NOT EXISTS public.catalogue_intelligence_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  vendor_shop_id uuid REFERENCES public.vendor_shops(id) ON DELETE SET NULL,
  actor_id uuid DEFAULT auth.uid(),
  previous_status text,
  new_status text,
  explanation text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.catalogue_attribute_definitions(code, label, data_type, official_unit, synonyms, validation_rules, is_required)
VALUES
  ('volume_ml', 'Volume', 'number', 'ml', ARRAY['contenance', 'volume', 'cl', 'ml'], '{"min": 50, "max": 15000}'::jsonb, true),
  ('alcohol_percentage', 'Degre alcool', 'number', '%', ARRAY['degre', 'alcool', 'abv'], '{"min": 0, "max": 80}'::jsonb, false),
  ('vintage_year', 'Millesime', 'number', 'year', ARRAY['annee', 'millesime', 'vintage'], '{"min": 1900, "max": 2100}'::jsonb, false),
  ('origin_country', 'Pays', 'text', NULL, ARRAY['origine', 'pays'], '{}'::jsonb, false),
  ('region', 'Region', 'text', NULL, ARRAY['terroir', 'region'], '{}'::jsonb, false),
  ('grape_variety', 'Cepage', 'text', NULL, ARRAY['cepage', 'variete'], '{}'::jsonb, false),
  ('brand', 'Marque', 'text', NULL, ARRAY['marque', 'maison', 'producteur'], '{}'::jsonb, true),
  ('packaging', 'Conditionnement', 'enum', NULL, ARRAY['carton', 'caisse', 'coffret', 'format'], '["bouteille","carton","caisse","coffret"]'::jsonb, false)
ON CONFLICT (code) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_catalogue_quality_product
  ON public.catalogue_product_quality_snapshots(product_id, analyzed_at DESC);
CREATE INDEX IF NOT EXISTS idx_catalogue_quality_vendor
  ON public.catalogue_product_quality_snapshots(vendor_shop_id, analyzed_at DESC);
CREATE INDEX IF NOT EXISTS idx_catalogue_proposals_vendor
  ON public.catalogue_ai_enrichment_proposals(vendor_shop_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_catalogue_duplicates_product
  ON public.catalogue_duplicate_candidates(product_id, status, confidence_score DESC);
CREATE INDEX IF NOT EXISTS idx_catalogue_variants_product
  ON public.catalogue_product_variants(product_id, variant_type);
CREATE INDEX IF NOT EXISTS idx_catalogue_brands_normalized
  ON public.catalogue_brand_references(normalized_name);
CREATE INDEX IF NOT EXISTS idx_catalogue_taxonomy_slug
  ON public.catalogue_category_taxonomy(slug, level);

CREATE OR REPLACE FUNCTION public.catalogue_intelligence_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.catalogue_intelligence_append_only()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'catalogue_intelligence_history_append_only';
END;
$$;

DROP TRIGGER IF EXISTS trg_catalogue_attribute_touch ON public.catalogue_attribute_definitions;
CREATE TRIGGER trg_catalogue_attribute_touch
BEFORE UPDATE ON public.catalogue_attribute_definitions
FOR EACH ROW EXECUTE FUNCTION public.catalogue_intelligence_touch_updated_at();

DROP TRIGGER IF EXISTS trg_catalogue_brand_touch ON public.catalogue_brand_references;
CREATE TRIGGER trg_catalogue_brand_touch
BEFORE UPDATE ON public.catalogue_brand_references
FOR EACH ROW EXECUTE FUNCTION public.catalogue_intelligence_touch_updated_at();

DROP TRIGGER IF EXISTS trg_catalogue_taxonomy_touch ON public.catalogue_category_taxonomy;
CREATE TRIGGER trg_catalogue_taxonomy_touch
BEFORE UPDATE ON public.catalogue_category_taxonomy
FOR EACH ROW EXECUTE FUNCTION public.catalogue_intelligence_touch_updated_at();

DROP TRIGGER IF EXISTS trg_catalogue_variants_touch ON public.catalogue_product_variants;
CREATE TRIGGER trg_catalogue_variants_touch
BEFORE UPDATE ON public.catalogue_product_variants
FOR EACH ROW EXECUTE FUNCTION public.catalogue_intelligence_touch_updated_at();

DROP TRIGGER IF EXISTS trg_catalogue_quality_append_only ON public.catalogue_product_quality_snapshots;
CREATE TRIGGER trg_catalogue_quality_append_only
BEFORE UPDATE OR DELETE ON public.catalogue_product_quality_snapshots
FOR EACH ROW EXECUTE FUNCTION public.catalogue_intelligence_append_only();

DROP TRIGGER IF EXISTS trg_catalogue_events_append_only ON public.catalogue_intelligence_events;
CREATE TRIGGER trg_catalogue_events_append_only
BEFORE UPDATE OR DELETE ON public.catalogue_intelligence_events
FOR EACH ROW EXECUTE FUNCTION public.catalogue_intelligence_append_only();

DROP TRIGGER IF EXISTS trg_catalogue_proposals_touch ON public.catalogue_ai_enrichment_proposals;
CREATE TRIGGER trg_catalogue_proposals_touch
BEFORE UPDATE ON public.catalogue_ai_enrichment_proposals
FOR EACH ROW EXECUTE FUNCTION public.catalogue_intelligence_touch_updated_at();

DROP TRIGGER IF EXISTS trg_catalogue_duplicates_touch ON public.catalogue_duplicate_candidates;
CREATE TRIGGER trg_catalogue_duplicates_touch
BEFORE UPDATE ON public.catalogue_duplicate_candidates
FOR EACH ROW EXECUTE FUNCTION public.catalogue_intelligence_touch_updated_at();

CREATE OR REPLACE FUNCTION public.analyze_catalogue_product(_product_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p public.products%ROWTYPE;
  v_shop public.vendor_shops%ROWTYPE;
  v_snapshot_id uuid;
  v_completeness numeric := 0;
  v_attribute numeric := 0;
  v_brand numeric := 0;
  v_category numeric := 0;
  v_variant numeric := 0;
  v_image numeric := 0;
  v_seo numeric := 0;
  v_consistency numeric := 0;
  v_quality numeric := 0;
  v_missing text[] := ARRAY[]::text[];
  v_issues text[] := ARRAY[]::text[];
  v_suggested_attributes jsonb := '{}'::jsonb;
  v_brand_ref uuid;
  v_taxonomy_ref uuid;
  v_duplicate_count integer := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'auth_required';
  END IF;

  SELECT * INTO p FROM public.products WHERE id = _product_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'catalogue_product_not_found';
  END IF;

  IF p.vendor_id IS NULL THEN
    RAISE EXCEPTION 'catalogue_product_not_marketplace';
  END IF;

  SELECT * INTO v_shop FROM public.vendor_shops WHERE id = p.vendor_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'catalogue_shop_not_found';
  END IF;

  IF v_shop.owner_id <> auth.uid() AND NOT public.catalogue_intelligence_is_admin() THEN
    RAISE EXCEPTION 'catalogue_permission_denied';
  END IF;

  IF COALESCE(p.name, '') = '' THEN v_missing := array_append(v_missing, 'name'); END IF;
  IF COALESCE(p.image_url, '') = '' THEN v_missing := array_append(v_missing, 'image_url'); END IF;
  IF COALESCE(p.price, 0) <= 0 THEN v_missing := array_append(v_missing, 'price'); END IF;
  IF p.category_id IS NULL THEN v_missing := array_append(v_missing, 'category_id'); END IF;
  IF COALESCE(p.volume_ml, 0) <= 0 THEN v_missing := array_append(v_missing, 'volume_ml'); END IF;
  IF COALESCE(p.description, p.short_description, '') = '' THEN v_missing := array_append(v_missing, 'description'); END IF;

  SELECT id INTO v_brand_ref
  FROM public.catalogue_brand_references b
  WHERE b.is_active
    AND (
      lower(p.name) ILIKE '%' || lower(b.canonical_name) || '%'
      OR EXISTS (SELECT 1 FROM unnest(b.aliases) a WHERE lower(p.name) ILIKE '%' || lower(a) || '%')
    )
  ORDER BY length(b.canonical_name) DESC
  LIMIT 1;

  SELECT id INTO v_taxonomy_ref
  FROM public.catalogue_category_taxonomy t
  WHERE t.is_active
    AND (t.category_id = p.category_id OR lower(p.name) ILIKE '%' || lower(t.label) || '%')
  ORDER BY CASE WHEN t.category_id = p.category_id THEN 0 ELSE 1 END, t.sort_order
  LIMIT 1;

  v_completeness := GREATEST(0, 100 - array_length(v_missing, 1) * 14);
  v_attribute := LEAST(100,
    (CASE WHEN COALESCE(p.volume_ml, 0) > 0 THEN 25 ELSE 0 END) +
    (CASE WHEN COALESCE(p.alcohol_percentage, 0) > 0 THEN 20 ELSE 0 END) +
    (CASE WHEN COALESCE(p.origin_country, '') <> '' THEN 15 ELSE 0 END) +
    (CASE WHEN COALESCE(p.region, '') <> '' THEN 15 ELSE 0 END) +
    (CASE WHEN COALESCE(p.grape_variety, '') <> '' THEN 15 ELSE 0 END) +
    (CASE WHEN p.vintage_year IS NOT NULL THEN 10 ELSE 0 END)
  );
  v_brand := CASE WHEN v_brand_ref IS NOT NULL THEN 100 WHEN length(COALESCE(p.name, '')) >= 8 THEN 55 ELSE 20 END;
  v_category := CASE WHEN p.category_id IS NOT NULL THEN 90 ELSE 20 END;
  v_variant := CASE
    WHEN EXISTS (SELECT 1 FROM public.catalogue_product_variants v WHERE v.product_id = p.id AND v.is_active) THEN 100
    WHEN COALESCE(p.volume_ml, 0) > 0 THEN 70
    ELSE 35
  END;
  v_image := CASE WHEN COALESCE(p.image_url, '') <> '' THEN 80 ELSE 10 END;
  v_seo := CASE
    WHEN length(COALESCE(p.description, '')) >= 180 AND COALESCE(p.slug, '') <> '' THEN 90
    WHEN length(COALESCE(p.short_description, p.description, '')) >= 60 THEN 65
    ELSE 30
  END;
  v_consistency := CASE
    WHEN COALESCE(p.price, 0) <= 0 THEN 20
    WHEN COALESCE(p.volume_ml, 0) > 15000 THEN 35
    ELSE 85
  END;

  IF COALESCE(p.volume_ml, 0) > 15000 THEN
    v_issues := array_append(v_issues, 'volume_unusual');
  END IF;
  IF v_brand_ref IS NULL THEN
    v_issues := array_append(v_issues, 'brand_to_normalize');
  END IF;
  IF v_taxonomy_ref IS NULL THEN
    v_issues := array_append(v_issues, 'taxonomy_to_confirm');
  END IF;

  v_suggested_attributes := jsonb_build_object(
    'volume_ml', NULLIF(p.volume_ml, 0),
    'alcohol_percentage', NULLIF(p.alcohol_percentage, 0),
    'origin_country', NULLIF(p.origin_country, ''),
    'region', NULLIF(p.region, ''),
    'grape_variety', NULLIF(p.grape_variety, ''),
    'vintage_year', p.vintage_year
  );

  v_quality := round(
    v_completeness * 0.18 +
    v_attribute * 0.16 +
    v_brand * 0.12 +
    v_category * 0.12 +
    v_variant * 0.10 +
    v_image * 0.14 +
    v_seo * 0.10 +
    v_consistency * 0.08,
    2
  );

  INSERT INTO public.catalogue_product_quality_snapshots (
    product_id, vendor_shop_id, vendor_owner_id,
    catalogue_quality_score, completeness_score, attribute_score, brand_score, category_score,
    variant_score, image_score, seo_score, consistency_score,
    missing_attributes, normalization_issues, suggested_attributes,
    suggested_brand_id, suggested_taxonomy_id
  )
  VALUES (
    p.id, v_shop.id, v_shop.owner_id,
    v_quality, v_completeness, v_attribute, v_brand, v_category,
    v_variant, v_image, v_seo, v_consistency,
    COALESCE(v_missing, ARRAY[]::text[]), v_issues, v_suggested_attributes,
    v_brand_ref, v_taxonomy_ref
  )
  RETURNING id INTO v_snapshot_id;

  IF v_brand_ref IS NOT NULL THEN
    INSERT INTO public.catalogue_ai_enrichment_proposals(
      product_id, quality_snapshot_id, vendor_shop_id, vendor_owner_id,
      proposal_type, current_value, proposed_value, confidence_score, explanation
    )
    VALUES (
      p.id, v_snapshot_id, v_shop.id, v_shop.owner_id,
      'brand',
      jsonb_build_object('name', p.name),
      jsonb_build_object('brand_reference_id', v_brand_ref),
      80,
      'Marque rapprochee du referentiel catalogue. Validation requise avant toute publication.'
    );
  END IF;

  IF v_taxonomy_ref IS NOT NULL THEN
    INSERT INTO public.catalogue_ai_enrichment_proposals(
      product_id, quality_snapshot_id, vendor_shop_id, vendor_owner_id,
      proposal_type, current_value, proposed_value, confidence_score, explanation
    )
    VALUES (
      p.id, v_snapshot_id, v_shop.id, v_shop.owner_id,
      'category',
      jsonb_build_object('category_id', p.category_id),
      jsonb_build_object('taxonomy_id', v_taxonomy_ref),
      75,
      'Taxonomie officielle suggeree. Aucune modification automatique de categorie.'
    );
  END IF;

  INSERT INTO public.catalogue_duplicate_candidates(product_id, candidate_product_id, vendor_shop_id, confidence_score, signals, details)
  SELECT
    p.id,
    candidate.id,
    v_shop.id,
    CASE WHEN COALESCE(candidate.sku, '') <> '' AND candidate.sku = p.sku THEN 95 ELSE 72 END,
    ARRAY_REMOVE(ARRAY[
      CASE WHEN COALESCE(candidate.sku, '') <> '' AND candidate.sku = p.sku THEN 'same_sku' END,
      CASE WHEN lower(candidate.name) = lower(p.name) THEN 'same_title' END,
      CASE WHEN candidate.volume_ml IS NOT DISTINCT FROM p.volume_ml THEN 'same_volume' END
    ], NULL),
    jsonb_build_object('candidate_name', candidate.name, 'current_name', p.name)
  FROM public.products candidate
  WHERE candidate.id <> p.id
    AND candidate.vendor_id = p.vendor_id
    AND (
      (COALESCE(candidate.sku, '') <> '' AND candidate.sku = p.sku)
      OR lower(candidate.name) = lower(p.name)
    )
  ON CONFLICT (product_id, candidate_product_id) DO UPDATE
  SET confidence_score = EXCLUDED.confidence_score,
      signals = EXCLUDED.signals,
      details = EXCLUDED.details,
      updated_at = now();

  GET DIAGNOSTICS v_duplicate_count = ROW_COUNT;

  INSERT INTO public.catalogue_intelligence_events(event_type, product_id, vendor_shop_id, actor_id, new_status, explanation, metadata)
  VALUES (
    'product_analyzed',
    p.id,
    v_shop.id,
    auth.uid(),
    'snapshot_created',
    'Catalogue Intelligence Engine a cree un snapshot qualite et des propositions non publiees.',
    jsonb_build_object('snapshot_id', v_snapshot_id, 'quality_score', v_quality, 'duplicate_candidates', v_duplicate_count)
  );

  RETURN jsonb_build_object(
    'snapshot_id', v_snapshot_id,
    'product_id', p.id,
    'catalogue_quality_score', v_quality,
    'missing_attributes', COALESCE(v_missing, ARRAY[]::text[]),
    'normalization_issues', v_issues,
    'duplicate_candidates', v_duplicate_count
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.update_catalogue_enrichment_proposal_status(
  _proposal_id uuid,
  _status text,
  _explanation text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.catalogue_ai_enrichment_proposals%ROWTYPE;
BEGIN
  IF _status NOT IN ('approved', 'rejected', 'archived') THEN
    RAISE EXCEPTION 'catalogue_invalid_proposal_status';
  END IF;

  SELECT * INTO r
  FROM public.catalogue_ai_enrichment_proposals
  WHERE id = _proposal_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'catalogue_proposal_not_found';
  END IF;

  IF r.vendor_owner_id <> auth.uid() AND NOT public.catalogue_intelligence_is_admin() THEN
    RAISE EXCEPTION 'catalogue_permission_denied';
  END IF;

  UPDATE public.catalogue_ai_enrichment_proposals
  SET status = _status,
      reviewed_by = auth.uid(),
      reviewed_at = now()
  WHERE id = r.id;

  INSERT INTO public.catalogue_intelligence_events(
    event_type, product_id, vendor_shop_id, actor_id, previous_status, new_status, explanation, metadata
  )
  VALUES (
    'proposal_status_changed',
    r.product_id,
    r.vendor_shop_id,
    auth.uid(),
    r.status,
    _status,
    COALESCE(_explanation, 'Statut proposition catalogue mis a jour.'),
    jsonb_build_object('proposal_id', r.id, 'proposal_type', r.proposal_type)
  );

  RETURN jsonb_build_object('proposal_id', r.id, 'status', _status);
END;
$$;

CREATE OR REPLACE FUNCTION public.update_catalogue_duplicate_candidate_status(
  _candidate_id uuid,
  _status text,
  _explanation text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.catalogue_duplicate_candidates%ROWTYPE;
BEGIN
  IF NOT public.catalogue_intelligence_is_admin() THEN
    RAISE EXCEPTION 'admin_required';
  END IF;

  IF _status NOT IN ('confirmed_duplicate', 'not_duplicate', 'merged_externally', 'archived') THEN
    RAISE EXCEPTION 'catalogue_invalid_duplicate_status';
  END IF;

  SELECT * INTO r
  FROM public.catalogue_duplicate_candidates
  WHERE id = _candidate_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'catalogue_duplicate_candidate_not_found';
  END IF;

  UPDATE public.catalogue_duplicate_candidates
  SET status = _status,
      reviewed_by = auth.uid(),
      reviewed_at = now()
  WHERE id = r.id;

  INSERT INTO public.catalogue_intelligence_events(
    event_type, product_id, vendor_shop_id, actor_id, previous_status, new_status, explanation, metadata
  )
  VALUES (
    'duplicate_candidate_status_changed',
    r.product_id,
    r.vendor_shop_id,
    auth.uid(),
    r.status,
    _status,
    COALESCE(_explanation, 'Statut doublon potentiel mis a jour sans fusion automatique.'),
    jsonb_build_object('candidate_id', r.id, 'candidate_product_id', r.candidate_product_id)
  );

  RETURN jsonb_build_object('candidate_id', r.id, 'status', _status);
END;
$$;

CREATE OR REPLACE VIEW public.my_catalogue_quality_latest AS
SELECT DISTINCT ON (s.product_id)
  s.*,
  p.name AS product_name,
  p.slug AS product_slug,
  p.image_url AS product_image_url,
  p.price AS product_price
FROM public.catalogue_product_quality_snapshots s
JOIN public.products p ON p.id = s.product_id
WHERE s.vendor_owner_id = auth.uid()
   OR public.catalogue_intelligence_is_admin()
ORDER BY s.product_id, s.analyzed_at DESC;

CREATE OR REPLACE VIEW public.my_catalogue_enrichment_proposals AS
SELECT
  pr.*,
  p.name AS product_name,
  p.image_url AS product_image_url
FROM public.catalogue_ai_enrichment_proposals pr
JOIN public.products p ON p.id = pr.product_id
WHERE pr.vendor_owner_id = auth.uid()
   OR public.catalogue_intelligence_is_admin();

CREATE OR REPLACE VIEW public.admin_catalogue_intelligence_overview AS
SELECT
  vs.id AS vendor_shop_id,
  vs.name AS shop_name,
  vs.owner_id AS vendor_owner_id,
  count(DISTINCT p.id)::integer AS product_count,
  round(COALESCE(avg(latest.catalogue_quality_score), 0), 2) AS average_quality_score,
  count(DISTINCT pr.id) FILTER (WHERE pr.status = 'pending')::integer AS pending_proposals,
  count(DISTINCT dc.id) FILTER (WHERE dc.status = 'candidate')::integer AS duplicate_candidates,
  max(latest.analyzed_at) AS last_analyzed_at
FROM public.vendor_shops vs
LEFT JOIN public.products p ON p.vendor_id = vs.id
LEFT JOIN LATERAL (
  SELECT s.*
  FROM public.catalogue_product_quality_snapshots s
  WHERE s.product_id = p.id
  ORDER BY s.analyzed_at DESC
  LIMIT 1
) latest ON true
LEFT JOIN public.catalogue_ai_enrichment_proposals pr ON pr.vendor_shop_id = vs.id
LEFT JOIN public.catalogue_duplicate_candidates dc ON dc.vendor_shop_id = vs.id
WHERE public.catalogue_intelligence_is_admin()
GROUP BY vs.id, vs.name, vs.owner_id;

CREATE OR REPLACE VIEW public.admin_catalogue_duplicate_candidates AS
SELECT
  dc.*,
  p.name AS product_name,
  cp.name AS candidate_product_name,
  vs.name AS shop_name
FROM public.catalogue_duplicate_candidates dc
JOIN public.products p ON p.id = dc.product_id
JOIN public.products cp ON cp.id = dc.candidate_product_id
LEFT JOIN public.vendor_shops vs ON vs.id = dc.vendor_shop_id
WHERE public.catalogue_intelligence_is_admin();

ALTER TABLE public.catalogue_attribute_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalogue_brand_references ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalogue_category_taxonomy ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalogue_product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalogue_product_quality_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalogue_ai_enrichment_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalogue_duplicate_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalogue_intelligence_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated reads catalogue attribute definitions"
  ON public.catalogue_attribute_definitions FOR SELECT TO authenticated USING (is_active OR public.catalogue_intelligence_is_admin());
CREATE POLICY "Admins manage catalogue attribute definitions"
  ON public.catalogue_attribute_definitions FOR ALL TO authenticated
  USING (public.catalogue_intelligence_is_admin())
  WITH CHECK (public.catalogue_intelligence_is_admin());

CREATE POLICY "Authenticated reads catalogue brand references"
  ON public.catalogue_brand_references FOR SELECT TO authenticated USING (is_active OR public.catalogue_intelligence_is_admin());
CREATE POLICY "Admins manage catalogue brand references"
  ON public.catalogue_brand_references FOR ALL TO authenticated
  USING (public.catalogue_intelligence_is_admin())
  WITH CHECK (public.catalogue_intelligence_is_admin());

CREATE POLICY "Authenticated reads catalogue taxonomy"
  ON public.catalogue_category_taxonomy FOR SELECT TO authenticated USING (is_active OR public.catalogue_intelligence_is_admin());
CREATE POLICY "Admins manage catalogue taxonomy"
  ON public.catalogue_category_taxonomy FOR ALL TO authenticated
  USING (public.catalogue_intelligence_is_admin())
  WITH CHECK (public.catalogue_intelligence_is_admin());

CREATE POLICY "Vendors read own product variants"
  ON public.catalogue_product_variants FOR SELECT TO authenticated
  USING (public.catalogue_intelligence_is_admin() OR public.catalogue_intelligence_owns_product(product_id));
CREATE POLICY "Admins manage catalogue variants"
  ON public.catalogue_product_variants FOR ALL TO authenticated
  USING (public.catalogue_intelligence_is_admin())
  WITH CHECK (public.catalogue_intelligence_is_admin());

CREATE POLICY "Vendors read own catalogue quality snapshots"
  ON public.catalogue_product_quality_snapshots FOR SELECT TO authenticated
  USING (vendor_owner_id = auth.uid() OR public.catalogue_intelligence_is_admin());

CREATE POLICY "Vendors read own catalogue proposals"
  ON public.catalogue_ai_enrichment_proposals FOR SELECT TO authenticated
  USING (vendor_owner_id = auth.uid() OR public.catalogue_intelligence_is_admin());

CREATE POLICY "Vendors read own catalogue duplicate candidates"
  ON public.catalogue_duplicate_candidates FOR SELECT TO authenticated
  USING (
    public.catalogue_intelligence_is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.vendor_shops vs
      WHERE vs.id = catalogue_duplicate_candidates.vendor_shop_id
        AND vs.owner_id = auth.uid()
    )
  );
CREATE POLICY "Admins manage catalogue duplicate candidates"
  ON public.catalogue_duplicate_candidates FOR ALL TO authenticated
  USING (public.catalogue_intelligence_is_admin())
  WITH CHECK (public.catalogue_intelligence_is_admin());

CREATE POLICY "Vendors read own catalogue events"
  ON public.catalogue_intelligence_events FOR SELECT TO authenticated
  USING (
    actor_id = auth.uid()
    OR public.catalogue_intelligence_is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.vendor_shops vs
      WHERE vs.id = catalogue_intelligence_events.vendor_shop_id
        AND vs.owner_id = auth.uid()
    )
  );

GRANT SELECT ON public.catalogue_attribute_definitions TO authenticated;
GRANT SELECT ON public.catalogue_brand_references TO authenticated;
GRANT SELECT ON public.catalogue_category_taxonomy TO authenticated;
GRANT SELECT ON public.catalogue_product_variants TO authenticated;
GRANT SELECT ON public.catalogue_product_quality_snapshots TO authenticated;
GRANT SELECT ON public.catalogue_ai_enrichment_proposals TO authenticated;
GRANT SELECT ON public.catalogue_duplicate_candidates TO authenticated;
GRANT SELECT ON public.catalogue_intelligence_events TO authenticated;
GRANT SELECT ON public.my_catalogue_quality_latest TO authenticated;
GRANT SELECT ON public.my_catalogue_enrichment_proposals TO authenticated;
GRANT SELECT ON public.admin_catalogue_intelligence_overview TO authenticated;
GRANT SELECT ON public.admin_catalogue_duplicate_candidates TO authenticated;
GRANT EXECUTE ON FUNCTION public.analyze_catalogue_product(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_catalogue_enrichment_proposal_status(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_catalogue_duplicate_candidate_status(uuid, text, text) TO authenticated;

GRANT ALL ON public.catalogue_attribute_definitions TO service_role;
GRANT ALL ON public.catalogue_brand_references TO service_role;
GRANT ALL ON public.catalogue_category_taxonomy TO service_role;
GRANT ALL ON public.catalogue_product_variants TO service_role;
GRANT ALL ON public.catalogue_product_quality_snapshots TO service_role;
GRANT ALL ON public.catalogue_ai_enrichment_proposals TO service_role;
GRANT ALL ON public.catalogue_duplicate_candidates TO service_role;
GRANT ALL ON public.catalogue_intelligence_events TO service_role;

NOTIFY pgrst, 'reload schema';
