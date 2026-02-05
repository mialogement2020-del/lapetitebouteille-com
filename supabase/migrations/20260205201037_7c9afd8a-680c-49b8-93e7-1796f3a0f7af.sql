-- ============================================
-- FIX: Grant INSERT permission to anon role on orders table
-- This is required for guest checkout to work
-- ============================================

-- Grant INSERT permission to anon for guest orders
GRANT INSERT ON public.orders TO anon;

-- Grant SELECT permission to anon for reading their orders via token
GRANT SELECT ON public.orders TO anon;

-- Grant INSERT permission to anon for order_items (guest checkout)
GRANT INSERT ON public.order_items TO anon;

-- Grant SELECT permission to anon for order_items (reading their order details)
GRANT SELECT ON public.order_items TO anon;

-- Ensure authenticated role has proper permissions too
GRANT INSERT, SELECT, UPDATE ON public.orders TO authenticated;
GRANT INSERT, SELECT ON public.order_items TO authenticated;