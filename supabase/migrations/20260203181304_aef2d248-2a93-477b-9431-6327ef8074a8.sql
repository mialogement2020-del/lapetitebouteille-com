-- Create a table to store report schedule configuration
CREATE TABLE IF NOT EXISTS public.report_schedule_config (
    id TEXT PRIMARY KEY DEFAULT 'weekly-stock-report',
    cron_expression TEXT NOT NULL DEFAULT '0 8 * * 1',
    frequency TEXT NOT NULL DEFAULT 'weekly',
    day_of_week TEXT,
    hour INTEGER NOT NULL DEFAULT 8,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.report_schedule_config ENABLE ROW LEVEL SECURITY;

-- Create policy for admin access only
CREATE POLICY "Admins can manage report schedule"
ON public.report_schedule_config
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Insert default configuration
INSERT INTO public.report_schedule_config (id, cron_expression, frequency, day_of_week, hour)
VALUES ('weekly-stock-report', '0 8 * * 1', 'weekly', '1', 8)
ON CONFLICT (id) DO NOTHING;

-- Create trigger to update updated_at
CREATE TRIGGER update_report_schedule_config_updated_at
    BEFORE UPDATE ON public.report_schedule_config
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();