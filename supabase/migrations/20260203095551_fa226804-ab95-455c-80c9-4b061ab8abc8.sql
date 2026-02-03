-- Function to recalculate product rating stats
CREATE OR REPLACE FUNCTION public.update_product_rating_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    target_product_id uuid;
    new_avg_rating numeric;
    new_review_count integer;
BEGIN
    -- Determine which product to update
    IF TG_OP = 'DELETE' THEN
        target_product_id := OLD.product_id;
    ELSE
        target_product_id := NEW.product_id;
    END IF;
    
    -- Calculate new stats from approved reviews only
    SELECT 
        COALESCE(AVG(rating)::numeric(3,2), 0),
        COUNT(*)::integer
    INTO new_avg_rating, new_review_count
    FROM public.reviews
    WHERE product_id = target_product_id
    AND is_approved = true;
    
    -- Update the product
    UPDATE public.products
    SET 
        average_rating = new_avg_rating,
        review_count = new_review_count,
        updated_at = now()
    WHERE id = target_product_id;
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger on reviews table
CREATE TRIGGER trigger_update_product_rating_on_review_change
AFTER INSERT OR UPDATE OF is_approved, rating OR DELETE
ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_product_rating_stats();