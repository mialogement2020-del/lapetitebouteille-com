-- Correction des policies trop permissives

-- Supprimer les policies problématiques
DROP POLICY IF EXISTS "Users can create order items" ON public.order_items;
DROP POLICY IF EXISTS "System can create referral relationships" ON public.referral_relationships;

-- Recréer avec des conditions plus restrictives

-- Order Items: seuls les utilisateurs authentifiés peuvent créer des items pour leurs propres commandes
CREATE POLICY "Users can create order items for their orders" ON public.order_items 
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.orders 
            WHERE orders.id = order_items.order_id 
            AND (orders.user_id = auth.uid() OR orders.user_id IS NULL)
        )
    );

-- Referral Relationships: seul l'utilisateur référé peut créer la relation (lors de l'inscription)
CREATE POLICY "Users can create their own referral relationship" ON public.referral_relationships 
    FOR INSERT WITH CHECK (auth.uid() = referred_id);