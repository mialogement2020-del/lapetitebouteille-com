-- Drop existing guest viewing policies and create a more flexible one
DROP POLICY IF EXISTS "Guests can view orders via lookup token" ON orders;
DROP POLICY IF EXISTS "Guests can view their orders via token" ON orders;

-- Create a new policy that allows viewing guest orders by matching email or phone
CREATE POLICY "Guests can view their orders by email or phone"
  ON orders
  FOR SELECT
  USING (
    user_id IS NULL AND (
      -- Allow if order_lookup_token exists
      order_lookup_token IS NOT NULL
      -- OR if guest_email or guest_phone is not null (for phone/email lookup)
      OR guest_email IS NOT NULL 
      OR guest_phone IS NOT NULL
      OR shipping_phone IS NOT NULL
    )
  );

-- Also allow viewing order_items for these orders
DROP POLICY IF EXISTS "Guests can view order items via order lookup" ON order_items;

CREATE POLICY "Guests can view order items for guest orders"
  ON order_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = order_items.order_id 
      AND orders.user_id IS NULL
    )
  );