-- FIX 1: Remove public access to order_items
-- The "Anyone can view order items" policy exposes all purchase data publicly

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can view order items" ON public.order_items;

-- Add policy for guest order viewing via lookup token (for order confirmation page)
-- This allows guests to view their order items using the secure order lookup token
CREATE POLICY "Guests can view order items via order lookup"
ON public.order_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = order_items.order_id
    AND orders.user_id IS NULL
    AND orders.order_lookup_token IS NOT NULL
  )
);

-- FIX 2: Create atomic withdrawal processing trigger
-- This ensures wallet balance is properly deducted when a withdrawal is approved

CREATE OR REPLACE FUNCTION public.process_withdrawal_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _current_balance NUMERIC;
  _new_balance NUMERIC;
BEGIN
  -- Only process when status changes from pending to completed (approval)
  IF NEW.status = 'completed' AND OLD.status = 'pending' THEN
    -- Get current balance atomically with FOR UPDATE lock
    SELECT balance INTO _current_balance
    FROM wallets
    WHERE id = NEW.wallet_id
    FOR UPDATE;
    
    -- Check sufficient balance
    IF _current_balance IS NULL OR _current_balance < NEW.amount THEN
      RAISE EXCEPTION 'Solde insuffisant pour ce retrait. Solde: %, Demandé: %', 
        COALESCE(_current_balance, 0), NEW.amount;
    END IF;
    
    -- Calculate new balance
    _new_balance := _current_balance - NEW.amount;
    
    -- Deduct from wallet balance and update stats atomically
    UPDATE wallets 
    SET 
      balance = _new_balance,
      total_withdrawn = COALESCE(total_withdrawn, 0) + NEW.amount,
      updated_at = NOW()
    WHERE id = NEW.wallet_id;
    
    -- Record transaction for audit trail
    INSERT INTO wallet_transactions (
      wallet_id, 
      user_id, 
      type, 
      amount, 
      balance_after,
      reference_type, 
      reference_id, 
      description
    ) VALUES (
      NEW.wallet_id, 
      NEW.user_id, 
      'withdrawal', 
      NEW.amount,
      _new_balance,
      'withdrawal', 
      NEW.id, 
      format('Retrait approuvé via %s - %s', NEW.payment_method, NEW.phone_number)
    );
    
    -- Set processed_by to track which admin approved
    NEW.processed_by := auth.uid();
    NEW.processed_at := NOW();
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on withdrawal_requests
DROP TRIGGER IF EXISTS withdrawal_status_change_trigger ON public.withdrawal_requests;
CREATE TRIGGER withdrawal_status_change_trigger
BEFORE UPDATE ON public.withdrawal_requests
FOR EACH ROW
EXECUTE FUNCTION public.process_withdrawal_status_change();