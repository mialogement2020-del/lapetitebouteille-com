-- P3.4 AI Moderation & Compliance Engine.
-- Decision-support only: no content deletion, no automatic suspension and no P0 mutation.
-- The engine detects, scores, explains and queues human moderation.

CREATE OR REPLACE FUNCTION public.marketplace_compliance_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.marketplace_governance_is_admin();
$$;

CREATE OR REPLACE FUNCTION public.marketplace_compliance_owns_shop(_shop_id uuid)
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

INSERT INTO public.marketplace_governance_case_types(code, label, description, default_priority, source_modules)
VALUES
  (
    'compliance_review',
    'Revue conformite Marketplace',
    'Signalement de conformite genere par le moteur P3.4, decision humaine requise.',
    'high',
    ARRAY['marketplace_compliance', 'marketplace_governance', 'workflow']
  )
ON CONFLICT (code) DO UPDATE
SET label = EXCLUDED.label,
    description = EXCLUDED.description,
    default_priority = EXCLUDED.default_priority,
    source_modules = EXCLUDED.source_modules,
    is_active = true;

CREATE TABLE IF NOT EXISTS public.marketplace_compliance_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text NOT NULL,
  category text NOT NULL CHECK (category IN ('catalogue', 'image', 'seo', 'marketplace', 'legal', 'fraud', 'quality')),
  severity text NOT NULL DEFAULT 'normal' CHECK (severity IN ('critical', 'high', 'normal', 'low')),
  priority integer NOT NULL DEFAULT 100,
  version text NOT NULL DEFAULT 'p3.4-v1',
  is_active boolean NOT NULL DEFAULT true,
  rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  remediation_actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.marketplace_compliance_findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  finding_number text NOT NULL UNIQUE DEFAULT (
    'MC-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(gen_random_uuid()::text, 1, 8))
  ),
  policy_id uuid NOT NULL REFERENCES public.marketplace_compliance_policies(id) ON DELETE RESTRICT,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  vendor_shop_id uuid REFERENCES public.vendor_shops(id) ON DELETE SET NULL,
  vendor_owner_id uuid,
  governance_case_id uuid REFERENCES public.marketplace_governance_cases(id) ON DELETE SET NULL,
  source_module text NOT NULL DEFAULT 'marketplace_compliance',
  source_ref_id uuid,
  queue_status text NOT NULL DEFAULT 'to_review' CHECK (queue_status IN (
    'to_review',
    'to_fix',
    'to_complete',
    'to_validate',
    'compliant',
    'rejection_proposed',
    'archived'
  )),
  severity text NOT NULL DEFAULT 'normal' CHECK (severity IN ('critical', 'high', 'normal', 'low')),
  confidence_score numeric NOT NULL DEFAULT 0 CHECK (confidence_score BETWEEN 0 AND 100),
  compliance_score numeric NOT NULL DEFAULT 0 CHECK (compliance_score BETWEEN 0 AND 100),
  title text NOT NULL,
  justification text NOT NULL,
  analyzed_elements jsonb NOT NULL DEFAULT '{}'::jsonb,
  estimated_impact jsonb NOT NULL DEFAULT '{}'::jsonb,
  recommended_actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  detection_hash text NOT NULL,
  engine_version text NOT NULL DEFAULT 'p3.4-compliance-v1',
  rule_version text NOT NULL DEFAULT 'p3.4-rules-v1',
  final_decision text,
  decided_by uuid,
  decided_at timestamptz,
  resolution_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE(product_id, policy_id, detection_hash)
);

CREATE TABLE IF NOT EXISTS public.marketplace_compliance_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  vendor_shop_id uuid REFERENCES public.vendor_shops(id) ON DELETE SET NULL,
  vendor_owner_id uuid,
  catalogue_compliance_score numeric NOT NULL DEFAULT 0 CHECK (catalogue_compliance_score BETWEEN 0 AND 100),
  image_compliance_score numeric NOT NULL DEFAULT 0 CHECK (image_compliance_score BETWEEN 0 AND 100),
  seo_compliance_score numeric NOT NULL DEFAULT 0 CHECK (seo_compliance_score BETWEEN 0 AND 100),
  marketplace_compliance_score numeric NOT NULL DEFAULT 0 CHECK (marketplace_compliance_score BETWEEN 0 AND 100),
  global_compliance_score numeric NOT NULL DEFAULT 0 CHECK (global_compliance_score BETWEEN 0 AND 100),
  findings_count integer NOT NULL DEFAULT 0,
  critical_findings_count integer NOT NULL DEFAULT 0,
  high_findings_count integer NOT NULL DEFAULT 0,
  queue_status text NOT NULL DEFAULT 'to_review',
  explanation text NOT NULL,
  signals jsonb NOT NULL DEFAULT '{}'::jsonb,
  engine_version text NOT NULL DEFAULT 'p3.4-compliance-v1',
  calculated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.marketplace_compliance_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  finding_id uuid REFERENCES public.marketplace_compliance_findings(id) ON DELETE SET NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  vendor_shop_id uuid REFERENCES public.vendor_shops(id) ON DELETE SET NULL,
  actor_id uuid DEFAULT auth.uid(),
  actor_type text NOT NULL DEFAULT 'system' CHECK (actor_type IN ('system', 'ai', 'admin', 'vendor')),
  event_type text NOT NULL CHECK (event_type IN (
    'detected',
    'analyzed',
    'proposed',
    'status_changed',
    'admin_decision',
    'vendor_response',
    'resolved',
    'archived',
    'scan_completed'
  )),
  previous_status text,
  new_status text,
  explanation text NOT NULL,
  data_used jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_marketplace_compliance_policies_active
  ON public.marketplace_compliance_policies(category, is_active, priority);
CREATE INDEX IF NOT EXISTS idx_marketplace_compliance_findings_queue
  ON public.marketplace_compliance_findings(queue_status, severity, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_compliance_findings_product
  ON public.marketplace_compliance_findings(product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_compliance_findings_vendor
  ON public.marketplace_compliance_findings(vendor_shop_id, queue_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_compliance_scores_product
  ON public.marketplace_compliance_scores(product_id, calculated_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_compliance_scores_vendor
  ON public.marketplace_compliance_scores(vendor_shop_id, calculated_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_compliance_events_finding
  ON public.marketplace_compliance_events(finding_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.marketplace_compliance_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.marketplace_compliance_events_append_only()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'marketplace_compliance_history_is_append_only';
END;
$$;

DROP TRIGGER IF EXISTS trg_marketplace_compliance_policies_touch ON public.marketplace_compliance_policies;
CREATE TRIGGER trg_marketplace_compliance_policies_touch
  BEFORE UPDATE ON public.marketplace_compliance_policies
  FOR EACH ROW EXECUTE FUNCTION public.marketplace_compliance_touch_updated_at();

DROP TRIGGER IF EXISTS trg_marketplace_compliance_findings_touch ON public.marketplace_compliance_findings;
CREATE TRIGGER trg_marketplace_compliance_findings_touch
  BEFORE UPDATE ON public.marketplace_compliance_findings
  FOR EACH ROW EXECUTE FUNCTION public.marketplace_compliance_touch_updated_at();

DROP TRIGGER IF EXISTS trg_marketplace_compliance_events_append_only_update ON public.marketplace_compliance_events;
CREATE TRIGGER trg_marketplace_compliance_events_append_only_update
  BEFORE UPDATE ON public.marketplace_compliance_events
  FOR EACH ROW EXECUTE FUNCTION public.marketplace_compliance_events_append_only();

DROP TRIGGER IF EXISTS trg_marketplace_compliance_events_append_only_delete ON public.marketplace_compliance_events;
CREATE TRIGGER trg_marketplace_compliance_events_append_only_delete
  BEFORE DELETE ON public.marketplace_compliance_events
  FOR EACH ROW EXECUTE FUNCTION public.marketplace_compliance_events_append_only();

INSERT INTO public.marketplace_compliance_policies(code, name, description, category, severity, priority, rules, remediation_actions)
VALUES
  ('short_description', 'Description trop courte', 'La description ne donne pas assez d information pour vendre et moderer le produit.', 'catalogue', 'normal', 100, '{"min_description_length":80}'::jsonb, '["Completer la description", "Ajouter origine, format et conseils"]'::jsonb),
  ('duplicate_description', 'Description dupliquee', 'Plusieurs produits utilisent une description quasi identique.', 'catalogue', 'normal', 110, '{}'::jsonb, '["Reecrire la description", "Verifier les variantes"]'::jsonb),
  ('missing_required_information', 'Informations obligatoires manquantes', 'Volume, categorie, image ou attributs essentiels absents.', 'marketplace', 'high', 80, '{}'::jsonb, '["Completer les champs obligatoires", "Demander une correction vendeur"]'::jsonb),
  ('image_quality_low', 'Image non conforme', 'Image absente, faible qualite ou non validee par le Studio Image.', 'image', 'high', 70, '{"min_image_score":75}'::jsonb, '["Relancer le Studio Image", "Demander une nouvelle image"]'::jsonb),
  ('duplicate_image', 'Image en double', 'La meme image publique semble utilisee sur plusieurs produits.', 'image', 'normal', 120, '{}'::jsonb, '["Verifier les doublons", "Corriger image produit"]'::jsonb),
  ('external_contact_or_link', 'Lien externe ou contact interdit', 'Le contenu contient un lien ou contact externe qui peut contourner la marketplace.', 'fraud', 'critical', 20, '{}'::jsonb, '["Masquer avant publication", "Revue admin obligatoire"]'::jsonb),
  ('seo_compliance_low', 'Conformite SEO faible', 'Le score SEO Marketplace est insuffisant.', 'seo', 'normal', 130, '{"min_seo_score":65}'::jsonb, '["Generer proposition SEO", "Completer titre et meta"]'::jsonb),
  ('catalogue_quality_low', 'Qualite catalogue faible', 'Le Catalogue Intelligence indique une qualite insuffisante.', 'quality', 'normal', 140, '{"min_catalogue_quality":65}'::jsonb, '["Appliquer enrichissements valides", "Verifier attributs"]'::jsonb)
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    category = EXCLUDED.category,
    severity = EXCLUDED.severity,
    priority = EXCLUDED.priority,
    rules = EXCLUDED.rules,
    remediation_actions = EXCLUDED.remediation_actions,
    is_active = true,
    updated_at = now();

CREATE OR REPLACE FUNCTION public.marketplace_compliance_queue_for_score(_score numeric, _critical_count integer, _high_count integer)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN COALESCE(_critical_count, 0) > 0 THEN 'rejection_proposed'
    WHEN COALESCE(_score, 0) >= 90 THEN 'compliant'
    WHEN COALESCE(_score, 0) >= 75 THEN 'to_validate'
    WHEN COALESCE(_high_count, 0) > 0 THEN 'to_fix'
    WHEN COALESCE(_score, 0) >= 50 THEN 'to_complete'
    ELSE 'to_review'
  END;
$$;

CREATE OR REPLACE FUNCTION public.marketplace_compliance_record_finding(
  _policy_code text,
  _product_id uuid,
  _vendor_shop_id uuid,
  _vendor_owner_id uuid,
  _source_ref_id uuid,
  _confidence_score numeric,
  _compliance_score numeric,
  _title text,
  _justification text,
  _analyzed_elements jsonb,
  _estimated_impact jsonb,
  _recommended_actions jsonb,
  _detection_hash text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_policy public.marketplace_compliance_policies%ROWTYPE;
  v_finding_id uuid;
  v_queue_status text;
BEGIN
  SELECT * INTO v_policy
  FROM public.marketplace_compliance_policies
  WHERE code = _policy_code
    AND is_active = true;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  v_queue_status := CASE
    WHEN v_policy.severity = 'critical' THEN 'rejection_proposed'
    WHEN v_policy.severity = 'high' THEN 'to_fix'
    ELSE 'to_review'
  END;

  INSERT INTO public.marketplace_compliance_findings(
    policy_id, product_id, vendor_shop_id, vendor_owner_id, source_ref_id,
    queue_status, severity, confidence_score, compliance_score, title, justification,
    analyzed_elements, estimated_impact, recommended_actions, detection_hash, rule_version
  )
  VALUES (
    v_policy.id, _product_id, _vendor_shop_id, _vendor_owner_id, _source_ref_id,
    v_queue_status, v_policy.severity, LEAST(100, GREATEST(0, COALESCE(_confidence_score, 0))),
    LEAST(100, GREATEST(0, COALESCE(_compliance_score, 0))), _title, _justification,
    COALESCE(_analyzed_elements, '{}'::jsonb), COALESCE(_estimated_impact, '{}'::jsonb),
    COALESCE(_recommended_actions, v_policy.remediation_actions), _detection_hash, v_policy.version
  )
  ON CONFLICT (product_id, policy_id, detection_hash) DO UPDATE
  SET confidence_score = EXCLUDED.confidence_score,
      compliance_score = EXCLUDED.compliance_score,
      queue_status = CASE
        WHEN public.marketplace_compliance_findings.queue_status IN ('compliant', 'archived') THEN public.marketplace_compliance_findings.queue_status
        ELSE EXCLUDED.queue_status
      END,
      justification = EXCLUDED.justification,
      analyzed_elements = EXCLUDED.analyzed_elements,
      estimated_impact = EXCLUDED.estimated_impact,
      recommended_actions = EXCLUDED.recommended_actions,
      updated_at = now()
  RETURNING id INTO v_finding_id;

  INSERT INTO public.marketplace_compliance_events(
    finding_id, product_id, vendor_shop_id, actor_type, event_type, new_status,
    explanation, data_used, metadata
  )
  VALUES (
    v_finding_id, _product_id, _vendor_shop_id, 'ai', 'detected', v_queue_status,
    _justification,
    COALESCE(_analyzed_elements, '{}'::jsonb),
    jsonb_build_object('policy_code', _policy_code, 'engine_version', 'p3.4-compliance-v1')
  );

  RETURN v_finding_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.scan_marketplace_compliance(_limit integer DEFAULT 150)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit integer := LEAST(GREATEST(COALESCE(_limit, 150), 1), 500);
  p record;
  v_scanned integer := 0;
  v_findings integer := 0;
  v_catalogue_score numeric;
  v_image_score numeric;
  v_seo_score numeric;
  v_marketplace_score numeric;
  v_global_score numeric;
  v_findings_count integer;
  v_critical_count integer;
  v_high_count integer;
  v_queue_status text;
  v_latest_quality record;
  v_latest_seo record;
  v_latest_image record;
  v_open_coach_recommendations integer;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.marketplace_compliance_is_admin() THEN
    RAISE EXCEPTION 'marketplace_compliance_admin_required';
  END IF;

  FOR p IN
    SELECT
      pr.*,
      vs.owner_id AS vendor_owner_id,
      vs.name AS shop_name,
      c.name AS category_name
    FROM public.products pr
    LEFT JOIN public.vendor_shops vs ON vs.id = pr.vendor_id
    LEFT JOIN public.categories c ON c.id = pr.category_id
    WHERE pr.vendor_id IS NOT NULL
    ORDER BY pr.updated_at DESC NULLS LAST, pr.created_at DESC
    LIMIT v_limit
  LOOP
    v_scanned := v_scanned + 1;

    SELECT latest.*
    INTO v_latest_quality
    FROM (
      (
        SELECT qs.id, qs.catalogue_quality_score, 0 AS sort_order
        FROM public.catalogue_product_quality_snapshots qs
        WHERE qs.product_id = p.id
        ORDER BY qs.analyzed_at DESC
        LIMIT 1
      )
      UNION ALL
      SELECT NULL::uuid AS id, NULL::numeric AS catalogue_quality_score, 1 AS sort_order
    ) latest
    ORDER BY latest.sort_order
    LIMIT 1;

    SELECT latest.*
    INTO v_latest_seo
    FROM (
      (
        SELECT ss.id, ss.seo_score, ss.discoverability_score, 0 AS sort_order
        FROM public.marketplace_seo_product_scores ss
        WHERE ss.product_id = p.id
        ORDER BY ss.analyzed_at DESC
        LIMIT 1
      )
      UNION ALL
      SELECT NULL::uuid AS id, NULL::numeric AS seo_score, NULL::numeric AS discoverability_score, 1 AS sort_order
    ) latest
    ORDER BY latest.sort_order
    LIMIT 1;

    SELECT latest.*
    INTO v_latest_image
    FROM (
      (
        SELECT ij.id, ij.compliance_score, 0 AS sort_order
        FROM public.marketplace_image_studio_jobs ij
        WHERE ij.product_id = p.id
        ORDER BY ij.updated_at DESC NULLS LAST, ij.created_at DESC
        LIMIT 1
      )
      UNION ALL
      SELECT NULL::uuid AS id, NULL::numeric AS compliance_score, 1 AS sort_order
    ) latest
    ORDER BY latest.sort_order
    LIMIT 1;

    SELECT count(*)::integer
    INTO v_open_coach_recommendations
    FROM public.marketplace_coach_recommendations cr
    WHERE cr.product_id = p.id
      AND cr.status IN ('open', 'pending', 'in_progress');

    IF length(COALESCE(p.description, '')) < 80 THEN
      PERFORM public.marketplace_compliance_record_finding(
        'short_description', p.id, p.vendor_id, p.vendor_owner_id, NULL,
        90, 60,
        'Description produit insuffisante',
        'La description contient moins de 80 caracteres et ne permet pas une moderation commerciale fiable.',
        jsonb_build_object('description_length', length(COALESCE(p.description, '')), 'product_name', p.name),
        jsonb_build_object('seller_impact', 'fiche moins persuasive', 'admin_impact', 'controle manuel plus long'),
        '["Completer la description", "Ajouter les attributs commerciaux utiles"]'::jsonb,
        md5(p.id::text || ':short_description:' || COALESCE(p.description, ''))
      );
      v_findings := v_findings + 1;
    END IF;

    IF p.description ~* '(https?://|www\.|wa\.me|whatsapp|telegram|tel:|\\+237)' OR p.short_description ~* '(https?://|www\.|wa\.me|whatsapp|telegram|tel:|\\+237)' THEN
      PERFORM public.marketplace_compliance_record_finding(
        'external_contact_or_link', p.id, p.vendor_id, p.vendor_owner_id, NULL,
        95, 20,
        'Lien externe ou contact detecte',
        'Le contenu contient un lien externe ou une information de contact pouvant contourner les regles Marketplace.',
        jsonb_build_object('product_name', p.name, 'description', left(COALESCE(p.description, ''), 400), 'short_description', COALESCE(p.short_description, '')),
        jsonb_build_object('fraud_risk', 'contournement marketplace', 'legal_risk', 'contenu non conforme'),
        '["Revue admin obligatoire", "Demander suppression du lien ou contact"]'::jsonb,
        md5(p.id::text || ':external_link')
      );
      v_findings := v_findings + 1;
    END IF;

    IF p.image_url IS NULL OR length(trim(COALESCE(p.image_url, ''))) = 0 OR COALESCE(v_latest_image.compliance_score, 100) < 75 THEN
      PERFORM public.marketplace_compliance_record_finding(
        'image_quality_low', p.id, p.vendor_id, p.vendor_owner_id, v_latest_image.id,
        88, LEAST(100, COALESCE(v_latest_image.compliance_score, 30)),
        'Image produit a verifier',
        'L image est absente ou le dernier score Studio Image est inferieur au seuil de conformite.',
        jsonb_build_object('image_url_present', p.image_url IS NOT NULL, 'image_studio_score', COALESCE(v_latest_image.compliance_score, NULL)),
        jsonb_build_object('conversion_risk', 'visuel moins vendeur', 'brand_risk', 'catalogue non homogene'),
        '["Relancer le Studio Image", "Demander une image conforme"]'::jsonb,
        md5(p.id::text || ':image_quality:' || COALESCE(v_latest_image.id::text, 'missing'))
      );
      v_findings := v_findings + 1;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM public.products other
      WHERE other.id <> p.id
        AND other.vendor_id IS NOT NULL
        AND other.image_url = p.image_url
        AND p.image_url IS NOT NULL
    ) THEN
      PERFORM public.marketplace_compliance_record_finding(
        'duplicate_image', p.id, p.vendor_id, p.vendor_owner_id, NULL,
        75, 70,
        'Image utilisee sur plusieurs produits',
        'La meme image publique apparait sur au moins deux produits Marketplace.',
        jsonb_build_object('image_url', p.image_url),
        jsonb_build_object('catalogue_risk', 'confusion client', 'moderation_risk', 'doublon a verifier'),
        '["Verifier si les produits sont des variantes", "Remplacer l image si necessaire"]'::jsonb,
        md5(p.id::text || ':duplicate_image:' || COALESCE(p.image_url, ''))
      );
      v_findings := v_findings + 1;
    END IF;

    IF p.category_id IS NULL OR p.volume_ml IS NULL OR p.image_url IS NULL THEN
      PERFORM public.marketplace_compliance_record_finding(
        'missing_required_information', p.id, p.vendor_id, p.vendor_owner_id, NULL,
        90, 55,
        'Information obligatoire manquante',
        'La fiche produit ne contient pas tous les champs indispensables a la vente et a la moderation.',
        jsonb_build_object('category_missing', p.category_id IS NULL, 'volume_missing', p.volume_ml IS NULL, 'image_missing', p.image_url IS NULL),
        jsonb_build_object('admin_impact', 'validation plus lente', 'buyer_impact', 'information incomplete'),
        '["Completer les champs obligatoires", "Verifier categorie et volume"]'::jsonb,
        md5(p.id::text || ':missing_required:' || COALESCE(p.category_id::text, '') || COALESCE(p.volume_ml::text, ''))
      );
      v_findings := v_findings + 1;
    END IF;

    IF COALESCE(v_latest_seo.seo_score, 100) < 65 THEN
      PERFORM public.marketplace_compliance_record_finding(
        'seo_compliance_low', p.id, p.vendor_id, p.vendor_owner_id, v_latest_seo.id,
        80, COALESCE(v_latest_seo.seo_score, 50),
        'Conformite SEO insuffisante',
        'Le score SEO Marketplace est sous le seuil minimum de conformite editorial.',
        jsonb_build_object('seo_score', v_latest_seo.seo_score, 'discoverability_score', v_latest_seo.discoverability_score),
        jsonb_build_object('visibility_risk', 'faible decouvrabilite', 'sales_risk', 'moins de trafic organique'),
        '["Generer une proposition SEO", "Completer meta et mots cles"]'::jsonb,
        md5(p.id::text || ':seo_low:' || COALESCE(v_latest_seo.id::text, 'missing'))
      );
      v_findings := v_findings + 1;
    END IF;

    IF COALESCE(v_latest_quality.catalogue_quality_score, 100) < 65 OR v_open_coach_recommendations > 0 THEN
      PERFORM public.marketplace_compliance_record_finding(
        'catalogue_quality_low', p.id, p.vendor_id, p.vendor_owner_id, COALESCE(v_latest_quality.id, NULL),
        78, LEAST(COALESCE(v_latest_quality.catalogue_quality_score, 65), 75),
        'Qualite catalogue a ameliorer',
        'Le produit presente un score qualite faible ou des recommandations Coach encore ouvertes.',
        jsonb_build_object('catalogue_quality_score', v_latest_quality.catalogue_quality_score, 'open_coach_recommendations', v_open_coach_recommendations),
        jsonb_build_object('seller_impact', 'fiche moins complete', 'admin_impact', 'suivi qualite requis'),
        '["Traiter les recommandations Coach", "Valider les enrichissements Catalogue"]'::jsonb,
        md5(p.id::text || ':quality_low:' || COALESCE(v_latest_quality.id::text, 'missing') || ':' || v_open_coach_recommendations::text)
      );
      v_findings := v_findings + 1;
    END IF;

    SELECT
      count(*)::integer,
      count(*) FILTER (WHERE severity = 'critical' AND queue_status NOT IN ('compliant', 'archived'))::integer,
      count(*) FILTER (WHERE severity = 'high' AND queue_status NOT IN ('compliant', 'archived'))::integer
    INTO v_findings_count, v_critical_count, v_high_count
    FROM public.marketplace_compliance_findings
    WHERE product_id = p.id
      AND queue_status NOT IN ('compliant', 'archived');

    v_catalogue_score := GREATEST(0, 100 - (v_findings_count * 8) - (v_high_count * 12) - (v_critical_count * 25));
    v_image_score := GREATEST(0, COALESCE(v_latest_image.compliance_score, CASE WHEN p.image_url IS NULL THEN 35 ELSE 85 END) - (v_critical_count * 20));
    v_seo_score := GREATEST(0, COALESCE(v_latest_seo.seo_score, 75) - (v_findings_count * 3));
    v_marketplace_score := GREATEST(0, 100 - (v_findings_count * 7) - (v_high_count * 10) - (v_critical_count * 30));
    v_global_score := round((v_catalogue_score + v_image_score + v_seo_score + v_marketplace_score) / 4, 0);
    v_queue_status := public.marketplace_compliance_queue_for_score(v_global_score, v_critical_count, v_high_count);

    INSERT INTO public.marketplace_compliance_scores(
      product_id, vendor_shop_id, vendor_owner_id,
      catalogue_compliance_score, image_compliance_score, seo_compliance_score,
      marketplace_compliance_score, global_compliance_score,
      findings_count, critical_findings_count, high_findings_count, queue_status,
      explanation, signals
    )
    VALUES (
      p.id, p.vendor_id, p.vendor_owner_id,
      v_catalogue_score, v_image_score, v_seo_score,
      v_marketplace_score, v_global_score,
      v_findings_count, v_critical_count, v_high_count, v_queue_status,
      'Score P3.4 calcule a partir des signaux catalogue, image, SEO, coach et marketplace. Il ne modifie aucun contenu.',
      jsonb_build_object(
        'product_name', p.name,
        'shop_name', p.shop_name,
        'category_name', p.category_name,
        'latest_catalogue_quality_score', v_latest_quality.catalogue_quality_score,
        'latest_image_score', v_latest_image.compliance_score,
        'latest_seo_score', v_latest_seo.seo_score,
        'open_coach_recommendations', v_open_coach_recommendations
      )
    );
  END LOOP;

  INSERT INTO public.marketplace_compliance_events(actor_type, event_type, explanation, data_used, metadata)
  VALUES (
    'ai',
    'scan_completed',
    'Scan P3.4 termine. Les resultats sont des propositions de moderation, aucune suppression automatique.',
    jsonb_build_object('limit', v_limit, 'scanned_products', v_scanned, 'findings_touched', v_findings),
    jsonb_build_object('engine_version', 'p3.4-compliance-v1')
  );

  RETURN jsonb_build_object('scanned_products', v_scanned, 'findings_touched', v_findings, 'mode', 'human_review_only');
END;
$$;

CREATE OR REPLACE FUNCTION public.update_marketplace_compliance_finding_status(
  _finding_id uuid,
  _queue_status text,
  _resolution_note text DEFAULT NULL,
  _create_governance_case boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_finding public.marketplace_compliance_findings%ROWTYPE;
  v_old_status text;
  v_case_id uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT public.marketplace_compliance_is_admin() THEN
    RAISE EXCEPTION 'marketplace_compliance_admin_required';
  END IF;

  IF _queue_status NOT IN ('to_review', 'to_fix', 'to_complete', 'to_validate', 'compliant', 'rejection_proposed', 'archived') THEN
    RAISE EXCEPTION 'invalid_marketplace_compliance_status';
  END IF;

  SELECT * INTO v_finding
  FROM public.marketplace_compliance_findings
  WHERE id = _finding_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'marketplace_compliance_finding_not_found';
  END IF;

  v_old_status := v_finding.queue_status;

  IF _create_governance_case AND v_finding.governance_case_id IS NULL THEN
    INSERT INTO public.marketplace_governance_cases(
      created_by, created_by_type, case_type, priority, confidence_score, status, source_module, source_ref_id,
      vendor_shop_id, vendor_owner_id, product_id, is_vendor_visible, problem, explanation,
      data_used, potential_impacts, recommended_actions, metadata
    )
    VALUES (
      auth.uid(), 'admin', 'compliance_review', v_finding.severity, v_finding.confidence_score, 'new',
      'marketplace_compliance', v_finding.id,
      v_finding.vendor_shop_id, v_finding.vendor_owner_id, v_finding.product_id, true,
      v_finding.title, v_finding.justification,
      v_finding.analyzed_elements, v_finding.estimated_impact, v_finding.recommended_actions,
      jsonb_build_object('finding_number', v_finding.finding_number, 'human_review_required', true)
    )
    ON CONFLICT (source_module, source_ref_id) DO UPDATE
    SET updated_at = now()
    RETURNING id INTO v_case_id;
  ELSE
    v_case_id := v_finding.governance_case_id;
  END IF;

  UPDATE public.marketplace_compliance_findings
  SET queue_status = _queue_status,
      final_decision = CASE WHEN _queue_status IN ('compliant', 'archived', 'rejection_proposed') THEN _queue_status ELSE final_decision END,
      decided_by = CASE WHEN _queue_status IN ('compliant', 'archived', 'rejection_proposed') THEN auth.uid() ELSE decided_by END,
      decided_at = CASE WHEN _queue_status IN ('compliant', 'archived', 'rejection_proposed') THEN now() ELSE decided_at END,
      resolution_note = _resolution_note,
      governance_case_id = COALESCE(v_case_id, governance_case_id),
      updated_at = now()
  WHERE id = _finding_id;

  INSERT INTO public.marketplace_compliance_events(
    finding_id, product_id, vendor_shop_id, actor_id, actor_type, event_type,
    previous_status, new_status, explanation, data_used, metadata
  )
  VALUES (
    _finding_id, v_finding.product_id, v_finding.vendor_shop_id, auth.uid(), 'admin',
    CASE WHEN _queue_status IN ('compliant', 'archived') THEN 'resolved' ELSE 'status_changed' END,
    v_old_status, _queue_status,
    COALESCE(_resolution_note, 'Statut de moderation mis a jour par un administrateur.'),
    v_finding.analyzed_elements,
    jsonb_build_object('governance_case_id', v_case_id, 'human_decision', true)
  );

  RETURN jsonb_build_object('finding_id', _finding_id, 'status', _queue_status, 'governance_case_id', v_case_id);
END;
$$;

CREATE OR REPLACE VIEW public.admin_marketplace_compliance_overview AS
SELECT
  COALESCE((SELECT round(avg(global_compliance_score), 0) FROM (
    SELECT DISTINCT ON (product_id) product_id, global_compliance_score
    FROM public.marketplace_compliance_scores
    ORDER BY product_id, calculated_at DESC
  ) latest_scores), 0)::integer AS global_compliance_score,
  COALESCE((SELECT count(*) FROM public.marketplace_compliance_findings WHERE queue_status NOT IN ('compliant', 'archived')), 0)::integer AS open_findings,
  COALESCE((SELECT count(*) FROM public.marketplace_compliance_findings WHERE severity = 'critical' AND queue_status NOT IN ('compliant', 'archived')), 0)::integer AS critical_findings,
  COALESCE((SELECT count(*) FROM public.marketplace_compliance_findings WHERE queue_status = 'rejection_proposed'), 0)::integer AS rejection_proposed,
  COALESCE((SELECT count(*) FROM public.marketplace_compliance_findings WHERE created_at >= now() - interval '24 hours'), 0)::integer AS findings_24h,
  COALESCE((SELECT count(*) FROM public.marketplace_compliance_policies WHERE is_active = true), 0)::integer AS active_policies,
  COALESCE((SELECT avg(EXTRACT(epoch FROM (updated_at - created_at)) / 3600)::integer FROM public.marketplace_compliance_findings WHERE queue_status IN ('compliant', 'archived')), 0)::integer AS avg_resolution_hours
WHERE public.marketplace_compliance_is_admin();

CREATE OR REPLACE VIEW public.admin_marketplace_compliance_queue AS
SELECT
  f.id,
  f.finding_number,
  f.created_at,
  f.updated_at,
  f.queue_status,
  f.severity,
  f.confidence_score,
  f.compliance_score,
  f.title,
  f.justification,
  f.analyzed_elements,
  f.estimated_impact,
  f.recommended_actions,
  f.governance_case_id,
  p.name AS product_name,
  p.slug AS product_slug,
  p.image_url AS product_image_url,
  vs.name AS shop_name,
  pol.code AS policy_code,
  pol.name AS policy_name,
  pol.category AS policy_category
FROM public.marketplace_compliance_findings f
JOIN public.marketplace_compliance_policies pol ON pol.id = f.policy_id
LEFT JOIN public.products p ON p.id = f.product_id
LEFT JOIN public.vendor_shops vs ON vs.id = f.vendor_shop_id
WHERE public.marketplace_compliance_is_admin();

CREATE OR REPLACE VIEW public.admin_marketplace_compliance_policy_stats AS
SELECT
  pol.id,
  pol.code,
  pol.name,
  pol.category,
  pol.severity,
  pol.priority,
  pol.is_active,
  count(f.id)::integer AS total_findings,
  count(f.id) FILTER (WHERE f.queue_status NOT IN ('compliant', 'archived'))::integer AS open_findings,
  count(f.id) FILTER (WHERE f.created_at >= now() - interval '7 days')::integer AS findings_7d
FROM public.marketplace_compliance_policies pol
LEFT JOIN public.marketplace_compliance_findings f ON f.policy_id = pol.id
WHERE public.marketplace_compliance_is_admin()
GROUP BY pol.id, pol.code, pol.name, pol.category, pol.severity, pol.priority, pol.is_active;

CREATE OR REPLACE VIEW public.admin_marketplace_compliance_shop_stats AS
SELECT
  vs.id AS vendor_shop_id,
  vs.name AS shop_name,
  COALESCE(avg(latest_scores.global_compliance_score), 0)::integer AS avg_compliance_score,
  count(DISTINCT f.id) FILTER (WHERE f.queue_status NOT IN ('compliant', 'archived'))::integer AS open_findings,
  count(DISTINCT f.id) FILTER (WHERE f.severity = 'critical' AND f.queue_status NOT IN ('compliant', 'archived'))::integer AS critical_findings,
  count(DISTINCT f.product_id)::integer AS flagged_products
FROM public.vendor_shops vs
LEFT JOIN public.marketplace_compliance_findings f ON f.vendor_shop_id = vs.id
LEFT JOIN LATERAL (
  SELECT DISTINCT ON (s.product_id) s.product_id, s.global_compliance_score
  FROM public.marketplace_compliance_scores s
  WHERE s.vendor_shop_id = vs.id
  ORDER BY s.product_id, s.calculated_at DESC
) latest_scores ON true
WHERE public.marketplace_compliance_is_admin()
GROUP BY vs.id, vs.name;

CREATE OR REPLACE VIEW public.admin_marketplace_compliance_trends AS
SELECT
  date_trunc('day', created_at)::date AS day,
  count(*)::integer AS total_events,
  count(*) FILTER (WHERE event_type = 'detected')::integer AS detections,
  count(*) FILTER (WHERE event_type = 'resolved')::integer AS resolutions,
  count(*) FILTER (WHERE event_type = 'admin_decision')::integer AS admin_decisions
FROM public.marketplace_compliance_events
WHERE public.marketplace_compliance_is_admin()
GROUP BY date_trunc('day', created_at)::date
ORDER BY day DESC;

CREATE OR REPLACE VIEW public.my_marketplace_compliance_findings AS
SELECT
  f.id,
  f.finding_number,
  f.created_at,
  f.queue_status,
  f.severity,
  f.compliance_score,
  f.title,
  f.justification,
  f.recommended_actions,
  p.name AS product_name,
  p.image_url AS product_image_url,
  pol.name AS policy_name,
  pol.category AS policy_category
FROM public.marketplace_compliance_findings f
JOIN public.marketplace_compliance_policies pol ON pol.id = f.policy_id
LEFT JOIN public.products p ON p.id = f.product_id
WHERE f.vendor_shop_id IS NOT NULL
  AND public.marketplace_compliance_owns_shop(f.vendor_shop_id);

ALTER TABLE public.marketplace_compliance_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_compliance_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_compliance_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_compliance_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Compliance policies admin readable" ON public.marketplace_compliance_policies;
CREATE POLICY "Compliance policies admin readable"
  ON public.marketplace_compliance_policies FOR SELECT TO authenticated
  USING (public.marketplace_compliance_is_admin());

DROP POLICY IF EXISTS "Compliance policies admin writable" ON public.marketplace_compliance_policies;
CREATE POLICY "Compliance policies admin writable"
  ON public.marketplace_compliance_policies FOR ALL TO authenticated
  USING (public.marketplace_compliance_is_admin())
  WITH CHECK (public.marketplace_compliance_is_admin());

DROP POLICY IF EXISTS "Compliance findings admin or owner readable" ON public.marketplace_compliance_findings;
CREATE POLICY "Compliance findings admin or owner readable"
  ON public.marketplace_compliance_findings FOR SELECT TO authenticated
  USING (
    public.marketplace_compliance_is_admin()
    OR (vendor_shop_id IS NOT NULL AND public.marketplace_compliance_owns_shop(vendor_shop_id))
  );

DROP POLICY IF EXISTS "Compliance findings admin writable" ON public.marketplace_compliance_findings;
CREATE POLICY "Compliance findings admin writable"
  ON public.marketplace_compliance_findings FOR ALL TO authenticated
  USING (public.marketplace_compliance_is_admin())
  WITH CHECK (public.marketplace_compliance_is_admin());

DROP POLICY IF EXISTS "Compliance scores admin or owner readable" ON public.marketplace_compliance_scores;
CREATE POLICY "Compliance scores admin or owner readable"
  ON public.marketplace_compliance_scores FOR SELECT TO authenticated
  USING (
    public.marketplace_compliance_is_admin()
    OR (vendor_shop_id IS NOT NULL AND public.marketplace_compliance_owns_shop(vendor_shop_id))
  );

DROP POLICY IF EXISTS "Compliance events admin or owner readable" ON public.marketplace_compliance_events;
CREATE POLICY "Compliance events admin or owner readable"
  ON public.marketplace_compliance_events FOR SELECT TO authenticated
  USING (
    public.marketplace_compliance_is_admin()
    OR (vendor_shop_id IS NOT NULL AND public.marketplace_compliance_owns_shop(vendor_shop_id))
  );

DROP POLICY IF EXISTS "Compliance events admin insert" ON public.marketplace_compliance_events;
CREATE POLICY "Compliance events admin insert"
  ON public.marketplace_compliance_events FOR INSERT TO authenticated
  WITH CHECK (public.marketplace_compliance_is_admin());

GRANT SELECT ON public.marketplace_compliance_policies TO authenticated;
GRANT SELECT ON public.marketplace_compliance_findings TO authenticated;
GRANT SELECT ON public.marketplace_compliance_scores TO authenticated;
GRANT SELECT ON public.marketplace_compliance_events TO authenticated;
GRANT SELECT ON public.admin_marketplace_compliance_overview TO authenticated;
GRANT SELECT ON public.admin_marketplace_compliance_queue TO authenticated;
GRANT SELECT ON public.admin_marketplace_compliance_policy_stats TO authenticated;
GRANT SELECT ON public.admin_marketplace_compliance_shop_stats TO authenticated;
GRANT SELECT ON public.admin_marketplace_compliance_trends TO authenticated;
GRANT SELECT ON public.my_marketplace_compliance_findings TO authenticated;
GRANT EXECUTE ON FUNCTION public.scan_marketplace_compliance(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_marketplace_compliance_finding_status(uuid, text, text, boolean) TO authenticated;

GRANT ALL ON public.marketplace_compliance_policies TO service_role;
GRANT ALL ON public.marketplace_compliance_findings TO service_role;
GRANT ALL ON public.marketplace_compliance_scores TO service_role;
GRANT ALL ON public.marketplace_compliance_events TO service_role;
GRANT EXECUTE ON FUNCTION public.scan_marketplace_compliance(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_marketplace_compliance_finding_status(uuid, text, text, boolean) TO service_role;

NOTIFY pgrst, 'reload schema';
