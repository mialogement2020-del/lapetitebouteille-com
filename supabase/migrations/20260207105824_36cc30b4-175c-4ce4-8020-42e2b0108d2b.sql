-- ============================================================
-- SECURITY FIX: Block direct access to admin_2fa sensitive fields
-- Force all clients to use admin_2fa_status view instead
-- ============================================================

-- Drop existing SELECT policies on admin_2fa
DROP POLICY IF EXISTS "Admins can view their own 2FA status" ON public.admin_2fa;

-- The admin_2fa table should ONLY be accessible via:
-- 1. Edge functions using service role (bypasses RLS)
-- 2. The admin_2fa_status view (excludes sensitive fields)

-- No SELECT policy = no direct client access to the table
-- Edge functions with service role can still read/write

-- ============================================================
-- SECURITY FIX: Tighten service role INSERT policies
-- Replace WITH CHECK (true) with proper admin restrictions
-- ============================================================

-- Fix report_history: Only admins can insert (edge functions use service role anyway)
DROP POLICY IF EXISTS "Service role can insert report history" ON public.report_history;

CREATE POLICY "Admins can insert report history"
ON public.report_history
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Fix user_notifications: Allow users to insert their own notifications OR admins can insert any
-- But edge functions use service role, so this is mainly for client-side safety
DROP POLICY IF EXISTS "Service role can insert notifications" ON public.user_notifications;

-- Note: We need to keep some insert capability for triggers/edge functions
-- Since edge functions use service role (bypasses RLS), we can restrict client access
-- Allow users to only see their own notifications, no direct insert from clients

-- Keep only the SELECT policy for users, remove permissive INSERT
-- Edge functions using service role can still insert