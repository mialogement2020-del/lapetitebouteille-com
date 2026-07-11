-- When an admin marks a cash-on-delivery order as delivered, the payment has
-- effectively been collected. Mark only COD orders as paid at that transition.
-- Mobile Money remains confirmed only through provider/webhook proof.

CREATE OR REPLACE FUNCTION public.admin_update_order_status(
  _order_id uuid,
  _new_status public.order_status,
  _notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_status public.order_status;
  v_order_number text;
  v_payment_method public.payment_method;
  v_payment_status public.payment_status;
  v_next_payment_status public.payment_status;
  v_history_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'admin_required';
  END IF;

  SELECT status, order_number, payment_method, payment_status
    INTO v_old_status, v_order_number, v_payment_method, v_payment_status
  FROM public.orders
  WHERE id = _order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'order_not_found';
  END IF;

  v_next_payment_status := v_payment_status;

  IF _new_status = 'delivered'
     AND v_payment_method = 'cash_on_delivery'
     AND v_payment_status = 'pending' THEN
    v_next_payment_status := 'completed';
  END IF;

  UPDATE public.orders
  SET
    status = _new_status,
    payment_status = v_next_payment_status,
    payment_reference = CASE
      WHEN v_next_payment_status = 'completed'
       AND v_payment_status IS DISTINCT FROM v_next_payment_status
       AND payment_reference IS NULL
      THEN 'cod:' || v_order_number
      ELSE payment_reference
    END
  WHERE id = _order_id;

  IF NULLIF(trim(COALESCE(_notes, '')), '') IS NOT NULL THEN
    SELECT id
      INTO v_history_id
    FROM public.order_status_history
    WHERE order_id = _order_id
      AND new_status = _new_status::text
    ORDER BY changed_at DESC
    LIMIT 1;

    IF v_history_id IS NOT NULL THEN
      UPDATE public.order_status_history
      SET notes = _notes
      WHERE id = v_history_id;
    ELSE
      BEGIN
        INSERT INTO public.order_status_history (
          order_id,
          previous_status,
          new_status,
          changed_by,
          notes
        ) VALUES (
          _order_id,
          v_old_status::text,
          _new_status::text,
          auth.uid(),
          _notes
        );
      EXCEPTION
        WHEN others THEN
          RAISE WARNING 'Manual order status note logging failed for order %: %', _order_id, SQLERRM;
      END;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', _order_id,
    'order_number', v_order_number,
    'previous_status', v_old_status,
    'new_status', _new_status,
    'previous_payment_status', v_payment_status,
    'payment_status', v_next_payment_status,
    'cod_payment_completed', v_next_payment_status = 'completed' AND v_payment_status IS DISTINCT FROM v_next_payment_status
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_order_status(uuid, public.order_status, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_order_status(uuid, public.order_status, text) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
