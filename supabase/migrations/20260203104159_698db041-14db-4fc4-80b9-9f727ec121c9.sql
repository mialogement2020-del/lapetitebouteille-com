-- Create stock_alerts_history table to track sent alerts
CREATE TABLE public.stock_alerts_history (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
    product_name text NOT NULL,
    product_sku text,
    stock_quantity integer NOT NULL,
    threshold integer NOT NULL,
    alert_type text NOT NULL DEFAULT 'low_stock', -- 'low_stock' or 'out_of_stock'
    sent_at timestamp with time zone NOT NULL DEFAULT now(),
    email_sent_to text,
    email_status text DEFAULT 'sent' -- 'sent', 'failed'
);

-- Enable RLS
ALTER TABLE public.stock_alerts_history ENABLE ROW LEVEL SECURITY;

-- Only admins can view and manage stock alerts history
CREATE POLICY "Admins can manage stock alerts history"
ON public.stock_alerts_history
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster queries
CREATE INDEX idx_stock_alerts_history_sent_at ON public.stock_alerts_history(sent_at DESC);
CREATE INDEX idx_stock_alerts_history_product_id ON public.stock_alerts_history(product_id);

-- Add comment
COMMENT ON TABLE public.stock_alerts_history IS 'Historique des alertes de stock envoyées par email';