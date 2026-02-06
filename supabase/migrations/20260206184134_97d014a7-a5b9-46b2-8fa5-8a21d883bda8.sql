-- Add policy for admins to create order_update notifications
CREATE POLICY "Admins can create order update notifications"
ON public.user_notifications
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) AND type = 'order_update'
);