-- =============================================
-- GIFT PACKAGING OPTIONS
-- =============================================

-- Table for gift packaging options
CREATE TABLE public.gift_packaging_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price INTEGER NOT NULL DEFAULT 0,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.gift_packaging_options ENABLE ROW LEVEL SECURITY;

-- Anyone can view active packaging options
CREATE POLICY "Anyone can view active packaging options"
  ON public.gift_packaging_options
  FOR SELECT
  USING (is_active = true);

-- Admins can manage packaging options
CREATE POLICY "Admins can manage packaging options"
  ON public.gift_packaging_options
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Insert default gift packaging options
INSERT INTO public.gift_packaging_options (name, description, price, display_order) VALUES
  ('Standard', 'Emballage soigné dans un sac élégant', 0, 1),
  ('Coffret Cadeau', 'Boîte premium avec nœud satin', 2500, 2),
  ('Coffret Luxe', 'Écrin en bois avec message personnalisé', 5000, 3);

-- =============================================
-- LOYALTY POINTS SYSTEM
-- =============================================

-- Loyalty points configuration
CREATE TABLE public.loyalty_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  points_per_fcfa INTEGER DEFAULT 1, -- 1 point per 100 FCFA spent
  fcfa_per_point INTEGER DEFAULT 100, -- How many FCFA = 1 point
  min_points_redeem INTEGER DEFAULT 500, -- Minimum points to redeem
  points_value_fcfa INTEGER DEFAULT 10, -- 1 point = 10 FCFA discount
  welcome_bonus INTEGER DEFAULT 100, -- Points given on first order
  birthday_bonus INTEGER DEFAULT 200, -- Bonus points on birthday
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.loyalty_config ENABLE ROW LEVEL SECURITY;

-- Anyone can view config
CREATE POLICY "Anyone can view loyalty config"
  ON public.loyalty_config
  FOR SELECT
  USING (true);

-- Admins can manage config
CREATE POLICY "Admins can manage loyalty config"
  ON public.loyalty_config
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Insert default config
INSERT INTO public.loyalty_config (points_per_fcfa, fcfa_per_point, min_points_redeem, points_value_fcfa, welcome_bonus)
VALUES (1, 100, 500, 10, 100);

-- User loyalty points balance
CREATE TABLE public.user_loyalty (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  total_points INTEGER DEFAULT 0,
  lifetime_points INTEGER DEFAULT 0, -- Total points ever earned
  tier TEXT DEFAULT 'bronze' CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_loyalty ENABLE ROW LEVEL SECURITY;

-- Users can view their own loyalty
CREATE POLICY "Users can view own loyalty"
  ON public.user_loyalty
  FOR SELECT
  USING (auth.uid() = user_id);

-- System can insert/update (via triggers)
CREATE POLICY "System can manage loyalty"
  ON public.user_loyalty
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Loyalty points transactions
CREATE TABLE public.loyalty_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  points INTEGER NOT NULL, -- Can be positive (earned) or negative (redeemed)
  type TEXT NOT NULL CHECK (type IN ('purchase', 'redemption', 'bonus', 'welcome', 'birthday', 'referral', 'adjustment')),
  description TEXT,
  reference_type TEXT, -- 'order', 'promo', etc.
  reference_id UUID,
  balance_after INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;

-- Users can view their own transactions
CREATE POLICY "Users can view own loyalty transactions"
  ON public.loyalty_transactions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all
CREATE POLICY "Admins can view all loyalty transactions"
  ON public.loyalty_transactions
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Add gift packaging fields to orders
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS gift_packaging_id UUID REFERENCES public.gift_packaging_options(id),
  ADD COLUMN IF NOT EXISTS gift_message TEXT,
  ADD COLUMN IF NOT EXISTS gift_packaging_price INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS loyalty_points_earned INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS loyalty_points_used INTEGER DEFAULT 0;

-- Function to calculate and award loyalty points after order completion
CREATE OR REPLACE FUNCTION public.award_loyalty_points()
RETURNS TRIGGER AS $$
DECLARE
  _config RECORD;
  _current_balance INTEGER;
  _points_to_award INTEGER;
  _new_balance INTEGER;
  _is_first_order BOOLEAN;
BEGIN
  -- Only award points when order is delivered
  IF NEW.status = 'delivered' AND OLD.status != 'delivered' AND NEW.user_id IS NOT NULL THEN
    -- Get loyalty config
    SELECT * INTO _config FROM public.loyalty_config WHERE is_active = true LIMIT 1;
    
    IF _config IS NULL THEN
      RETURN NEW;
    END IF;
    
    -- Calculate points (1 point per 100 FCFA)
    _points_to_award := FLOOR(NEW.total / _config.fcfa_per_point) * _config.points_per_fcfa;
    
    -- Check if first order for welcome bonus
    SELECT COUNT(*) = 1 INTO _is_first_order
    FROM public.orders
    WHERE user_id = NEW.user_id AND status = 'delivered';
    
    IF _is_first_order THEN
      _points_to_award := _points_to_award + _config.welcome_bonus;
    END IF;
    
    -- Get or create user loyalty record
    INSERT INTO public.user_loyalty (user_id, total_points, lifetime_points)
    VALUES (NEW.user_id, 0, 0)
    ON CONFLICT (user_id) DO NOTHING;
    
    SELECT total_points INTO _current_balance
    FROM public.user_loyalty
    WHERE user_id = NEW.user_id
    FOR UPDATE;
    
    _new_balance := COALESCE(_current_balance, 0) + _points_to_award;
    
    -- Update user loyalty
    UPDATE public.user_loyalty
    SET 
      total_points = _new_balance,
      lifetime_points = lifetime_points + _points_to_award,
      updated_at = now(),
      tier = CASE
        WHEN lifetime_points + _points_to_award >= 10000 THEN 'platinum'
        WHEN lifetime_points + _points_to_award >= 5000 THEN 'gold'
        WHEN lifetime_points + _points_to_award >= 2000 THEN 'silver'
        ELSE 'bronze'
      END
    WHERE user_id = NEW.user_id;
    
    -- Record transaction
    INSERT INTO public.loyalty_transactions (
      user_id, points, type, description, reference_type, reference_id, balance_after
    ) VALUES (
      NEW.user_id,
      _points_to_award,
      CASE WHEN _is_first_order THEN 'welcome' ELSE 'purchase' END,
      CASE WHEN _is_first_order 
        THEN format('Commande %s + Bonus bienvenue', NEW.order_number)
        ELSE format('Commande %s', NEW.order_number)
      END,
      'order',
      NEW.id,
      _new_balance
    );
    
    -- Update order with points earned
    NEW.loyalty_points_earned := _points_to_award;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for loyalty points
CREATE TRIGGER award_loyalty_points_trigger
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.award_loyalty_points();

-- Function to redeem loyalty points
CREATE OR REPLACE FUNCTION public.redeem_loyalty_points(_user_id UUID, _points INTEGER)
RETURNS JSONB AS $$
DECLARE
  _config RECORD;
  _current_balance INTEGER;
  _new_balance INTEGER;
  _discount_amount INTEGER;
BEGIN
  -- Get config
  SELECT * INTO _config FROM public.loyalty_config WHERE is_active = true LIMIT 1;
  
  IF _config IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Programme fidélité non disponible');
  END IF;
  
  -- Check minimum points
  IF _points < _config.min_points_redeem THEN
    RETURN jsonb_build_object('success', false, 'error', format('Minimum %s points requis', _config.min_points_redeem));
  END IF;
  
  -- Get current balance
  SELECT total_points INTO _current_balance
  FROM public.user_loyalty
  WHERE user_id = _user_id
  FOR UPDATE;
  
  IF _current_balance IS NULL OR _current_balance < _points THEN
    RETURN jsonb_build_object('success', false, 'error', 'Points insuffisants');
  END IF;
  
  _new_balance := _current_balance - _points;
  _discount_amount := _points * _config.points_value_fcfa;
  
  -- Update balance
  UPDATE public.user_loyalty
  SET total_points = _new_balance, updated_at = now()
  WHERE user_id = _user_id;
  
  -- Record transaction
  INSERT INTO public.loyalty_transactions (
    user_id, points, type, description, balance_after
  ) VALUES (
    _user_id,
    -_points,
    'redemption',
    format('Utilisation de %s points pour %s FCFA de réduction', _points, _discount_amount),
    _new_balance
  );
  
  RETURN jsonb_build_object(
    'success', true, 
    'discount_amount', _discount_amount,
    'points_used', _points,
    'remaining_balance', _new_balance
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.redeem_loyalty_points TO authenticated;