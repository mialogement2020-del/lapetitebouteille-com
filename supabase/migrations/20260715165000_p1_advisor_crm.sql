-- P1 CRM Conseiller LPB.
-- Additive module only: no P0 financial mutation, no commission, no wallet change.

ALTER TYPE public.admin_permission ADD VALUE IF NOT EXISTS 'crm';

CREATE OR REPLACE FUNCTION public.crm_normalize_email(_email text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT NULLIF(lower(trim(COALESCE(_email, ''))), '')
$$;

CREATE OR REPLACE FUNCTION public.crm_normalize_phone(_phone text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT NULLIF(regexp_replace(COALESCE(_phone, ''), '[^0-9+]', '', 'g'), '')
$$;

CREATE OR REPLACE FUNCTION public.crm_is_admin()
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
          AND ap.permission::text IN ('full_access', 'crm')
      )
    )
$$;

CREATE TABLE IF NOT EXISTS public.crm_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_advisor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  linked_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  first_name text,
  last_name text,
  phone text,
  email text,
  phone_normalized text,
  email_normalized text,
  city text,
  company_name text,
  contact_type text NOT NULL DEFAULT 'individual'
    CHECK (contact_type IN ('individual', 'company', 'wholesale', 'event', 'partner')),
  relationship_status text NOT NULL DEFAULT 'prospect'
    CHECK (relationship_status IN (
      'prospect', 'new', 'interested', 'hot', 'client', 'loyal',
      'dormant', 'vip', 'company', 'lost', 'archived'
    )),
  pipeline_stage text NOT NULL DEFAULT 'prospect'
    CHECK (pipeline_stage IN (
      'prospect', 'contacted', 'interested', 'proposal_sent',
      'order_completed', 'loyal_client', 'company_need_identified',
      'quote_to_prepare', 'quote_sent', 'negotiation', 'company_order',
      'recurring_company_client'
    )),
  source text NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual', 'referral', 'platform_assigned', 'admin_transfer', 'import_preview', 'quote', 'order')),
  preferred_channel text NOT NULL DEFAULT 'whatsapp'
    CHECK (preferred_channel IN ('phone', 'whatsapp', 'email', 'sms', 'in_person', 'none')),
  birthday date,
  consent_status text NOT NULL DEFAULT 'unknown'
    CHECK (consent_status IN ('unknown', 'granted', 'refused', 'withdrawn')),
  consent_recorded_at timestamptz,
  do_not_contact boolean NOT NULL DEFAULT false,
  retention_until date,
  duplicate_key text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz,
  archived_reason text,
  CONSTRAINT crm_contacts_identity_present CHECK (
    linked_user_id IS NOT NULL
    OR phone_normalized IS NOT NULL
    OR email_normalized IS NOT NULL
    OR NULLIF(trim(COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')), '') IS NOT NULL
    OR company_name IS NOT NULL
  )
);

CREATE OR REPLACE FUNCTION public.crm_can_access_contact(_contact_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL
    AND (
      public.crm_is_admin()
      OR EXISTS (
        SELECT 1
        FROM public.crm_contacts c
        WHERE c.id = _contact_id
          AND c.owner_advisor_id = auth.uid()
          AND c.archived_at IS NULL
      )
    )
$$;

CREATE TABLE IF NOT EXISTS public.crm_contact_preferences (
  contact_id uuid PRIMARY KEY REFERENCES public.crm_contacts(id) ON DELETE CASCADE,
  preferred_categories text[] NOT NULL DEFAULT '{}',
  preferred_products text[] NOT NULL DEFAULT '{}',
  preferred_brands text[] NOT NULL DEFAULT '{}',
  budget_min numeric(12,2),
  budget_max numeric(12,2),
  preferred_occasions text[] NOT NULL DEFAULT '{}',
  dislikes text[] NOT NULL DEFAULT '{}',
  notes text,
  ai_context jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT crm_contact_preferences_budget_check CHECK (
    budget_min IS NULL OR budget_max IS NULL OR budget_min <= budget_max
  )
);

CREATE TABLE IF NOT EXISTS public.crm_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES public.crm_contacts(id) ON DELETE CASCADE,
  advisor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (char_length(trim(content)) > 0),
  is_sensitive boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.crm_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid REFERENCES public.crm_contacts(id) ON DELETE CASCADE,
  advisor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_type text NOT NULL DEFAULT 'follow_up'
    CHECK (task_type IN ('follow_up', 'birthday', 'wedding', 'event', 'company_gift', 'dormant_client', 'abandoned_cart', 'usual_product_available', 'new_offer', 'post_delivery')),
  title text NOT NULL CHECK (char_length(trim(title)) > 0),
  description text,
  due_at timestamptz NOT NULL,
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'done', 'cancelled')),
  completed_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.crm_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES public.crm_contacts(id) ON DELETE CASCADE,
  advisor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL DEFAULT 'event'
    CHECK (event_type IN ('birthday', 'wedding', 'corporate_event', 'holiday', 'meeting', 'tasting', 'other')),
  event_date date NOT NULL,
  recurrence text NOT NULL DEFAULT 'none' CHECK (recurrence IN ('none', 'yearly', 'monthly', 'weekly')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.crm_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES public.crm_contacts(id) ON DELETE CASCADE,
  advisor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opportunity_type text NOT NULL DEFAULT 'retail'
    CHECK (opportunity_type IN ('retail', 'gift', 'wedding', 'company', 'wholesale', 'subscription', 'event')),
  title text NOT NULL CHECK (char_length(trim(title)) > 0),
  estimated_budget numeric(12,2),
  stage text NOT NULL DEFAULT 'prospect'
    CHECK (stage IN ('prospect', 'need_identified', 'proposal_to_prepare', 'proposal_sent', 'negotiation', 'won', 'lost')),
  expected_date date,
  probability integer NOT NULL DEFAULT 25 CHECK (probability BETWEEN 0 AND 100),
  notes text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'won', 'lost', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.crm_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid REFERENCES public.crm_contacts(id) ON DELETE SET NULL,
  advisor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  activity_type text NOT NULL
    CHECK (activity_type IN ('created', 'updated', 'note_added', 'task_created', 'task_completed', 'event_created', 'opportunity_created', 'status_changed', 'transferred', 'archived', 'accessed', 'consent_changed')),
  channel text CHECK (channel IS NULL OR channel IN ('system', 'phone', 'whatsapp', 'email', 'sms', 'in_person', 'admin')),
  summary text NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_crm_contacts_owner_status ON public.crm_contacts(owner_advisor_id, relationship_status) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_crm_contacts_linked_user ON public.crm_contacts(linked_user_id) WHERE linked_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_crm_contacts_phone ON public.crm_contacts(phone_normalized) WHERE phone_normalized IS NOT NULL AND archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_crm_contacts_email ON public.crm_contacts(email_normalized) WHERE email_normalized IS NOT NULL AND archived_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_crm_contacts_owner_phone ON public.crm_contacts(owner_advisor_id, phone_normalized) WHERE phone_normalized IS NOT NULL AND archived_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_crm_contacts_owner_email ON public.crm_contacts(owner_advisor_id, email_normalized) WHERE email_normalized IS NOT NULL AND archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_crm_tasks_advisor_due ON public.crm_tasks(advisor_id, due_at, status);
CREATE INDEX IF NOT EXISTS idx_crm_opportunities_advisor_stage ON public.crm_opportunities(advisor_id, stage, status);
CREATE INDEX IF NOT EXISTS idx_crm_activity_contact_time ON public.crm_activity_log(contact_id, occurred_at DESC);

CREATE OR REPLACE FUNCTION public.crm_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.crm_prepare_contact()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.email_normalized := public.crm_normalize_email(NEW.email);
  NEW.phone_normalized := public.crm_normalize_phone(NEW.phone);
  NEW.duplicate_key := COALESCE(NEW.email_normalized, NEW.phone_normalized, NEW.linked_user_id::text);
  NEW.updated_at := now();

  IF NEW.relationship_status = 'archived' AND NEW.archived_at IS NULL THEN
    NEW.archived_at := now();
  END IF;

  IF NEW.owner_advisor_id IS NULL THEN
    NEW.owner_advisor_id := auth.uid();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_crm_contacts_prepare ON public.crm_contacts;
CREATE TRIGGER trg_crm_contacts_prepare
BEFORE INSERT OR UPDATE ON public.crm_contacts
FOR EACH ROW EXECUTE FUNCTION public.crm_prepare_contact();

DROP TRIGGER IF EXISTS trg_crm_preferences_touch ON public.crm_contact_preferences;
CREATE TRIGGER trg_crm_preferences_touch
BEFORE UPDATE ON public.crm_contact_preferences
FOR EACH ROW EXECUTE FUNCTION public.crm_touch_updated_at();

DROP TRIGGER IF EXISTS trg_crm_notes_touch ON public.crm_notes;
CREATE TRIGGER trg_crm_notes_touch
BEFORE UPDATE ON public.crm_notes
FOR EACH ROW EXECUTE FUNCTION public.crm_touch_updated_at();

DROP TRIGGER IF EXISTS trg_crm_tasks_touch ON public.crm_tasks;
CREATE TRIGGER trg_crm_tasks_touch
BEFORE UPDATE ON public.crm_tasks
FOR EACH ROW EXECUTE FUNCTION public.crm_touch_updated_at();

DROP TRIGGER IF EXISTS trg_crm_events_touch ON public.crm_events;
CREATE TRIGGER trg_crm_events_touch
BEFORE UPDATE ON public.crm_events
FOR EACH ROW EXECUTE FUNCTION public.crm_touch_updated_at();

DROP TRIGGER IF EXISTS trg_crm_opportunities_touch ON public.crm_opportunities;
CREATE TRIGGER trg_crm_opportunities_touch
BEFORE UPDATE ON public.crm_opportunities
FOR EACH ROW EXECUTE FUNCTION public.crm_touch_updated_at();

CREATE OR REPLACE FUNCTION public.crm_activity_is_append_only()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'crm_activity_log_is_append_only';
END;
$$;

DROP TRIGGER IF EXISTS trg_crm_activity_immutable_update ON public.crm_activity_log;
CREATE TRIGGER trg_crm_activity_immutable_update
BEFORE UPDATE ON public.crm_activity_log
FOR EACH ROW EXECUTE FUNCTION public.crm_activity_is_append_only();

DROP TRIGGER IF EXISTS trg_crm_activity_immutable_delete ON public.crm_activity_log;
CREATE TRIGGER trg_crm_activity_immutable_delete
BEFORE DELETE ON public.crm_activity_log
FOR EACH ROW EXECUTE FUNCTION public.crm_activity_is_append_only();

CREATE OR REPLACE FUNCTION public.crm_log_activity(
  _contact_id uuid,
  _activity_type text,
  _summary text,
  _channel text DEFAULT 'system',
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
  IF auth.uid() IS NULL OR NOT public.crm_can_access_contact(_contact_id) THEN
    RAISE EXCEPTION 'crm_contact_access_denied';
  END IF;

  INSERT INTO public.crm_activity_log(contact_id, advisor_id, activity_type, channel, summary, metadata)
  VALUES (_contact_id, auth.uid(), _activity_type, _channel, _summary, COALESCE(_metadata, '{}'::jsonb))
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.crm_archive_contact(_contact_id uuid, _reason text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.crm_can_access_contact(_contact_id) THEN
    RAISE EXCEPTION 'crm_contact_access_denied';
  END IF;

  INSERT INTO public.crm_activity_log(contact_id, advisor_id, activity_type, channel, summary, metadata)
  VALUES (
    _contact_id,
    auth.uid(),
    'archived',
    'system',
    COALESCE(_reason, 'Contact archive'),
    jsonb_build_object('source', 'crm_archive_contact')
  );

  UPDATE public.crm_contacts
  SET archived_at = now(),
      archived_reason = COALESCE(_reason, archived_reason, 'manual_archive'),
      relationship_status = 'archived'
  WHERE id = _contact_id;

  RETURN jsonb_build_object('success', true, 'contact_id', _contact_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.crm_complete_task(_task_id uuid, _summary text DEFAULT 'Tache terminee')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contact_id uuid;
BEGIN
  SELECT contact_id INTO v_contact_id
  FROM public.crm_tasks
  WHERE id = _task_id
    AND (advisor_id = auth.uid() OR public.crm_is_admin())
  FOR UPDATE;

  IF v_contact_id IS NULL THEN
    RAISE EXCEPTION 'crm_task_not_found_or_forbidden';
  END IF;

  UPDATE public.crm_tasks
  SET status = 'done',
      completed_at = COALESCE(completed_at, now())
  WHERE id = _task_id;

  IF v_contact_id IS NOT NULL THEN
    PERFORM public.crm_log_activity(v_contact_id, 'task_completed', _summary, 'system', jsonb_build_object('task_id', _task_id));
  END IF;

  RETURN jsonb_build_object('success', true, 'task_id', _task_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_transfer_crm_contact(_contact_id uuid, _new_owner_advisor_id uuid, _reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_owner uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT public.crm_is_admin() THEN
    RAISE EXCEPTION 'crm_admin_required';
  END IF;

  SELECT owner_advisor_id INTO v_old_owner
  FROM public.crm_contacts
  WHERE id = _contact_id
  FOR UPDATE;

  IF v_old_owner IS NULL THEN
    RAISE EXCEPTION 'crm_contact_not_found';
  END IF;

  UPDATE public.crm_contacts
  SET owner_advisor_id = _new_owner_advisor_id,
      source = 'admin_transfer'
  WHERE id = _contact_id;

  INSERT INTO public.crm_activity_log(contact_id, advisor_id, activity_type, channel, summary, metadata)
  VALUES (
    _contact_id,
    auth.uid(),
    'transferred',
    'admin',
    COALESCE(_reason, 'Transfert admin'),
    jsonb_build_object('old_owner_advisor_id', v_old_owner, 'new_owner_advisor_id', _new_owner_advisor_id)
  );

  RETURN jsonb_build_object('success', true, 'contact_id', _contact_id, 'old_owner_advisor_id', v_old_owner, 'new_owner_advisor_id', _new_owner_advisor_id);
END;
$$;

CREATE OR REPLACE VIEW public.crm_contact_order_summary AS
SELECT
  c.id AS contact_id,
  count(o.id)::integer AS order_count,
  max(o.created_at) AS last_order_at,
  round(avg(o.total), 0) AS average_order_total,
  COALESCE(sum(o.total), 0) AS total_revenue,
  max(o.shipping_city) AS last_shipping_city,
  jsonb_agg(
    jsonb_build_object(
      'order_id', o.id,
      'order_number', o.order_number,
      'status', o.status,
      'payment_status', o.payment_status,
      'total', o.total,
      'shipping_city', o.shipping_city,
      'created_at', o.created_at
    )
    ORDER BY o.created_at DESC
  ) FILTER (WHERE o.id IS NOT NULL) AS recent_orders
FROM public.crm_contacts c
LEFT JOIN public.orders o ON (
  (c.linked_user_id IS NOT NULL AND o.user_id = c.linked_user_id)
  OR (c.email_normalized IS NOT NULL AND public.crm_normalize_email(o.guest_email) = c.email_normalized)
  OR (c.phone_normalized IS NOT NULL AND public.crm_normalize_phone(o.guest_phone) = c.phone_normalized)
  OR (c.phone_normalized IS NOT NULL AND public.crm_normalize_phone(o.shipping_phone) = c.phone_normalized)
)
WHERE public.crm_can_access_contact(c.id)
GROUP BY c.id;

CREATE OR REPLACE VIEW public.crm_duplicate_candidates AS
SELECT
  c1.id AS contact_id,
  c2.id AS possible_duplicate_contact_id,
  c1.owner_advisor_id,
  CASE
    WHEN c1.linked_user_id IS NOT NULL AND c1.linked_user_id = c2.linked_user_id THEN 'linked_user_id'
    WHEN c1.email_normalized IS NOT NULL AND c1.email_normalized = c2.email_normalized THEN 'email'
    WHEN c1.phone_normalized IS NOT NULL AND c1.phone_normalized = c2.phone_normalized THEN 'phone'
    ELSE 'name_city'
  END AS duplicate_reason
FROM public.crm_contacts c1
JOIN public.crm_contacts c2
  ON c1.id < c2.id
 AND c1.owner_advisor_id = c2.owner_advisor_id
 AND c1.archived_at IS NULL
 AND c2.archived_at IS NULL
 AND (
   (c1.linked_user_id IS NOT NULL AND c1.linked_user_id = c2.linked_user_id)
   OR (c1.email_normalized IS NOT NULL AND c1.email_normalized = c2.email_normalized)
   OR (c1.phone_normalized IS NOT NULL AND c1.phone_normalized = c2.phone_normalized)
   OR (
     COALESCE(c1.city, '') <> ''
     AND lower(COALESCE(c1.city, '')) = lower(COALESCE(c2.city, ''))
     AND lower(trim(COALESCE(c1.first_name, '') || ' ' || COALESCE(c1.last_name, ''))) =
         lower(trim(COALESCE(c2.first_name, '') || ' ' || COALESCE(c2.last_name, '')))
   )
 )
WHERE public.crm_is_admin() OR c1.owner_advisor_id = auth.uid();

CREATE OR REPLACE VIEW public.crm_dashboard_summary AS
SELECT
  auth.uid() AS viewer_id,
  count(*) FILTER (WHERE c.archived_at IS NULL)::integer AS contacts_total,
  count(*) FILTER (WHERE c.relationship_status IN ('prospect', 'interested', 'hot') AND c.archived_at IS NULL)::integer AS prospects_active,
  count(*) FILTER (WHERE c.relationship_status IN ('client', 'loyal', 'vip') AND c.archived_at IS NULL)::integer AS customers_active,
  count(*) FILTER (WHERE c.relationship_status = 'dormant' AND c.archived_at IS NULL)::integer AS dormant_contacts,
  count(*) FILTER (WHERE c.contact_type = 'company' AND c.archived_at IS NULL)::integer AS company_contacts,
  (
    SELECT count(*)::integer
    FROM public.crm_tasks t
    WHERE (public.crm_is_admin() OR t.advisor_id = auth.uid())
      AND t.status IN ('open', 'in_progress')
      AND t.due_at <= now()
  ) AS tasks_due,
  (
    SELECT count(*)::integer
    FROM public.crm_opportunities o
    WHERE (public.crm_is_admin() OR o.advisor_id = auth.uid())
      AND o.status = 'open'
      AND o.probability >= 60
  ) AS hot_opportunities,
  (
    SELECT count(*)::integer
    FROM public.crm_duplicate_candidates
  ) AS duplicate_candidates
FROM public.crm_contacts c
WHERE public.crm_is_admin()
   OR c.owner_advisor_id = auth.uid();

ALTER TABLE public.crm_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_contact_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "CRM contacts owner or admin can read" ON public.crm_contacts;
CREATE POLICY "CRM contacts owner or admin can read"
ON public.crm_contacts FOR SELECT TO authenticated
USING (owner_advisor_id = auth.uid() OR public.crm_is_admin());

DROP POLICY IF EXISTS "CRM contacts owner can insert" ON public.crm_contacts;
CREATE POLICY "CRM contacts owner can insert"
ON public.crm_contacts FOR INSERT TO authenticated
WITH CHECK (owner_advisor_id = auth.uid() OR public.crm_is_admin());

DROP POLICY IF EXISTS "CRM contacts owner or admin can update" ON public.crm_contacts;
CREATE POLICY "CRM contacts owner or admin can update"
ON public.crm_contacts FOR UPDATE TO authenticated
USING (owner_advisor_id = auth.uid() OR public.crm_is_admin())
WITH CHECK (owner_advisor_id = auth.uid() OR public.crm_is_admin());

DROP POLICY IF EXISTS "CRM preferences accessible through contact" ON public.crm_contact_preferences;
CREATE POLICY "CRM preferences accessible through contact"
ON public.crm_contact_preferences FOR ALL TO authenticated
USING (public.crm_can_access_contact(contact_id))
WITH CHECK (public.crm_can_access_contact(contact_id));

DROP POLICY IF EXISTS "CRM notes protected by owner and sensitivity" ON public.crm_notes;
CREATE POLICY "CRM notes protected by owner and sensitivity"
ON public.crm_notes FOR SELECT TO authenticated
USING (
  advisor_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.crm_contacts c
    WHERE c.id = contact_id
      AND c.owner_advisor_id = auth.uid()
  )
  OR (public.crm_is_admin() AND is_sensitive = false)
);

DROP POLICY IF EXISTS "CRM notes owner can insert" ON public.crm_notes;
CREATE POLICY "CRM notes owner can insert"
ON public.crm_notes FOR INSERT TO authenticated
WITH CHECK (advisor_id = auth.uid() AND public.crm_can_access_contact(contact_id));

DROP POLICY IF EXISTS "CRM notes author can update" ON public.crm_notes;
CREATE POLICY "CRM notes author can update"
ON public.crm_notes FOR UPDATE TO authenticated
USING (advisor_id = auth.uid())
WITH CHECK (advisor_id = auth.uid() AND public.crm_can_access_contact(contact_id));

DROP POLICY IF EXISTS "CRM tasks owner or admin can manage" ON public.crm_tasks;
CREATE POLICY "CRM tasks owner or admin can manage"
ON public.crm_tasks FOR ALL TO authenticated
USING (advisor_id = auth.uid() OR public.crm_is_admin())
WITH CHECK ((advisor_id = auth.uid() OR public.crm_is_admin()) AND (contact_id IS NULL OR public.crm_can_access_contact(contact_id)));

DROP POLICY IF EXISTS "CRM events owner or admin can manage" ON public.crm_events;
CREATE POLICY "CRM events owner or admin can manage"
ON public.crm_events FOR ALL TO authenticated
USING (advisor_id = auth.uid() OR public.crm_is_admin())
WITH CHECK ((advisor_id = auth.uid() OR public.crm_is_admin()) AND public.crm_can_access_contact(contact_id));

DROP POLICY IF EXISTS "CRM opportunities owner or admin can manage" ON public.crm_opportunities;
CREATE POLICY "CRM opportunities owner or admin can manage"
ON public.crm_opportunities FOR ALL TO authenticated
USING (advisor_id = auth.uid() OR public.crm_is_admin())
WITH CHECK ((advisor_id = auth.uid() OR public.crm_is_admin()) AND public.crm_can_access_contact(contact_id));

DROP POLICY IF EXISTS "CRM activity owner or admin can read" ON public.crm_activity_log;
CREATE POLICY "CRM activity owner or admin can read"
ON public.crm_activity_log FOR SELECT TO authenticated
USING (contact_id IS NULL OR public.crm_can_access_contact(contact_id) OR public.crm_is_admin());

DROP POLICY IF EXISTS "CRM activity append through function or owner" ON public.crm_activity_log;
CREATE POLICY "CRM activity append through function or owner"
ON public.crm_activity_log FOR INSERT TO authenticated
WITH CHECK (advisor_id = auth.uid() AND (contact_id IS NULL OR public.crm_can_access_contact(contact_id)));

GRANT SELECT, INSERT, UPDATE ON public.crm_contacts TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.crm_contact_preferences TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.crm_notes TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.crm_tasks TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.crm_events TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.crm_opportunities TO authenticated;
GRANT SELECT, INSERT ON public.crm_activity_log TO authenticated;
GRANT SELECT ON public.crm_contact_order_summary TO authenticated;
GRANT SELECT ON public.crm_duplicate_candidates TO authenticated;
GRANT SELECT ON public.crm_dashboard_summary TO authenticated;
GRANT EXECUTE ON FUNCTION public.crm_log_activity(uuid, text, text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.crm_archive_contact(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.crm_complete_task(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_transfer_crm_contact(uuid, uuid, text) TO authenticated;

NOTIFY pgrst, 'reload schema';
