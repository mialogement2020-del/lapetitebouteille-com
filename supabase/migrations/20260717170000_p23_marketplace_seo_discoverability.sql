-- P2.3 Marketplace SEO & Discoverability Engine.
-- Advisory-only module: no wallet, commission, order, checkout or P0 financial mutation.

ALTER TYPE public.admin_permission ADD VALUE IF NOT EXISTS 'marketplace_seo';

CREATE OR REPLACE FUNCTION public.marketplace_seo_is_admin()
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
        AND ap.permission IN (
          'full_access',
          'marketplace_seo',
          'marketplace_coach',
          'marketplace_image_studio',
          'products'
        )
    ),
    false
  );
$$;

CREATE OR REPLACE FUNCTION public.marketplace_seo_owns_shop(_shop_id uuid)
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

CREATE TABLE IF NOT EXISTS public.marketplace_seo_product_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  vendor_shop_id uuid REFERENCES public.vendor_shops(id) ON DELETE SET NULL,
  vendor_owner_id uuid,
  seo_score numeric NOT NULL DEFAULT 0,
  discoverability_score numeric NOT NULL DEFAULT 0,
  title_score numeric NOT NULL DEFAULT 0,
  description_score numeric NOT NULL DEFAULT 0,
  media_score numeric NOT NULL DEFAULT 0,
  structured_data_score numeric NOT NULL DEFAULT 0,
  category_score numeric NOT NULL DEFAULT 0,
  search_score numeric NOT NULL DEFAULT 0,
  score_breakdown jsonb NOT NULL DEFAULT '{}'::jsonb,
  issues text[] NOT NULL DEFAULT ARRAY[]::text[],
  recommendations jsonb NOT NULL DEFAULT '[]'::jsonb,
  suggested_keywords text[] NOT NULL DEFAULT ARRAY[]::text[],
  duplicate_candidates jsonb NOT NULL DEFAULT '[]'::jsonb,
  engine_version text NOT NULL DEFAULT 'p2.3-seo-v1',
  analyzed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.marketplace_seo_shop_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_shop_id uuid NOT NULL REFERENCES public.vendor_shops(id) ON DELETE CASCADE,
  vendor_owner_id uuid,
  seo_score numeric NOT NULL DEFAULT 0,
  discoverability_score numeric NOT NULL DEFAULT 0,
  product_count integer NOT NULL DEFAULT 0,
  optimized_product_count integer NOT NULL DEFAULT 0,
  score_breakdown jsonb NOT NULL DEFAULT '{}'::jsonb,
  issues text[] NOT NULL DEFAULT ARRAY[]::text[],
  recommendations jsonb NOT NULL DEFAULT '[]'::jsonb,
  engine_version text NOT NULL DEFAULT 'p2.3-seo-v1',
  analyzed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.marketplace_seo_content_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
  vendor_shop_id uuid REFERENCES public.vendor_shops(id) ON DELETE SET NULL,
  vendor_owner_id uuid,
  proposal_type text NOT NULL CHECK (proposal_type IN ('title', 'meta_description', 'slug', 'description', 'keywords', 'image_alt', 'faq', 'shop_meta')),
  current_value jsonb NOT NULL DEFAULT '{}'::jsonb,
  proposed_value jsonb NOT NULL DEFAULT '{}'::jsonb,
  explanation text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'approved', 'rejected', 'applied')),
  created_by uuid DEFAULT auth.uid(),
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.marketplace_seo_proposal_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid REFERENCES public.marketplace_seo_content_proposals(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  vendor_shop_id uuid REFERENCES public.vendor_shops(id) ON DELETE SET NULL,
  vendor_owner_id uuid,
  event_type text NOT NULL,
  previous_status text,
  new_status text,
  explanation text NOT NULL DEFAULT '',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  actor_id uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.marketplace_search_synonyms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_term text NOT NULL,
  synonyms text[] NOT NULL DEFAULT ARRAY[]::text[],
  scope text NOT NULL DEFAULT 'marketplace' CHECK (scope IN ('marketplace', 'category', 'product', 'brand')),
  language text NOT NULL DEFAULT 'fr',
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.marketplace_discoverability_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL CHECK (event_type IN ('impression', 'click', 'search', 'no_result', 'low_relevance', 'product_view', 'shop_view')),
  query text,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  vendor_shop_id uuid REFERENCES public.vendor_shops(id) ON DELETE SET NULL,
  position integer,
  actor_id uuid DEFAULT auth.uid(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.marketplace_duplicate_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  candidate_product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  vendor_shop_id uuid REFERENCES public.vendor_shops(id) ON DELETE SET NULL,
  confidence numeric NOT NULL DEFAULT 0,
  signals jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'ignored', 'merged', 'false_positive')),
  detected_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, candidate_product_id)
);

CREATE INDEX IF NOT EXISTS idx_marketplace_seo_product_scores_product
  ON public.marketplace_seo_product_scores(product_id, analyzed_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_seo_product_scores_vendor
  ON public.marketplace_seo_product_scores(vendor_shop_id, analyzed_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_seo_shop_scores_vendor
  ON public.marketplace_seo_shop_scores(vendor_shop_id, analyzed_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_seo_proposals_vendor
  ON public.marketplace_seo_content_proposals(vendor_shop_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_discoverability_events_vendor
  ON public.marketplace_discoverability_events(vendor_shop_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_search_synonyms_active
  ON public.marketplace_search_synonyms(is_active, scope);
CREATE UNIQUE INDEX IF NOT EXISTS idx_marketplace_search_synonyms_unique_term
  ON public.marketplace_search_synonyms(lower(canonical_term), scope, language);

CREATE OR REPLACE FUNCTION public.marketplace_seo_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.marketplace_seo_history_append_only()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'marketplace_seo_history_append_only';
END;
$$;

DROP TRIGGER IF EXISTS trg_marketplace_seo_scores_append_only ON public.marketplace_seo_product_scores;
CREATE TRIGGER trg_marketplace_seo_scores_append_only
BEFORE UPDATE OR DELETE ON public.marketplace_seo_product_scores
FOR EACH ROW EXECUTE FUNCTION public.marketplace_seo_history_append_only();

DROP TRIGGER IF EXISTS trg_marketplace_seo_shop_scores_append_only ON public.marketplace_seo_shop_scores;
CREATE TRIGGER trg_marketplace_seo_shop_scores_append_only
BEFORE UPDATE OR DELETE ON public.marketplace_seo_shop_scores
FOR EACH ROW EXECUTE FUNCTION public.marketplace_seo_history_append_only();

DROP TRIGGER IF EXISTS trg_marketplace_seo_proposal_events_append_only ON public.marketplace_seo_proposal_events;
CREATE TRIGGER trg_marketplace_seo_proposal_events_append_only
BEFORE UPDATE OR DELETE ON public.marketplace_seo_proposal_events
FOR EACH ROW EXECUTE FUNCTION public.marketplace_seo_history_append_only();

DROP TRIGGER IF EXISTS trg_marketplace_discoverability_events_append_only ON public.marketplace_discoverability_events;
CREATE TRIGGER trg_marketplace_discoverability_events_append_only
BEFORE UPDATE OR DELETE ON public.marketplace_discoverability_events
FOR EACH ROW EXECUTE FUNCTION public.marketplace_seo_history_append_only();

DROP TRIGGER IF EXISTS trg_marketplace_search_synonyms_touch ON public.marketplace_search_synonyms;
CREATE TRIGGER trg_marketplace_search_synonyms_touch
BEFORE UPDATE ON public.marketplace_search_synonyms
FOR EACH ROW EXECUTE FUNCTION public.marketplace_seo_touch_updated_at();

DROP TRIGGER IF EXISTS trg_marketplace_seo_proposals_touch ON public.marketplace_seo_content_proposals;
CREATE TRIGGER trg_marketplace_seo_proposals_touch
BEFORE UPDATE ON public.marketplace_seo_content_proposals
FOR EACH ROW EXECUTE FUNCTION public.marketplace_seo_touch_updated_at();

CREATE OR REPLACE FUNCTION public.calculate_marketplace_product_seo(_product_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p public.products%ROWTYPE;
  v_shop public.vendor_shops%ROWTYPE;
  v_title_score numeric := 0;
  v_description_score numeric := 0;
  v_media_score numeric := 0;
  v_structured_score numeric := 0;
  v_category_score numeric := 0;
  v_search_score numeric := 0;
  v_seo_score numeric := 0;
  v_discoverability_score numeric := 0;
  v_issues text[] := ARRAY[]::text[];
  v_recommendations jsonb := '[]'::jsonb;
  v_duplicate_candidates jsonb := '[]'::jsonb;
  v_keywords text[] := ARRAY[]::text[];
  v_score_id uuid;
BEGIN
  SELECT * INTO p
  FROM public.products
  WHERE id = _product_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'marketplace_seo_product_not_found';
  END IF;

  IF p.vendor_id IS NULL THEN
    RAISE EXCEPTION 'marketplace_seo_product_not_marketplace';
  END IF;

  SELECT * INTO v_shop
  FROM public.vendor_shops
  WHERE id = p.vendor_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'marketplace_seo_shop_not_found';
  END IF;

  IF v_shop.owner_id <> auth.uid() AND NOT public.marketplace_seo_is_admin() THEN
    RAISE EXCEPTION 'marketplace_seo_permission_denied';
  END IF;

  v_title_score := CASE
    WHEN length(coalesce(p.name, '')) BETWEEN 18 AND 70 THEN 100
    WHEN length(coalesce(p.name, '')) >= 8 THEN 70
    ELSE 30
  END;

  v_description_score := CASE
    WHEN length(coalesce(p.description, '')) >= 240 THEN 100
    WHEN length(coalesce(p.description, '')) >= 120 THEN 75
    WHEN length(coalesce(p.short_description, '')) >= 60 THEN 55
    ELSE 20
  END;

  v_media_score := CASE
    WHEN coalesce(p.image_url, '') <> '' AND coalesce(array_length(p.gallery_urls, 1), 0) >= 2 THEN 100
    WHEN coalesce(p.image_url, '') <> '' THEN 75
    ELSE 10
  END;

  v_structured_score := (
    CASE WHEN coalesce(p.slug, '') <> '' THEN 25 ELSE 0 END
    + CASE WHEN coalesce(p.price, 0) > 0 THEN 25 ELSE 0 END
    + CASE WHEN p.stock_quantity IS NOT NULL THEN 20 ELSE 0 END
    + CASE WHEN coalesce(p.volume_ml, 0) > 0 OR coalesce(p.origin_country, '') <> '' THEN 15 ELSE 0 END
    + CASE WHEN coalesce(p.alcohol_percentage, 0) > 0 OR coalesce(p.grape_variety, '') <> '' THEN 15 ELSE 0 END
  );

  v_category_score := CASE WHEN p.category_id IS NOT NULL THEN 100 ELSE 30 END;
  v_search_score := LEAST(100, (
    CASE WHEN coalesce(p.name, '') <> '' THEN 25 ELSE 0 END
    + CASE WHEN coalesce(p.description, '') <> '' OR coalesce(p.short_description, '') <> '' THEN 25 ELSE 0 END
    + CASE WHEN coalesce(p.origin_country, '') <> '' THEN 15 ELSE 0 END
    + CASE WHEN coalesce(p.region, '') <> '' THEN 15 ELSE 0 END
    + CASE WHEN coalesce(p.grape_variety, '') <> '' THEN 10 ELSE 0 END
    + CASE WHEN coalesce(p.sku, '') <> '' THEN 10 ELSE 0 END
  ));

  IF v_title_score < 80 THEN
    v_issues := array_append(v_issues, 'title_to_optimize');
    v_recommendations := v_recommendations || jsonb_build_array(jsonb_build_object(
      'type', 'title',
      'priority', 'high',
      'message', 'Créer un titre précis avec produit, format et caractéristique clé.'
    ));
  END IF;

  IF v_description_score < 75 THEN
    v_issues := array_append(v_issues, 'description_too_short');
    v_recommendations := v_recommendations || jsonb_build_array(jsonb_build_object(
      'type', 'description',
      'priority', 'high',
      'message', 'Ajouter origine, usage, profil gustatif et contexte d achat.'
    ));
  END IF;

  IF v_media_score < 75 THEN
    v_issues := array_append(v_issues, 'image_missing_or_incomplete');
  END IF;

  IF p.category_id IS NULL THEN
    v_issues := array_append(v_issues, 'missing_category');
  END IF;

  IF NOT coalesce(p.is_active, false) THEN
    v_issues := array_append(v_issues, 'product_not_public');
  END IF;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'product_id', candidate.id,
    'name', candidate.name,
    'confidence', 70,
    'signals', ARRAY['similar_title', 'same_vendor']
  )), '[]'::jsonb)
  INTO v_duplicate_candidates
  FROM public.products candidate
  WHERE candidate.id <> p.id
    AND candidate.vendor_id = p.vendor_id
    AND lower(candidate.name) = lower(p.name)
  LIMIT 5;

  v_keywords := ARRAY_REMOVE(ARRAY[
    nullif(split_part(lower(coalesce(p.name, '')), ' ', 1), ''),
    nullif(lower(coalesce(p.origin_country, '')), ''),
    nullif(lower(coalesce(p.region, '')), ''),
    nullif(lower(coalesce(p.grape_variety, '')), '')
  ], NULL);

  v_seo_score := round((v_title_score * 0.18) + (v_description_score * 0.22) + (v_media_score * 0.15) + (v_structured_score * 0.2) + (v_category_score * 0.1) + (v_search_score * 0.15), 2);
  v_discoverability_score := round((v_seo_score * 0.55) + (CASE WHEN coalesce(p.is_active, false) THEN 20 ELSE 0 END) + (CASE WHEN coalesce(p.stock_quantity, 0) > 0 THEN 15 ELSE 0 END) + (CASE WHEN v_shop.is_active THEN 10 ELSE 0 END), 2);

  INSERT INTO public.marketplace_seo_product_scores(
    product_id, vendor_shop_id, vendor_owner_id, seo_score, discoverability_score,
    title_score, description_score, media_score, structured_data_score, category_score, search_score,
    score_breakdown, issues, recommendations, suggested_keywords, duplicate_candidates
  )
  VALUES (
    p.id, v_shop.id, v_shop.owner_id, v_seo_score, LEAST(100, v_discoverability_score),
    v_title_score, v_description_score, v_media_score, v_structured_score, v_category_score, v_search_score,
    jsonb_build_object(
      'title', v_title_score,
      'description', v_description_score,
      'media', v_media_score,
      'structured_data', v_structured_score,
      'category', v_category_score,
      'search', v_search_score,
      'data_used', ARRAY['products public fields', 'vendor_shops public fields']
    ),
    v_issues,
    v_recommendations,
    v_keywords,
    v_duplicate_candidates
  )
  RETURNING id INTO v_score_id;

  RETURN jsonb_build_object(
    'score_id', v_score_id,
    'product_id', p.id,
    'seo_score', v_seo_score,
    'discoverability_score', LEAST(100, v_discoverability_score),
    'issues', v_issues,
    'recommendations', v_recommendations
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_marketplace_seo_product_proposals(_product_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p public.products%ROWTYPE;
  v_shop public.vendor_shops%ROWTYPE;
  v_base_title text;
  v_meta text;
  v_created integer := 0;
BEGIN
  SELECT * INTO p FROM public.products WHERE id = _product_id;
  IF NOT FOUND OR p.vendor_id IS NULL THEN
    RAISE EXCEPTION 'marketplace_seo_product_not_found';
  END IF;

  SELECT * INTO v_shop FROM public.vendor_shops WHERE id = p.vendor_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'marketplace_seo_shop_not_found';
  END IF;

  IF v_shop.owner_id <> auth.uid() AND NOT public.marketplace_seo_is_admin() THEN
    RAISE EXCEPTION 'marketplace_seo_permission_denied';
  END IF;

  v_base_title := trim(concat_ws(' ', p.name, nullif(p.volume_ml::text || 'ml', 'ml'), nullif(p.origin_country, '')));
  v_meta := left(trim(concat_ws(' ', 'Achetez', p.name, 'chez', v_shop.name, 'sur La Petite Bouteille. Livraison au Cameroun, fiche vendeur vérifiée et disponibilité Marketplace.')), 158);

  INSERT INTO public.marketplace_seo_content_proposals(product_id, vendor_shop_id, vendor_owner_id, proposal_type, current_value, proposed_value, explanation)
  VALUES
    (p.id, v_shop.id, v_shop.owner_id, 'title', jsonb_build_object('value', p.name), jsonb_build_object('value', v_base_title), 'Titre enrichi avec format, origine ou contexte public.'),
    (p.id, v_shop.id, v_shop.owner_id, 'meta_description', jsonb_build_object('value', coalesce(p.short_description, p.description, '')), jsonb_build_object('value', v_meta), 'Meta description lisible par Google et réseaux sociaux.'),
    (p.id, v_shop.id, v_shop.owner_id, 'image_alt', jsonb_build_object('value', p.name), jsonb_build_object('value', concat(p.name, ' - ', v_shop.name)), 'Alt texte public décrivant le produit sans données privées.')
  ON CONFLICT DO NOTHING;

  GET DIAGNOSTICS v_created = ROW_COUNT;

  INSERT INTO public.marketplace_seo_proposal_events(product_id, vendor_shop_id, vendor_owner_id, event_type, new_status, explanation, metadata)
  VALUES (p.id, v_shop.id, v_shop.owner_id, 'proposals_generated', 'draft', 'Propositions SEO créées sans publication automatique.', jsonb_build_object('created_rows', v_created));

  RETURN jsonb_build_object('product_id', p.id, 'created_rows', v_created);
END;
$$;

CREATE OR REPLACE FUNCTION public.calculate_marketplace_shop_seo(_vendor_shop_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_shop public.vendor_shops%ROWTYPE;
  v_product_count integer := 0;
  v_optimized_product_count integer := 0;
  v_avg_seo numeric := 0;
  v_shop_profile_score numeric := 0;
  v_seo_score numeric := 0;
  v_discoverability_score numeric := 0;
  v_issues text[] := ARRAY[]::text[];
  v_recommendations jsonb := '[]'::jsonb;
  v_score_id uuid;
BEGIN
  IF _vendor_shop_id IS NULL THEN
    SELECT * INTO v_shop
    FROM public.vendor_shops
    WHERE owner_id = auth.uid()
    ORDER BY created_at ASC
    LIMIT 1;
  ELSE
    SELECT * INTO v_shop
    FROM public.vendor_shops
    WHERE id = _vendor_shop_id;
  END IF;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'marketplace_seo_shop_not_found';
  END IF;

  IF v_shop.owner_id <> auth.uid() AND NOT public.marketplace_seo_is_admin() THEN
    RAISE EXCEPTION 'marketplace_seo_permission_denied';
  END IF;

  SELECT count(*)::integer
  INTO v_product_count
  FROM public.products p
  WHERE p.vendor_id = v_shop.id
    AND coalesce(p.is_active, false) = true;

  SELECT
    coalesce(avg(s.seo_score), 0),
    count(*) FILTER (WHERE s.seo_score >= 80)::integer
  INTO v_avg_seo, v_optimized_product_count
  FROM (
    SELECT DISTINCT ON (product_id) product_id, seo_score
    FROM public.marketplace_seo_product_scores
    WHERE vendor_shop_id = v_shop.id
    ORDER BY product_id, analyzed_at DESC
  ) s;

  v_shop_profile_score := (
    CASE WHEN length(coalesce(v_shop.name, '')) >= 4 THEN 20 ELSE 0 END
    + CASE WHEN length(coalesce(v_shop.description, '')) >= 80 THEN 25 ELSE 0 END
    + CASE WHEN coalesce(v_shop.logo_url, '') <> '' THEN 15 ELSE 0 END
    + CASE WHEN coalesce(v_shop.banner_url, '') <> '' THEN 15 ELSE 0 END
    + CASE WHEN coalesce(v_shop.city, '') <> '' THEN 10 ELSE 0 END
    + CASE WHEN coalesce(v_shop.contact_phone, '') <> '' OR coalesce(v_shop.contact_email, '') <> '' THEN 10 ELSE 0 END
    + CASE WHEN v_shop.is_verified THEN 5 ELSE 0 END
  );

  IF v_product_count = 0 THEN
    v_issues := array_append(v_issues, 'no_public_product');
  END IF;
  IF v_shop_profile_score < 70 THEN
    v_issues := array_append(v_issues, 'shop_profile_incomplete');
    v_recommendations := v_recommendations || jsonb_build_array(jsonb_build_object(
      'type', 'shop_profile',
      'priority', 'high',
      'message', 'Compléter description, logo, bannière, ville et contact public.'
    ));
  END IF;
  IF v_avg_seo < 70 AND v_product_count > 0 THEN
    v_issues := array_append(v_issues, 'products_need_seo_analysis');
  END IF;

  v_seo_score := round((v_shop_profile_score * 0.45) + (v_avg_seo * 0.55), 2);
  v_discoverability_score := round((v_seo_score * 0.7) + LEAST(20, v_product_count * 2) + CASE WHEN v_shop.is_active THEN 10 ELSE 0 END, 2);

  INSERT INTO public.marketplace_seo_shop_scores(
    vendor_shop_id, vendor_owner_id, seo_score, discoverability_score, product_count, optimized_product_count,
    score_breakdown, issues, recommendations
  )
  VALUES (
    v_shop.id, v_shop.owner_id, LEAST(100, v_seo_score), LEAST(100, v_discoverability_score), v_product_count, v_optimized_product_count,
    jsonb_build_object(
      'shop_profile', v_shop_profile_score,
      'average_product_seo', v_avg_seo,
      'public_product_count', v_product_count,
      'data_used', ARRAY['vendor_shops public fields', 'latest marketplace_seo_product_scores']
    ),
    v_issues,
    v_recommendations
  )
  RETURNING id INTO v_score_id;

  RETURN jsonb_build_object(
    'score_id', v_score_id,
    'vendor_shop_id', v_shop.id,
    'seo_score', LEAST(100, v_seo_score),
    'discoverability_score', LEAST(100, v_discoverability_score),
    'issues', v_issues
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.update_marketplace_seo_proposal_status(
  _proposal_id uuid,
  _status text,
  _explanation text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.marketplace_seo_content_proposals%ROWTYPE;
BEGIN
  IF _status NOT IN ('draft', 'pending', 'approved', 'rejected', 'applied') THEN
    RAISE EXCEPTION 'marketplace_seo_invalid_status';
  END IF;

  SELECT * INTO r
  FROM public.marketplace_seo_content_proposals
  WHERE id = _proposal_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'marketplace_seo_proposal_not_found';
  END IF;

  IF r.vendor_owner_id <> auth.uid() AND NOT public.marketplace_seo_is_admin() THEN
    RAISE EXCEPTION 'marketplace_seo_permission_denied';
  END IF;

  UPDATE public.marketplace_seo_content_proposals
  SET status = _status,
      reviewed_by = CASE WHEN public.marketplace_seo_is_admin() THEN auth.uid() ELSE reviewed_by END,
      reviewed_at = CASE WHEN public.marketplace_seo_is_admin() THEN now() ELSE reviewed_at END
  WHERE id = r.id;

  INSERT INTO public.marketplace_seo_proposal_events(
    proposal_id, product_id, vendor_shop_id, vendor_owner_id, event_type, previous_status, new_status, explanation
  )
  VALUES (r.id, r.product_id, r.vendor_shop_id, r.vendor_owner_id, 'status_changed', r.status, _status, _explanation);

  RETURN jsonb_build_object('proposal_id', r.id, 'status', _status);
END;
$$;

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
BEGIN
  INSERT INTO public.marketplace_discoverability_events(event_type, query, product_id, vendor_shop_id, position, actor_id, metadata)
  VALUES (_event_type, _query, _product_id, _vendor_shop_id, _position, auth.uid(), COALESCE(_metadata, '{}'::jsonb))
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE VIEW public.my_marketplace_seo_product_scores AS
SELECT
  s.*,
  p.name AS product_name,
  p.slug AS product_slug,
  p.image_url AS product_image_url,
  p.price AS product_price,
  p.stock_quantity AS product_stock_quantity
FROM public.marketplace_seo_product_scores s
JOIN public.products p ON p.id = s.product_id
WHERE s.vendor_owner_id = auth.uid()
   OR public.marketplace_seo_is_admin();

CREATE OR REPLACE VIEW public.my_marketplace_seo_latest_products AS
SELECT DISTINCT ON (s.product_id)
  s.*,
  p.name AS product_name,
  p.slug AS product_slug,
  p.image_url AS product_image_url,
  p.price AS product_price,
  p.stock_quantity AS product_stock_quantity
FROM public.marketplace_seo_product_scores s
JOIN public.products p ON p.id = s.product_id
WHERE s.vendor_owner_id = auth.uid()
   OR public.marketplace_seo_is_admin()
ORDER BY s.product_id, s.analyzed_at DESC;

CREATE OR REPLACE VIEW public.my_marketplace_seo_shop_score AS
SELECT DISTINCT ON (s.vendor_shop_id)
  s.*,
  vs.name AS shop_name,
  vs.slug AS shop_slug
FROM public.marketplace_seo_shop_scores s
JOIN public.vendor_shops vs ON vs.id = s.vendor_shop_id
WHERE s.vendor_owner_id = auth.uid()
   OR public.marketplace_seo_is_admin()
ORDER BY s.vendor_shop_id, s.analyzed_at DESC;

CREATE OR REPLACE VIEW public.my_marketplace_seo_proposals AS
SELECT
  pr.*,
  p.name AS product_name,
  p.slug AS product_slug,
  p.image_url AS product_image_url,
  vs.name AS shop_name
FROM public.marketplace_seo_content_proposals pr
LEFT JOIN public.products p ON p.id = pr.product_id
LEFT JOIN public.vendor_shops vs ON vs.id = pr.vendor_shop_id
WHERE pr.vendor_owner_id = auth.uid()
   OR public.marketplace_seo_is_admin();

CREATE OR REPLACE VIEW public.admin_marketplace_seo_overview AS
SELECT
  s.vendor_shop_id,
  vs.name AS shop_name,
  vs.owner_id AS vendor_owner_id,
  s.seo_score,
  s.discoverability_score,
  s.product_count,
  s.optimized_product_count,
  s.issues,
  s.recommendations,
  s.analyzed_at,
  COALESCE(open_proposals.open_proposals, 0)::integer AS open_proposals
FROM public.marketplace_seo_shop_scores s
JOIN public.vendor_shops vs ON vs.id = s.vendor_shop_id
LEFT JOIN LATERAL (
  SELECT count(*) AS open_proposals
  FROM public.marketplace_seo_content_proposals pr
  WHERE pr.vendor_shop_id = s.vendor_shop_id
    AND pr.status IN ('draft', 'pending')
) open_proposals ON true
WHERE public.marketplace_seo_is_admin();

CREATE OR REPLACE VIEW public.admin_marketplace_seo_issues AS
SELECT DISTINCT ON (s.product_id)
  s.product_id,
  p.name AS product_name,
  p.slug AS product_slug,
  vs.name AS shop_name,
  s.vendor_shop_id,
  s.seo_score,
  s.discoverability_score,
  s.issues,
  s.recommendations,
  s.analyzed_at
FROM public.marketplace_seo_product_scores s
JOIN public.products p ON p.id = s.product_id
JOIN public.vendor_shops vs ON vs.id = s.vendor_shop_id
WHERE public.marketplace_seo_is_admin()
ORDER BY s.product_id, s.analyzed_at DESC;

CREATE OR REPLACE VIEW public.public_marketplace_sitemap_entries AS
SELECT
  'shop'::text AS entry_type,
  concat('/boutique/', vs.slug) AS path,
  vs.updated_at AS updated_at,
  0.7::numeric AS priority
FROM public.vendor_shops vs
WHERE vs.is_active = true
  AND coalesce(vs.slug, '') <> ''
UNION ALL
SELECT
  'product'::text AS entry_type,
  concat('/produit/', p.slug) AS path,
  p.updated_at AS updated_at,
  0.8::numeric AS priority
FROM public.products p
JOIN public.vendor_shops vs ON vs.id = p.vendor_id
WHERE coalesce(p.is_active, false) = true
  AND vs.is_active = true
  AND coalesce(p.slug, '') <> '';

ALTER TABLE public.marketplace_seo_product_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_seo_shop_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_seo_content_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_seo_proposal_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_search_synonyms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_discoverability_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_duplicate_candidates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Vendors view own marketplace seo product scores" ON public.marketplace_seo_product_scores;
CREATE POLICY "Vendors view own marketplace seo product scores"
  ON public.marketplace_seo_product_scores FOR SELECT TO authenticated
  USING (vendor_owner_id = auth.uid() OR public.marketplace_seo_is_admin());

DROP POLICY IF EXISTS "Vendors insert own marketplace seo product scores" ON public.marketplace_seo_product_scores;
CREATE POLICY "Vendors insert own marketplace seo product scores"
  ON public.marketplace_seo_product_scores FOR INSERT TO authenticated
  WITH CHECK (vendor_owner_id = auth.uid() OR public.marketplace_seo_is_admin());

DROP POLICY IF EXISTS "Vendors view own marketplace seo shop scores" ON public.marketplace_seo_shop_scores;
CREATE POLICY "Vendors view own marketplace seo shop scores"
  ON public.marketplace_seo_shop_scores FOR SELECT TO authenticated
  USING (vendor_owner_id = auth.uid() OR public.marketplace_seo_is_admin());

DROP POLICY IF EXISTS "Vendors insert own marketplace seo shop scores" ON public.marketplace_seo_shop_scores;
CREATE POLICY "Vendors insert own marketplace seo shop scores"
  ON public.marketplace_seo_shop_scores FOR INSERT TO authenticated
  WITH CHECK (vendor_owner_id = auth.uid() OR public.marketplace_seo_is_admin());

DROP POLICY IF EXISTS "Vendors view own marketplace seo proposals" ON public.marketplace_seo_content_proposals;
CREATE POLICY "Vendors view own marketplace seo proposals"
  ON public.marketplace_seo_content_proposals FOR SELECT TO authenticated
  USING (vendor_owner_id = auth.uid() OR public.marketplace_seo_is_admin());

DROP POLICY IF EXISTS "Vendors update own marketplace seo proposal status" ON public.marketplace_seo_content_proposals;
CREATE POLICY "Vendors update own marketplace seo proposal status"
  ON public.marketplace_seo_content_proposals FOR UPDATE TO authenticated
  USING (vendor_owner_id = auth.uid() OR public.marketplace_seo_is_admin())
  WITH CHECK (vendor_owner_id = auth.uid() OR public.marketplace_seo_is_admin());

DROP POLICY IF EXISTS "Admins insert marketplace seo proposals" ON public.marketplace_seo_content_proposals;
CREATE POLICY "Admins insert marketplace seo proposals"
  ON public.marketplace_seo_content_proposals FOR INSERT TO authenticated
  WITH CHECK (vendor_owner_id = auth.uid() OR public.marketplace_seo_is_admin());

DROP POLICY IF EXISTS "Vendors view own marketplace seo proposal events" ON public.marketplace_seo_proposal_events;
CREATE POLICY "Vendors view own marketplace seo proposal events"
  ON public.marketplace_seo_proposal_events FOR SELECT TO authenticated
  USING (vendor_owner_id = auth.uid() OR public.marketplace_seo_is_admin());

DROP POLICY IF EXISTS "Authenticated insert marketplace seo proposal events" ON public.marketplace_seo_proposal_events;
CREATE POLICY "Authenticated insert marketplace seo proposal events"
  ON public.marketplace_seo_proposal_events FOR INSERT TO authenticated
  WITH CHECK (vendor_owner_id = auth.uid() OR public.marketplace_seo_is_admin());

DROP POLICY IF EXISTS "Everyone reads active marketplace synonyms" ON public.marketplace_search_synonyms;
CREATE POLICY "Everyone reads active marketplace synonyms"
  ON public.marketplace_search_synonyms FOR SELECT TO anon, authenticated
  USING (is_active = true OR public.marketplace_seo_is_admin());

DROP POLICY IF EXISTS "Admins manage marketplace synonyms" ON public.marketplace_search_synonyms;
CREATE POLICY "Admins manage marketplace synonyms"
  ON public.marketplace_search_synonyms FOR ALL TO authenticated
  USING (public.marketplace_seo_is_admin())
  WITH CHECK (public.marketplace_seo_is_admin());

DROP POLICY IF EXISTS "Authenticated records discoverability events" ON public.marketplace_discoverability_events;
CREATE POLICY "Authenticated records discoverability events"
  ON public.marketplace_discoverability_events FOR INSERT TO authenticated
  WITH CHECK (actor_id = auth.uid() OR public.marketplace_seo_is_admin());

DROP POLICY IF EXISTS "Vendors view own discoverability events" ON public.marketplace_discoverability_events;
CREATE POLICY "Vendors view own discoverability events"
  ON public.marketplace_discoverability_events FOR SELECT TO authenticated
  USING (
    public.marketplace_seo_is_admin()
    OR EXISTS (
      SELECT 1 FROM public.vendor_shops vs
      WHERE vs.id = marketplace_discoverability_events.vendor_shop_id
        AND vs.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Vendors view own duplicate candidates" ON public.marketplace_duplicate_candidates;
CREATE POLICY "Vendors view own duplicate candidates"
  ON public.marketplace_duplicate_candidates FOR SELECT TO authenticated
  USING (public.marketplace_seo_is_admin() OR public.marketplace_seo_owns_shop(vendor_shop_id));

DROP POLICY IF EXISTS "Admins manage duplicate candidates" ON public.marketplace_duplicate_candidates;
CREATE POLICY "Admins manage duplicate candidates"
  ON public.marketplace_duplicate_candidates FOR ALL TO authenticated
  USING (public.marketplace_seo_is_admin())
  WITH CHECK (public.marketplace_seo_is_admin());

GRANT EXECUTE ON FUNCTION public.calculate_marketplace_product_seo(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_marketplace_seo_product_proposals(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_marketplace_shop_seo(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_marketplace_seo_proposal_status(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_marketplace_discoverability_event(text, text, uuid, uuid, integer, jsonb) TO authenticated;

GRANT SELECT ON public.my_marketplace_seo_product_scores TO authenticated;
GRANT SELECT ON public.my_marketplace_seo_latest_products TO authenticated;
GRANT SELECT ON public.my_marketplace_seo_shop_score TO authenticated;
GRANT SELECT ON public.my_marketplace_seo_proposals TO authenticated;
GRANT SELECT ON public.admin_marketplace_seo_overview TO authenticated;
GRANT SELECT ON public.admin_marketplace_seo_issues TO authenticated;
GRANT SELECT ON public.public_marketplace_sitemap_entries TO anon, authenticated;
GRANT SELECT ON public.marketplace_search_synonyms TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.marketplace_search_synonyms TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON public.marketplace_seo_content_proposals TO authenticated, service_role;
GRANT SELECT, INSERT ON public.marketplace_seo_product_scores TO authenticated, service_role;
GRANT SELECT, INSERT ON public.marketplace_seo_shop_scores TO authenticated, service_role;
GRANT SELECT, INSERT ON public.marketplace_seo_proposal_events TO authenticated, service_role;
GRANT SELECT, INSERT ON public.marketplace_discoverability_events TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON public.marketplace_duplicate_candidates TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
