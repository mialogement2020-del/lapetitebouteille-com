-- ============================================
-- SECURITY FIX: Restrict withdrawal_requests policies to authenticated role only
-- This fixes the Supabase linter warning about anonymous access
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can manage withdrawals" ON public.withdrawal_requests;
DROP POLICY IF EXISTS "Users can create withdrawal requests" ON public.withdrawal_requests;
DROP POLICY IF EXISTS "Users can view their own withdrawals" ON public.withdrawal_requests;

-- Recreate policies explicitly targeting 'authenticated' role
-- This ensures the anon role cannot even attempt to access this table

-- Admin policy for ALL operations
CREATE POLICY "Admins can manage withdrawals"
ON public.withdrawal_requests
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Users can create their own withdrawal requests
CREATE POLICY "Users can create withdrawal requests"
ON public.withdrawal_requests
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can view their own withdrawal requests
CREATE POLICY "Users can view their own withdrawals"
ON public.withdrawal_requests
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);