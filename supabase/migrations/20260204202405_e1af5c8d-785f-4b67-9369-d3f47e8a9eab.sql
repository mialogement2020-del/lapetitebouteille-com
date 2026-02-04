-- Drop the overly permissive policies
DROP POLICY IF EXISTS "System can insert commission notifications" ON public.user_notifications;
DROP POLICY IF EXISTS "Users can receive their own notifications" ON public.user_notifications;

-- Create a more specific policy: authenticated users can insert notifications
-- but only for themselves (they receive notifications, not create for others)
-- For commission notifications from checkout, we need to allow insert when user is placing order
-- The checkout creates notifications for the referrer, not for themselves
-- So we need a policy that allows inserting commission notifications during checkout

-- Allow authenticated users to insert commission-type notifications
-- This is needed because the checkout process creates notifications for referrers
CREATE POLICY "Checkout can create commission notifications" 
ON public.user_notifications 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND type = 'commission'
);