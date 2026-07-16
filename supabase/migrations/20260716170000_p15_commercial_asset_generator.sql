-- P1.5 - LPB Commercial Asset Generator IA.
-- Commercial content generation only: no wallet, commission, order, P0 or accounting mutation.

ALTER TYPE public.admin_permission ADD VALUE IF NOT EXISTS 'commercial_assets';

CREATE OR REPLACE FUNCTION public.commercial_asset_is_admin()
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
        AND ap.permission::text IN ('full_access', 'commercial_assets', 'conversation_coach', 'ai_goals', 'commercial_calendar', 'crm')
    );
$$;

CREATE TABLE IF NOT EXISTS public.commercial_asset_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_type text NOT NULL CHECK (
    template_type IN (
      'whatsapp', 'email', 'sms', 'facebook', 'instagram', 'linkedin', 'story',
      'product_sheet', 'pdf_catalog', 'flyer', 'poster_a4', 'business_offer',
      'quote', 'digital_business_card', 'mini_shop_qr', 'campaign_page'
    )
  ),
  title text NOT NULL,
  description text,
  occasion text NOT NULL DEFAULT 'general',
  target_audience text NOT NULL DEFAULT 'individual',
  default_tone text NOT NULL DEFAULT 'professional',
  body_template text NOT NULL,
  layout_schema jsonb NOT NULL DEFAULT '{}'::jsonb,
  required_assets jsonb NOT NULL DEFAULT '[]'::jsonb,
  allowed_export_formats text[] NOT NULL DEFAULT ARRAY['pdf', 'png', 'jpeg', 'webp'],
  is_official boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (template_type, title)
);

CREATE TABLE IF NOT EXISTS public.commercial_asset_generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  template_id uuid REFERENCES public.commercial_asset_templates(id) ON DELETE SET NULL,
  asset_type text NOT NULL,
  title text NOT NULL,
  brief text,
  content_text text NOT NULL,
  html_preview text,
  personalization jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_context jsonb NOT NULL DEFAULT '{}'::jsonb,
  recommended_products jsonb NOT NULL DEFAULT '[]'::jsonb,
  official_image_urls text[] NOT NULL DEFAULT '{}',
  export_formats text[] NOT NULL DEFAULT ARRAY['pdf', 'png', 'jpeg', 'webp'],
  status text NOT NULL DEFAULT 'generated' CHECK (status IN ('generated', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.commercial_asset_exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  generation_id uuid NOT NULL REFERENCES public.commercial_asset_generations(id) ON DELETE CASCADE,
  export_format text NOT NULL CHECK (export_format IN ('pdf', 'png', 'jpeg', 'webp')),
  export_status text NOT NULL DEFAULT 'requested' CHECK (export_status IN ('requested', 'ready', 'failed')),
  file_url text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  requested_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.commercial_asset_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  generation_id uuid REFERENCES public.commercial_asset_generations(id) ON DELETE SET NULL,
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  event_type text NOT NULL CHECK (event_type IN ('generated', 'export_requested', 'shared', 'click', 'conversion', 'archived')),
  channel text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.commercial_asset_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_commercial_asset_templates_touch ON public.commercial_asset_templates;
CREATE TRIGGER trg_commercial_asset_templates_touch
BEFORE UPDATE ON public.commercial_asset_templates
FOR EACH ROW
EXECUTE FUNCTION public.commercial_asset_touch_updated_at();

DROP TRIGGER IF EXISTS trg_commercial_asset_generations_touch ON public.commercial_asset_generations;
CREATE TRIGGER trg_commercial_asset_generations_touch
BEFORE UPDATE ON public.commercial_asset_generations
FOR EACH ROW
EXECUTE FUNCTION public.commercial_asset_touch_updated_at();

CREATE OR REPLACE FUNCTION public.commercial_asset_events_append_only()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'commercial_asset_events_append_only';
END;
$$;

DROP TRIGGER IF EXISTS trg_commercial_asset_events_append_only ON public.commercial_asset_events;
CREATE TRIGGER trg_commercial_asset_events_append_only
BEFORE UPDATE OR DELETE ON public.commercial_asset_events
FOR EACH ROW
EXECUTE FUNCTION public.commercial_asset_events_append_only();

CREATE OR REPLACE FUNCTION public.commercial_asset_can_access_generation(_generation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.commercial_asset_generations g
    WHERE g.id = _generation_id
      AND (g.owner_id = auth.uid() OR public.commercial_asset_is_admin())
  );
$$;

CREATE OR REPLACE FUNCTION public.generate_commercial_asset(
  _template_id uuid DEFAULT NULL,
  _asset_type text DEFAULT 'whatsapp',
  _brief text DEFAULT NULL,
  _product_ids uuid[] DEFAULT '{}'::uuid[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_template public.commercial_asset_templates%ROWTYPE;
  v_profile record;
  v_referral text;
  v_advisor_name text;
  v_contact text;
  v_referral_link text;
  v_mini_shop_link text;
  v_products jsonb := '[]'::jsonb;
  v_images text[] := '{}';
  v_content text;
  v_title text;
  v_generation_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication_required';
  END IF;

  IF _template_id IS NOT NULL THEN
    SELECT * INTO v_template
    FROM public.commercial_asset_templates
    WHERE id = _template_id
      AND is_active = true;
  ELSE
    SELECT * INTO v_template
    FROM public.commercial_asset_templates
    WHERE template_type = COALESCE(_asset_type, 'whatsapp')
      AND is_active = true
    ORDER BY is_official DESC, created_at ASC
    LIMIT 1;
  END IF;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'commercial_asset_template_not_found';
  END IF;

  SELECT p.first_name, p.last_name, p.email, p.phone, p.avatar_url
  INTO v_profile
  FROM public.profiles p
  WHERE p.id = auth.uid();

  SELECT COALESCE(custom_code, code)
  INTO v_referral
  FROM public.referral_codes
  WHERE user_id = auth.uid()
    AND is_active = true
  ORDER BY created_at DESC
  LIMIT 1;

  v_advisor_name := trim(COALESCE(v_profile.first_name, '') || ' ' || COALESCE(v_profile.last_name, ''));
  IF v_advisor_name = '' THEN
    v_advisor_name := COALESCE(v_profile.email, 'Conseiller LPB');
  END IF;
  v_contact := COALESCE(v_profile.phone, v_profile.email, '');
  v_referral_link := 'https://www.lapetitebouteille.com/' || CASE WHEN v_referral IS NULL THEN '' ELSE '?ref=' || v_referral END;
  v_mini_shop_link := 'https://www.lapetitebouteille.com/catalogue' || CASE WHEN v_referral IS NULL THEN '' ELSE '?ref=' || v_referral END;

  SELECT
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', p.id,
          'name', p.name,
          'slug', p.slug,
          'price', p.price,
          'image_url', p.image_url,
          'product_url', 'https://www.lapetitebouteille.com/produit/' || p.slug || CASE WHEN v_referral IS NULL THEN '' ELSE '?ref=' || v_referral END
        )
        ORDER BY p.is_featured DESC, p.price DESC NULLS LAST
      ),
      '[]'::jsonb
    ),
    COALESCE(array_agg(p.image_url) FILTER (WHERE p.image_url IS NOT NULL AND p.image_url <> ''), '{}')
  INTO v_products, v_images
  FROM (
    SELECT id, name, slug, price, image_url, is_featured
    FROM public.products
    WHERE is_active = true
      AND image_url IS NOT NULL
      AND image_url <> ''
      AND (cardinality(_product_ids) = 0 OR id = ANY(_product_ids))
    ORDER BY is_featured DESC, price DESC NULLS LAST, name ASC
    LIMIT 8
  ) p;

  v_content := v_template.body_template;
  v_content := replace(v_content, '{{advisor_name}}', v_advisor_name);
  v_content := replace(v_content, '{{advisor_contact}}', v_contact);
  v_content := replace(v_content, '{{referral_link}}', v_referral_link);
  v_content := replace(v_content, '{{mini_shop_link}}', v_mini_shop_link);
  v_content := replace(v_content, '{{brief}}', COALESCE(_brief, 'Selection LPB adaptee a votre besoin.'));
  v_content := replace(v_content, '{{product_count}}', jsonb_array_length(v_products)::text);

  IF jsonb_array_length(v_products) > 0 THEN
    v_content := replace(v_content, '{{main_product}}', COALESCE(v_products->0->>'name', 'selection LPB'));
    v_content := replace(v_content, '{{main_price}}', COALESCE(v_products->0->>'price', ''));
  ELSE
    v_content := replace(v_content, '{{main_product}}', 'selection LPB');
    v_content := replace(v_content, '{{main_price}}', '');
  END IF;

  v_title := v_template.title || ' - ' || to_char(now(), 'DD/MM/YYYY HH24:MI');

  INSERT INTO public.commercial_asset_generations (
    owner_id, template_id, asset_type, title, brief, content_text, html_preview,
    personalization, source_context, recommended_products, official_image_urls, export_formats
  )
  VALUES (
    auth.uid(),
    v_template.id,
    v_template.template_type,
    v_title,
    _brief,
    v_content,
    '<article><h1>' || replace(v_title, '<', '&lt;') || '</h1><p>' || replace(v_content, E'\n', '<br/>') || '</p></article>',
    jsonb_build_object(
      'advisor_name', v_advisor_name,
      'advisor_contact', v_contact,
      'avatar_url', v_profile.avatar_url,
      'referral_code', v_referral,
      'referral_link', v_referral_link,
      'mini_shop_link', v_mini_shop_link
    ),
    jsonb_build_object(
      'engine_version', 'p1.5-commercial-assets',
      'brief', _brief,
      'template_type', v_template.template_type,
      'data_sources_allowed', ARRAY['crm', 'commercial_calendar', 'ai_goals', 'conversation_coach', 'catalog', 'campaigns'],
      'data_sources_forbidden', ARRAY['wallets', 'commissions', 'orders_mutation', 'p0', 'accounting']
    ),
    v_products,
    v_images,
    v_template.allowed_export_formats
  )
  RETURNING id INTO v_generation_id;

  INSERT INTO public.commercial_asset_events (generation_id, owner_id, event_type, channel, metadata)
  VALUES (v_generation_id, auth.uid(), 'generated', v_template.template_type, jsonb_build_object('template_id', v_template.id));

  RETURN jsonb_build_object(
    'generation_id', v_generation_id,
    'asset_type', v_template.template_type,
    'title', v_title,
    'export_formats', v_template.allowed_export_formats,
    'product_count', jsonb_array_length(v_products)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.request_commercial_asset_export(
  _generation_id uuid,
  _export_format text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_export_id uuid;
BEGIN
  IF NOT public.commercial_asset_can_access_generation(_generation_id) THEN
    RAISE EXCEPTION 'commercial_asset_access_denied';
  END IF;

  IF _export_format NOT IN ('pdf', 'png', 'jpeg', 'webp') THEN
    RAISE EXCEPTION 'unsupported_export_format';
  END IF;

  INSERT INTO public.commercial_asset_exports (generation_id, export_format, requested_by, metadata)
  VALUES (_generation_id, _export_format, auth.uid(), jsonb_build_object('status', 'queued_for_visual_engine'))
  RETURNING id INTO v_export_id;

  INSERT INTO public.commercial_asset_events (generation_id, owner_id, event_type, channel, metadata)
  SELECT _generation_id, g.owner_id, 'export_requested', _export_format, jsonb_build_object('export_id', v_export_id)
  FROM public.commercial_asset_generations g
  WHERE g.id = _generation_id;

  RETURN jsonb_build_object('export_id', v_export_id, 'status', 'requested', 'format', _export_format);
END;
$$;

CREATE OR REPLACE FUNCTION public.record_commercial_asset_event(
  _generation_id uuid,
  _event_type text,
  _channel text DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id uuid;
BEGIN
  IF _generation_id IS NOT NULL AND NOT public.commercial_asset_can_access_generation(_generation_id) THEN
    RAISE EXCEPTION 'commercial_asset_access_denied';
  END IF;

  INSERT INTO public.commercial_asset_events (generation_id, owner_id, event_type, channel, metadata)
  SELECT _generation_id, COALESCE(g.owner_id, auth.uid()), _event_type, _channel, COALESCE(_metadata, '{}'::jsonb)
  FROM (SELECT 1) x
  LEFT JOIN public.commercial_asset_generations g ON g.id = _generation_id
  RETURNING id INTO v_event_id;

  RETURN jsonb_build_object('event_id', v_event_id, 'event_type', _event_type);
END;
$$;

CREATE OR REPLACE VIEW public.advisor_commercial_asset_dashboard AS
SELECT
  g.*,
  (
    SELECT count(*)
    FROM public.commercial_asset_events e
    WHERE e.generation_id = g.id
      AND e.event_type = 'shared'
  ) AS share_count,
  (
    SELECT count(*)
    FROM public.commercial_asset_events e
    WHERE e.generation_id = g.id
      AND e.event_type = 'click'
  ) AS click_count,
  (
    SELECT count(*)
    FROM public.commercial_asset_events e
    WHERE e.generation_id = g.id
      AND e.event_type = 'conversion'
  ) AS conversion_count,
  (
    SELECT jsonb_agg(to_jsonb(x) ORDER BY x.created_at DESC)
    FROM (
      SELECT id, export_format, export_status, file_url, created_at
      FROM public.commercial_asset_exports ex
      WHERE ex.generation_id = g.id
      ORDER BY ex.created_at DESC
      LIMIT 8
    ) x
  ) AS exports
FROM public.commercial_asset_generations g
WHERE g.owner_id = auth.uid()
   OR public.commercial_asset_is_admin();

CREATE OR REPLACE VIEW public.advisor_commercial_asset_template_library AS
SELECT id, template_type, title, description, occasion, target_audience, default_tone, allowed_export_formats, is_official, is_active, created_at
FROM public.commercial_asset_templates
WHERE is_active = true
   OR public.commercial_asset_is_admin();

CREATE OR REPLACE VIEW public.admin_commercial_asset_report AS
SELECT
  g.owner_id,
  count(*) AS generated_total,
  count(*) FILTER (WHERE g.created_at >= now() - interval '7 days') AS generated_7d,
  count(e.id) FILTER (WHERE e.event_type = 'shared') AS shares_total,
  count(e.id) FILTER (WHERE e.event_type = 'click') AS clicks_total,
  count(e.id) FILTER (WHERE e.event_type = 'conversion') AS conversions_total,
  round(100.0 * count(e.id) FILTER (WHERE e.event_type = 'conversion') / NULLIF(count(e.id) FILTER (WHERE e.event_type = 'click'), 0), 2) AS conversion_rate,
  max(g.created_at) AS last_generated_at
FROM public.commercial_asset_generations g
LEFT JOIN public.commercial_asset_events e ON e.generation_id = g.id
WHERE public.commercial_asset_is_admin()
GROUP BY g.owner_id;

ALTER TABLE public.commercial_asset_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_asset_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_asset_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_asset_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated read active commercial asset templates" ON public.commercial_asset_templates;
CREATE POLICY "Authenticated read active commercial asset templates"
ON public.commercial_asset_templates
FOR SELECT
TO authenticated
USING (is_active = true OR public.commercial_asset_is_admin());

DROP POLICY IF EXISTS "Admins manage commercial asset templates" ON public.commercial_asset_templates;
CREATE POLICY "Admins manage commercial asset templates"
ON public.commercial_asset_templates
FOR ALL
TO authenticated
USING (public.commercial_asset_is_admin())
WITH CHECK (public.commercial_asset_is_admin());

DROP POLICY IF EXISTS "Owners manage own commercial assets" ON public.commercial_asset_generations;
CREATE POLICY "Owners manage own commercial assets"
ON public.commercial_asset_generations
FOR ALL
TO authenticated
USING (owner_id = auth.uid() OR public.commercial_asset_is_admin())
WITH CHECK (owner_id = auth.uid() OR public.commercial_asset_is_admin());

DROP POLICY IF EXISTS "Owners read own commercial asset exports" ON public.commercial_asset_exports;
CREATE POLICY "Owners read own commercial asset exports"
ON public.commercial_asset_exports
FOR SELECT
TO authenticated
USING (public.commercial_asset_can_access_generation(generation_id));

DROP POLICY IF EXISTS "Owners request own commercial asset exports" ON public.commercial_asset_exports;
CREATE POLICY "Owners request own commercial asset exports"
ON public.commercial_asset_exports
FOR INSERT
TO authenticated
WITH CHECK (public.commercial_asset_can_access_generation(generation_id));

DROP POLICY IF EXISTS "Owners read own commercial asset events" ON public.commercial_asset_events;
CREATE POLICY "Owners read own commercial asset events"
ON public.commercial_asset_events
FOR SELECT
TO authenticated
USING (owner_id = auth.uid() OR public.commercial_asset_is_admin());

DROP POLICY IF EXISTS "Owners insert own commercial asset events" ON public.commercial_asset_events;
CREATE POLICY "Owners insert own commercial asset events"
ON public.commercial_asset_events
FOR INSERT
TO authenticated
WITH CHECK (owner_id = auth.uid() OR public.commercial_asset_is_admin());

INSERT INTO public.commercial_asset_templates (
  template_type, title, description, occasion, target_audience, default_tone, body_template, layout_schema, required_assets, allowed_export_formats, is_official
)
VALUES
  ('whatsapp', 'Promotion week-end WhatsApp', 'Message court pour relancer les clients avant le week-end.', 'promotion_weekend', 'individual', 'warm',
   'Bonjour, ici {{advisor_name}} de La Petite Bouteille.\n\n{{brief}}\n\nMa suggestion du moment : {{main_product}}.\nLien direct : {{referral_link}}\nContact : {{advisor_contact}}',
   '{"format":"text","safe_area":"mobile"}'::jsonb, '["advisor_name","referral_link","official_product_image"]'::jsonb, ARRAY['pdf','png','jpeg','webp'], true),
  ('instagram', 'Story cadeau premium', 'Story courte pour coffret cadeau, anniversaire ou attention premium.', 'gift', 'individual', 'premium',
   'Idee cadeau LPB : {{main_product}}\nSelection elegante, disponible via {{mini_shop_link}}\nConseiller : {{advisor_name}}',
   '{"format":"story","ratio":"9:16","background":"official_product_image"}'::jsonb, '["official_product_image","advisor_name","qr"]'::jsonb, ARRAY['png','jpeg','webp'], true),
  ('email', 'Offre entreprise', 'Email commercial pour entreprises, partenaires et cadeaux corporate.', 'company', 'business', 'professional',
   'Bonjour,\n\nJe vous propose une selection LPB adaptee a vos clients, partenaires ou collaborateurs.\n\n{{brief}}\n\nProduit phare : {{main_product}}\nMini-boutique : {{mini_shop_link}}\n\n{{advisor_name}}\n{{advisor_contact}}',
   '{"format":"email","sections":["intro","products","cta"]}'::jsonb, '["advisor_contact","mini_shop_link"]'::jsonb, ARRAY['pdf'], true),
  ('flyer', 'Flyer mariage', 'Flyer A5/A4 pour offres mariage et evenements.', 'wedding', 'individual', 'premium',
   'Offre mariage LPB\n{{brief}}\nSelection conseillee : {{main_product}}\nContactez {{advisor_name}} : {{advisor_contact}}\nQR boutique : {{mini_shop_link}}',
   '{"format":"flyer","ratio":"A4","style":"premium"}'::jsonb, '["official_product_image","qr","advisor_contact"]'::jsonb, ARRAY['pdf','png','jpeg'], true),
  ('pdf_catalog', 'Mini catalogue conseiller', 'Mini catalogue partageable avec produits recommandes.', 'general', 'mixed', 'professional',
   'Catalogue LPB personnalise par {{advisor_name}}\n{{product_count}} produits recommandes.\nAcces : {{mini_shop_link}}\nContact : {{advisor_contact}}',
   '{"format":"catalog","max_products":8}'::jsonb, '["official_product_images","advisor_name","qr"]'::jsonb, ARRAY['pdf'], true),
  ('digital_business_card', 'Carte de visite digitale', 'Carte personnelle du Conseiller LPB.', 'general', 'mixed', 'professional',
   '{{advisor_name}}\nConseiller LPB\nContact : {{advisor_contact}}\nBoutique : {{mini_shop_link}}\nLien ambassadeur : {{referral_link}}',
   '{"format":"card","ratio":"1.91:1"}'::jsonb, '["advisor_name","advisor_contact","qr"]'::jsonb, ARRAY['png','jpeg','webp','pdf'], true)
ON CONFLICT (template_type, title) DO UPDATE
SET description = EXCLUDED.description,
    body_template = EXCLUDED.body_template,
    layout_schema = EXCLUDED.layout_schema,
    required_assets = EXCLUDED.required_assets,
    allowed_export_formats = EXCLUDED.allowed_export_formats,
    is_official = true,
    is_active = true,
    updated_at = now();

GRANT SELECT, INSERT, UPDATE ON public.commercial_asset_templates TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON public.commercial_asset_generations TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON public.commercial_asset_exports TO authenticated, service_role;
GRANT SELECT, INSERT ON public.commercial_asset_events TO authenticated, service_role;
GRANT SELECT ON public.advisor_commercial_asset_dashboard TO authenticated, service_role;
GRANT SELECT ON public.advisor_commercial_asset_template_library TO authenticated, service_role;
GRANT SELECT ON public.admin_commercial_asset_report TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.generate_commercial_asset(uuid, text, text, uuid[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.request_commercial_asset_export(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.record_commercial_asset_event(uuid, text, text, jsonb) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
