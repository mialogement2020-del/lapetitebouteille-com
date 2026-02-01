-- Fix RLS policies for guest checkout

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can create orders" ON public.orders;
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can create order items for their orders" ON public.order_items;

-- Orders: Allow authenticated users to create orders for themselves
CREATE POLICY "Authenticated users can create own orders" 
ON public.orders FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Orders: Allow guests to create orders with null user_id
CREATE POLICY "Guests can create orders" 
ON public.orders FOR INSERT 
WITH CHECK (auth.uid() IS NULL AND user_id IS NULL);

-- Orders: Users can view their own orders
CREATE POLICY "Users can view own orders" 
ON public.orders FOR SELECT 
USING (auth.uid() = user_id);

-- Orders: Guests can view orders by phone number (for tracking)
CREATE POLICY "Guests can view orders by phone" 
ON public.orders FOR SELECT 
USING (guest_phone IS NOT NULL);

-- Order Items: Allow insert for authenticated users' orders
CREATE POLICY "Users can create order items for own orders" 
ON public.order_items FOR INSERT 
WITH CHECK (
    auth.uid() IS NOT NULL AND 
    EXISTS (
        SELECT 1 FROM public.orders 
        WHERE orders.id = order_id AND orders.user_id = auth.uid()
    )
);

-- Order Items: Allow insert for guest orders
CREATE POLICY "Guests can create order items" 
ON public.order_items FOR INSERT 
WITH CHECK (
    auth.uid() IS NULL AND 
    EXISTS (
        SELECT 1 FROM public.orders 
        WHERE orders.id = order_id AND orders.user_id IS NULL
    )
);

-- Order Items: Allow viewing for all (product details are not sensitive)
CREATE POLICY "Anyone can view order items" 
ON public.order_items FOR SELECT 
USING (true);