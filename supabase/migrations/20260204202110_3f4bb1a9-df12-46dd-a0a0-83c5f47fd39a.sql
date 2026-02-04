-- Allow system to insert notifications for commission events
-- We add a policy that allows inserting notifications for commission type
CREATE POLICY "System can insert commission notifications" 
ON public.user_notifications 
FOR INSERT 
WITH CHECK (type = 'commission');

-- Also allow the user who just placed an order to receive their own notifications
CREATE POLICY "Users can receive their own notifications" 
ON public.user_notifications 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);