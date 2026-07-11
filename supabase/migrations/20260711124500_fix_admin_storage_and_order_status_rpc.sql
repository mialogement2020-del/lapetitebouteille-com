-- Fix historical admin RLS issues for storage uploads and order status changes.
-- Safe migration: no data deletion, no stock recalculation.

INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO UPDATE
SET public = true;

DROP POLICY IF EXISTS "Public read product images" ON storage.objects;
DROP POLICY IF EXISTS "Public can read product images" ON storage.objects;
CREATE POLICY "Public can read product images"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Admins can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can insert product images" ON storage.objects;
CREATE POLICY "Admins can insert product images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'product-images'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);

DROP POLICY IF EXISTS "Admins can update product images" ON storage.objects;
CREATE POLICY "Admins can update product images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'product-images'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
)
WITH CHECK (
  bucket_id = 'product-images'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);

DROP POLICY IF EXISTS "Admins can delete product images" ON storage.objects;
CREATE POLICY "Admins can delete product images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'product-images'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);

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
  v_history_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'admin_required';
  END IF;

  SELECT status, order_number
    INTO v_old_status, v_order_number
  FROM public.orders
  WHERE id = _order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'order_not_found';
  END IF;

  UPDATE public.orders
  SET status = _new_status
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
    'new_status', _new_status
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_order_status(uuid, public.order_status, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_order_status(uuid, public.order_status, text) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
