-- Drop the overly permissive policy that exposes user_id
DROP POLICY IF EXISTS "Anyone can view active referral codes by code" ON referral_codes;

-- Create a security definer function to validate referral codes without exposing user_id
CREATE OR REPLACE FUNCTION public.validate_referral_code(_code text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _referrer_id uuid;
  _is_valid boolean := false;
BEGIN
  -- Find the referrer by code or custom_code
  SELECT user_id INTO _referrer_id
  FROM referral_codes
  WHERE (code = _code OR custom_code = _code)
    AND is_active = true;
  
  IF _referrer_id IS NOT NULL THEN
    _is_valid := true;
  END IF;
  
  -- Return only validity status, NOT the user_id (for security)
  RETURN jsonb_build_object(
    'is_valid', _is_valid,
    'code', _code
  );
END;
$$;

-- Grant execute permission to authenticated and anon users
GRANT EXECUTE ON FUNCTION public.validate_referral_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_referral_code(text) TO anon;