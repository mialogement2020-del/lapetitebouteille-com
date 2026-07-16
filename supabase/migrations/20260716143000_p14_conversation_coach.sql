-- P1.4 - LPB Conversation Coach.
-- Commercial assistant only: no wallet, commission, order, P0 or accounting mutation.

ALTER TYPE public.admin_permission ADD VALUE IF NOT EXISTS 'conversation_coach';

CREATE OR REPLACE FUNCTION public.conversation_coach_is_admin()
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
        AND ap.permission::text IN ('full_access', 'crm', 'commercial_calendar', 'ai_goals', 'conversation_coach')
    );
$$;

CREATE TABLE IF NOT EXISTS public.coach_conversation_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advisor_id uuid NOT NULL DEFAULT auth.uid(),
  contact_id uuid REFERENCES public.crm_contacts(id) ON DELETE SET NULL,
  source_channel text NOT NULL DEFAULT 'whatsapp'
    CHECK (source_channel IN ('whatsapp', 'messenger', 'email', 'sms', 'phone_note', 'free_question')),
  mode text NOT NULL DEFAULT 'general'
    CHECK (mode IN ('general', 'gift', 'wedding', 'company', 'wholesale', 'birthday', 'abandoned_cart', 'follow_up')),
  status text NOT NULL DEFAULT 'analyzed'
    CHECK (status IN ('draft', 'analyzed', 'archived')),
  conversation_text text NOT NULL,
  detected_budget numeric,
  detected_occasion text,
  detected_city text,
  detected_people_count integer,
  detected_customer_type text,
  detected_intent text,
  detected_urgency text,
  detected_objections text[] NOT NULL DEFAULT '{}',
  detected_risk_flags text[] NOT NULL DEFAULT '{}',
  analysis_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.coach_conversation_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.coach_conversation_sessions(id) ON DELETE CASCADE,
  recommendation_type text NOT NULL
    CHECK (recommendation_type IN ('main_product', 'economy_alternative', 'premium_alternative', 'complementary', 'upsell', 'script', 'objection_response')),
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  title text NOT NULL,
  rationale text,
  suggested_message text,
  score numeric NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.coach_response_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.coach_conversation_sessions(id) ON DELETE CASCADE,
  variant_type text NOT NULL CHECK (variant_type IN ('short', 'professional', 'warm', 'premium', 'whatsapp', 'email', 'sms')),
  content text NOT NULL,
  tone text NOT NULL,
  is_selected boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.coach_script_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  script_type text NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  variables jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (script_type, title)
);

CREATE TABLE IF NOT EXISTS public.coach_conversation_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.coach_conversation_sessions(id) ON DELETE CASCADE,
  outcome text NOT NULL CHECK (outcome IN ('won', 'lost', 'no_response', 'follow_up', 'neutral')),
  reason text,
  selected_variant_id uuid REFERENCES public.coach_response_variants(id) ON DELETE SET NULL,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.coach_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES public.coach_conversation_sessions(id) ON DELETE SET NULL,
  advisor_id uuid NOT NULL DEFAULT auth.uid(),
  action text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.coach_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_coach_conversation_sessions_touch ON public.coach_conversation_sessions;
CREATE TRIGGER trg_coach_conversation_sessions_touch
BEFORE UPDATE ON public.coach_conversation_sessions
FOR EACH ROW
EXECUTE FUNCTION public.coach_touch_updated_at();

DROP TRIGGER IF EXISTS trg_coach_script_templates_touch ON public.coach_script_templates;
CREATE TRIGGER trg_coach_script_templates_touch
BEFORE UPDATE ON public.coach_script_templates
FOR EACH ROW
EXECUTE FUNCTION public.coach_touch_updated_at();

CREATE OR REPLACE FUNCTION public.coach_activity_is_append_only()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'coach_activity_log_append_only';
END;
$$;

DROP TRIGGER IF EXISTS trg_coach_activity_log_append_only_update ON public.coach_activity_log;
CREATE TRIGGER trg_coach_activity_log_append_only_update
BEFORE UPDATE OR DELETE ON public.coach_activity_log
FOR EACH ROW
EXECUTE FUNCTION public.coach_activity_is_append_only();

CREATE OR REPLACE FUNCTION public.coach_can_access_session(_session_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.coach_conversation_sessions s
    WHERE s.id = _session_id
      AND (s.advisor_id = auth.uid() OR public.conversation_coach_is_admin())
  );
$$;

CREATE OR REPLACE FUNCTION public.coach_make_message(
  _variant text,
  _occasion text,
  _objections text[],
  _customer_type text
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v_intro text;
  v_objection text := CASE WHEN 'price' = ANY(_objections) THEN 'Je peux aussi vous proposer une alternative plus accessible sans perdre en qualite. ' ELSE '' END;
  v_b2b text := CASE WHEN _customer_type = 'company' THEN 'Pour votre entreprise, nous pouvons organiser une selection adaptee et une livraison planifiee. ' ELSE '' END;
BEGIN
  IF _variant = 'short' THEN
    v_intro := 'Oui, je peux vous aider a choisir rapidement. ';
  ELSIF _variant = 'professional' THEN
    v_intro := 'Bonjour, merci pour votre message. Je vous propose une selection adaptee a votre besoin. ';
  ELSIF _variant = 'warm' THEN
    v_intro := 'Avec plaisir, je vais vous orienter vers le meilleur choix selon votre occasion. ';
  ELSIF _variant = 'premium' THEN
    v_intro := 'Pour un rendu elegant et memorable, je vous recommande une reference premium bien adaptee. ';
  ELSIF _variant = 'email' THEN
    v_intro := 'Bonjour,\n\nMerci pour votre demande. Voici une proposition adaptee a votre besoin. ';
  ELSIF _variant = 'sms' THEN
    v_intro := 'Bonjour, voici une suggestion LPB adaptee a votre besoin. ';
  ELSE
    v_intro := 'Bonjour, merci pour votre message. ';
  END IF;

  RETURN v_intro || v_b2b || v_objection || 'Dites-moi votre budget et la ville de livraison, je vous confirme la meilleure option disponible.';
END;
$$;

CREATE OR REPLACE FUNCTION public.coach_analyze_conversation(
  _conversation_text text,
  _contact_id uuid DEFAULT NULL,
  _source_channel text DEFAULT 'whatsapp',
  _mode text DEFAULT 'general'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session_id uuid;
  v_text text := lower(COALESCE(_conversation_text, ''));
  v_digits text;
  v_budget numeric;
  v_occasion text := NULL;
  v_city text := NULL;
  v_customer_type text := 'individual';
  v_intent text := 'medium';
  v_urgency text := 'normal';
  v_objections text[] := '{}';
  v_risks text[] := '{}';
  v_product record;
  v_rank integer := 0;
  v_type text;
  v_title text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication_required';
  END IF;

  IF COALESCE(trim(_conversation_text), '') = '' THEN
    RAISE EXCEPTION 'conversation_text_required';
  END IF;

  IF _contact_id IS NOT NULL AND NOT public.crm_can_access_contact(_contact_id) THEN
    RAISE EXCEPTION 'crm_contact_access_denied';
  END IF;

  v_digits := regexp_replace(COALESCE(substring(_conversation_text FROM '([0-9][0-9 .]{2,})'), ''), '[^0-9]', '', 'g');
  v_budget := NULLIF(v_digits, '')::numeric;

  IF v_text ~ '(mariage|marie|ceremonie)' THEN v_occasion := 'wedding'; END IF;
  IF v_text ~ '(anniversaire|birthday)' THEN v_occasion := COALESCE(v_occasion, 'birthday'); END IF;
  IF v_text ~ '(cadeau|offrir|coffret)' THEN v_occasion := COALESCE(v_occasion, 'gift'); END IF;
  IF v_text ~ '(entreprise|societe|hotel|restaurant|client|partenaire)' THEN v_customer_type := 'company'; END IF;
  IF v_text ~ '(gros|carton|caisse|wholesale|revendre)' THEN v_customer_type := 'wholesale'; END IF;
  IF v_text ~ '(yaounde|yaounde|yaounde|yaoundé)' THEN v_city := 'Yaounde'; END IF;
  IF v_text ~ '(douala)' THEN v_city := 'Douala'; END IF;
  IF v_text ~ '(urgent|aujourd.hui|maintenant|ce soir|vite)' THEN v_urgency := 'urgent'; END IF;
  IF v_text ~ '(acheter|commande|prendre|livrer|disponible|prix)' THEN v_intent := 'high'; END IF;

  IF v_text ~ '(trop cher|cher|moins cher|reduction|reduction|remise|prix)' THEN v_objections := array_append(v_objections, 'price'); END IF;
  IF v_text ~ '(je reflechis|reflechir|plus tard|demain)' THEN v_objections := array_append(v_objections, 'thinking'); END IF;
  IF v_text ~ '(ailleurs|concurrent|autre boutique|moins couteux)' THEN v_objections := array_append(v_objections, 'competitor'); END IF;
  IF v_text ~ '(livraison|frais)' THEN v_objections := array_append(v_objections, 'delivery_fee'); END IF;
  IF v_text ~ '(connais pas|marque inconnue)' THEN v_objections := array_append(v_objections, 'unknown_brand'); END IF;
  IF v_text ~ '(urgent|concurrent|moins cher)' THEN v_risks := array_append(v_risks, 'risk_of_lost_sale'); END IF;

  INSERT INTO public.coach_conversation_sessions (
    advisor_id, contact_id, source_channel, mode, conversation_text,
    detected_budget, detected_occasion, detected_city, detected_customer_type,
    detected_intent, detected_urgency, detected_objections, detected_risk_flags, analysis_summary
  )
  VALUES (
    auth.uid(), _contact_id, COALESCE(_source_channel, 'whatsapp'), COALESCE(_mode, 'general'), _conversation_text,
    v_budget, COALESCE(v_occasion, _mode), v_city, v_customer_type,
    v_intent, v_urgency, v_objections, v_risks,
    jsonb_build_object(
      'engine_version', 'p1.4-observation',
      'summary', 'Conversation analysee pour suggerer une reponse commerciale sans envoi automatique.',
      'data_sources_allowed', ARRAY['crm', 'commercial_calendar', 'ai_goals', 'catalog', 'availability', 'promotions'],
      'data_sources_forbidden', ARRAY['purchase_costs', 'margins', 'accounting', 'p0', 'commission_pool']
    )
  )
  RETURNING id INTO v_session_id;

  FOREACH v_type IN ARRAY ARRAY['short', 'professional', 'warm', 'premium', 'whatsapp', 'email', 'sms']
  LOOP
    INSERT INTO public.coach_response_variants (session_id, variant_type, tone, content)
    VALUES (v_session_id, v_type, v_type, public.coach_make_message(v_type, COALESCE(v_occasion, _mode), v_objections, v_customer_type));
  END LOOP;

  FOR v_product IN
    SELECT id, name, price, image_url, stock_quantity
    FROM public.products
    WHERE is_active = true
      AND COALESCE(stock_quantity, 0) > 0
      AND (v_budget IS NULL OR price <= (v_budget * 1.35))
    ORDER BY is_featured DESC, price DESC NULLS LAST, name ASC
    LIMIT 3
  LOOP
    v_rank := v_rank + 1;
    v_type := CASE v_rank WHEN 1 THEN 'main_product' WHEN 2 THEN 'premium_alternative' ELSE 'economy_alternative' END;
    v_title := CASE v_rank WHEN 1 THEN 'Recommandation principale' WHEN 2 THEN 'Alternative premium' ELSE 'Alternative economique' END;

    INSERT INTO public.coach_conversation_recommendations (
      session_id, recommendation_type, product_id, title, rationale, suggested_message, score, metadata
    )
    VALUES (
      v_session_id,
      v_type,
      v_product.id,
      v_title || ' - ' || v_product.name,
      'Produit actif et disponible, adapte au contexte detecte par le Coach IA.',
      'Je vous recommande ' || v_product.name || ', une option disponible qui correspond bien a votre besoin.',
      GREATEST(60, 100 - (v_rank * 8)),
      jsonb_build_object('sale_price', v_product.price, 'stock_quantity', v_product.stock_quantity, 'image_url', v_product.image_url)
    );
  END LOOP;

  IF 'price' = ANY(v_objections) THEN
    INSERT INTO public.coach_conversation_recommendations (session_id, recommendation_type, title, rationale, suggested_message, score)
    VALUES (
      v_session_id,
      'objection_response',
      'Reponse objection prix',
      'Le client signale une sensibilite au prix.',
      'Je comprends. Lidee est de choisir le meilleur rapport qualite/prix selon votre budget, sans sacrifier la presentation.',
      92
    );
  END IF;

  INSERT INTO public.coach_activity_log (session_id, advisor_id, action, payload)
  VALUES (
    v_session_id,
    auth.uid(),
    'conversation_analyzed',
    jsonb_build_object('intent', v_intent, 'urgency', v_urgency, 'objections', v_objections, 'risk_flags', v_risks)
  );

  RETURN jsonb_build_object(
    'session_id', v_session_id,
    'intent', v_intent,
    'urgency', v_urgency,
    'objections', v_objections,
    'risk_flags', v_risks
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.coach_record_feedback(
  _session_id uuid,
  _outcome text,
  _reason text DEFAULT NULL,
  _selected_variant_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_feedback_id uuid;
BEGIN
  IF NOT public.coach_can_access_session(_session_id) THEN
    RAISE EXCEPTION 'coach_session_access_denied';
  END IF;

  INSERT INTO public.coach_conversation_feedback (session_id, outcome, reason, selected_variant_id, created_by)
  VALUES (_session_id, _outcome, _reason, _selected_variant_id, auth.uid())
  RETURNING id INTO v_feedback_id;

  INSERT INTO public.coach_activity_log (session_id, advisor_id, action, payload)
  SELECT _session_id, s.advisor_id, 'feedback_recorded', jsonb_build_object('outcome', _outcome, 'reason', _reason)
  FROM public.coach_conversation_sessions s
  WHERE s.id = _session_id;

  RETURN jsonb_build_object('feedback_id', v_feedback_id, 'session_id', _session_id, 'outcome', _outcome);
END;
$$;

CREATE OR REPLACE VIEW public.advisor_conversation_coach_dashboard AS
SELECT
  s.*,
  COALESCE(
    (
      SELECT jsonb_agg(to_jsonb(r) ORDER BY r.score DESC, r.created_at DESC)
      FROM public.coach_conversation_recommendations r
      WHERE r.session_id = s.id
    ),
    '[]'::jsonb
  ) AS recommendations,
  COALESCE(
    (
      SELECT jsonb_agg(to_jsonb(v) ORDER BY v.created_at ASC)
      FROM public.coach_response_variants v
      WHERE v.session_id = s.id
    ),
    '[]'::jsonb
  ) AS response_variants,
  (
    SELECT to_jsonb(f)
    FROM public.coach_conversation_feedback f
    WHERE f.session_id = s.id
    ORDER BY f.created_at DESC
    LIMIT 1
  ) AS latest_feedback
FROM public.coach_conversation_sessions s
WHERE s.advisor_id = auth.uid()
   OR public.conversation_coach_is_admin();

CREATE OR REPLACE VIEW public.advisor_coach_script_library AS
SELECT id, script_type, title, content, variables, is_active, created_at, updated_at
FROM public.coach_script_templates
WHERE is_active = true;

CREATE OR REPLACE VIEW public.admin_conversation_coach_report AS
SELECT
  s.advisor_id,
  count(*) AS conversations_analyzed,
  count(*) FILTER (WHERE f.outcome = 'won') AS won_total,
  count(*) FILTER (WHERE f.outcome = 'lost') AS lost_total,
  count(*) FILTER (WHERE f.outcome = 'no_response') AS no_response_total,
  count(*) FILTER (WHERE f.outcome = 'follow_up') AS follow_up_total,
  round(
    100.0 * count(*) FILTER (WHERE f.outcome = 'won') / NULLIF(count(*) FILTER (WHERE f.outcome IS NOT NULL), 0),
    2
  ) AS estimated_success_rate,
  jsonb_agg(DISTINCT objection) FILTER (WHERE objection IS NOT NULL) AS frequent_objections,
  max(s.created_at) AS last_conversation_at
FROM public.coach_conversation_sessions s
LEFT JOIN LATERAL unnest(s.detected_objections) AS objection ON true
LEFT JOIN LATERAL (
  SELECT outcome
  FROM public.coach_conversation_feedback f
  WHERE f.session_id = s.id
  ORDER BY f.created_at DESC
  LIMIT 1
) f ON true
WHERE public.conversation_coach_is_admin()
GROUP BY s.advisor_id;

ALTER TABLE public.coach_conversation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_conversation_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_response_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_script_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_conversation_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Advisors manage own coach sessions" ON public.coach_conversation_sessions;
CREATE POLICY "Advisors manage own coach sessions"
ON public.coach_conversation_sessions
FOR ALL
TO authenticated
USING (advisor_id = auth.uid() OR public.conversation_coach_is_admin())
WITH CHECK (advisor_id = auth.uid() OR public.conversation_coach_is_admin());

DROP POLICY IF EXISTS "Advisors read own coach recommendations" ON public.coach_conversation_recommendations;
CREATE POLICY "Advisors read own coach recommendations"
ON public.coach_conversation_recommendations
FOR SELECT
TO authenticated
USING (public.coach_can_access_session(session_id));

DROP POLICY IF EXISTS "System writes coach recommendations" ON public.coach_conversation_recommendations;
CREATE POLICY "System writes coach recommendations"
ON public.coach_conversation_recommendations
FOR INSERT
TO authenticated
WITH CHECK (public.coach_can_access_session(session_id));

DROP POLICY IF EXISTS "Advisors read own coach variants" ON public.coach_response_variants;
CREATE POLICY "Advisors read own coach variants"
ON public.coach_response_variants
FOR SELECT
TO authenticated
USING (public.coach_can_access_session(session_id));

DROP POLICY IF EXISTS "System writes coach variants" ON public.coach_response_variants;
CREATE POLICY "System writes coach variants"
ON public.coach_response_variants
FOR INSERT
TO authenticated
WITH CHECK (public.coach_can_access_session(session_id));

DROP POLICY IF EXISTS "Authenticated read active coach scripts" ON public.coach_script_templates;
CREATE POLICY "Authenticated read active coach scripts"
ON public.coach_script_templates
FOR SELECT
TO authenticated
USING (is_active = true OR public.conversation_coach_is_admin());

DROP POLICY IF EXISTS "Admins manage coach scripts" ON public.coach_script_templates;
CREATE POLICY "Admins manage coach scripts"
ON public.coach_script_templates
FOR ALL
TO authenticated
USING (public.conversation_coach_is_admin())
WITH CHECK (public.conversation_coach_is_admin());

DROP POLICY IF EXISTS "Advisors manage own coach feedback" ON public.coach_conversation_feedback;
CREATE POLICY "Advisors manage own coach feedback"
ON public.coach_conversation_feedback
FOR ALL
TO authenticated
USING (public.coach_can_access_session(session_id))
WITH CHECK (public.coach_can_access_session(session_id));

DROP POLICY IF EXISTS "Admins read coach activity log" ON public.coach_activity_log;
CREATE POLICY "Admins read coach activity log"
ON public.coach_activity_log
FOR SELECT
TO authenticated
USING (public.conversation_coach_is_admin() OR advisor_id = auth.uid());

DROP POLICY IF EXISTS "System inserts coach activity log" ON public.coach_activity_log;
CREATE POLICY "System inserts coach activity log"
ON public.coach_activity_log
FOR INSERT
TO authenticated
WITH CHECK (advisor_id = auth.uid() OR public.conversation_coach_is_admin());

INSERT INTO public.coach_script_templates (script_type, title, content, variables)
VALUES
  ('first_contact', 'Premier contact', 'Bonjour, je suis Conseiller LPB. Je peux vous aider a choisir le vin, champagne ou spiritueux adapte a votre occasion.', '["client_name", "occasion"]'::jsonb),
  ('follow_up', 'Relance douce', 'Bonjour, je reviens vers vous concernant votre demande. Souhaitez-vous que je vous propose 2 ou 3 options disponibles ?', '["client_name"]'::jsonb),
  ('thank_you', 'Remerciement apres achat', 'Merci pour votre confiance. Je reste disponible pour votre prochaine selection ou pour un cadeau.', '["client_name", "order_number"]'::jsonb),
  ('abandoned_cart', 'Panier abandonne', 'Vous aviez repere une selection LPB. Je peux verifier la disponibilite et vous proposer une alternative si besoin.', '["client_name"]'::jsonb),
  ('birthday', 'Anniversaire', 'Pour un anniversaire, je vous conseille une bouteille elegante ou un coffret adapte au budget et au profil de la personne.', '["budget"]'::jsonb),
  ('wedding', 'Mariage', 'Pour un mariage, le plus important est de choisir une reference fiable, disponible en quantite et coherente avec le repas.', '["guest_count", "budget"]'::jsonb),
  ('company', 'Entreprise', 'Pour votre entreprise, nous pouvons preparer une selection professionnelle adaptee aux clients, partenaires ou collaborateurs.', '["company_name", "quantity"]'::jsonb),
  ('wholesale', 'Vente en gros', 'Pour un achat en gros, je peux verifier les cartons ou caisses disponibles et vous orienter vers la meilleure option.', '["quantity"]'::jsonb),
  ('objection_price', 'Objection prix', 'Je comprends votre point. Je peux vous proposer une alternative plus accessible ou une reference offrant un meilleur rapport qualite/prix.', '["budget"]'::jsonb)
ON CONFLICT (script_type, title) DO UPDATE
SET content = EXCLUDED.content,
    variables = EXCLUDED.variables,
    is_active = true,
    updated_at = now();

GRANT SELECT, INSERT, UPDATE ON public.coach_conversation_sessions TO authenticated, service_role;
GRANT SELECT, INSERT ON public.coach_conversation_recommendations TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON public.coach_response_variants TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON public.coach_script_templates TO authenticated, service_role;
GRANT SELECT, INSERT ON public.coach_conversation_feedback TO authenticated, service_role;
GRANT SELECT, INSERT ON public.coach_activity_log TO authenticated, service_role;
GRANT SELECT ON public.advisor_conversation_coach_dashboard TO authenticated, service_role;
GRANT SELECT ON public.advisor_coach_script_library TO authenticated, service_role;
GRANT SELECT ON public.admin_conversation_coach_report TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.coach_analyze_conversation(text, uuid, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.coach_record_feedback(uuid, text, text, uuid) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
