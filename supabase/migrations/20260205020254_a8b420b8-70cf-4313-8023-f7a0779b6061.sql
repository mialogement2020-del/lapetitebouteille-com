-- Create a secure function to get referrer_id from a referral code
-- This function uses SECURITY DEFINER to access the table without public SELECT policy
CREATE OR REPLACE FUNCTION public.get_referrer_id_from_code(_code text)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _referrer_id uuid;
BEGIN
  SELECT user_id INTO _referrer_id
  FROM referral_codes
  WHERE (code = _code OR custom_code = _code)
    AND is_active = true;
  
  RETURN _referrer_id;
END;
$$;

-- Grant execute permission to authenticated users only (needed during checkout)
GRANT EXECUTE ON FUNCTION public.get_referrer_id_from_code(text) TO authenticated;