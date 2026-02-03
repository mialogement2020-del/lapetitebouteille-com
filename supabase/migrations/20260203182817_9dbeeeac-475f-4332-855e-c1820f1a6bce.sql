-- Create table for report history
CREATE TABLE public.report_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  report_type TEXT NOT NULL DEFAULT 'weekly_stock',
  recipients TEXT[] NOT NULL DEFAULT '{}',
  out_of_stock_count INTEGER NOT NULL DEFAULT 0,
  low_stock_count INTEGER NOT NULL DEFAULT 0,
  critical_stock_count INTEGER NOT NULL DEFAULT 0,
  total_alerts_count INTEGER NOT NULL DEFAULT 0,
  trend_percentage INTEGER DEFAULT 0,
  send_status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  email_id TEXT
);

-- Enable RLS
ALTER TABLE public.report_history ENABLE ROW LEVEL SECURITY;

-- Policy for admins to read report history
CREATE POLICY "Admins can view report history"
ON public.report_history
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Policy for service role to insert (edge functions)
CREATE POLICY "Service role can insert report history"
ON public.report_history
FOR INSERT
WITH CHECK (true);

-- Create index on sent_at for faster queries
CREATE INDEX idx_report_history_sent_at ON public.report_history(sent_at DESC);

-- Add comment for documentation
COMMENT ON TABLE public.report_history IS 'Historique des rapports de stock envoyés automatiquement';