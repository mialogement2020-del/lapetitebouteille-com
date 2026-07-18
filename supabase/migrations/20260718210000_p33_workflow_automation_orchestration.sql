-- P3.3 Workflow Automation & Orchestration Engine.
-- Configurable automation for Marketplace governance workflows.
-- Proposal-only design: no automatic sensitive business decision.
-- No P0 financial mutation: no wallets, commissions, orders, payments,
-- withdrawals, Revenue Engine, ledger or financial snapshots are touched.

CREATE OR REPLACE FUNCTION public.marketplace_workflow_automation_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.marketplace_workflow_is_admin();
$$;

CREATE TABLE IF NOT EXISTS public.marketplace_workflow_automation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  trigger_event text NOT NULL CHECK (trigger_event IN (
    'case_created',
    'status_changed',
    'case_assigned',
    'comment_added',
    'vendor_replied',
    'due_reached',
    'priority_changed',
    'case_validated',
    'case_refused',
    'manual'
  )),
  conditions jsonb NOT NULL DEFAULT '{}'::jsonb,
  actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  priority integer NOT NULL DEFAULT 100,
  is_active boolean NOT NULL DEFAULT true,
  cooldown_minutes integer NOT NULL DEFAULT 0,
  run_count integer NOT NULL DEFAULT 0,
  last_run_at timestamptz,
  last_error text,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT marketplace_workflow_automation_actions_array CHECK (jsonb_typeof(actions) = 'array'),
  CONSTRAINT marketplace_workflow_automation_conditions_object CHECK (jsonb_typeof(conditions) = 'object')
);

CREATE TABLE IF NOT EXISTS public.marketplace_workflow_automation_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id uuid NOT NULL REFERENCES public.marketplace_workflow_automation_rules(id) ON DELETE CASCADE,
  case_id uuid REFERENCES public.marketplace_governance_cases(id) ON DELETE CASCADE,
  trigger_event text NOT NULL,
  scheduled_for timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  attempt_count integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 3,
  locked_at timestamptz,
  locked_by text,
  completed_at timestamptz,
  last_error text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.marketplace_workflow_automation_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id uuid REFERENCES public.marketplace_workflow_automation_rules(id) ON DELETE SET NULL,
  queue_id uuid REFERENCES public.marketplace_workflow_automation_queue(id) ON DELETE SET NULL,
  case_id uuid REFERENCES public.marketplace_governance_cases(id) ON DELETE SET NULL,
  trigger_event text NOT NULL,
  status text NOT NULL CHECK (status IN ('success', 'failed', 'skipped')),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz NOT NULL DEFAULT now(),
  duration_ms integer NOT NULL DEFAULT 0,
  actor_type text NOT NULL DEFAULT 'system' CHECK (actor_type IN ('system', 'admin')),
  result jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.marketplace_workflow_automation_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES public.marketplace_governance_cases(id) ON DELETE CASCADE,
  rule_id uuid REFERENCES public.marketplace_workflow_automation_rules(id) ON DELETE SET NULL,
  task_type text NOT NULL DEFAULT 'task' CHECK (task_type IN ('task', 'reminder', 'follow_up', 'information_request', 'sub_case_review')),
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'done', 'cancelled')),
  due_at timestamptz,
  assigned_to uuid,
  created_by uuid,
  completed_by uuid,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.marketplace_workflow_automation_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id uuid REFERENCES public.marketplace_workflow_automation_rules(id) ON DELETE CASCADE,
  name text NOT NULL,
  schedule_type text NOT NULL CHECK (schedule_type IN ('once', 'hourly', 'daily', 'weekly')),
  next_run_at timestamptz NOT NULL,
  last_run_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_marketplace_workflow_automation_rules_trigger
  ON public.marketplace_workflow_automation_rules(trigger_event, is_active, priority);
CREATE INDEX IF NOT EXISTS idx_marketplace_workflow_automation_queue_status
  ON public.marketplace_workflow_automation_queue(status, scheduled_for, created_at);
CREATE INDEX IF NOT EXISTS idx_marketplace_workflow_automation_queue_case
  ON public.marketplace_workflow_automation_queue(case_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_workflow_automation_executions_rule
  ON public.marketplace_workflow_automation_executions(rule_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_workflow_automation_executions_case
  ON public.marketplace_workflow_automation_executions(case_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_workflow_automation_tasks_case
  ON public.marketplace_workflow_automation_tasks(case_id, status, due_at);
CREATE INDEX IF NOT EXISTS idx_marketplace_workflow_automation_schedules_next
  ON public.marketplace_workflow_automation_schedules(is_active, next_run_at);

CREATE OR REPLACE FUNCTION public.marketplace_workflow_automation_append_only()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'marketplace_workflow_automation_history_is_append_only';
END;
$$;

DROP TRIGGER IF EXISTS trg_marketplace_workflow_automation_executions_append_only ON public.marketplace_workflow_automation_executions;
CREATE TRIGGER trg_marketplace_workflow_automation_executions_append_only
  BEFORE UPDATE OR DELETE ON public.marketplace_workflow_automation_executions
  FOR EACH ROW EXECUTE FUNCTION public.marketplace_workflow_automation_append_only();

CREATE OR REPLACE FUNCTION public.marketplace_workflow_rule_matches(
  _rule public.marketplace_workflow_automation_rules,
  _case public.marketplace_governance_cases,
  _payload jsonb DEFAULT '{}'::jsonb
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_conditions jsonb := COALESCE(_rule.conditions, '{}'::jsonb);
  v_statuses text[];
  v_priorities text[];
  v_case_types text[];
BEGIN
  IF COALESCE(v_conditions->>'case_type', '') <> '' AND v_conditions->>'case_type' <> _case.case_type THEN
    RETURN false;
  END IF;

  IF COALESCE(v_conditions->>'workflow_status_code', '') <> '' AND v_conditions->>'workflow_status_code' <> _case.workflow_status_code THEN
    RETURN false;
  END IF;

  IF COALESCE(v_conditions->>'priority', '') <> '' AND v_conditions->>'priority' <> _case.priority THEN
    RETURN false;
  END IF;

  IF v_conditions ? 'case_types' THEN
    SELECT array_agg(value::text) INTO v_case_types FROM jsonb_array_elements_text(v_conditions->'case_types') AS value;
    IF NOT (_case.case_type = ANY(COALESCE(v_case_types, ARRAY[]::text[]))) THEN
      RETURN false;
    END IF;
  END IF;

  IF v_conditions ? 'workflow_statuses' THEN
    SELECT array_agg(value::text) INTO v_statuses FROM jsonb_array_elements_text(v_conditions->'workflow_statuses') AS value;
    IF NOT (_case.workflow_status_code = ANY(COALESCE(v_statuses, ARRAY[]::text[]))) THEN
      RETURN false;
    END IF;
  END IF;

  IF v_conditions ? 'priorities' THEN
    SELECT array_agg(value::text) INTO v_priorities FROM jsonb_array_elements_text(v_conditions->'priorities') AS value;
    IF NOT (_case.priority = ANY(COALESCE(v_priorities, ARRAY[]::text[]))) THEN
      RETURN false;
    END IF;
  END IF;

  IF COALESCE((v_conditions->>'vendor_visible')::boolean, _case.is_vendor_visible) <> _case.is_vendor_visible THEN
    RETURN false;
  END IF;

  IF COALESCE(v_conditions->>'payload_event_type', '') <> '' AND v_conditions->>'payload_event_type' <> COALESCE(_payload->>'event_type', '') THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.enqueue_marketplace_workflow_automations(
  _case_id uuid,
  _trigger_event text,
  _payload jsonb DEFAULT '{}'::jsonb,
  _scheduled_for timestamptz DEFAULT now()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_case public.marketplace_governance_cases%ROWTYPE;
  r public.marketplace_workflow_automation_rules%ROWTYPE;
  v_created integer := 0;
  v_next timestamptz := COALESCE(_scheduled_for, now());
BEGIN
  SELECT * INTO v_case
  FROM public.marketplace_governance_cases
  WHERE id = _case_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('created_jobs', 0, 'reason', 'case_not_found');
  END IF;

  FOR r IN
    SELECT *
    FROM public.marketplace_workflow_automation_rules
    WHERE is_active = true
      AND trigger_event = _trigger_event
    ORDER BY priority ASC, created_at ASC
  LOOP
    IF public.marketplace_workflow_rule_matches(r, v_case, _payload) THEN
      IF r.cooldown_minutes > 0 AND r.last_run_at IS NOT NULL AND r.last_run_at > now() - make_interval(mins => r.cooldown_minutes) THEN
        INSERT INTO public.marketplace_workflow_automation_executions(rule_id, case_id, trigger_event, status, result)
        VALUES (r.id, _case_id, _trigger_event, 'skipped', jsonb_build_object('reason', 'cooldown_active'));
      ELSE
        INSERT INTO public.marketplace_workflow_automation_queue(rule_id, case_id, trigger_event, scheduled_for, payload)
        VALUES (r.id, _case_id, _trigger_event, v_next, COALESCE(_payload, '{}'::jsonb));
        v_created := v_created + 1;
      END IF;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('created_jobs', v_created, 'trigger_event', _trigger_event, 'case_id', _case_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.marketplace_workflow_event_automation_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trigger_event text;
BEGIN
  v_trigger_event := CASE
    WHEN NEW.event_type = 'resolution_initialized' THEN 'case_created'
    WHEN NEW.event_type = 'status_changed' THEN 'status_changed'
    WHEN NEW.event_type = 'case_assigned' THEN 'case_assigned'
    WHEN NEW.event_type = 'comment_added' AND NEW.actor_type = 'vendor' THEN 'vendor_replied'
    WHEN NEW.event_type = 'comment_added' THEN 'comment_added'
    WHEN NEW.event_type = 'escalation_proposed' THEN 'due_reached'
    ELSE NULL
  END;

  IF v_trigger_event IS NOT NULL AND NEW.case_id IS NOT NULL THEN
    PERFORM public.enqueue_marketplace_workflow_automations(
      NEW.case_id,
      v_trigger_event,
      jsonb_build_object('event_id', NEW.id, 'event_type', NEW.event_type, 'actor_type', NEW.actor_type)
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_marketplace_workflow_event_automation ON public.marketplace_case_workflow_events;
CREATE TRIGGER trg_marketplace_workflow_event_automation
  AFTER INSERT ON public.marketplace_case_workflow_events
  FOR EACH ROW EXECUTE FUNCTION public.marketplace_workflow_event_automation_trigger();

CREATE OR REPLACE FUNCTION public.admin_create_marketplace_workflow_automation_rule(
  _name text,
  _description text,
  _trigger_event text,
  _conditions jsonb DEFAULT '{}'::jsonb,
  _actions jsonb DEFAULT '[]'::jsonb,
  _priority integer DEFAULT 100,
  _is_active boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rule_id uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT public.marketplace_workflow_automation_is_admin() THEN
    RAISE EXCEPTION 'marketplace_workflow_automation_admin_required';
  END IF;

  INSERT INTO public.marketplace_workflow_automation_rules(
    name, description, trigger_event, conditions, actions, priority, is_active, created_by, updated_by
  )
  VALUES (
    _name,
    _description,
    _trigger_event,
    COALESCE(_conditions, '{}'::jsonb),
    COALESCE(_actions, '[]'::jsonb),
    COALESCE(_priority, 100),
    COALESCE(_is_active, true),
    auth.uid(),
    auth.uid()
  )
  RETURNING id INTO v_rule_id;

  RETURN jsonb_build_object('rule_id', v_rule_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_toggle_marketplace_workflow_automation_rule(
  _rule_id uuid,
  _is_active boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.marketplace_workflow_automation_is_admin() THEN
    RAISE EXCEPTION 'marketplace_workflow_automation_admin_required';
  END IF;

  UPDATE public.marketplace_workflow_automation_rules
  SET is_active = _is_active,
      updated_by = auth.uid(),
      updated_at = now()
  WHERE id = _rule_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'marketplace_workflow_automation_rule_not_found';
  END IF;

  RETURN jsonb_build_object('rule_id', _rule_id, 'is_active', _is_active);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_schedule_marketplace_workflow_reminder(
  _case_id uuid,
  _title text,
  _description text DEFAULT NULL,
  _due_at timestamptz DEFAULT now() + interval '24 hours',
  _assigned_to uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task_id uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT public.marketplace_workflow_automation_is_admin() THEN
    RAISE EXCEPTION 'marketplace_workflow_automation_admin_required';
  END IF;

  INSERT INTO public.marketplace_workflow_automation_tasks(
    case_id, task_type, title, description, due_at, assigned_to, created_by, metadata
  )
  VALUES (
    _case_id,
    'reminder',
    _title,
    _description,
    COALESCE(_due_at, now() + interval '24 hours'),
    _assigned_to,
    auth.uid(),
    jsonb_build_object('source', 'manual_admin_reminder')
  )
  RETURNING id INTO v_task_id;

  INSERT INTO public.marketplace_case_workflow_events(case_id, actor_id, actor_type, event_type, new_value, comment)
  VALUES (_case_id, auth.uid(), 'admin', 'automation_reminder_scheduled', jsonb_build_object('task_id', v_task_id, 'due_at', _due_at), _title);

  RETURN jsonb_build_object('task_id', v_task_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.process_marketplace_workflow_automation_queue(_limit integer DEFAULT 50)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  q record;
  a jsonb;
  v_started timestamptz;
  v_processed integer := 0;
  v_success integer := 0;
  v_failed integer := 0;
  v_result jsonb;
  v_action_count integer;
  v_limit integer := LEAST(GREATEST(COALESCE(_limit, 50), 1), 200);
  v_template public.marketplace_case_checklist_templates%ROWTYPE;
  v_item text;
  v_position integer;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.marketplace_workflow_automation_is_admin() THEN
    RAISE EXCEPTION 'marketplace_workflow_automation_admin_required';
  END IF;

  FOR q IN
    SELECT queue.*, rules.actions, rules.name AS rule_name
    FROM public.marketplace_workflow_automation_queue queue
    JOIN public.marketplace_workflow_automation_rules rules ON rules.id = queue.rule_id
    WHERE queue.status = 'pending'
      AND queue.scheduled_for <= now()
      AND queue.attempt_count < queue.max_attempts
    ORDER BY queue.scheduled_for ASC, rules.priority ASC, queue.created_at ASC
    LIMIT v_limit
    FOR UPDATE SKIP LOCKED
  LOOP
    v_processed := v_processed + 1;
    v_started := clock_timestamp();
    v_result := jsonb_build_object('actions', '[]'::jsonb);
    v_action_count := 0;

    UPDATE public.marketplace_workflow_automation_queue
    SET status = 'processing',
        attempt_count = attempt_count + 1,
        locked_at = now(),
        locked_by = 'workflow_automation_engine',
        updated_at = now()
    WHERE id = q.id;

    BEGIN
      FOR a IN SELECT * FROM jsonb_array_elements(COALESCE(q.actions, '[]'::jsonb))
      LOOP
        IF COALESCE(a->>'type', '') NOT IN (
          'send_notification',
          'create_task',
          'schedule_reminder',
          'assign_checklist',
          'request_information',
          'propose_escalation',
          'open_sub_case'
        ) THEN
          RAISE EXCEPTION 'marketplace_workflow_automation_forbidden_action: %', COALESCE(a->>'type', '');
        END IF;

        IF a->>'type' = 'send_notification' THEN
          INSERT INTO public.marketplace_governance_notifications(case_id, recipient_id, recipient_role, notification_type, title, message, severity, metadata)
          VALUES (
            q.case_id,
            NULL,
            COALESCE(a->>'recipient_role', 'admin'),
            'workflow_automation',
            COALESCE(a->>'title', q.rule_name),
            COALESCE(a->>'message', 'Automation workflow executee.'),
            COALESCE(a->>'severity', 'normal'),
            jsonb_build_object('rule_id', q.rule_id, 'queue_id', q.id, 'automation', true)
          );
        ELSIF a->>'type' IN ('create_task', 'schedule_reminder', 'request_information', 'open_sub_case') THEN
          INSERT INTO public.marketplace_workflow_automation_tasks(case_id, rule_id, task_type, title, description, due_at, metadata)
          VALUES (
            q.case_id,
            q.rule_id,
            CASE
              WHEN a->>'type' = 'schedule_reminder' THEN 'reminder'
              WHEN a->>'type' = 'request_information' THEN 'information_request'
              WHEN a->>'type' = 'open_sub_case' THEN 'sub_case_review'
              ELSE 'task'
            END,
            COALESCE(a->>'title', q.rule_name),
            a->>'description',
            CASE WHEN COALESCE(a->>'delay_hours', '') <> '' THEN now() + make_interval(hours => (a->>'delay_hours')::integer) ELSE NULL END,
            jsonb_build_object('rule_id', q.rule_id, 'queue_id', q.id, 'automation', true)
          );
        ELSIF a->>'type' = 'assign_checklist' THEN
          v_position := 0;
          SELECT template.* INTO v_template
          FROM public.marketplace_case_checklist_templates template
          JOIN public.marketplace_governance_cases c ON c.case_type = template.case_type
          WHERE c.id = q.case_id
            AND template.is_active = true;

          IF FOUND THEN
            FOR v_item IN SELECT jsonb_array_elements_text(v_template.items)
            LOOP
              v_position := v_position + 1;
              INSERT INTO public.marketplace_case_checklist_items(case_id, template_id, label, position)
              VALUES (q.case_id, v_template.id, v_item, v_position)
              ON CONFLICT (case_id, label) DO NOTHING;
            END LOOP;
          END IF;
        ELSIF a->>'type' = 'propose_escalation' THEN
          INSERT INTO public.marketplace_case_escalations(case_id, escalation_type, severity, reason, recommended_action, metadata)
          VALUES (
            q.case_id,
            COALESCE(a->>'escalation_type', 'blocked'),
            COALESCE(a->>'severity', 'high'),
            COALESCE(a->>'reason', 'Escalade proposee par automation.'),
            COALESCE(a->>'recommended_action', 'Revue humaine requise.'),
            jsonb_build_object('rule_id', q.rule_id, 'queue_id', q.id, 'automation', true)
          )
          ON CONFLICT (case_id, escalation_type, status) DO NOTHING;
        END IF;

        v_action_count := v_action_count + 1;
      END LOOP;

      INSERT INTO public.marketplace_case_workflow_events(case_id, actor_type, event_type, new_value, comment)
      VALUES (
        q.case_id,
        'system',
        'automation_executed',
        jsonb_build_object('rule_id', q.rule_id, 'queue_id', q.id, 'actions_count', v_action_count),
        'Automation executee sans decision sensible.'
      );

      UPDATE public.marketplace_workflow_automation_queue
      SET status = 'completed',
          completed_at = now(),
          updated_at = now()
      WHERE id = q.id;

      UPDATE public.marketplace_workflow_automation_rules
      SET run_count = run_count + 1,
          last_run_at = now(),
          last_error = NULL,
          updated_at = now()
      WHERE id = q.rule_id;

      INSERT INTO public.marketplace_workflow_automation_executions(rule_id, queue_id, case_id, trigger_event, status, started_at, finished_at, duration_ms, result)
      VALUES (
        q.rule_id,
        q.id,
        q.case_id,
        q.trigger_event,
        'success',
        v_started,
        clock_timestamp(),
        GREATEST(0, (EXTRACT(epoch FROM (clock_timestamp() - v_started)) * 1000)::integer),
        jsonb_build_object('actions_count', v_action_count, 'mode', 'no_sensitive_decision')
      );
      v_success := v_success + 1;
    EXCEPTION WHEN OTHERS THEN
      UPDATE public.marketplace_workflow_automation_queue
      SET status = CASE WHEN attempt_count >= max_attempts THEN 'failed' ELSE 'pending' END,
          last_error = SQLERRM,
          locked_at = NULL,
          locked_by = NULL,
          updated_at = now()
      WHERE id = q.id;

      UPDATE public.marketplace_workflow_automation_rules
      SET last_error = SQLERRM,
          updated_at = now()
      WHERE id = q.rule_id;

      INSERT INTO public.marketplace_workflow_automation_executions(rule_id, queue_id, case_id, trigger_event, status, started_at, finished_at, duration_ms, error_message)
      VALUES (
        q.rule_id,
        q.id,
        q.case_id,
        q.trigger_event,
        'failed',
        v_started,
        clock_timestamp(),
        GREATEST(0, (EXTRACT(epoch FROM (clock_timestamp() - v_started)) * 1000)::integer),
        SQLERRM
      );
      v_failed := v_failed + 1;
    END;
  END LOOP;

  RETURN jsonb_build_object('processed', v_processed, 'success', v_success, 'failed', v_failed, 'limit', v_limit);
END;
$$;

CREATE OR REPLACE FUNCTION public.process_marketplace_workflow_scheduler(_limit integer DEFAULT 100)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  v_processed integer := 0;
  v_limit integer := LEAST(GREATEST(COALESCE(_limit, 100), 1), 500);
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.marketplace_workflow_automation_is_admin() THEN
    RAISE EXCEPTION 'marketplace_workflow_automation_admin_required';
  END IF;

  FOR r IN
    SELECT *
    FROM public.marketplace_workflow_automation_schedules
    WHERE is_active = true
      AND next_run_at <= now()
    ORDER BY next_run_at ASC
    LIMIT v_limit
    FOR UPDATE SKIP LOCKED
  LOOP
    INSERT INTO public.marketplace_workflow_automation_queue(rule_id, trigger_event, scheduled_for, payload)
    VALUES (r.rule_id, 'manual', now(), COALESCE(r.payload, '{}'::jsonb));

    UPDATE public.marketplace_workflow_automation_schedules
    SET last_run_at = now(),
        next_run_at = CASE r.schedule_type
          WHEN 'once' THEN next_run_at
          WHEN 'hourly' THEN now() + interval '1 hour'
          WHEN 'daily' THEN now() + interval '1 day'
          WHEN 'weekly' THEN now() + interval '1 week'
          ELSE next_run_at
        END,
        is_active = CASE WHEN r.schedule_type = 'once' THEN false ELSE is_active END,
        updated_at = now()
    WHERE id = r.id;

    v_processed := v_processed + 1;
  END LOOP;

  RETURN jsonb_build_object('scheduled_jobs', v_processed, 'limit', v_limit);
END;
$$;

CREATE OR REPLACE VIEW public.admin_marketplace_workflow_automation_rules AS
SELECT
  r.*,
  (
    SELECT count(*)
    FROM public.marketplace_workflow_automation_queue q
    WHERE q.rule_id = r.id AND q.status = 'pending'
  )::integer AS pending_jobs,
  (
    SELECT count(*)
    FROM public.marketplace_workflow_automation_executions e
    WHERE e.rule_id = r.id AND e.status = 'failed'
  )::integer AS failed_executions,
  (
    SELECT avg(e.duration_ms)
    FROM public.marketplace_workflow_automation_executions e
    WHERE e.rule_id = r.id
  )::integer AS avg_duration_ms
FROM public.marketplace_workflow_automation_rules r
WHERE public.marketplace_workflow_automation_is_admin();

CREATE OR REPLACE VIEW public.admin_marketplace_workflow_automation_queue AS
SELECT
  q.*,
  r.name AS rule_name,
  c.case_number,
  c.priority AS case_priority,
  c.workflow_status_code
FROM public.marketplace_workflow_automation_queue q
JOIN public.marketplace_workflow_automation_rules r ON r.id = q.rule_id
LEFT JOIN public.marketplace_governance_cases c ON c.id = q.case_id
WHERE public.marketplace_workflow_automation_is_admin();

CREATE OR REPLACE VIEW public.admin_marketplace_workflow_automation_executions AS
SELECT
  e.*,
  r.name AS rule_name,
  c.case_number
FROM public.marketplace_workflow_automation_executions e
LEFT JOIN public.marketplace_workflow_automation_rules r ON r.id = e.rule_id
LEFT JOIN public.marketplace_governance_cases c ON c.id = e.case_id
WHERE public.marketplace_workflow_automation_is_admin();

CREATE OR REPLACE VIEW public.admin_marketplace_workflow_automation_tasks AS
SELECT
  t.*,
  r.name AS rule_name,
  c.case_number,
  c.priority AS case_priority
FROM public.marketplace_workflow_automation_tasks t
LEFT JOIN public.marketplace_workflow_automation_rules r ON r.id = t.rule_id
LEFT JOIN public.marketplace_governance_cases c ON c.id = t.case_id
WHERE public.marketplace_workflow_automation_is_admin();

CREATE OR REPLACE VIEW public.admin_marketplace_workflow_automation_overview AS
SELECT
  count(*) FILTER (WHERE r.is_active)::integer AS active_rules,
  count(*) FILTER (WHERE NOT r.is_active)::integer AS inactive_rules,
  COALESCE((SELECT count(*) FROM public.marketplace_workflow_automation_queue q WHERE q.status = 'pending'), 0)::integer AS pending_jobs,
  COALESCE((SELECT count(*) FROM public.marketplace_workflow_automation_queue q WHERE q.status = 'failed'), 0)::integer AS failed_jobs,
  COALESCE((SELECT count(*) FROM public.marketplace_workflow_automation_executions e WHERE e.created_at >= now() - interval '24 hours'), 0)::integer AS executions_24h,
  COALESCE((SELECT count(*) FROM public.marketplace_workflow_automation_executions e WHERE e.status = 'failed' AND e.created_at >= now() - interval '24 hours'), 0)::integer AS failed_executions_24h,
  COALESCE((SELECT avg(e.duration_ms)::integer FROM public.marketplace_workflow_automation_executions e WHERE e.created_at >= now() - interval '7 days'), 0)::integer AS avg_duration_ms_7d,
  COALESCE((SELECT count(*) FROM public.marketplace_workflow_automation_tasks t WHERE t.status = 'open'), 0)::integer AS open_tasks
FROM public.marketplace_workflow_automation_rules r
WHERE public.marketplace_workflow_automation_is_admin();

INSERT INTO public.marketplace_workflow_automation_rules(name, description, trigger_event, conditions, actions, priority, is_active, metadata)
VALUES
  (
    'Notifier admin sur dossier critique',
    'Envoie une notification interne quand un dossier critique entre dans le workflow.',
    'case_created',
    '{"priorities":["critical"]}'::jsonb,
    '[{"type":"send_notification","recipient_role":"admin","title":"Dossier critique Marketplace","message":"Un dossier critique necessite une revue humaine.","severity":"critical"}]'::jsonb,
    10,
    true,
    '{"seeded":true,"decision_mode":"notification_only"}'::jsonb
  ),
  (
    'Checklist automatique par type de dossier',
    'Affecte la checklist pertinente sans valider la decision.',
    'case_created',
    '{}'::jsonb,
    '[{"type":"assign_checklist"}]'::jsonb,
    20,
    true,
    '{"seeded":true,"decision_mode":"preparation_only"}'::jsonb
  ),
  (
    'Relance vendeur apres demande information',
    'Cree un rappel humain apres une demande d information vendeur.',
    'status_changed',
    '{"workflow_statuses":["waiting_vendor","info_requested"]}'::jsonb,
    '[{"type":"schedule_reminder","title":"Relancer le vendeur","description":"Verifier si le vendeur a repondu et relancer si necessaire.","delay_hours":48}]'::jsonb,
    30,
    true,
    '{"seeded":true,"decision_mode":"reminder_only"}'::jsonb
  ),
  (
    'Proposer escalade dossier en retard',
    'Propose une escalade quand une echeance est atteinte.',
    'due_reached',
    '{}'::jsonb,
    '[{"type":"propose_escalation","escalation_type":"overdue","severity":"high","reason":"Echeance workflow atteinte.","recommended_action":"Revue humaine prioritaire."}]'::jsonb,
    40,
    true,
    '{"seeded":true,"decision_mode":"proposal_only"}'::jsonb
  )
ON CONFLICT DO NOTHING;

ALTER TABLE public.marketplace_workflow_automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_workflow_automation_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_workflow_automation_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_workflow_automation_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_workflow_automation_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Automation rules admin readable" ON public.marketplace_workflow_automation_rules;
CREATE POLICY "Automation rules admin readable"
  ON public.marketplace_workflow_automation_rules FOR SELECT TO authenticated
  USING (public.marketplace_workflow_automation_is_admin());

DROP POLICY IF EXISTS "Automation rules admin writable" ON public.marketplace_workflow_automation_rules;
CREATE POLICY "Automation rules admin writable"
  ON public.marketplace_workflow_automation_rules FOR ALL TO authenticated
  USING (public.marketplace_workflow_automation_is_admin())
  WITH CHECK (public.marketplace_workflow_automation_is_admin());

DROP POLICY IF EXISTS "Automation queue admin readable" ON public.marketplace_workflow_automation_queue;
CREATE POLICY "Automation queue admin readable"
  ON public.marketplace_workflow_automation_queue FOR SELECT TO authenticated
  USING (public.marketplace_workflow_automation_is_admin());

DROP POLICY IF EXISTS "Automation executions admin readable" ON public.marketplace_workflow_automation_executions;
CREATE POLICY "Automation executions admin readable"
  ON public.marketplace_workflow_automation_executions FOR SELECT TO authenticated
  USING (public.marketplace_workflow_automation_is_admin());

DROP POLICY IF EXISTS "Automation tasks admin readable" ON public.marketplace_workflow_automation_tasks;
CREATE POLICY "Automation tasks admin readable"
  ON public.marketplace_workflow_automation_tasks FOR SELECT TO authenticated
  USING (public.marketplace_workflow_automation_is_admin());

DROP POLICY IF EXISTS "Automation tasks admin writable" ON public.marketplace_workflow_automation_tasks;
CREATE POLICY "Automation tasks admin writable"
  ON public.marketplace_workflow_automation_tasks FOR ALL TO authenticated
  USING (public.marketplace_workflow_automation_is_admin())
  WITH CHECK (public.marketplace_workflow_automation_is_admin());

DROP POLICY IF EXISTS "Automation schedules admin readable" ON public.marketplace_workflow_automation_schedules;
CREATE POLICY "Automation schedules admin readable"
  ON public.marketplace_workflow_automation_schedules FOR SELECT TO authenticated
  USING (public.marketplace_workflow_automation_is_admin());

DROP POLICY IF EXISTS "Automation schedules admin writable" ON public.marketplace_workflow_automation_schedules;
CREATE POLICY "Automation schedules admin writable"
  ON public.marketplace_workflow_automation_schedules FOR ALL TO authenticated
  USING (public.marketplace_workflow_automation_is_admin())
  WITH CHECK (public.marketplace_workflow_automation_is_admin());

GRANT SELECT ON public.marketplace_workflow_automation_rules TO authenticated;
GRANT SELECT ON public.marketplace_workflow_automation_queue TO authenticated;
GRANT SELECT ON public.marketplace_workflow_automation_executions TO authenticated;
GRANT SELECT ON public.marketplace_workflow_automation_tasks TO authenticated;
GRANT SELECT ON public.marketplace_workflow_automation_schedules TO authenticated;
GRANT SELECT ON public.admin_marketplace_workflow_automation_rules TO authenticated;
GRANT SELECT ON public.admin_marketplace_workflow_automation_queue TO authenticated;
GRANT SELECT ON public.admin_marketplace_workflow_automation_executions TO authenticated;
GRANT SELECT ON public.admin_marketplace_workflow_automation_tasks TO authenticated;
GRANT SELECT ON public.admin_marketplace_workflow_automation_overview TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_marketplace_workflow_automation_rule(text, text, text, jsonb, jsonb, integer, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_toggle_marketplace_workflow_automation_rule(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_schedule_marketplace_workflow_reminder(uuid, text, text, timestamptz, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_marketplace_workflow_automation_queue(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_marketplace_workflow_scheduler(integer) TO authenticated;

GRANT ALL ON public.marketplace_workflow_automation_rules TO service_role;
GRANT ALL ON public.marketplace_workflow_automation_queue TO service_role;
GRANT ALL ON public.marketplace_workflow_automation_executions TO service_role;
GRANT ALL ON public.marketplace_workflow_automation_tasks TO service_role;
GRANT ALL ON public.marketplace_workflow_automation_schedules TO service_role;

NOTIFY pgrst, 'reload schema';
