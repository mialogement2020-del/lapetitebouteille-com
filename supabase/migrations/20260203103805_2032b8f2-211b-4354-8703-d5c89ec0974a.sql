-- Fix: Replace permissive INSERT policy with service role based insertion
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Service role can insert notifications" ON public.user_notifications;

-- Admins can insert notifications for anyone
CREATE POLICY "Admins can insert notifications"
ON public.user_notifications
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));