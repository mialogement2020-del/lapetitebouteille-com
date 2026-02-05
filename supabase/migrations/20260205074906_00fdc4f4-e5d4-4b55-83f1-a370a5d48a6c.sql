-- Fix: Add explicit INSERT policy for profiles table
-- The handle_new_user trigger uses SECURITY DEFINER so it bypasses RLS
-- This policy ensures users can only create their own profile (defensive measure)

CREATE POLICY "System can create profiles"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = id);