-- Fix #1: Secure orders table - Remove dangerous guest phone policy
DROP POLICY IF EXISTS "Guests can view orders by phone" ON public.orders;

-- Add order lookup token for secure guest access
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_lookup_token TEXT;

-- Create index for faster lookup
CREATE INDEX IF NOT EXISTS idx_orders_lookup_token ON public.orders(order_lookup_token) WHERE order_lookup_token IS NOT NULL;

-- Fix #2: Replace permissive referral insert policy with strict validation
DROP POLICY IF EXISTS "Users can create their own referral relationship" ON public.referral_relationships;
DROP POLICY IF EXISTS "System can create referral relationships" ON public.referral_relationships;

-- Create strict policy with comprehensive validation
CREATE POLICY "Users create validated referral once" 
ON public.referral_relationships
FOR INSERT WITH CHECK (
  -- Only referred user can create relationship for themselves
  referred_id = auth.uid() AND
  
  -- Referrer must have valid active referral code
  EXISTS (
    SELECT 1 FROM public.referral_codes 
    WHERE user_id = referrer_id 
    AND (code = referral_code_used OR custom_code = referral_code_used)
    AND is_active = true
  ) AND
  
  -- Cannot refer yourself
  referrer_id != auth.uid() AND
  
  -- Must be level 1 only (direct referral)
  level = 1 AND
  
  -- Can only create ONE referral relationship per user
  NOT EXISTS (
    SELECT 1 FROM public.referral_relationships 
    WHERE referred_id = auth.uid()
  )
);

-- Fix #5: Create atomic commission generation function to prevent race conditions
CREATE OR REPLACE FUNCTION public.generate_mlm_commissions(
  _order_id UUID,
  _referrer_id UUID,
  _order_total NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _current_referrer_id UUID;
  _level INT;
  _rate NUMERIC;
  _bonus_rate NUMERIC;
  _effective_rate NUMERIC;
  _commission_amount NUMERIC;
  _wallet_id UUID;
  _new_balance NUMERIC;
  _commission_id UUID;
  _result JSONB := '[]'::jsonb;
BEGIN
  _current_referrer_id := _referrer_id;
  
  -- Process each level
  FOR _level, _rate IN 
    SELECT 1, 8::NUMERIC UNION ALL
    SELECT 2, 4::NUMERIC UNION ALL
    SELECT 3, 2::NUMERIC
  LOOP
    EXIT WHEN _current_referrer_id IS NULL;
    
    -- Get rank bonus
    SELECT COALESCE(rc.bonus_percentage, 0) INTO _bonus_rate
    FROM user_ranks ur
    JOIN rank_config rc ON rc.rank = ur.current_rank
    WHERE ur.user_id = _current_referrer_id;
    
    _bonus_rate := COALESCE(_bonus_rate, 0);
    _effective_rate := _rate + (CASE WHEN _level = 1 THEN _bonus_rate ELSE 0 END);
    _commission_amount := (_order_total * _effective_rate) / 100;
    
    -- ATOMIC: Get wallet and update balance in single operation
    UPDATE wallets
    SET pending_balance = COALESCE(pending_balance, 0) + _commission_amount
    WHERE user_id = _current_referrer_id
    RETURNING id, pending_balance INTO _wallet_id, _new_balance;
    
    IF NOT FOUND THEN
      -- Wallet doesn't exist, skip this level
      RAISE NOTICE 'Wallet not found for user %, skipping', _current_referrer_id;
    ELSE
      -- Create commission record
      INSERT INTO commissions (
        order_id, beneficiary_id, level, commission_rate,
        bonus_rate, order_amount, commission_amount, status
      ) VALUES (
        _order_id, _current_referrer_id, _level, _effective_rate,
        CASE WHEN _level = 1 THEN _bonus_rate ELSE 0 END,
        _order_total, _commission_amount, 'pending'
      ) RETURNING id INTO _commission_id;
      
      -- Create wallet transaction
      INSERT INTO wallet_transactions (
        wallet_id, user_id, type, amount, balance_after,
        reference_type, reference_id, description
      ) VALUES (
        _wallet_id, _current_referrer_id, 'commission', _commission_amount,
        _new_balance, 'order', _order_id,
        format('Commission niveau %s (%s%%)', _level, _effective_rate)
      );
      
      -- Create notification
      INSERT INTO user_notifications (
        user_id, type, title, message, reference_type, reference_id
      ) VALUES (
        _current_referrer_id, 'commission',
        format('🎉 Nouvelle commission niveau %s', _level),
        format('Vous avez reçu %s FCFA de commission (%s%%) suite à une commande.', 
          to_char(_commission_amount, 'FM999,999,999'), _effective_rate),
        'commission', _commission_id
      );
      
      -- Add to result
      _result := _result || jsonb_build_object(
        'level', _level,
        'amount', _commission_amount,
        'beneficiary_id', _current_referrer_id
      );
    END IF;
    
    -- Get next referrer
    SELECT referrer_id INTO _current_referrer_id
    FROM referral_relationships
    WHERE referred_id = _current_referrer_id AND level = 1;
  END LOOP;
  
  RETURN jsonb_build_object('success', true, 'commissions', _result);
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Create secure referral creation function (to replace client-side processing)
CREATE OR REPLACE FUNCTION public.create_referral_relationship(
  _referral_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _referrer_id UUID;
  _user_id UUID;
  _current_signups INTEGER;
BEGIN
  _user_id := auth.uid();
  
  -- Validate user is authenticated
  IF _user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  
  -- Sanitize input - only allow alphanumeric and hyphen/underscore
  IF _referral_code !~ '^[A-Za-z0-9_-]+$' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid code format');
  END IF;
  
  -- Check if user already has a referrer
  IF EXISTS (SELECT 1 FROM referral_relationships WHERE referred_id = _user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already referred');
  END IF;
  
  -- Find referrer with SAFE lookup
  SELECT user_id, COALESCE(total_signups, 0) INTO _referrer_id, _current_signups
  FROM referral_codes
  WHERE (code = _referral_code OR custom_code = _referral_code)
  AND is_active = true;
  
  IF _referrer_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid referral code');
  END IF;
  
  -- Cannot self-refer
  IF _referrer_id = _user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot refer yourself');
  END IF;
  
  -- Create relationship atomically
  INSERT INTO referral_relationships (referrer_id, referred_id, level, referral_code_used)
  VALUES (_referrer_id, _user_id, 1, _referral_code);
  
  -- Update referral code stats
  UPDATE referral_codes
  SET total_signups = _current_signups + 1
  WHERE user_id = _referrer_id;
  
  RETURN jsonb_build_object('success', true, 'referrer_id', _referrer_id);
EXCEPTION 
  WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already referred');
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;