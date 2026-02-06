-- Create table for admin 2FA configuration
CREATE TABLE public.admin_2fa (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    totp_secret TEXT NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT false,
    backup_codes TEXT[] DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    last_verified_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

-- Enable RLS
ALTER TABLE public.admin_2fa ENABLE ROW LEVEL SECURITY;

-- Only admins can view their own 2FA config (secret should be hidden via view)
CREATE POLICY "Admins can view their own 2FA status"
ON public.admin_2fa
FOR SELECT
TO authenticated
USING (
    auth.uid() = user_id 
    AND public.has_role(auth.uid(), 'admin')
);

-- Only the user can update their own 2FA
CREATE POLICY "Admins can update their own 2FA"
ON public.admin_2fa
FOR UPDATE
TO authenticated
USING (
    auth.uid() = user_id 
    AND public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
    auth.uid() = user_id 
    AND public.has_role(auth.uid(), 'admin')
);

-- Create a view that hides the secret for client-side queries
CREATE VIEW public.admin_2fa_status
WITH (security_invoker=on) AS
SELECT 
    id,
    user_id,
    is_enabled,
    backup_codes IS NOT NULL AS has_backup_codes,
    created_at,
    updated_at,
    last_verified_at
FROM public.admin_2fa;

-- Function to check if user has 2FA enabled
CREATE OR REPLACE FUNCTION public.has_2fa_enabled(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COALESCE(
        (SELECT is_enabled FROM public.admin_2fa WHERE user_id = _user_id),
        false
    )
$$;

-- Function to verify TOTP code (called from edge function only)
CREATE OR REPLACE FUNCTION public.verify_2fa_session(_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.admin_2fa
    SET last_verified_at = now()
    WHERE user_id = _user_id;
END;
$$;

-- Function to check if 2FA session is still valid (within 15 minutes)
CREATE OR REPLACE FUNCTION public.is_2fa_session_valid(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COALESCE(
        (SELECT last_verified_at > now() - INTERVAL '15 minutes' 
         FROM public.admin_2fa 
         WHERE user_id = _user_id AND is_enabled = true),
        true  -- If 2FA not enabled, session is always valid
    )
$$;

-- Add trigger for updated_at
CREATE TRIGGER update_admin_2fa_updated_at
BEFORE UPDATE ON public.admin_2fa
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();