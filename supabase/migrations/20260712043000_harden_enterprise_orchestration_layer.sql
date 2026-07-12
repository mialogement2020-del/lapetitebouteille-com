-- Harden enterprise orchestration foundations after LPB Ecosystem V2 audit.
-- Additive migration: no data deletion, no workflow execution replay.

ALTER TABLE public.domain_events
  ADD COLUMN IF NOT EXISTS attempt_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_attempt_at timestamptz,
  ADD COLUMN IF NOT EXISTS next_attempt_at timestamptz,
  ADD COLUMN IF NOT EXISTS locked_at timestamptz,
  ADD COLUMN IF NOT EXISTS locked_by text,
  ADD COLUMN IF NOT EXISTS dead_letter_at timestamptz;

CREATE INDEX IF NOT EXISTS domain_events_processable_idx
ON public.domain_events (status, (COALESCE(next_attempt_at, occurred_at)), occurred_at)
WHERE status IN ('pending', 'failed');

CREATE INDEX IF NOT EXISTS domain_events_dead_letter_idx
ON public.domain_events (dead_letter_at DESC)
WHERE status = 'dead_letter';

-- The previous version dispatched an Edge Function from SQL with a hard-coded
-- Supabase project URL and anon JWT. Database triggers now only persist events.
-- A secured scheduler/admin action should process pending rows out-of-band.
CREATE OR REPLACE FUNCTION public.publish_event(
  _event_type text,
  _aggregate_type text,
  _aggregate_id text,
  _payload jsonb DEFAULT '{}'::jsonb,
  _source text DEFAULT 'system',
  _actor_id uuid DEFAULT NULL
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id bigint;
BEGIN
  INSERT INTO public.domain_events (
    event_type,
    aggregate_type,
    aggregate_id,
    payload,
    source,
    actor_id,
    status,
    next_attempt_at
  )
  VALUES (
    _event_type,
    _aggregate_type,
    _aggregate_id,
    COALESCE(_payload, '{}'::jsonb),
    _source,
    _actor_id,
    'pending',
    now()
  )
  RETURNING id INTO _id;

  RETURN _id;
END;
$$;

REVOKE ALL ON FUNCTION public.publish_event(text, text, text, jsonb, text, uuid)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.publish_event(text, text, text, jsonb, text, uuid)
TO service_role;

CREATE OR REPLACE VIEW public.admin_orchestration_health AS
SELECT
  count(*) FILTER (WHERE status = 'pending') AS pending_events,
  count(*) FILTER (WHERE status = 'failed') AS failed_events,
  count(*) FILTER (WHERE status = 'dead_letter') AS dead_letter_events,
  min(occurred_at) FILTER (WHERE status = 'pending') AS oldest_pending_at,
  count(*) FILTER (WHERE occurred_at >= now() - interval '24 hours') AS events_24h,
  (
    SELECT count(*)
    FROM public.workflow_executions we
    WHERE we.executed_at >= now() - interval '24 hours'
  ) AS executions_24h,
  (
    SELECT count(*)
    FROM public.workflow_executions we
    WHERE we.executed_at >= now() - interval '24 hours'
      AND we.status = 'failed'
  ) AS failed_executions_24h
FROM public.domain_events
WHERE public.has_role(auth.uid(), 'admin'::public.app_role);

GRANT SELECT ON public.admin_orchestration_health TO authenticated, service_role;

-- Fix the reputation signal emitted when MLM commissions are completed.
-- The old trigger referenced obsolete commission columns and statuses.
-- Current commissions use beneficiary_id, commission_amount, and payment_status values.
CREATE OR REPLACE FUNCTION public.trust_signal_on_commission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_should_emit boolean := false;
BEGIN
  IF NEW.status = 'completed' AND NEW.beneficiary_id IS NOT NULL THEN
    IF TG_OP = 'INSERT' THEN
      v_should_emit := true;
    ELSIF OLD.status IS DISTINCT FROM NEW.status THEN
      v_should_emit := true;
    END IF;
  END IF;

  IF v_should_emit THEN
    BEGIN
      PERFORM public.record_trust_signal(
        NEW.beneficiary_id,
        'ambassador'::public.trust_subject_type,
        'commission_completed',
        1,
        1,
        'mlm',
        jsonb_build_object(
          'commission_id', NEW.id,
          'order_id', NEW.order_id,
          'amount', NEW.commission_amount,
          'level', NEW.level
        )
      );

      PERFORM public.compute_trust_score(
        NEW.beneficiary_id,
        'ambassador'::public.trust_subject_type
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Commission trust signal skipped for commission %: %', NEW.id, SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_trust_signal_commission ON public.commissions;
CREATE TRIGGER trg_trust_signal_commission
AFTER INSERT OR UPDATE OF status ON public.commissions
FOR EACH ROW
EXECUTE FUNCTION public.trust_signal_on_commission();

NOTIFY pgrst, 'reload schema';
