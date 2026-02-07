-- =============================================
-- NOUVELLES FONCTIONNALITÉS E-COMMERCE & MLM
-- =============================================

-- 1. PRODUITS VUS RÉCEMMENT
CREATE TABLE public.recently_viewed (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  view_count INTEGER DEFAULT 1,
  UNIQUE(user_id, product_id)
);

ALTER TABLE public.recently_viewed ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own recently viewed" 
ON public.recently_viewed FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own recently viewed" 
ON public.recently_viewed FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recently viewed" 
ON public.recently_viewed FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recently viewed" 
ON public.recently_viewed FOR DELETE 
USING (auth.uid() = user_id);

CREATE INDEX idx_recently_viewed_user ON public.recently_viewed(user_id, viewed_at DESC);

-- 2. ALERTES RETOUR EN STOCK
CREATE TABLE public.back_in_stock_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  email VARCHAR(255),
  phone VARCHAR(20),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  is_notified BOOLEAN DEFAULT false,
  notified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT email_or_user CHECK (user_id IS NOT NULL OR email IS NOT NULL)
);

ALTER TABLE public.back_in_stock_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own alerts" 
ON public.back_in_stock_alerts FOR SELECT 
USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Anyone can create alerts" 
ON public.back_in_stock_alerts FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can delete their own alerts" 
ON public.back_in_stock_alerts FOR DELETE 
USING (auth.uid() = user_id);

CREATE INDEX idx_back_in_stock_product ON public.back_in_stock_alerts(product_id, is_notified);

-- 3. VENTES FLASH
CREATE TABLE public.flash_sales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  discount_percentage INTEGER NOT NULL CHECK (discount_percentage > 0 AND discount_percentage <= 90),
  starts_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  banner_image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_dates CHECK (ends_at > starts_at)
);

ALTER TABLE public.flash_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active flash sales" 
ON public.flash_sales FOR SELECT 
USING (is_active = true AND starts_at <= now() AND ends_at > now());

CREATE POLICY "Admins can manage flash sales" 
ON public.flash_sales FOR ALL 
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_flash_sales_active ON public.flash_sales(is_active, starts_at, ends_at);

-- 4. PRODUITS EN VENTE FLASH
CREATE TABLE public.flash_sale_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  flash_sale_id UUID NOT NULL REFERENCES public.flash_sales(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  flash_price INTEGER NOT NULL,
  max_quantity INTEGER,
  sold_quantity INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(flash_sale_id, product_id)
);

ALTER TABLE public.flash_sale_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view flash sale products" 
ON public.flash_sale_products FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage flash sale products" 
ON public.flash_sale_products FOR ALL 
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 5. CHALLENGES AMBASSADEURS
CREATE TABLE public.ambassador_challenges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  challenge_type VARCHAR(50) NOT NULL CHECK (challenge_type IN ('referrals', 'sales', 'signups', 'orders')),
  target_value INTEGER NOT NULL,
  bonus_amount INTEGER NOT NULL,
  starts_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  badge_icon VARCHAR(50),
  badge_color VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_challenge_dates CHECK (ends_at > starts_at)
);

ALTER TABLE public.ambassador_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active challenges" 
ON public.ambassador_challenges FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can manage challenges" 
ON public.ambassador_challenges FOR ALL 
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 6. PARTICIPATIONS AUX CHALLENGES
CREATE TABLE public.challenge_participations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge_id UUID NOT NULL REFERENCES public.ambassador_challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  current_progress INTEGER DEFAULT 0,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  bonus_claimed BOOLEAN DEFAULT false,
  bonus_claimed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(challenge_id, user_id)
);

ALTER TABLE public.challenge_participations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own participations" 
ON public.challenge_participations FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can join challenges" 
ON public.challenge_participations FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own participations" 
ON public.challenge_participations FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage participations" 
ON public.challenge_participations FOR ALL 
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_challenge_participations_user ON public.challenge_participations(user_id, is_completed);

-- 7. VISUELS PARTAGEABLES
CREATE TABLE public.shareable_assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  asset_type VARCHAR(50) NOT NULL CHECK (asset_type IN ('banner', 'story', 'post', 'flyer')),
  platform VARCHAR(50) NOT NULL CHECK (platform IN ('whatsapp', 'facebook', 'instagram', 'all')),
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  is_active BOOLEAN DEFAULT true,
  download_count INTEGER DEFAULT 0,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.shareable_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active assets" 
ON public.shareable_assets FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can manage assets" 
ON public.shareable_assets FOR ALL 
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_shareable_assets_type ON public.shareable_assets(asset_type, platform, is_active);

-- 8. HISTORIQUE DE TÉLÉCHARGEMENT DES ASSETS
CREATE TABLE public.asset_downloads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id UUID NOT NULL REFERENCES public.shareable_assets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  downloaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.asset_downloads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own downloads" 
ON public.asset_downloads FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can track their downloads" 
ON public.asset_downloads FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- 9. VUE LEADERBOARD MENSUEL
CREATE OR REPLACE VIEW public.monthly_leaderboard AS
SELECT 
  c.beneficiary_id as user_id,
  p.first_name,
  p.last_name,
  p.avatar_url,
  ur.current_rank,
  rc.badge_color,
  SUM(c.commission_amount) as monthly_earnings,
  COUNT(DISTINCT c.order_id) as monthly_orders,
  COUNT(DISTINCT CASE WHEN rr.level = 1 THEN rr.referred_id END) as new_referrals,
  RANK() OVER (ORDER BY SUM(c.commission_amount) DESC) as rank_position
FROM public.commissions c
LEFT JOIN public.profiles p ON p.id = c.beneficiary_id
LEFT JOIN public.user_ranks ur ON ur.user_id = c.beneficiary_id
LEFT JOIN public.rank_config rc ON rc.rank = ur.current_rank
LEFT JOIN public.referral_relationships rr ON rr.referrer_id = c.beneficiary_id 
  AND rr.created_at >= date_trunc('month', now())
WHERE c.created_at >= date_trunc('month', now())
  AND c.status IN ('completed', 'pending')
GROUP BY c.beneficiary_id, p.first_name, p.last_name, p.avatar_url, ur.current_rank, rc.badge_color
ORDER BY monthly_earnings DESC
LIMIT 100;

-- 10. FONCTION POUR INCRÉMENTER LE COMPTEUR DE TÉLÉCHARGEMENT
CREATE OR REPLACE FUNCTION public.increment_asset_download(asset_uuid UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.shareable_assets 
  SET download_count = download_count + 1 
  WHERE id = asset_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. TRIGGERS POUR updated_at (si pas déjà créés)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_flash_sales_updated_at
BEFORE UPDATE ON public.flash_sales
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ambassador_challenges_updated_at
BEFORE UPDATE ON public.ambassador_challenges
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_challenge_participations_updated_at
BEFORE UPDATE ON public.challenge_participations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();