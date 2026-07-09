CREATE OR REPLACE FUNCTION public.can_insert_order_item_for_current_actor(_order_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.orders o
    WHERE o.id = _order_id
      AND (
        o.user_id = auth.uid()
        OR o.user_id IS NULL
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.can_insert_order_item_for_current_actor(uuid) TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Guests can create order items" ON public.order_items;
DROP POLICY IF EXISTS "Users can create order items for own or guest orders" ON public.order_items;

CREATE POLICY "Guests can create order items for guest orders"
ON public.order_items
FOR INSERT
TO anon
WITH CHECK (public.can_insert_order_item_for_current_actor(order_id));

CREATE POLICY "Users can create order items for own or guest orders"
ON public.order_items
FOR INSERT
TO authenticated
WITH CHECK (public.can_insert_order_item_for_current_actor(order_id));