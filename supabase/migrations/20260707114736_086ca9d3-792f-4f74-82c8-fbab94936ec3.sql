
-- Trigger functions: no one should EXECUTE these directly
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure::text AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.prosecdef
      AND p.prorettype = 'trigger'::regtype
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
  END LOOP;
END $$;

-- Admin / service-only SECURITY DEFINER functions
DO $$
DECLARE
  fn text;
  admin_fns text[] := ARRAY[
    'public.approve_wholesaler_application(uuid)',
    'public.auto_reconcile_pending()',
    'public.auto_release_delivered_escrows()',
    'public.calculate_order_risk_score(uuid)',
    'public.capture_escrow(uuid,text)',
    'public.compute_order_risk_score(uuid)',
    'public.compute_trust_score(uuid,trust_subject_type)',
    'public.compute_user_recommendations(uuid)',
    'public.create_escrow_from_payment(uuid)',
    'public.create_invoice_from_quote(uuid,integer)',
    'public.escrow_capture(uuid,numeric,text)',
    'public.escrow_hold(uuid,uuid,uuid,numeric,text,text)',
    'public.escrow_refund(uuid,numeric,text)',
    'public.generate_mlm_commissions(uuid,uuid,numeric)',
    'public.publish_event(text,text,text,jsonb,text,uuid)',
    'public.purge_old_analytics_events()',
    'public.purge_old_perf_metrics()',
    'public.recompute_all_trust_scores()',
    'public.recompute_customer_segments()',
    'public.recompute_vendor_trust_score(uuid)',
    'public.reconcile_payment(uuid,text)',
    'public.reconcile_payment_intent(uuid)',
    'public.record_trust_signal(uuid,trust_subject_type,text,numeric,smallint,text,jsonb)',
    'public.refresh_product_affinities()',
    'public.refund_escrow(uuid,numeric,text)',
    'public.register_invoice_payment(uuid,numeric,text,text,text)',
    'public.score_order_risk(uuid)',
    'public.upsert_payment_reconciliation(uuid)',
    'public.wallet_credit(uuid,numeric,text,text,text,jsonb)',
    'public.wallet_debit(uuid,numeric,text,text,text,jsonb)',
    'public.wallet_transfer(uuid,uuid,numeric,text,text,text)',
    'public.get_vendor_order_lines()',
    'public.get_wholesaler_outstanding(uuid)',
    'public.verify_2fa_session(uuid)'
  ];
BEGIN
  FOREACH fn IN ARRAY admin_fns LOOP
    BEGIN
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn);
    EXCEPTION WHEN undefined_function THEN
      RAISE NOTICE 'skip missing %', fn;
    END;
  END LOOP;
END $$;

-- Authenticated-only helpers (role checks, self-actions)
DO $$
DECLARE
  fn text;
  auth_fns text[] := ARRAY[
    'public.get_my_roles()',
    'public.get_my_shop_id()',
    'public.get_user_rank(uuid)',
    'public.get_user_recommendations(uuid,integer)',
    'public.has_2fa_enabled(uuid)',
    'public.has_admin_permission(uuid,admin_permission)',
    'public.has_any_role(app_role[])',
    'public.has_full_admin_access(uuid)',
    'public.has_role(uuid,app_role)',
    'public.is_2fa_session_valid(uuid)',
    'public.create_referral_relationship(text)',
    'public.increment_asset_download(uuid)',
    'public.redeem_loyalty_points(uuid,integer)'
  ];
BEGIN
  FOREACH fn IN ARRAY auth_fns LOOP
    BEGIN
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', fn);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', fn);
    EXCEPTION WHEN undefined_function THEN
      RAISE NOTICE 'skip missing %', fn;
    END;
  END LOOP;
END $$;

-- Public (anon-allowed) functions: keep callable
DO $$
DECLARE
  fn text;
  pub_fns text[] := ARRAY[
    'public.lookup_guest_order(text,text,text)',
    'public.increment_article_views(text)',
    'public.increment_referral_clicks(text)',
    'public.validate_referral_code(text)',
    'public.get_referrer_id_from_code(text)',
    'public.convert_currency(numeric,text,text)',
    'public.get_active_rate(text,text)',
    'public.match_products_by_embedding(vector,integer,double precision)'
  ];
BEGIN
  FOREACH fn IN ARRAY pub_fns LOOP
    BEGIN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO anon, authenticated, service_role', fn);
    EXCEPTION WHEN undefined_function THEN
      RAISE NOTICE 'skip missing %', fn;
    END;
  END LOOP;
END $$;
