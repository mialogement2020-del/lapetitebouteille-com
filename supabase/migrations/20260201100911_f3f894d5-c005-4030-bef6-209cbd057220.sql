-- ===========================================
-- PHASE 1: TYPES ÉNUMÉRÉS
-- ===========================================

-- Rôles utilisateur
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Statuts de commande
CREATE TYPE public.order_status AS ENUM ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled');

-- Méthodes de paiement
CREATE TYPE public.payment_method AS ENUM ('mtn_money', 'orange_money', 'cash_on_delivery', 'credit_card');

-- Statuts de paiement
CREATE TYPE public.payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');

-- Rangs MLM
CREATE TYPE public.ambassador_rank AS ENUM ('bronze', 'silver', 'gold', 'diamond', 'elite');

-- Statuts de retrait
CREATE TYPE public.withdrawal_status AS ENUM ('pending', 'approved', 'rejected', 'completed');

-- Type de transaction portefeuille
CREATE TYPE public.wallet_transaction_type AS ENUM ('commission', 'bonus', 'withdrawal', 'store_credit', 'adjustment');

-- ===========================================
-- PHASE 2: TABLES E-COMMERCE
-- ===========================================

-- Catégories de produits
CREATE TABLE public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    image_url TEXT,
    parent_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Produits
CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    short_description TEXT,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    price DECIMAL(10,2) NOT NULL,
    original_price DECIMAL(10,2),
    sku TEXT UNIQUE,
    stock_quantity INT DEFAULT 0,
    low_stock_threshold INT DEFAULT 5,
    is_active BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    alcohol_percentage DECIMAL(4,2),
    volume_ml INT,
    origin_country TEXT,
    region TEXT,
    grape_variety TEXT,
    vintage_year INT,
    tasting_notes TEXT,
    food_pairing TEXT,
    serving_temperature TEXT,
    image_url TEXT,
    gallery_urls TEXT[],
    average_rating DECIMAL(2,1) DEFAULT 0,
    review_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Profils utilisateurs
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    avatar_url TEXT,
    date_of_birth DATE,
    is_age_verified BOOLEAN DEFAULT false,
    preferred_language TEXT DEFAULT 'fr',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Rôles utilisateurs (séparé pour la sécurité)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'user',
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Adresses de livraison
CREATE TABLE public.addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    label TEXT DEFAULT 'Domicile',
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    street_address TEXT NOT NULL,
    city TEXT NOT NULL,
    neighborhood TEXT,
    additional_info TEXT,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Commandes
CREATE TABLE public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number TEXT NOT NULL UNIQUE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    guest_email TEXT,
    guest_phone TEXT,
    status order_status DEFAULT 'pending',
    subtotal DECIMAL(12,2) NOT NULL,
    discount_amount DECIMAL(12,2) DEFAULT 0,
    delivery_fee DECIMAL(10,2) DEFAULT 0,
    total DECIMAL(12,2) NOT NULL,
    payment_method payment_method,
    payment_status payment_status DEFAULT 'pending',
    payment_reference TEXT,
    shipping_address_id UUID REFERENCES public.addresses(id),
    shipping_full_name TEXT,
    shipping_phone TEXT,
    shipping_street TEXT,
    shipping_city TEXT,
    shipping_neighborhood TEXT,
    shipping_notes TEXT,
    referral_code_used TEXT,
    referrer_id UUID REFERENCES auth.users(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Articles de commande
CREATE TABLE public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    product_image TEXT,
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Avis clients
CREATE TABLE public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title TEXT,
    comment TEXT,
    is_verified_purchase BOOLEAN DEFAULT false,
    is_approved BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Liste de souhaits
CREATE TABLE public.wishlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, product_id)
);

-- Panier
CREATE TABLE public.cart_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, product_id)
);

-- ===========================================
-- PHASE 3: TABLES MLM / PARRAINAGE
-- ===========================================

-- Codes de parrainage
CREATE TABLE public.referral_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    code TEXT NOT NULL UNIQUE,
    custom_code TEXT UNIQUE,
    total_clicks INT DEFAULT 0,
    total_signups INT DEFAULT 0,
    total_orders INT DEFAULT 0,
    total_revenue DECIMAL(14,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Relations de parrainage (multi-niveaux)
CREATE TABLE public.referral_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    referred_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    level INT NOT NULL DEFAULT 1,
    referral_code_used TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(referrer_id, referred_id)
);

-- Configuration des commissions par niveau
CREATE TABLE public.commission_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    level INT NOT NULL UNIQUE,
    rate_percentage DECIMAL(5,2) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Configuration des rangs
CREATE TABLE public.rank_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rank ambassador_rank NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    min_active_referrals INT NOT NULL,
    max_active_referrals INT,
    bonus_percentage DECIMAL(5,2) DEFAULT 0,
    benefits TEXT[],
    badge_color TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Rangs utilisateurs
CREATE TABLE public.user_ranks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    current_rank ambassador_rank DEFAULT 'bronze',
    active_referrals_count INT DEFAULT 0,
    total_referrals_count INT DEFAULT 0,
    rank_achieved_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Portefeuilles virtuels
CREATE TABLE public.wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    balance DECIMAL(14,2) DEFAULT 0,
    total_earned DECIMAL(14,2) DEFAULT 0,
    total_withdrawn DECIMAL(14,2) DEFAULT 0,
    total_store_credit DECIMAL(14,2) DEFAULT 0,
    pending_balance DECIMAL(14,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Transactions portefeuille
CREATE TABLE public.wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID REFERENCES public.wallets(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    type wallet_transaction_type NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    balance_after DECIMAL(14,2) NOT NULL,
    description TEXT,
    reference_id UUID,
    reference_type TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Commissions générées
CREATE TABLE public.commissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    beneficiary_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    purchaser_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    level INT NOT NULL,
    order_amount DECIMAL(12,2) NOT NULL,
    commission_rate DECIMAL(5,2) NOT NULL,
    bonus_rate DECIMAL(5,2) DEFAULT 0,
    commission_amount DECIMAL(12,2) NOT NULL,
    status payment_status DEFAULT 'pending',
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Demandes de retrait
CREATE TABLE public.withdrawal_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    wallet_id UUID REFERENCES public.wallets(id) ON DELETE CASCADE NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    payment_method payment_method NOT NULL,
    phone_number TEXT NOT NULL,
    status withdrawal_status DEFAULT 'pending',
    processed_by UUID REFERENCES auth.users(id),
    processed_at TIMESTAMPTZ,
    rejection_reason TEXT,
    transaction_reference TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Bonus et challenges MLM
CREATE TABLE public.mlm_bonuses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    bonus_type TEXT NOT NULL,
    bonus_name TEXT NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    trigger_condition TEXT,
    achieved_at TIMESTAMPTZ DEFAULT now(),
    paid BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ===========================================
-- PHASE 4: CODES PROMO
-- ===========================================

CREATE TABLE public.promo_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    description TEXT,
    discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value DECIMAL(10,2) NOT NULL,
    min_order_amount DECIMAL(10,2) DEFAULT 0,
    max_discount_amount DECIMAL(10,2),
    usage_limit INT,
    used_count INT DEFAULT 0,
    valid_from TIMESTAMPTZ DEFAULT now(),
    valid_until TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ===========================================
-- PHASE 5: FONCTIONS UTILITAIRES
-- ===========================================

-- Fonction pour vérifier les rôles (évite récursion RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = _user_id AND role = _role
    )
$$;

-- Fonction pour obtenir le rang d'un utilisateur
CREATE OR REPLACE FUNCTION public.get_user_rank(_user_id UUID)
RETURNS ambassador_rank
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COALESCE(
        (SELECT current_rank FROM public.user_ranks WHERE user_id = _user_id),
        'bronze'::ambassador_rank
    )
$$;

-- Fonction mise à jour timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Fonction génération numéro de commande
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TEXT AS $$
DECLARE
    order_num TEXT;
BEGIN
    order_num := 'CMD-' || TO_CHAR(now(), 'YYYYMMDD') || '-' || 
                 LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
    RETURN order_num;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Fonction génération code parrainage
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT AS $$
DECLARE
    new_code TEXT;
    code_exists BOOLEAN;
BEGIN
    LOOP
        new_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));
        SELECT EXISTS(SELECT 1 FROM public.referral_codes WHERE code = new_code) INTO code_exists;
        EXIT WHEN NOT code_exists;
    END LOOP;
    RETURN new_code;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ===========================================
-- PHASE 6: TRIGGERS
-- ===========================================

-- Triggers updated_at
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_addresses_updated_at BEFORE UPDATE ON public.addresses
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON public.reviews
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cart_items_updated_at BEFORE UPDATE ON public.cart_items
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_referral_codes_updated_at BEFORE UPDATE ON public.referral_codes
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_ranks_updated_at BEFORE UPDATE ON public.user_ranks
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_wallets_updated_at BEFORE UPDATE ON public.wallets
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_withdrawal_requests_updated_at BEFORE UPDATE ON public.withdrawal_requests
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger création profil automatique
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Créer le profil
    INSERT INTO public.profiles (id, email)
    VALUES (NEW.id, NEW.email);
    
    -- Attribuer le rôle utilisateur par défaut
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user');
    
    -- Créer le portefeuille
    INSERT INTO public.wallets (user_id)
    VALUES (NEW.id);
    
    -- Créer le code de parrainage
    INSERT INTO public.referral_codes (user_id, code)
    VALUES (NEW.id, public.generate_referral_code());
    
    -- Créer le rang initial
    INSERT INTO public.user_ranks (user_id, current_rank)
    VALUES (NEW.id, 'bronze');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ===========================================
-- PHASE 7: ROW LEVEL SECURITY
-- ===========================================

-- Activer RLS sur toutes les tables
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rank_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_ranks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mlm_bonuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

-- Policies: Categories (lecture publique)
CREATE POLICY "Categories are viewable by everyone" ON public.categories FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage categories" ON public.categories FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Policies: Products (lecture publique)
CREATE POLICY "Products are viewable by everyone" ON public.products FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage products" ON public.products FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Policies: Profiles
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Policies: User Roles (lecture par utilisateur, gestion admin)
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Policies: Addresses
CREATE POLICY "Users can manage their own addresses" ON public.addresses FOR ALL USING (auth.uid() = user_id);

-- Policies: Orders
CREATE POLICY "Users can view their own orders" ON public.orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create orders" ON public.orders FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Admins can manage all orders" ON public.orders FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Policies: Order Items
CREATE POLICY "Users can view their order items" ON public.order_items FOR SELECT 
    USING (EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()));
CREATE POLICY "Users can create order items" ON public.order_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can manage order items" ON public.order_items FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Policies: Reviews
CREATE POLICY "Approved reviews are viewable by everyone" ON public.reviews FOR SELECT USING (is_approved = true);
CREATE POLICY "Users can create reviews" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own reviews" ON public.reviews FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage reviews" ON public.reviews FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Policies: Wishlist
CREATE POLICY "Users can manage their wishlist" ON public.wishlist FOR ALL USING (auth.uid() = user_id);

-- Policies: Cart
CREATE POLICY "Users can manage their cart" ON public.cart_items FOR ALL USING (auth.uid() = user_id);

-- Policies: Referral Codes
CREATE POLICY "Users can view their own referral code" ON public.referral_codes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Anyone can view active referral codes by code" ON public.referral_codes FOR SELECT USING (is_active = true);
CREATE POLICY "Users can update their own referral code" ON public.referral_codes FOR UPDATE USING (auth.uid() = user_id);

-- Policies: Referral Relationships
CREATE POLICY "Users can view their referral relationships" ON public.referral_relationships FOR SELECT 
    USING (auth.uid() = referrer_id OR auth.uid() = referred_id);
CREATE POLICY "System can create referral relationships" ON public.referral_relationships FOR INSERT WITH CHECK (true);

-- Policies: Commission Rates (lecture publique)
CREATE POLICY "Commission rates are viewable by everyone" ON public.commission_rates FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage commission rates" ON public.commission_rates FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Policies: Rank Config (lecture publique)
CREATE POLICY "Rank config is viewable by everyone" ON public.rank_config FOR SELECT USING (true);
CREATE POLICY "Admins can manage rank config" ON public.rank_config FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Policies: User Ranks
CREATE POLICY "Users can view their own rank" ON public.user_ranks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage user ranks" ON public.user_ranks FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Policies: Wallets
CREATE POLICY "Users can view their own wallet" ON public.wallets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage wallets" ON public.wallets FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Policies: Wallet Transactions
CREATE POLICY "Users can view their own transactions" ON public.wallet_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage transactions" ON public.wallet_transactions FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Policies: Commissions
CREATE POLICY "Users can view their own commissions" ON public.commissions FOR SELECT USING (auth.uid() = beneficiary_id);
CREATE POLICY "Admins can manage commissions" ON public.commissions FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Policies: Withdrawal Requests
CREATE POLICY "Users can view their own withdrawals" ON public.withdrawal_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create withdrawal requests" ON public.withdrawal_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage withdrawals" ON public.withdrawal_requests FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Policies: MLM Bonuses
CREATE POLICY "Users can view their own bonuses" ON public.mlm_bonuses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage bonuses" ON public.mlm_bonuses FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Policies: Promo Codes (lecture publique codes actifs)
CREATE POLICY "Active promo codes are viewable" ON public.promo_codes FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage promo codes" ON public.promo_codes FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ===========================================
-- PHASE 8: DONNÉES INITIALES
-- ===========================================

-- Taux de commission par niveau
INSERT INTO public.commission_rates (level, rate_percentage, description) VALUES
(1, 8.00, 'Niveau 1 - Filleuls directs'),
(2, 4.00, 'Niveau 2 - Filleuls de niveau 2'),
(3, 2.00, 'Niveau 3 - Filleuls de niveau 3');

-- Configuration des rangs
INSERT INTO public.rank_config (rank, display_name, min_active_referrals, max_active_referrals, bonus_percentage, benefits, badge_color) VALUES
('bronze', 'Bronze', 0, 10, 0, ARRAY['Commission de base', 'Badge profil'], '#CD7F32'),
('silver', 'Argent', 11, 30, 1.00, ARRAY['+1% commission tous niveaux', 'Livraison gratuite personnelle'], '#C0C0C0'),
('gold', 'Or', 31, 75, 2.00, ARRAY['+2% commission tous niveaux', 'Produits exclusifs en avant-première', 'Support prioritaire'], '#D4AF37'),
('diamond', 'Diamant', 76, 150, 3.00, ARRAY['+3% commission tous niveaux', 'Cadeaux produits mensuels', 'Invitation événements VIP'], '#B9F2FF'),
('elite', 'Élite', 151, NULL, 4.00, ARRAY['Commissions maximales', 'Compte ambassadeur officiel', 'Revenus récurrents sur tout le réseau'], '#9B59B6');

-- Catégories de produits
INSERT INTO public.categories (name, slug, description, display_order) VALUES
('Vins', 'vins', 'Rouges, blancs et rosés d''exception', 1),
('Champagnes', 'champagnes', 'Les plus grandes maisons', 2),
('Spiritueux', 'spiritueux', 'Whisky, Cognac, Rhum et plus', 3),
('Coffrets Cadeaux', 'coffrets', 'L''art d''offrir', 4);

-- Produits d'exemple
INSERT INTO public.products (name, slug, category_id, price, original_price, description, short_description, is_featured, is_active, alcohol_percentage, volume_ml, origin_country, image_url) VALUES
('Château Margaux 2018', 'chateau-margaux-2018', (SELECT id FROM public.categories WHERE slug = 'vins'), 125000, 145000, 'Un grand cru classé de Bordeaux, élégant et complexe.', 'Grand Cru Classé Bordeaux', true, true, 13.5, 750, 'France', 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?q=80&w=400'),
('Dom Pérignon Vintage 2012', 'dom-perignon-2012', (SELECT id FROM public.categories WHERE slug = 'champagnes'), 185000, NULL, 'La cuvée emblématique de la maison Dom Pérignon.', 'Champagne Prestige', true, true, 12.5, 750, 'France', 'https://images.unsplash.com/photo-1547595628-c61a29f496f0?q=80&w=400'),
('Hennessy XO', 'hennessy-xo', (SELECT id FROM public.categories WHERE slug = 'spiritueux'), 95000, NULL, 'Un cognac d''exception aux arômes intenses de fruits confits et d''épices.', 'Cognac Extra Old', true, true, 40.0, 700, 'France', 'https://images.unsplash.com/photo-1527281400683-1aae777175f8?q=80&w=400'),
('Moët & Chandon Impérial', 'moet-chandon-imperial', (SELECT id FROM public.categories WHERE slug = 'champagnes'), 45000, 52000, 'Le champagne iconique de la maison Moët & Chandon.', 'Champagne Brut', true, true, 12.0, 750, 'France', 'https://images.unsplash.com/photo-1549566959-0c8f564bc5af?q=80&w=400'),
('Glenfiddich 18 ans', 'glenfiddich-18', (SELECT id FROM public.categories WHERE slug = 'spiritueux'), 78000, NULL, 'Single malt écossais vieilli 18 ans en fûts de chêne.', 'Single Malt Scotch Whisky', false, true, 40.0, 700, 'Écosse', 'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?q=80&w=400'),
('Veuve Clicquot Yellow Label', 'veuve-clicquot-brut', (SELECT id FROM public.categories WHERE slug = 'champagnes'), 55000, NULL, 'L''expression parfaite du style Veuve Clicquot.', 'Champagne Brut', false, true, 12.0, 750, 'France', 'https://images.unsplash.com/photo-1598306442928-4d90f32c6866?q=80&w=400');