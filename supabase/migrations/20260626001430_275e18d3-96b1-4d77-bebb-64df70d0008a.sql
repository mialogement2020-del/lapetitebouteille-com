
-- ============================================================
-- LPB ORCHESTRATION LAYER - Foundation
-- ============================================================

-- 1. Domain events (append-only log)
CREATE TABLE public.domain_events (
  id BIGSERIAL PRIMARY KEY,
  event_type TEXT NOT NULL,
  aggregate_type TEXT NOT NULL,
  aggregate_id TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  source TEXT,
  actor_id UUID,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | processed | failed | skipped
  processed_at TIMESTAMPTZ,
  error TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX domain_events_status_idx ON public.domain_events (status, occurred_at);
CREATE INDEX domain_events_type_idx ON public.domain_events (event_type, occurred_at DESC);
CREATE INDEX domain_events_aggregate_idx ON public.domain_events (aggregate_type, aggregate_id);

GRANT SELECT ON public.domain_events TO authenticated;
GRANT ALL ON public.domain_events TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.domain_events_id_seq TO service_role;

ALTER TABLE public.domain_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read domain events"
ON public.domain_events FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 2. Workflow rules (configurable automation)
CREATE TABLE public.workflow_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  trigger_event TEXT NOT NULL, -- matches domain_events.event_type
  conditions JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- conditions: [{ path: "payload.total", op: "gte", value: 50000 }, ...]
  actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- actions: [{ type: "notify_admin", params: {...} }, { type: "create_notification", params: {...} }]
  is_active BOOLEAN NOT NULL DEFAULT true,
  priority INT NOT NULL DEFAULT 100,
  run_count INT NOT NULL DEFAULT 0,
  last_run_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX workflow_rules_trigger_idx ON public.workflow_rules (trigger_event) WHERE is_active = true;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.workflow_rules TO authenticated;
GRANT ALL ON public.workflow_rules TO service_role;

ALTER TABLE public.workflow_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage workflow rules"
ON public.workflow_rules FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER workflow_rules_updated_at
BEFORE UPDATE ON public.workflow_rules
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Workflow executions (audit trail)
CREATE TABLE public.workflow_executions (
  id BIGSERIAL PRIMARY KEY,
  rule_id UUID REFERENCES public.workflow_rules(id) ON DELETE SET NULL,
  rule_name TEXT,
  event_id BIGINT REFERENCES public.domain_events(id) ON DELETE SET NULL,
  event_type TEXT,
  status TEXT NOT NULL, -- success | failed | skipped
  actions_run INT NOT NULL DEFAULT 0,
  error TEXT,
  result JSONB,
  duration_ms INT,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX workflow_executions_rule_idx ON public.workflow_executions (rule_id, executed_at DESC);
CREATE INDEX workflow_executions_recent_idx ON public.workflow_executions (executed_at DESC);

GRANT SELECT ON public.workflow_executions TO authenticated;
GRANT ALL ON public.workflow_executions TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.workflow_executions_id_seq TO service_role;

ALTER TABLE public.workflow_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read workflow executions"
ON public.workflow_executions FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 4. publish_event() helper (callable from any trigger / RPC)
CREATE OR REPLACE FUNCTION public.publish_event(
  _event_type TEXT,
  _aggregate_type TEXT,
  _aggregate_id TEXT,
  _payload JSONB DEFAULT '{}'::jsonb,
  _source TEXT DEFAULT 'system',
  _actor_id UUID DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id BIGINT;
  _function_url TEXT := 'https://bohtgmrlbaxtpwzbxhdq.supabase.co/functions/v1/orchestrator-process';
  _anon_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJvaHRnbXJsYmF4dHB3emJ4aGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4NjQyMTQsImV4cCI6MjA4NTQ0MDIxNH0.2CE8-Bzu3s5Iilg0t776Cthws75ve-xjmHwBgFsIQEc';
BEGIN
  INSERT INTO public.domain_events (event_type, aggregate_type, aggregate_id, payload, source, actor_id)
  VALUES (_event_type, _aggregate_type, _aggregate_id, COALESCE(_payload, '{}'::jsonb), _source, _actor_id)
  RETURNING id INTO _id;

  -- Fire-and-forget call to orchestrator processor
  BEGIN
    PERFORM net.http_post(
      url := _function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || _anon_key
      ),
      body := jsonb_build_object('event_id', _id)::jsonb
    );
  EXCEPTION WHEN OTHERS THEN
    -- never fail business operations because of orchestrator dispatch
    NULL;
  END;

  RETURN _id;
END;
$$;

-- 5. Trigger functions that publish domain events
-- Order lifecycle
CREATE OR REPLACE FUNCTION public.event_order_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.publish_event(
      'order.created',
      'order',
      NEW.id::text,
      jsonb_build_object(
        'order_number', NEW.order_number,
        'total', NEW.total,
        'user_id', NEW.user_id,
        'status', NEW.status,
        'payment_method', NEW.payment_method,
        'referrer_id', NEW.referrer_id
      ),
      'orders_table',
      NEW.user_id
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM public.publish_event(
      'order.status_changed',
      'order',
      NEW.id::text,
      jsonb_build_object(
        'order_number', NEW.order_number,
        'previous_status', OLD.status,
        'new_status', NEW.status,
        'total', NEW.total,
        'user_id', NEW.user_id
      ),
      'orders_table',
      auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_event_order_changes ON public.orders;
CREATE TRIGGER trg_event_order_changes
AFTER INSERT OR UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.event_order_changes();

-- Commissions
CREATE OR REPLACE FUNCTION public.event_commission_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.publish_event(
    'commission.created',
    'commission',
    NEW.id::text,
    jsonb_build_object(
      'beneficiary_id', NEW.beneficiary_id,
      'amount', NEW.commission_amount,
      'rate', NEW.commission_rate,
      'level', NEW.level,
      'order_id', NEW.order_id
    ),
    'commissions_table',
    NEW.beneficiary_id
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_event_commission_created ON public.commissions;
CREATE TRIGGER trg_event_commission_created
AFTER INSERT ON public.commissions
FOR EACH ROW EXECUTE FUNCTION public.event_commission_created();

-- Withdrawals
CREATE OR REPLACE FUNCTION public.event_withdrawal_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.publish_event(
      'withdrawal.requested',
      'withdrawal',
      NEW.id::text,
      jsonb_build_object(
        'user_id', NEW.user_id,
        'amount', NEW.amount,
        'method', NEW.payment_method
      ),
      'withdrawal_requests',
      NEW.user_id
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM public.publish_event(
      'withdrawal.status_changed',
      'withdrawal',
      NEW.id::text,
      jsonb_build_object(
        'user_id', NEW.user_id,
        'amount', NEW.amount,
        'previous_status', OLD.status,
        'new_status', NEW.status
      ),
      'withdrawal_requests',
      auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_event_withdrawal_changes ON public.withdrawal_requests;
CREATE TRIGGER trg_event_withdrawal_changes
AFTER INSERT OR UPDATE OF status ON public.withdrawal_requests
FOR EACH ROW EXECUTE FUNCTION public.event_withdrawal_changes();

-- 6. Seed example workflow rules so the system is useful out of the box
INSERT INTO public.workflow_rules (name, description, trigger_event, conditions, actions, priority) VALUES
(
  'Alerte commande à forte valeur',
  'Notifie les admins quand une commande dépasse 100 000 FCFA',
  'order.created',
  '[{"path":"payload.total","op":"gte","value":100000}]'::jsonb,
  '[{"type":"notify_admins","params":{"title":"💎 Commande VIP","message":"Une commande à forte valeur vient d''être passée."}}]'::jsonb,
  50
),
(
  'Surveillance retraits importants',
  'Notifie les admins de tout retrait supérieur à 50 000 FCFA',
  'withdrawal.requested',
  '[{"path":"payload.amount","op":"gte","value":50000}]'::jsonb,
  '[{"type":"notify_admins","params":{"title":"💰 Retrait important","message":"Un retrait important est en attente d''approbation."}}]'::jsonb,
  50
),
(
  'Célébration livraison',
  'Trace les commandes livrées pour analytics',
  'order.status_changed',
  '[{"path":"payload.new_status","op":"eq","value":"delivered"}]'::jsonb,
  '[{"type":"log","params":{"channel":"fulfillment"}}]'::jsonb,
  100
);
