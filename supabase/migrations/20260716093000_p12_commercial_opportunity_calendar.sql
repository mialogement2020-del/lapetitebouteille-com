-- P1.2 Commercial Opportunity Calendar.
-- Additive commercial intelligence module only: no wallet, commission, order, product or P0 mutation.

ALTER TYPE public.admin_permission ADD VALUE IF NOT EXISTS 'commercial_calendar';

CREATE OR REPLACE FUNCTION public.commercial_calendar_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR EXISTS (
        SELECT 1
        FROM public.admin_permissions ap
        WHERE ap.user_id = auth.uid()
          AND ap.permission::text IN ('full_access', 'commercial_calendar')
      )
    )
$$;

CREATE TABLE IF NOT EXISTS public.commercial_opportunity_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(trim(name)) > 1),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9][a-z0-9-]*$'),
  event_type text NOT NULL DEFAULT 'seasonal'
    CHECK (event_type IN ('seasonal', 'life_event', 'company', 'product_launch', 'lpb_promotion', 'custom')),
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'scheduled', 'active', 'paused', 'archived')),
  is_active boolean NOT NULL DEFAULT true,
  priority text NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  category text NOT NULL DEFAULT 'general',
  description text,
  commercial_objective text,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  recurrence_rule jsonb NOT NULL DEFAULT '{}'::jsonb,
  recommended_actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  target_client_types text[] NOT NULL DEFAULT '{}',
  target_cities text[] NOT NULL DEFAULT '{}',
  target_regions text[] NOT NULL DEFAULT '{}',
  target_vendor_ids uuid[] NOT NULL DEFAULT '{}',
  target_partner_ids uuid[] NOT NULL DEFAULT '{}',
  marketing_asset_requirements jsonb NOT NULL DEFAULT '[]'::jsonb,
  ai_brief jsonb NOT NULL DEFAULT '{}'::jsonb,
  publication_starts_at timestamptz,
  publication_ends_at timestamptz,
  auto_publish_at timestamptz,
  archived_at timestamptz,
  archived_reason text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT commercial_opportunity_period_check CHECK (starts_at <= ends_at)
);

CREATE TABLE IF NOT EXISTS public.commercial_opportunity_event_categories (
  event_id uuid NOT NULL REFERENCES public.commercial_opportunity_events(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  relevance_score integer NOT NULL DEFAULT 70 CHECK (relevance_score BETWEEN 0 AND 100),
  rationale text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, category_id)
);

CREATE TABLE IF NOT EXISTS public.commercial_opportunity_event_products (
  event_id uuid NOT NULL REFERENCES public.commercial_opportunity_events(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  relevance_score integer NOT NULL DEFAULT 70 CHECK (relevance_score BETWEEN 0 AND 100),
  rationale text,
  recommended_packaging text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, product_id)
);

CREATE TABLE IF NOT EXISTS public.commercial_opportunity_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.commercial_opportunity_events(id) ON DELETE SET NULL,
  name text NOT NULL CHECK (char_length(trim(name)) > 1),
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'scheduled', 'active', 'paused', 'completed', 'archived')),
  channel text NOT NULL DEFAULT 'advisor'
    CHECK (channel IN ('advisor', 'whatsapp', 'email', 'phone', 'social', 'store', 'marketplace')),
  objective text,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  target_client_types text[] NOT NULL DEFAULT '{}',
  target_cities text[] NOT NULL DEFAULT '{}',
  target_regions text[] NOT NULL DEFAULT '{}',
  target_vendor_ids uuid[] NOT NULL DEFAULT '{}',
  target_partner_ids uuid[] NOT NULL DEFAULT '{}',
  publication_starts_at timestamptz,
  publication_ends_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT commercial_campaign_period_check CHECK (starts_at <= ends_at)
);

CREATE TABLE IF NOT EXISTS public.commercial_opportunity_missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.commercial_opportunity_events(id) ON DELETE CASCADE,
  campaign_id uuid REFERENCES public.commercial_opportunity_campaigns(id) ON DELETE SET NULL,
  advisor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  title text NOT NULL CHECK (char_length(trim(title)) > 1),
  description text,
  mission_type text NOT NULL DEFAULT 'follow_up'
    CHECK (mission_type IN ('follow_up', 'quote', 'proposal', 'call', 'whatsapp', 'email', 'event_visit', 'content_share')),
  priority text NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status text NOT NULL DEFAULT 'available'
    CHECK (status IN ('available', 'assigned', 'in_progress', 'completed', 'cancelled', 'expired')),
  due_at timestamptz,
  suggested_client_types text[] NOT NULL DEFAULT '{}',
  suggested_cities text[] NOT NULL DEFAULT '{}',
  success_criteria jsonb NOT NULL DEFAULT '{}'::jsonb,
  ai_prompt_context jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.commercial_opportunity_marketing_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.commercial_opportunity_events(id) ON DELETE CASCADE,
  campaign_id uuid REFERENCES public.commercial_opportunity_campaigns(id) ON DELETE SET NULL,
  asset_type text NOT NULL
    CHECK (asset_type IN ('message_template', 'visual_brief', 'whatsapp_script', 'email_template', 'product_bundle', 'landing_page_brief')),
  title text NOT NULL CHECK (char_length(trim(title)) > 1),
  content text,
  asset_url text,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'ready', 'approved', 'archived')),
  ai_generation_context jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.commercial_opportunity_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.commercial_opportunity_events(id) ON DELETE SET NULL,
  campaign_id uuid REFERENCES public.commercial_opportunity_campaigns(id) ON DELETE SET NULL,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_commercial_events_window ON public.commercial_opportunity_events(starts_at, ends_at, status, is_active);
CREATE INDEX IF NOT EXISTS idx_commercial_events_priority ON public.commercial_opportunity_events(priority, category);
CREATE INDEX IF NOT EXISTS idx_commercial_campaigns_window ON public.commercial_opportunity_campaigns(starts_at, ends_at, status);
CREATE INDEX IF NOT EXISTS idx_commercial_missions_advisor_status ON public.commercial_opportunity_missions(advisor_id, status, due_at);
CREATE INDEX IF NOT EXISTS idx_commercial_assets_event_status ON public.commercial_opportunity_marketing_assets(event_id, status);
CREATE INDEX IF NOT EXISTS idx_commercial_activity_created ON public.commercial_opportunity_activity_log(created_at DESC);

CREATE OR REPLACE FUNCTION public.commercial_calendar_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  NEW.updated_by = COALESCE(auth.uid(), NEW.updated_by);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_commercial_events_touch ON public.commercial_opportunity_events;
CREATE TRIGGER trg_commercial_events_touch
BEFORE UPDATE ON public.commercial_opportunity_events
FOR EACH ROW EXECUTE FUNCTION public.commercial_calendar_touch_updated_at();

DROP TRIGGER IF EXISTS trg_commercial_campaigns_touch ON public.commercial_opportunity_campaigns;
CREATE TRIGGER trg_commercial_campaigns_touch
BEFORE UPDATE ON public.commercial_opportunity_campaigns
FOR EACH ROW EXECUTE FUNCTION public.commercial_calendar_touch_updated_at();

DROP TRIGGER IF EXISTS trg_commercial_missions_touch ON public.commercial_opportunity_missions;
CREATE TRIGGER trg_commercial_missions_touch
BEFORE UPDATE ON public.commercial_opportunity_missions
FOR EACH ROW EXECUTE FUNCTION public.commercial_calendar_touch_updated_at();

DROP TRIGGER IF EXISTS trg_commercial_assets_touch ON public.commercial_opportunity_marketing_assets;
CREATE TRIGGER trg_commercial_assets_touch
BEFORE UPDATE ON public.commercial_opportunity_marketing_assets
FOR EACH ROW EXECUTE FUNCTION public.commercial_calendar_touch_updated_at();

CREATE OR REPLACE FUNCTION public.commercial_calendar_log_event(
  _event_id uuid,
  _campaign_id uuid,
  _action text,
  _details jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.commercial_opportunity_activity_log(event_id, campaign_id, actor_id, action, details)
  VALUES (_event_id, _campaign_id, auth.uid(), _action, COALESCE(_details, '{}'::jsonb));
END;
$$;

CREATE OR REPLACE FUNCTION public.commercial_calendar_toggle_event(
  _event_id uuid,
  _is_active boolean,
  _reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event public.commercial_opportunity_events%ROWTYPE;
BEGIN
  IF NOT public.commercial_calendar_is_admin() THEN
    RAISE EXCEPTION 'commercial_calendar_admin_required';
  END IF;

  UPDATE public.commercial_opportunity_events
  SET is_active = _is_active,
      status = CASE
        WHEN _is_active AND status IN ('paused', 'draft') THEN 'active'
        WHEN NOT _is_active AND status <> 'archived' THEN 'paused'
        ELSE status
      END
  WHERE id = _event_id
  RETURNING * INTO v_event;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'commercial_opportunity_event_not_found';
  END IF;

  PERFORM public.commercial_calendar_log_event(
    _event_id,
    NULL,
    CASE WHEN _is_active THEN 'event_activated' ELSE 'event_paused' END,
    jsonb_build_object('reason', _reason, 'status', v_event.status)
  );

  RETURN jsonb_build_object('event_id', v_event.id, 'is_active', v_event.is_active, 'status', v_event.status);
END;
$$;

CREATE OR REPLACE FUNCTION public.commercial_calendar_archive_event(
  _event_id uuid,
  _reason text DEFAULT 'Archivage manuel'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event public.commercial_opportunity_events%ROWTYPE;
BEGIN
  IF NOT public.commercial_calendar_is_admin() THEN
    RAISE EXCEPTION 'commercial_calendar_admin_required';
  END IF;

  UPDATE public.commercial_opportunity_events
  SET status = 'archived',
      is_active = false,
      archived_at = now(),
      archived_reason = _reason
  WHERE id = _event_id
  RETURNING * INTO v_event;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'commercial_opportunity_event_not_found';
  END IF;

  PERFORM public.commercial_calendar_log_event(
    _event_id,
    NULL,
    'event_archived',
    jsonb_build_object('reason', _reason)
  );

  RETURN jsonb_build_object('event_id', v_event.id, 'status', v_event.status);
END;
$$;

CREATE OR REPLACE VIEW public.advisor_commercial_opportunity_calendar AS
SELECT
  e.id,
  e.name,
  e.slug,
  e.event_type,
  e.status,
  e.priority,
  e.category,
  e.description,
  e.commercial_objective,
  e.starts_at,
  e.ends_at,
  e.recurrence_rule,
  e.recommended_actions,
  e.target_client_types,
  e.target_cities,
  e.target_regions,
  e.marketing_asset_requirements,
  e.ai_brief,
  COALESCE(
    jsonb_agg(DISTINCT jsonb_build_object(
      'product_id', p.id,
      'name', p.name,
      'slug', p.slug,
      'image_url', p.image_url,
      'price', p.price,
      'relevance_score', ep.relevance_score,
      'rationale', ep.rationale
    )) FILTER (WHERE p.id IS NOT NULL),
    '[]'::jsonb
  ) AS recommended_products,
  COALESCE(
    jsonb_agg(DISTINCT jsonb_build_object(
      'category_id', c.id,
      'name', c.name,
      'slug', c.slug,
      'relevance_score', ec.relevance_score,
      'rationale', ec.rationale
    )) FILTER (WHERE c.id IS NOT NULL),
    '[]'::jsonb
  ) AS recommended_categories,
  COALESCE(
    jsonb_agg(DISTINCT jsonb_build_object(
      'mission_id', m.id,
      'title', m.title,
      'mission_type', m.mission_type,
      'priority', m.priority,
      'due_at', m.due_at,
      'status', m.status
    )) FILTER (WHERE m.id IS NOT NULL),
    '[]'::jsonb
  ) AS missions
FROM public.commercial_opportunity_events e
LEFT JOIN public.commercial_opportunity_event_products ep ON ep.event_id = e.id
LEFT JOIN public.products p ON p.id = ep.product_id AND p.is_active = true
LEFT JOIN public.commercial_opportunity_event_categories ec ON ec.event_id = e.id
LEFT JOIN public.categories c ON c.id = ec.category_id
LEFT JOIN public.commercial_opportunity_missions m
  ON m.event_id = e.id
  AND m.status IN ('available', 'assigned', 'in_progress')
WHERE e.is_active = true
  AND e.status IN ('scheduled', 'active')
  AND e.archived_at IS NULL
GROUP BY e.id;

CREATE OR REPLACE VIEW public.admin_commercial_opportunity_calendar_report AS
SELECT
  e.id,
  e.name,
  e.slug,
  e.event_type,
  e.status,
  e.is_active,
  e.priority,
  e.category,
  e.starts_at,
  e.ends_at,
  e.publication_starts_at,
  e.publication_ends_at,
  e.created_at,
  count(DISTINCT ep.product_id) AS recommended_product_count,
  count(DISTINCT ec.category_id) AS recommended_category_count,
  count(DISTINCT c.id) AS campaign_count,
  count(DISTINCT m.id) AS mission_count,
  count(DISTINCT a.id) AS marketing_asset_count
FROM public.commercial_opportunity_events e
LEFT JOIN public.commercial_opportunity_event_products ep ON ep.event_id = e.id
LEFT JOIN public.commercial_opportunity_event_categories ec ON ec.event_id = e.id
LEFT JOIN public.commercial_opportunity_campaigns c ON c.event_id = e.id
LEFT JOIN public.commercial_opportunity_missions m ON m.event_id = e.id
LEFT JOIN public.commercial_opportunity_marketing_assets a ON a.event_id = e.id
WHERE public.commercial_calendar_is_admin()
GROUP BY e.id;

CREATE OR REPLACE VIEW public.advisor_commercial_mission_board AS
SELECT
  m.id,
  m.event_id,
  e.name AS event_name,
  m.campaign_id,
  m.advisor_id,
  m.title,
  m.description,
  m.mission_type,
  m.priority,
  m.status,
  m.due_at,
  m.suggested_client_types,
  m.suggested_cities,
  m.success_criteria,
  m.ai_prompt_context,
  m.created_at,
  m.updated_at
FROM public.commercial_opportunity_missions m
LEFT JOIN public.commercial_opportunity_events e ON e.id = m.event_id
WHERE m.status IN ('available', 'assigned', 'in_progress')
  AND (m.advisor_id IS NULL OR m.advisor_id = auth.uid() OR public.commercial_calendar_is_admin());

ALTER TABLE public.commercial_opportunity_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_opportunity_event_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_opportunity_event_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_opportunity_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_opportunity_missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_opportunity_marketing_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_opportunity_activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Commercial calendar admins manage events" ON public.commercial_opportunity_events;
CREATE POLICY "Commercial calendar admins manage events"
ON public.commercial_opportunity_events FOR ALL TO authenticated
USING (public.commercial_calendar_is_admin())
WITH CHECK (public.commercial_calendar_is_admin());

DROP POLICY IF EXISTS "Advisors read active commercial events" ON public.commercial_opportunity_events;
CREATE POLICY "Advisors read active commercial events"
ON public.commercial_opportunity_events FOR SELECT TO authenticated
USING (is_active = true AND status IN ('scheduled', 'active') AND archived_at IS NULL);

DROP POLICY IF EXISTS "Commercial calendar admins manage event categories" ON public.commercial_opportunity_event_categories;
CREATE POLICY "Commercial calendar admins manage event categories"
ON public.commercial_opportunity_event_categories FOR ALL TO authenticated
USING (public.commercial_calendar_is_admin())
WITH CHECK (public.commercial_calendar_is_admin());

DROP POLICY IF EXISTS "Advisors read active event categories" ON public.commercial_opportunity_event_categories;
CREATE POLICY "Advisors read active event categories"
ON public.commercial_opportunity_event_categories FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.commercial_opportunity_events e
    WHERE e.id = event_id
      AND e.is_active = true
      AND e.status IN ('scheduled', 'active')
      AND e.archived_at IS NULL
  )
);

DROP POLICY IF EXISTS "Commercial calendar admins manage event products" ON public.commercial_opportunity_event_products;
CREATE POLICY "Commercial calendar admins manage event products"
ON public.commercial_opportunity_event_products FOR ALL TO authenticated
USING (public.commercial_calendar_is_admin())
WITH CHECK (public.commercial_calendar_is_admin());

DROP POLICY IF EXISTS "Advisors read active event products" ON public.commercial_opportunity_event_products;
CREATE POLICY "Advisors read active event products"
ON public.commercial_opportunity_event_products FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.commercial_opportunity_events e
    WHERE e.id = event_id
      AND e.is_active = true
      AND e.status IN ('scheduled', 'active')
      AND e.archived_at IS NULL
  )
);

DROP POLICY IF EXISTS "Commercial calendar admins manage campaigns" ON public.commercial_opportunity_campaigns;
CREATE POLICY "Commercial calendar admins manage campaigns"
ON public.commercial_opportunity_campaigns FOR ALL TO authenticated
USING (public.commercial_calendar_is_admin())
WITH CHECK (public.commercial_calendar_is_admin());

DROP POLICY IF EXISTS "Advisors read active campaigns" ON public.commercial_opportunity_campaigns;
CREATE POLICY "Advisors read active campaigns"
ON public.commercial_opportunity_campaigns FOR SELECT TO authenticated
USING (status IN ('scheduled', 'active', 'completed'));

DROP POLICY IF EXISTS "Commercial calendar admins manage missions" ON public.commercial_opportunity_missions;
CREATE POLICY "Commercial calendar admins manage missions"
ON public.commercial_opportunity_missions FOR ALL TO authenticated
USING (public.commercial_calendar_is_admin())
WITH CHECK (public.commercial_calendar_is_admin());

DROP POLICY IF EXISTS "Advisors read available or assigned missions" ON public.commercial_opportunity_missions;
CREATE POLICY "Advisors read available or assigned missions"
ON public.commercial_opportunity_missions FOR SELECT TO authenticated
USING (status IN ('available', 'assigned', 'in_progress') AND (advisor_id IS NULL OR advisor_id = auth.uid()));

DROP POLICY IF EXISTS "Commercial calendar admins manage marketing assets" ON public.commercial_opportunity_marketing_assets;
CREATE POLICY "Commercial calendar admins manage marketing assets"
ON public.commercial_opportunity_marketing_assets FOR ALL TO authenticated
USING (public.commercial_calendar_is_admin())
WITH CHECK (public.commercial_calendar_is_admin());

DROP POLICY IF EXISTS "Advisors read ready marketing assets" ON public.commercial_opportunity_marketing_assets;
CREATE POLICY "Advisors read ready marketing assets"
ON public.commercial_opportunity_marketing_assets FOR SELECT TO authenticated
USING (status IN ('ready', 'approved'));

DROP POLICY IF EXISTS "Commercial calendar admins read activity" ON public.commercial_opportunity_activity_log;
CREATE POLICY "Commercial calendar admins read activity"
ON public.commercial_opportunity_activity_log FOR SELECT TO authenticated
USING (public.commercial_calendar_is_admin());

DROP POLICY IF EXISTS "Commercial calendar admins append activity" ON public.commercial_opportunity_activity_log;
CREATE POLICY "Commercial calendar admins append activity"
ON public.commercial_opportunity_activity_log FOR INSERT TO authenticated
WITH CHECK (public.commercial_calendar_is_admin());

REVOKE ALL ON FUNCTION public.commercial_calendar_toggle_event(uuid, boolean, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.commercial_calendar_archive_event(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.commercial_calendar_toggle_event(uuid, boolean, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.commercial_calendar_archive_event(uuid, text) TO authenticated, service_role;

GRANT SELECT ON public.advisor_commercial_opportunity_calendar TO authenticated, service_role;
GRANT SELECT ON public.advisor_commercial_mission_board TO authenticated, service_role;
GRANT SELECT ON public.admin_commercial_opportunity_calendar_report TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON public.commercial_opportunity_events TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON public.commercial_opportunity_event_categories TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON public.commercial_opportunity_event_products TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON public.commercial_opportunity_campaigns TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON public.commercial_opportunity_missions TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON public.commercial_opportunity_marketing_assets TO authenticated, service_role;
GRANT SELECT, INSERT ON public.commercial_opportunity_activity_log TO authenticated, service_role;

INSERT INTO public.commercial_opportunity_events (
  name, slug, event_type, status, priority, category, description, commercial_objective,
  starts_at, ends_at, recurrence_rule, recommended_actions, target_client_types,
  target_cities, marketing_asset_requirements, ai_brief
)
VALUES
  ('Nouvel An', 'nouvel-an', 'seasonal', 'scheduled', 'critical', 'celebration', 'Période premium pour champagnes, vins mousseux, cadeaux et commandes entreprises.', 'Maximiser les ventes de célébration et coffrets cadeaux.',
   '2026-01-01 00:00:00+00', '2026-01-07 23:59:59+00', '{"frequency":"yearly","month":1,"day":1}'::jsonb,
   '["Relancer clients VIP", "Préparer offres champagnes", "Cibler entreprises et événements familiaux"]'::jsonb,
   ARRAY['vip', 'company', 'event', 'loyal'], ARRAY['Yaoundé', 'Douala'],
   '[{"type":"whatsapp_script","need":"message court premium"}, {"type":"visual_brief","need":"champagnes et coffrets"}]'::jsonb,
   '{"future_modules":["daily_ai_goals","coach_ai","whatsapp_campaigns","marketplace"]}'::jsonb),
  ('Saint-Valentin', 'saint-valentin', 'seasonal', 'scheduled', 'high', 'gift', 'Occasion cadeau pour couples, expériences, vins doux et champagnes.', 'Augmenter les paniers cadeau et les recommandations personnalisées.',
   '2026-02-01 00:00:00+00', '2026-02-14 23:59:59+00', '{"frequency":"yearly","month":2,"day":14}'::jsonb,
   '["Segmenter couples et cadeaux", "Proposer messages prêts à envoyer", "Mettre en avant coffrets"]'::jsonb,
   ARRAY['individual', 'vip', 'gift'], ARRAY['Yaoundé', 'Douala'],
   '[{"type":"message_template","need":"cadeau romantique"}, {"type":"product_bundle","need":"champagne + coffret"}]'::jsonb,
   '{"future_modules":["coach_ai","visual_generator","crm"]}'::jsonb),
  ('Journée de la Femme', 'journee-de-la-femme', 'seasonal', 'scheduled', 'high', 'celebration', 'Campagnes cadeaux, événements et entreprises autour du 8 mars.', 'Développer les ventes cadeaux et événements professionnels.',
   '2026-03-01 00:00:00+00', '2026-03-08 23:59:59+00', '{"frequency":"yearly","month":3,"day":8}'::jsonb,
   '["Cibler entreprises", "Préparer packs cadeaux", "Relancer contacts événementiels"]'::jsonb,
   ARRAY['company', 'event', 'gift'], ARRAY['Yaoundé', 'Douala'],
   '[{"type":"email_template","need":"offre entreprises"}, {"type":"visual_brief","need":"cadeaux premium"}]'::jsonb,
   '{"future_modules":["email_campaigns","business_assistant"]}'::jsonb),
  ('Ramadan', 'ramadan', 'seasonal', 'scheduled', 'medium', 'community', 'Période personnalisable selon calendrier lunaire, avec communication adaptée.', 'Préparer actions commerciales respectueuses du contexte local.',
   '2026-02-08 00:00:00+00', '2026-03-10 23:59:59+00', '{"frequency":"manual_yearly","reason":"lunar_calendar"}'::jsonb,
   '["Adapter le message", "Mettre en avant sans alcool si pertinent", "Planifier après rupture du jeûne"]'::jsonb,
   ARRAY['individual', 'company'], ARRAY['Yaoundé', 'Douala'],
   '[{"type":"message_template","need":"communication respectueuse"}]'::jsonb,
   '{"future_modules":["coach_ai","crm"]}'::jsonb),
  ('Pâques', 'paques', 'seasonal', 'scheduled', 'medium', 'family', 'Repas familiaux, cadeaux et événements religieux/familiaux.', 'Stimuler ventes vins, champagnes et cadeaux familiaux.',
   '2026-03-20 00:00:00+00', '2026-04-05 23:59:59+00', '{"frequency":"manual_yearly","reason":"movable_feast"}'::jsonb,
   '["Relancer familles", "Préparer sélection repas", "Proposer packs découverte"]'::jsonb,
   ARRAY['individual', 'family', 'gift'], ARRAY['Yaoundé', 'Douala'],
   '[{"type":"product_bundle","need":"accords repas"}]'::jsonb,
   '{"future_modules":["product_recommender","coach_ai"]}'::jsonb),
  ('Fête des Mères', 'fete-des-meres', 'seasonal', 'scheduled', 'high', 'gift', 'Occasion cadeau forte, personnalisable selon calendrier local.', 'Vendre coffrets, champagnes et cadeaux personnalisés.',
   '2026-05-15 00:00:00+00', '2026-05-30 23:59:59+00', '{"frequency":"manual_yearly"}'::jsonb,
   '["Préparer messages cadeau", "Relancer anciens acheteurs cadeaux", "Mettre en avant emballage cadeau"]'::jsonb,
   ARRAY['gift', 'individual', 'vip'], ARRAY['Yaoundé', 'Douala'],
   '[{"type":"whatsapp_script","need":"message fête des mères"}]'::jsonb,
   '{"future_modules":["crm","message_generator"]}'::jsonb),
  ('Fête des Pères', 'fete-des-peres', 'seasonal', 'scheduled', 'high', 'gift', 'Occasion cadeau whisky, cognac, rhum et coffrets.', 'Augmenter ventes spiritueux premium et coffrets.',
   '2026-06-01 00:00:00+00', '2026-06-21 23:59:59+00', '{"frequency":"manual_yearly"}'::jsonb,
   '["Segmenter amateurs spiritueux", "Proposer coffrets", "Préparer relance WhatsApp"]'::jsonb,
   ARRAY['gift', 'individual', 'vip'], ARRAY['Yaoundé', 'Douala'],
   '[{"type":"product_bundle","need":"whisky/cognac premium"}]'::jsonb,
   '{"future_modules":["coach_ai","marketplace"]}'::jsonb),
  ('Mariages', 'mariages', 'life_event', 'active', 'critical', 'event', 'Opportunité récurrente personnalisable pour devis gros, champagnes et vins de réception.', 'Capturer les devis événementiels et ventes en gros.',
   '2026-01-01 00:00:00+00', '2026-12-31 23:59:59+00', '{"frequency":"always_on"}'::jsonb,
   '["Identifier couples et organisateurs", "Préparer devis gros", "Proposer champagnes et vins réception"]'::jsonb,
   ARRAY['event', 'company', 'wholesale'], ARRAY['Yaoundé', 'Douala'],
   '[{"type":"landing_page_brief","need":"devis mariage"}, {"type":"whatsapp_script","need":"réponse devis"}]'::jsonb,
   '{"future_modules":["crm","quote_engine","coach_ai"]}'::jsonb),
  ('Anniversaires', 'anniversaires', 'life_event', 'active', 'medium', 'gift', 'Relances CRM personnalisées autour anniversaires clients et proches.', 'Créer des ventes régulières par relance personnalisée.',
   '2026-01-01 00:00:00+00', '2026-12-31 23:59:59+00', '{"frequency":"always_on","crm_date_field":"birthday"}'::jsonb,
   '["Surveiller anniversaires CRM", "Proposer cadeau selon budget", "Envoyer message prêt à personnaliser"]'::jsonb,
   ARRAY['individual', 'gift', 'vip'], ARRAY['Yaoundé', 'Douala'],
   '[{"type":"message_template","need":"anniversaire"}]'::jsonb,
   '{"future_modules":["crm","daily_ai_goals","message_generator"]}'::jsonb),
  ('Baptêmes', 'baptemes', 'life_event', 'scheduled', 'medium', 'family', 'Réceptions familiales avec besoins en vins, champagnes et boissons sans alcool.', 'Augmenter devis événementiels familiaux.',
   '2026-01-01 00:00:00+00', '2026-12-31 23:59:59+00', '{"frequency":"always_on"}'::jsonb,
   '["Identifier familles", "Préparer offre réception", "Proposer quantités adaptées"]'::jsonb,
   ARRAY['family', 'event'], ARRAY['Yaoundé', 'Douala'],
   '[{"type":"product_bundle","need":"réception familiale"}]'::jsonb,
   '{"future_modules":["quote_engine","coach_ai"]}'::jsonb),
  ('Diplômes', 'diplomes', 'seasonal', 'scheduled', 'medium', 'celebration', 'Saisons de remise de diplômes, fêtes étudiantes et cadeaux.', 'Stimuler ventes célébration et cadeaux accessibles.',
   '2026-06-01 00:00:00+00', '2026-08-31 23:59:59+00', '{"frequency":"yearly","months":[6,7,8]}'::jsonb,
   '["Cibler familles", "Proposer champagnes accessibles", "Préparer packs fête"]'::jsonb,
   ARRAY['family', 'gift', 'individual'], ARRAY['Yaoundé', 'Douala'],
   '[{"type":"visual_brief","need":"célébration diplôme"}]'::jsonb,
   '{"future_modules":["visual_generator","crm"]}'::jsonb),
  ('Vacances', 'vacances', 'seasonal', 'scheduled', 'medium', 'leisure', 'Périodes de détente, retrouvailles et consommation conviviale.', 'Optimiser sélections vins, spiritueux et offres découverte.',
   '2026-07-01 00:00:00+00', '2026-08-31 23:59:59+00', '{"frequency":"yearly","months":[7,8]}'::jsonb,
   '["Mettre en avant formats partage", "Relancer clients loisirs", "Créer bundles vacances"]'::jsonb,
   ARRAY['individual', 'family', 'loyal'], ARRAY['Yaoundé', 'Douala'],
   '[{"type":"product_bundle","need":"vacances et partage"}]'::jsonb,
   '{"future_modules":["coach_ai","retention"]}'::jsonb),
  ('Rentrée scolaire', 'rentree-scolaire', 'seasonal', 'scheduled', 'low', 'family', 'Période de budget familial sensible, opportunités limitées mais utiles en B2B.', 'Adapter les campagnes et éviter surpromotion non pertinente.',
   '2026-08-15 00:00:00+00', '2026-09-30 23:59:59+00', '{"frequency":"yearly","months":[8,9]}'::jsonb,
   '["Prioriser entreprises", "Limiter pression commerciale", "Préparer offres budget contrôlé"]'::jsonb,
   ARRAY['company', 'loyal'], ARRAY['Yaoundé', 'Douala'],
   '[{"type":"message_template","need":"budget maîtrisé"}]'::jsonb,
   '{"future_modules":["business_assistant","governance"]}'::jsonb),
  ('Noël', 'noel', 'seasonal', 'scheduled', 'critical', 'gift', 'Très forte période cadeaux, entreprises, coffrets et célébrations.', 'Maximiser ventes premium, coffrets et commandes entreprises.',
   '2026-12-01 00:00:00+00', '2026-12-25 23:59:59+00', '{"frequency":"yearly","month":12,"day":25}'::jsonb,
   '["Créer offres coffrets", "Relancer entreprises", "Préparer visuels cadeaux", "Planifier stocks"]'::jsonb,
   ARRAY['vip', 'company', 'gift', 'event'], ARRAY['Yaoundé', 'Douala'],
   '[{"type":"visual_brief","need":"coffrets Noël"}, {"type":"email_template","need":"offres entreprises"}]'::jsonb,
   '{"future_modules":["stock_forecast","coach_ai","email_campaigns","marketplace"]}'::jsonb),
  ('Fin d''année', 'fin-d-annee', 'seasonal', 'scheduled', 'critical', 'celebration', 'Période clé pour fêtes, entreprises, familles et achats de dernière minute.', 'Créer un pic commercial maîtrisé et anticipé.',
   '2026-12-20 00:00:00+00', '2026-12-31 23:59:59+00', '{"frequency":"yearly","month":12,"day":31}'::jsonb,
   '["Relancer tous segments chauds", "Prioriser champagnes", "Préparer scripts urgence livraison"]'::jsonb,
   ARRAY['vip', 'company', 'event', 'loyal'], ARRAY['Yaoundé', 'Douala'],
   '[{"type":"whatsapp_script","need":"dernière minute"}, {"type":"product_bundle","need":"fête premium"}]'::jsonb,
   '{"future_modules":["daily_ai_goals","whatsapp_campaigns","logistics"]}'::jsonb),
  ('Événements entreprises', 'evenements-entreprises', 'company', 'active', 'high', 'b2b', 'Séminaires, pots de départ, inaugurations, fêtes internes et cadeaux corporate.', 'Développer B2B, devis gros et récurrence entreprise.',
   '2026-01-01 00:00:00+00', '2026-12-31 23:59:59+00', '{"frequency":"always_on"}'::jsonb,
   '["Identifier décideurs", "Préparer proposition B2B", "Créer devis rapide"]'::jsonb,
   ARRAY['company', 'wholesale', 'event'], ARRAY['Yaoundé', 'Douala'],
   '[{"type":"email_template","need":"proposition entreprise"}, {"type":"landing_page_brief","need":"devis B2B"}]'::jsonb,
   '{"future_modules":["crm","quote_engine","business_assistant"]}'::jsonb),
  ('Lancements produits', 'lancements-produits', 'product_launch', 'active', 'medium', 'marketplace', 'Mise en avant structurée des nouveautés et exclusivités.', 'Augmenter adoption nouveaux produits et visibilité vendeurs.',
   '2026-01-01 00:00:00+00', '2026-12-31 23:59:59+00', '{"frequency":"always_on"}'::jsonb,
   '["Sélectionner nouveautés", "Créer briefs vendeurs", "Préparer supports conseillers"]'::jsonb,
   ARRAY['vip', 'loyal', 'marketplace'], ARRAY['Yaoundé', 'Douala'],
   '[{"type":"visual_brief","need":"nouveau produit"}, {"type":"message_template","need":"découverte"}]'::jsonb,
   '{"future_modules":["marketplace_coach","visual_generator","recommendations"]}'::jsonb),
  ('Promotions LPB', 'promotions-lpb', 'lpb_promotion', 'active', 'high', 'promotion', 'Campagnes commerciales LPB internes, contrôlées par l’admin.', 'Piloter promotions sans toucher aux règles financières du P0.',
   '2026-01-01 00:00:00+00', '2026-12-31 23:59:59+00', '{"frequency":"always_on"}'::jsonb,
   '["Préparer brief campagne", "Sélectionner produits", "Associer missions conseillers"]'::jsonb,
   ARRAY['loyal', 'vip', 'company', 'individual'], ARRAY['Yaoundé', 'Douala'],
   '[{"type":"product_bundle","need":"promotion contrôlée"}, {"type":"whatsapp_script","need":"offre limitée"}]'::jsonb,
   '{"future_modules":["daily_ai_goals","coach_ai","campaigns"]}'::jsonb)
ON CONFLICT (slug) DO NOTHING;

NOTIFY pgrst, 'reload schema';
