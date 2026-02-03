-- Add recipient_emails column to report_schedule_config
ALTER TABLE public.report_schedule_config 
ADD COLUMN recipient_emails TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Update the default row with the owner email placeholder
UPDATE public.report_schedule_config 
SET recipient_emails = ARRAY[]::TEXT[]
WHERE recipient_emails IS NULL;