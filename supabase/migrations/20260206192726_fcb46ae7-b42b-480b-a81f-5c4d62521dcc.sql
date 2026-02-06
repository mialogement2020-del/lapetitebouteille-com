
-- Modifier la fonction de génération des commissions MLM
-- pour exiger un achat minimum de 10 000 FCFA par l'ambassadeur

CREATE OR REPLACE FUNCTION public.generate_mlm_commissions(
  _order_id uuid,
  _referrer_id uuid,
  _order_total numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _current_referrer_id uuid;
  _current_level integer := 1;
  _commission_rate numeric;
  _bonus_rate numeric;
  _commission_amount numeric;
  _user_rank text;
  _commissions_created jsonb := '[]'::jsonb;
  _wallet_id uuid;
  _has_qualifying_purchase boolean;
BEGIN
  -- Start with the direct referrer
  _current_referrer_id := _referrer_id;
  
  -- Loop through up to 3 levels
  WHILE _current_level <= 3 AND _current_referrer_id IS NOT NULL LOOP
    
    -- Check if this ambassador has made at least one qualifying purchase (>= 10,000 FCFA)
    SELECT EXISTS (
      SELECT 1 FROM orders
      WHERE user_id = _current_referrer_id
        AND status NOT IN ('cancelled')
        AND total >= 10000
    ) INTO _has_qualifying_purchase;
    
    -- Only generate commission if ambassador has a qualifying purchase
    IF _has_qualifying_purchase THEN
      -- Get the commission rate for this level
      SELECT rate_percentage INTO _commission_rate
      FROM commission_rates
      WHERE level = _current_level AND is_active = true;
      
      IF _commission_rate IS NOT NULL THEN
        -- Get user's rank bonus
        SELECT rc.bonus_percentage INTO _bonus_rate
        FROM user_ranks ur
        JOIN rank_config rc ON rc.rank = ur.current_rank
        WHERE ur.user_id = _current_referrer_id;
        
        _bonus_rate := COALESCE(_bonus_rate, 0);
        
        -- Calculate commission
        _commission_amount := (_order_total * (_commission_rate + _bonus_rate)) / 100;
        
        -- Create commission record
        INSERT INTO commissions (
          beneficiary_id,
          order_id,
          order_amount,
          commission_rate,
          bonus_rate,
          commission_amount,
          level,
          status
        ) VALUES (
          _current_referrer_id,
          _order_id,
          _order_total,
          _commission_rate,
          _bonus_rate,
          _commission_amount,
          _current_level,
          'pending'
        );
        
        -- Update wallet pending balance
        SELECT id INTO _wallet_id FROM wallets WHERE user_id = _current_referrer_id;
        
        IF _wallet_id IS NOT NULL THEN
          UPDATE wallets
          SET pending_balance = COALESCE(pending_balance, 0) + _commission_amount,
              updated_at = now()
          WHERE id = _wallet_id;
        END IF;
        
        -- Create notification for the ambassador
        INSERT INTO user_notifications (
          user_id,
          type,
          title,
          message,
          reference_type,
          reference_id
        ) VALUES (
          _current_referrer_id,
          'commission',
          '💰 Nouvelle commission !',
          'Vous avez reçu une commission de ' || _commission_amount || ' FCFA (Niveau ' || _current_level || ')',
          'commission',
          _order_id::text
        );
        
        -- Add to result
        _commissions_created := _commissions_created || jsonb_build_object(
          'beneficiary_id', _current_referrer_id,
          'level', _current_level,
          'amount', _commission_amount,
          'rate', _commission_rate,
          'bonus', _bonus_rate
        );
      END IF;
    END IF;
    
    -- Move up the chain to the next referrer
    SELECT referrer_id INTO _current_referrer_id
    FROM referral_relationships
    WHERE referred_id = _current_referrer_id
      AND level = 1;
    
    _current_level := _current_level + 1;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'commissions', _commissions_created
  );
END;
$$;

-- Ajouter un commentaire explicatif
COMMENT ON FUNCTION public.generate_mlm_commissions IS 'Génère les commissions MLM sur 3 niveaux. Exige que l''ambassadeur ait effectué au moins un achat de 10 000 FCFA minimum pour être éligible aux commissions.';
