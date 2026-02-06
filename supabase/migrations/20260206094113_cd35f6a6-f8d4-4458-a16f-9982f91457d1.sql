-- Function to increment referral clicks atomically
CREATE OR REPLACE FUNCTION public.increment_referral_clicks(_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _updated_count INTEGER;
BEGIN
  -- Sanitize input
  IF _code IS NULL OR _code !~ '^[A-Za-z0-9_-]+$' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid code format');
  END IF;

  -- Increment click counter for matching code
  UPDATE referral_codes
  SET total_clicks = COALESCE(total_clicks, 0) + 1
  WHERE (code = _code OR custom_code = _code)
    AND is_active = true;
  
  GET DIAGNOSTICS _updated_count = ROW_COUNT;
  
  IF _updated_count = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Code not found');
  END IF;
  
  RETURN jsonb_build_object('success', true, 'clicks_incremented', true);
END;
$$;