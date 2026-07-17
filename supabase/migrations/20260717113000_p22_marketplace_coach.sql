-- P2.2 - Coach IA Marketplace.
-- Advisory marketplace intelligence only: never mutates wallets, commissions, orders, Revenue Engine or P0 finance tables.

ALTER TYPE public.admin_permission ADD VALUE IF NOT EXISTS 'marketplace_coach';

CREATE OR REPLACE FUNCTION public.marketplace_coach_is_admin()
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
          'marketplace_coach',
          'marketplace_image_studio',
          'business_scores',
          'products'
        )
    );
$$;

CREATE OR REPLACE FUNCTION public.marketplace_coach_owns_shop(_shop_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.vendor_shops vs
    WHERE vs.id = _shop_id
      AND vs.owner_id = auth.uid()
  );
$$;

CREATE TABLE IF NOT EXISTS public.marketplace_coach_product_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  vendor_shop_id uuid REFERENCES public.vendor_shops(id) ON DELETE SET NULL,
  vendor_owner_id uuid,
  title_score numeric NOT NULL DEFAULT 0 CHECK (title_score BETWEEN 0 AND 100),
  description_score numeric NOT NULL DEFAULT 0 CHECK (description_score BETWEEN 0 AND 100),
  image_score numeric NOT NULL DEFAULT 0 CHECK (image_score BETWEEN 0 AND 100),
  seo_score numeric NOT NULL DEFAULT 0 CHECK (seo_score BETWEEN 0 AND 100),
  completeness_score numeric NOT NULL DEFAULT 0 CHECK (completeness_score BETWEEN 0 AND 100),
  stock_score numeric NOT NULL DEFAULT 0 CHECK (stock_score BETWEEN 0 AND 100),
  compliance_score numeric NOT NULL DEFAULT 0 CHECK (compliance_score BETWEEN 0 AND 100),
  global_score numeric NOT NULL DEFAULT 0 CHECK (global_score BETWEEN 0 AND 100),
  strengths text[] NOT NULL DEFAULT '{}',
  weaknesses text[] NOT NULL DEFAULT '{}',
  opportunities text[] NOT NULL DEFAULT '{}',
  issues text[] NOT NULL DEFAULT '{}',
  suggested_title text,
  suggested_description text,
  suggested_keywords text[] NOT NULL DEFAULT '{}',
  explanation jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_context jsonb NOT NULL DEFAULT '{}'::jsonb,
  analysis_version text NOT NULL DEFAULT 'p2.2-marketplace-coach-v1',
  rule_version text NOT NULL DEFAULT '2026-07-17',
  analyzed_by uuid DEFAULT auth.uid(),
  analyzed_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.marketplace_coach_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
  analysis_id uuid REFERENCES public.marketplace_coach_product_analyses(id) ON DELETE SET NULL,
  vendor_shop_id uuid REFERENCES public.vendor_shops(id) ON DELETE SET NULL,
  vendor_owner_id uuid,
  recommendation_type text NOT NULL CHECK (recommendation_type IN (
    'title',
    'description',
    'image',
    'seo',
    'category',
    'pricing',
    'stock',
    'seasonal',
    'compliance',
    'conversion',
    'marketplace'
  )),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  title text NOT NULL,
  description text NOT NULL,
  justification text NOT NULL,
  expected_impact jsonb NOT NULL DEFAULT '{}'::jsonb,
  suggested_action jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'accepted', 'completed', 'dismissed')),
  due_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.marketplace_coach_shop_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_shop_id uuid NOT NULL REFERENCES public.vendor_shops(id) ON DELETE CASCADE,
  vendor_owner_id uuid NOT NULL,
  shop_score numeric NOT NULL DEFAULT 0 CHECK (shop_score BETWEEN 0 AND 100),
  product_quality_score numeric NOT NULL DEFAULT 0 CHECK (product_quality_score BETWEEN 0 AND 100),
  image_quality_score numeric NOT NULL DEFAULT 0 CHECK (image_quality_score BETWEEN 0 AND 100),
  seo_score numeric NOT NULL DEFAULT 0 CHECK (seo_score BETWEEN 0 AND 100),
  completeness_score numeric NOT NULL DEFAULT 0 CHECK (completeness_score BETWEEN 0 AND 100),
  conversion_score numeric NOT NULL DEFAULT 0 CHECK (conversion_score BETWEEN 0 AND 100),
  strengths text[] NOT NULL DEFAULT '{}',
  weaknesses text[] NOT NULL DEFAULT '{}',
  opportunities text[] NOT NULL DEFAULT '{}',
  products_to_optimize jsonb NOT NULL DEFAULT '[]'::jsonb,
  performing_products jsonb NOT NULL DEFAULT '[]'::jsonb,
  low_visibility_products jsonb NOT NULL DEFAULT '[]'::jsonb,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_context jsonb NOT NULL DEFAULT '{}'::jsonb,
  snapshot_version text NOT NULL DEFAULT 'p2.2-marketplace-coach-v1',
  calculated_by uuid DEFAULT auth.uid(),
  calculated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.marketplace_coach_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_shop_id uuid REFERENCES public.vendor_shops(id) ON DELETE SET NULL,
  vendor_owner_id uuid,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  event_type text NOT NULL CHECK (event_type IN (
    'product_analyzed',
    'shop_snapshot_created',
    'recommendation_created',
    'recommendation_status_changed',
    'admin_reviewed'
  )),
  actor_id uuid DEFAULT auth.uid(),
  title text NOT NULL,
  explanation text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_marketplace_coach_product_analyses_product
  ON public.marketplace_coach_product_analyses(product_id, analyzed_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_coach_product_analyses_vendor
  ON public.marketplace_coach_product_analyses(vendor_shop_id, analyzed_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_coach_recommendations_vendor
  ON public.marketplace_coach_recommendations(vendor_shop_id, status, priority);
CREATE INDEX IF NOT EXISTS idx_marketplace_coach_shop_snapshots_vendor
  ON public.marketplace_coach_shop_snapshots(vendor_shop_id, calculated_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_coach_events_vendor
  ON public.marketplace_coach_events(vendor_shop_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.marketplace_coach_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.marketplace_coach_history_is_append_only()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'marketplace_coach_history_append_only';
END;
$$;

DROP TRIGGER IF EXISTS trg_marketplace_coach_recommendations_touch ON public.marketplace_coach_recommendations;
CREATE TRIGGER trg_marketplace_coach_recommendations_touch
BEFORE UPDATE ON public.marketplace_coach_recommendations
FOR EACH ROW EXECUTE FUNCTION public.marketplace_coach_touch_updated_at();

DROP TRIGGER IF EXISTS trg_marketplace_coach_product_analyses_append_only ON public.marketplace_coach_product_analyses;
CREATE TRIGGER trg_marketplace_coach_product_analyses_append_only
BEFORE UPDATE OR DELETE ON public.marketplace_coach_product_analyses
FOR EACH ROW EXECUTE FUNCTION public.marketplace_coach_history_is_append_only();

DROP TRIGGER IF EXISTS trg_marketplace_coach_shop_snapshots_append_only ON public.marketplace_coach_shop_snapshots;
CREATE TRIGGER trg_marketplace_coach_shop_snapshots_append_only
BEFORE UPDATE OR DELETE ON public.marketplace_coach_shop_snapshots
FOR EACH ROW EXECUTE FUNCTION public.marketplace_coach_history_is_append_only();

DROP TRIGGER IF EXISTS trg_marketplace_coach_events_append_only ON public.marketplace_coach_events;
CREATE TRIGGER trg_marketplace_coach_events_append_only
BEFORE UPDATE OR DELETE ON public.marketplace_coach_events
FOR EACH ROW EXECUTE FUNCTION public.marketplace_coach_history_is_append_only();

CREATE OR REPLACE FUNCTION public.analyze_marketplace_product(_product_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p public.products%ROWTYPE;
  v_shop public.vendor_shops%ROWTYPE;
  v_image_score numeric := 0;
  v_title_score numeric := 0;
  v_description_score numeric := 0;
  v_seo_score numeric := 0;
  v_completeness_score numeric := 0;
  v_stock_score numeric := 0;
  v_compliance_score numeric := 0;
  v_global_score numeric := 0;
  v_latest_image_score numeric;
  v_views_30d integer := 0;
  v_reviews_count integer := 0;
  v_avg_rating numeric := 0;
  v_strengths text[] := '{}';
  v_weaknesses text[] := '{}';
  v_opportunities text[] := '{}';
  v_issues text[] := '{}';
  v_keywords text[] := '{}';
  v_analysis_id uuid;
  v_priority text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'auth_required';
  END IF;

  SELECT * INTO p
  FROM public.products
  WHERE id = _product_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'product_not_found';
  END IF;

  IF p.vendor_id IS NULL THEN
    RAISE EXCEPTION 'marketplace_product_required';
  END IF;

  SELECT * INTO v_shop
  FROM public.vendor_shops
  WHERE id = p.vendor_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'vendor_shop_not_found';
  END IF;

  IF v_shop.owner_id <> auth.uid() AND NOT public.marketplace_coach_is_admin() THEN
    RAISE EXCEPTION 'marketplace_coach_permission_denied';
  END IF;

  SELECT compliance_score INTO v_latest_image_score
  FROM public.marketplace_image_studio_jobs
  WHERE product_id = p.id
    AND compliance_score IS NOT NULL
  ORDER BY updated_at DESC
  LIMIT 1;

  SELECT count(*)::integer INTO v_views_30d
  FROM public.analytics_events e
  WHERE e.occurred_at >= now() - interval '30 days'
    AND (
      e.properties->>'product_id' = p.id::text
      OR e.path ILIKE '%' || p.slug || '%'
    );

  SELECT count(*)::integer, COALESCE(avg(rating), 0)
  INTO v_reviews_count, v_avg_rating
  FROM public.reviews
  WHERE product_id = p.id
    AND is_approved = true;

  v_title_score :=
    CASE
      WHEN length(trim(p.name)) BETWEEN 18 AND 80 THEN 90
      WHEN length(trim(p.name)) BETWEEN 8 AND 120 THEN 70
      ELSE 35
    END;

  v_description_score :=
    CASE
      WHEN COALESCE(length(trim(p.description)), 0) >= 250 THEN 95
      WHEN COALESCE(length(trim(p.description)), 0) >= 120 THEN 75
      WHEN COALESCE(length(trim(p.short_description)), 0) >= 60 THEN 55
      ELSE 25
    END;

  v_image_score :=
    COALESCE(v_latest_image_score,
      CASE
        WHEN p.image_url IS NOT NULL AND p.image_url <> '' AND p.moderation_status = 'approved' THEN 80
        WHEN p.image_url IS NOT NULL AND p.image_url <> '' THEN 55
        ELSE 10
      END
    );

  v_seo_score :=
    LEAST(100,
      (CASE WHEN p.slug IS NOT NULL AND p.slug <> '' THEN 20 ELSE 0 END) +
      (CASE WHEN p.short_description IS NOT NULL AND length(p.short_description) >= 50 THEN 20 ELSE 0 END) +
      (CASE WHEN p.description IS NOT NULL AND length(p.description) >= 180 THEN 25 ELSE 0 END) +
      (CASE WHEN p.category_id IS NOT NULL THEN 15 ELSE 0 END) +
      (CASE WHEN p.region IS NOT NULL OR p.origin_country IS NOT NULL THEN 10 ELSE 0 END) +
      (CASE WHEN p.tasting_notes IS NOT NULL OR p.food_pairing IS NOT NULL THEN 10 ELSE 0 END)
    );

  v_completeness_score :=
    LEAST(100,
      (CASE WHEN p.name IS NOT NULL AND p.name <> '' THEN 10 ELSE 0 END) +
      (CASE WHEN p.price > 0 THEN 10 ELSE 0 END) +
      (CASE WHEN p.category_id IS NOT NULL THEN 10 ELSE 0 END) +
      (CASE WHEN p.image_url IS NOT NULL AND p.image_url <> '' THEN 15 ELSE 0 END) +
      (CASE WHEN p.description IS NOT NULL AND length(p.description) >= 120 THEN 15 ELSE 0 END) +
      (CASE WHEN p.volume_ml IS NOT NULL THEN 10 ELSE 0 END) +
      (CASE WHEN p.origin_country IS NOT NULL THEN 10 ELSE 0 END) +
      (CASE WHEN p.tasting_notes IS NOT NULL THEN 10 ELSE 0 END) +
      (CASE WHEN p.food_pairing IS NOT NULL THEN 10 ELSE 0 END)
    );

  v_stock_score :=
    CASE
      WHEN COALESCE(p.stock_quantity, 0) > COALESCE(p.low_stock_threshold, 5) THEN 90
      WHEN COALESCE(p.stock_quantity, 0) > 0 THEN 55
      ELSE 5
    END;

  v_compliance_score :=
    CASE
      WHEN p.moderation_status = 'approved' THEN 90
      WHEN p.moderation_status = 'flagged' THEN 40
      WHEN p.moderation_status = 'rejected' THEN 5
      ELSE 60
    END;

  v_global_score := round((
    v_title_score * 0.12 +
    v_description_score * 0.18 +
    v_image_score * 0.20 +
    v_seo_score * 0.18 +
    v_completeness_score * 0.16 +
    v_stock_score * 0.08 +
    v_compliance_score * 0.08
  ), 2);

  IF v_title_score >= 80 THEN v_strengths := array_append(v_strengths, 'titre_clair'); ELSE v_weaknesses := array_append(v_weaknesses, 'titre_a_optimiser'); END IF;
  IF v_description_score >= 80 THEN v_strengths := array_append(v_strengths, 'description_riche'); ELSE v_issues := array_append(v_issues, 'description_insuffisante'); END IF;
  IF v_image_score >= 90 THEN v_strengths := array_append(v_strengths, 'image_conforme_lpb'); ELSE v_issues := array_append(v_issues, 'image_a_revoir'); END IF;
  IF v_seo_score < 70 THEN v_opportunities := array_append(v_opportunities, 'seo_marketplace'); END IF;
  IF v_stock_score < 60 THEN v_issues := array_append(v_issues, 'stock_faible_ou_indisponible'); END IF;
  IF v_views_30d = 0 THEN v_opportunities := array_append(v_opportunities, 'visibilite_faible'); END IF;

  v_keywords := ARRAY[
    lower(regexp_replace(p.name, '[^a-zA-Z0-9]+', ' ', 'g')),
    COALESCE(lower(p.origin_country), ''),
    COALESCE(lower(p.region), '')
  ];

  INSERT INTO public.marketplace_coach_product_analyses (
    product_id, vendor_shop_id, vendor_owner_id,
    title_score, description_score, image_score, seo_score, completeness_score,
    stock_score, compliance_score, global_score,
    strengths, weaknesses, opportunities, issues,
    suggested_title, suggested_description, suggested_keywords,
    explanation, source_context
  )
  VALUES (
    p.id, v_shop.id, v_shop.owner_id,
    v_title_score, v_description_score, v_image_score, v_seo_score, v_completeness_score,
    v_stock_score, v_compliance_score, v_global_score,
    v_strengths, v_weaknesses, v_opportunities, v_issues,
    CASE WHEN v_title_score < 70 THEN initcap(p.name) || ' - selection LPB' ELSE NULL END,
    CASE WHEN v_description_score < 75 THEN 'Enrichir la fiche avec origine, profil de gout, conseils de service, accord mets et moments de consommation.' ELSE NULL END,
    v_keywords,
    jsonb_build_object(
      'data_used', ARRAY['products', 'reviews', 'analytics_events', 'marketplace_image_studio_jobs'],
      'rules_applied', ARRAY['title_length', 'description_depth', 'image_compliance', 'seo_completeness', 'stock_availability', 'marketplace_compliance'],
      'why', 'Le Coach IA Marketplace mesure la capacite de la fiche a rassurer, etre trouvee et convertir sans modifier la fiche automatiquement.'
    ),
    jsonb_build_object(
      'views_30d', v_views_30d,
      'review_count', v_reviews_count,
      'average_rating', v_avg_rating,
      'latest_image_score', v_latest_image_score,
      'moderation_status', p.moderation_status
    )
  )
  RETURNING id INTO v_analysis_id;

  v_priority := CASE WHEN v_global_score < 50 THEN 'critical' WHEN v_global_score < 70 THEN 'high' WHEN v_global_score < 85 THEN 'medium' ELSE 'low' END;

  IF v_title_score < 70 THEN
    INSERT INTO public.marketplace_coach_recommendations(product_id, analysis_id, vendor_shop_id, vendor_owner_id, recommendation_type, priority, title, description, justification, expected_impact, suggested_action)
    VALUES (p.id, v_analysis_id, v_shop.id, v_shop.owner_id, 'title', v_priority, 'Optimiser le titre produit', 'Rendre le titre plus clair, plus vendeur et plus recherchable.', 'Le score titre est inferieur au seuil qualite Marketplace.', jsonb_build_object('seo', 'medium', 'conversion', 'medium'), jsonb_build_object('suggested_title', initcap(p.name) || ' - selection LPB'));
  END IF;

  IF v_description_score < 75 THEN
    INSERT INTO public.marketplace_coach_recommendations(product_id, analysis_id, vendor_shop_id, vendor_owner_id, recommendation_type, priority, title, description, justification, expected_impact, suggested_action)
    VALUES (p.id, v_analysis_id, v_shop.id, v_shop.owner_id, 'description', v_priority, 'Enrichir la description', 'Ajouter origine, notes, contexte d achat, accords et informations techniques.', 'Une fiche detaillee augmente la confiance et reduit les questions avant achat.', jsonb_build_object('conversion', 'high', 'support', 'medium'), jsonb_build_object('sections', ARRAY['origine', 'profil', 'accords', 'service', 'occasion']));
  END IF;

  IF v_image_score < 90 THEN
    INSERT INTO public.marketplace_coach_recommendations(product_id, analysis_id, vendor_shop_id, vendor_owner_id, recommendation_type, priority, title, description, justification, expected_impact, suggested_action)
    VALUES (p.id, v_analysis_id, v_shop.id, v_shop.owner_id, 'image', v_priority, 'Remplacer ou retraiter l image', 'Soumettre une image au Studio Image Marketplace LPB.', 'Le score image est trop faible pour garantir une presentation premium et uniforme.', jsonb_build_object('trust', 'high', 'catalogue_quality', 'high'), jsonb_build_object('tool', 'marketplace_image_studio'));
  END IF;

  IF v_seo_score < 70 THEN
    INSERT INTO public.marketplace_coach_recommendations(product_id, analysis_id, vendor_shop_id, vendor_owner_id, recommendation_type, priority, title, description, justification, expected_impact, suggested_action)
    VALUES (p.id, v_analysis_id, v_shop.id, v_shop.owner_id, 'seo', v_priority, 'Optimiser les mots-cles', 'Completer categorie, pays, region, notes et mots-cles utiles.', 'Une fiche mieux structuree ressort mieux dans le catalogue et les futures recherches Marketplace.', jsonb_build_object('visibility', 'high'), jsonb_build_object('keywords', v_keywords));
  END IF;

  IF v_stock_score < 60 THEN
    INSERT INTO public.marketplace_coach_recommendations(product_id, analysis_id, vendor_shop_id, vendor_owner_id, recommendation_type, priority, title, description, justification, expected_impact, suggested_action)
    VALUES (p.id, v_analysis_id, v_shop.id, v_shop.owner_id, 'stock', 'high', 'Corriger la disponibilite stock', 'Mettre a jour le stock ou desactiver temporairement le produit.', 'Un produit visible mais indisponible degrade la confiance et la conversion.', jsonb_build_object('trust', 'high', 'conversion', 'medium'), jsonb_build_object('current_stock', p.stock_quantity));
  END IF;

  INSERT INTO public.marketplace_coach_events(vendor_shop_id, vendor_owner_id, product_id, event_type, title, explanation, metadata)
  VALUES (v_shop.id, v_shop.owner_id, p.id, 'product_analyzed', 'Fiche produit analysee', 'Le Coach IA Marketplace a cree une analyse et des recommandations justifiees.', jsonb_build_object('analysis_id', v_analysis_id, 'global_score', v_global_score));

  RETURN jsonb_build_object(
    'analysis_id', v_analysis_id,
    'product_id', p.id,
    'global_score', v_global_score,
    'title_score', v_title_score,
    'description_score', v_description_score,
    'image_score', v_image_score,
    'seo_score', v_seo_score,
    'completeness_score', v_completeness_score,
    'stock_score', v_stock_score,
    'compliance_score', v_compliance_score,
    'issues', v_issues,
    'opportunities', v_opportunities
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_marketplace_coach_shop_snapshot(_vendor_shop_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_shop public.vendor_shops%ROWTYPE;
  v_total_products integer := 0;
  v_active_products integer := 0;
  v_avg_product_quality numeric := 0;
  v_avg_image_quality numeric := 0;
  v_avg_seo numeric := 0;
  v_avg_completeness numeric := 0;
  v_conversion_score numeric := 0;
  v_shop_score numeric := 0;
  v_open_recommendations integer := 0;
  v_snapshot_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'auth_required';
  END IF;

  IF _vendor_shop_id IS NULL THEN
    SELECT * INTO v_shop
    FROM public.vendor_shops
    WHERE owner_id = auth.uid()
    LIMIT 1;
  ELSE
    SELECT * INTO v_shop
    FROM public.vendor_shops
    WHERE id = _vendor_shop_id;
  END IF;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'vendor_shop_not_found';
  END IF;

  IF v_shop.owner_id <> auth.uid() AND NOT public.marketplace_coach_is_admin() THEN
    RAISE EXCEPTION 'marketplace_coach_permission_denied';
  END IF;

  SELECT count(*)::integer,
         count(*) FILTER (WHERE is_active = true)::integer
  INTO v_total_products, v_active_products
  FROM public.products
  WHERE vendor_id = v_shop.id;

  SELECT
    COALESCE(avg(global_score), 0),
    COALESCE(avg(image_score), 0),
    COALESCE(avg(seo_score), 0),
    COALESCE(avg(completeness_score), 0)
  INTO v_avg_product_quality, v_avg_image_quality, v_avg_seo, v_avg_completeness
  FROM (
    SELECT DISTINCT ON (a.product_id) a.*
    FROM public.marketplace_coach_product_analyses a
    WHERE a.vendor_shop_id = v_shop.id
    ORDER BY a.product_id, a.analyzed_at DESC
  ) latest;

  SELECT count(*)::integer INTO v_open_recommendations
  FROM public.marketplace_coach_recommendations
  WHERE vendor_shop_id = v_shop.id
    AND status = 'open';

  v_conversion_score := CASE
    WHEN v_total_products = 0 THEN 0
    WHEN v_open_recommendations = 0 THEN 90
    ELSE GREATEST(20, 90 - LEAST(60, v_open_recommendations * 4))
  END;

  v_shop_score := round((
    v_avg_product_quality * 0.32 +
    v_avg_image_quality * 0.22 +
    v_avg_seo * 0.18 +
    v_avg_completeness * 0.18 +
    v_conversion_score * 0.10
  ), 2);

  INSERT INTO public.marketplace_coach_shop_snapshots(
    vendor_shop_id, vendor_owner_id, shop_score, product_quality_score, image_quality_score,
    seo_score, completeness_score, conversion_score,
    strengths, weaknesses, opportunities,
    products_to_optimize, performing_products, low_visibility_products,
    metrics, source_context
  )
  VALUES (
    v_shop.id,
    v_shop.owner_id,
    v_shop_score,
    round(v_avg_product_quality, 2),
    round(v_avg_image_quality, 2),
    round(v_avg_seo, 2),
    round(v_avg_completeness, 2),
    round(v_conversion_score, 2),
    CASE WHEN v_avg_image_quality >= 85 THEN ARRAY['images_conformes'] ELSE '{}'::text[] END,
    ARRAY_REMOVE(ARRAY[
      CASE WHEN v_avg_product_quality < 70 THEN 'qualite_fiches_a_ameliorer' END,
      CASE WHEN v_avg_image_quality < 75 THEN 'images_a_normaliser' END,
      CASE WHEN v_avg_seo < 70 THEN 'seo_marketplace_faible' END,
      CASE WHEN v_open_recommendations > 10 THEN 'trop_de_recommandations_ouvertes' END
    ], NULL),
    ARRAY_REMOVE(ARRAY[
      CASE WHEN v_active_products < v_total_products THEN 'reactiver_ou_corriger_produits_inactifs' END,
      CASE WHEN v_open_recommendations > 0 THEN 'traiter_recommandations_prioritaires' END
    ], NULL),
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object('product_id', product_id, 'score', global_score, 'issues', issues))
      FROM (
        SELECT DISTINCT ON (product_id) product_id, global_score, issues
        FROM public.marketplace_coach_product_analyses
        WHERE vendor_shop_id = v_shop.id
        ORDER BY product_id, analyzed_at DESC
      ) x
      WHERE global_score < 70
      LIMIT 12
    ), '[]'::jsonb),
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object('product_id', product_id, 'score', global_score))
      FROM (
        SELECT DISTINCT ON (product_id) product_id, global_score
        FROM public.marketplace_coach_product_analyses
        WHERE vendor_shop_id = v_shop.id
        ORDER BY product_id, analyzed_at DESC
      ) x
      WHERE global_score >= 85
      LIMIT 12
    ), '[]'::jsonb),
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object('product_id', product_id, 'opportunities', opportunities))
      FROM (
        SELECT DISTINCT ON (product_id) product_id, opportunities
        FROM public.marketplace_coach_product_analyses
        WHERE vendor_shop_id = v_shop.id
        ORDER BY product_id, analyzed_at DESC
      ) x
      WHERE 'visibilite_faible' = ANY(opportunities)
      LIMIT 12
    ), '[]'::jsonb),
    jsonb_build_object(
      'total_products', v_total_products,
      'active_products', v_active_products,
      'open_recommendations', v_open_recommendations
    ),
    jsonb_build_object('sources', ARRAY['products', 'marketplace_coach_product_analyses', 'marketplace_coach_recommendations'])
  )
  RETURNING id INTO v_snapshot_id;

  INSERT INTO public.marketplace_coach_events(vendor_shop_id, vendor_owner_id, event_type, title, explanation, metadata)
  VALUES (v_shop.id, v_shop.owner_id, 'shop_snapshot_created', 'Snapshot boutique Marketplace cree', 'Le Coach IA Marketplace a consolide la qualite boutique sans effet financier.', jsonb_build_object('snapshot_id', v_snapshot_id, 'shop_score', v_shop_score));

  RETURN jsonb_build_object('snapshot_id', v_snapshot_id, 'vendor_shop_id', v_shop.id, 'shop_score', v_shop_score, 'open_recommendations', v_open_recommendations);
END;
$$;

CREATE OR REPLACE FUNCTION public.update_marketplace_coach_recommendation_status(
  _recommendation_id uuid,
  _status text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.marketplace_coach_recommendations%ROWTYPE;
BEGIN
  IF _status NOT IN ('open', 'accepted', 'completed', 'dismissed') THEN
    RAISE EXCEPTION 'invalid_recommendation_status';
  END IF;

  SELECT * INTO r
  FROM public.marketplace_coach_recommendations
  WHERE id = _recommendation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'recommendation_not_found';
  END IF;

  IF r.vendor_owner_id <> auth.uid() AND NOT public.marketplace_coach_is_admin() THEN
    RAISE EXCEPTION 'marketplace_coach_permission_denied';
  END IF;

  UPDATE public.marketplace_coach_recommendations
  SET status = _status
  WHERE id = _recommendation_id;

  INSERT INTO public.marketplace_coach_events(vendor_shop_id, vendor_owner_id, product_id, event_type, title, explanation, metadata)
  VALUES (r.vendor_shop_id, r.vendor_owner_id, r.product_id, 'recommendation_status_changed', 'Statut recommandation modifie', 'Le vendeur ou admin a mis a jour le suivi de la recommandation.', jsonb_build_object('recommendation_id', r.id, 'status', _status));

  RETURN jsonb_build_object('recommendation_id', _recommendation_id, 'status', _status);
END;
$$;

CREATE OR REPLACE VIEW public.my_marketplace_coach_dashboard AS
SELECT DISTINCT ON (s.vendor_shop_id)
  s.*,
  vs.shop_name,
  vs.slug AS shop_slug
FROM public.marketplace_coach_shop_snapshots s
JOIN public.vendor_shops vs ON vs.id = s.vendor_shop_id
WHERE vs.owner_id = auth.uid()
   OR public.marketplace_coach_is_admin()
ORDER BY s.vendor_shop_id, s.calculated_at DESC;

CREATE OR REPLACE VIEW public.my_marketplace_coach_recommendations AS
SELECT
  r.*,
  p.name AS product_name,
  p.slug AS product_slug,
  p.image_url AS product_image_url
FROM public.marketplace_coach_recommendations r
LEFT JOIN public.products p ON p.id = r.product_id
WHERE r.vendor_owner_id = auth.uid()
   OR public.marketplace_coach_is_admin();

CREATE OR REPLACE VIEW public.my_marketplace_coach_product_analyses AS
SELECT
  a.*,
  p.name AS product_name,
  p.slug AS product_slug,
  p.image_url AS product_image_url
FROM public.marketplace_coach_product_analyses a
JOIN public.products p ON p.id = a.product_id
WHERE a.vendor_owner_id = auth.uid()
   OR public.marketplace_coach_is_admin();

CREATE OR REPLACE VIEW public.admin_marketplace_coach_overview AS
SELECT
  s.vendor_shop_id,
  vs.shop_name,
  vs.owner_id AS vendor_owner_id,
  s.shop_score,
  s.product_quality_score,
  s.image_quality_score,
  s.seo_score,
  s.completeness_score,
  s.conversion_score,
  s.weaknesses,
  s.opportunities,
  s.metrics,
  s.calculated_at,
  COALESCE(open_rec.open_recommendations, 0) AS open_recommendations
FROM public.marketplace_coach_shop_snapshots s
JOIN public.vendor_shops vs ON vs.id = s.vendor_shop_id
LEFT JOIN LATERAL (
  SELECT count(*)::integer AS open_recommendations
  FROM public.marketplace_coach_recommendations r
  WHERE r.vendor_shop_id = s.vendor_shop_id
    AND r.status = 'open'
) open_rec ON true
WHERE public.marketplace_coach_is_admin();

ALTER TABLE public.marketplace_coach_product_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_coach_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_coach_shop_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_coach_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Vendors view own marketplace coach analyses" ON public.marketplace_coach_product_analyses;
CREATE POLICY "Vendors view own marketplace coach analyses"
  ON public.marketplace_coach_product_analyses
  FOR SELECT TO authenticated
  USING (vendor_owner_id = auth.uid() OR public.marketplace_coach_is_admin());

DROP POLICY IF EXISTS "Vendors create own marketplace coach analyses" ON public.marketplace_coach_product_analyses;
CREATE POLICY "Vendors create own marketplace coach analyses"
  ON public.marketplace_coach_product_analyses
  FOR INSERT TO authenticated
  WITH CHECK (vendor_owner_id = auth.uid() OR public.marketplace_coach_is_admin());

DROP POLICY IF EXISTS "Vendors view own marketplace coach recommendations" ON public.marketplace_coach_recommendations;
CREATE POLICY "Vendors view own marketplace coach recommendations"
  ON public.marketplace_coach_recommendations
  FOR SELECT TO authenticated
  USING (vendor_owner_id = auth.uid() OR public.marketplace_coach_is_admin());

DROP POLICY IF EXISTS "Vendors update own marketplace coach recommendation status" ON public.marketplace_coach_recommendations;
CREATE POLICY "Vendors update own marketplace coach recommendation status"
  ON public.marketplace_coach_recommendations
  FOR UPDATE TO authenticated
  USING (vendor_owner_id = auth.uid() OR public.marketplace_coach_is_admin())
  WITH CHECK (vendor_owner_id = auth.uid() OR public.marketplace_coach_is_admin());

DROP POLICY IF EXISTS "Admins insert marketplace coach recommendations" ON public.marketplace_coach_recommendations;
CREATE POLICY "Admins insert marketplace coach recommendations"
  ON public.marketplace_coach_recommendations
  FOR INSERT TO authenticated
  WITH CHECK (public.marketplace_coach_is_admin());

DROP POLICY IF EXISTS "Vendors view own marketplace coach snapshots" ON public.marketplace_coach_shop_snapshots;
CREATE POLICY "Vendors view own marketplace coach snapshots"
  ON public.marketplace_coach_shop_snapshots
  FOR SELECT TO authenticated
  USING (vendor_owner_id = auth.uid() OR public.marketplace_coach_is_admin());

DROP POLICY IF EXISTS "Vendors create own marketplace coach snapshots" ON public.marketplace_coach_shop_snapshots;
CREATE POLICY "Vendors create own marketplace coach snapshots"
  ON public.marketplace_coach_shop_snapshots
  FOR INSERT TO authenticated
  WITH CHECK (vendor_owner_id = auth.uid() OR public.marketplace_coach_is_admin());

DROP POLICY IF EXISTS "Vendors view own marketplace coach events" ON public.marketplace_coach_events;
CREATE POLICY "Vendors view own marketplace coach events"
  ON public.marketplace_coach_events
  FOR SELECT TO authenticated
  USING (vendor_owner_id = auth.uid() OR actor_id = auth.uid() OR public.marketplace_coach_is_admin());

DROP POLICY IF EXISTS "Vendors insert own marketplace coach events" ON public.marketplace_coach_events;
CREATE POLICY "Vendors insert own marketplace coach events"
  ON public.marketplace_coach_events
  FOR INSERT TO authenticated
  WITH CHECK (vendor_owner_id = auth.uid() OR public.marketplace_coach_is_admin());

GRANT SELECT, INSERT ON public.marketplace_coach_product_analyses TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.marketplace_coach_recommendations TO authenticated;
GRANT SELECT, INSERT ON public.marketplace_coach_shop_snapshots TO authenticated;
GRANT SELECT, INSERT ON public.marketplace_coach_events TO authenticated;
GRANT SELECT ON public.my_marketplace_coach_dashboard TO authenticated;
GRANT SELECT ON public.my_marketplace_coach_recommendations TO authenticated;
GRANT SELECT ON public.my_marketplace_coach_product_analyses TO authenticated;
GRANT SELECT ON public.admin_marketplace_coach_overview TO authenticated;
GRANT EXECUTE ON FUNCTION public.analyze_marketplace_product(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_marketplace_coach_shop_snapshot(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_marketplace_coach_recommendation_status(uuid, text) TO authenticated;
GRANT ALL ON public.marketplace_coach_product_analyses TO service_role;
GRANT ALL ON public.marketplace_coach_recommendations TO service_role;
GRANT ALL ON public.marketplace_coach_shop_snapshots TO service_role;
GRANT ALL ON public.marketplace_coach_events TO service_role;

NOTIFY pgrst, 'reload schema';
