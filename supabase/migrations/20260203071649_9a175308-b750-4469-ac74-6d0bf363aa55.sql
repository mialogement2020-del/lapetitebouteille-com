-- Create table for order status history
CREATE TABLE public.order_status_history (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    previous_status TEXT,
    new_status TEXT NOT NULL,
    changed_by UUID REFERENCES auth.users(id),
    changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    notes TEXT
);

-- Create index for faster lookups
CREATE INDEX idx_order_status_history_order_id ON public.order_status_history(order_id);
CREATE INDEX idx_order_status_history_changed_at ON public.order_status_history(changed_at);

-- Enable RLS
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view history of their orders"
ON public.order_status_history
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.orders
        WHERE orders.id = order_status_history.order_id
        AND orders.user_id = auth.uid()
    )
);

CREATE POLICY "Admins can manage order status history"
ON public.order_status_history
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger function to automatically log status changes
CREATE OR REPLACE FUNCTION public.log_order_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    -- Only log if status actually changed
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO public.order_status_history (
            order_id,
            previous_status,
            new_status,
            changed_by,
            notes
        ) VALUES (
            NEW.id,
            OLD.status::text,
            NEW.status::text,
            auth.uid(),
            NULL
        );
    END IF;
    RETURN NEW;
END;
$$;

-- Create trigger on orders table
CREATE TRIGGER trigger_log_order_status_change
AFTER UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.log_order_status_change();

-- Insert initial status for existing orders
INSERT INTO public.order_status_history (order_id, previous_status, new_status, notes)
SELECT id, NULL, status::text, 'Historique initial importé'
FROM public.orders
WHERE status IS NOT NULL;