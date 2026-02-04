-- Table pour les logs d'audit administratifs
CREATE TABLE public.admin_audit_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    user_email TEXT,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    entity_name TEXT,
    old_values JSONB,
    new_values JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index pour les requêtes fréquentes
CREATE INDEX idx_audit_logs_user_id ON public.admin_audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity_type ON public.admin_audit_logs(entity_type);
CREATE INDEX idx_audit_logs_action ON public.admin_audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON public.admin_audit_logs(created_at DESC);

-- Enable RLS
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can view audit logs
CREATE POLICY "Admins can view audit logs"
ON public.admin_audit_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Policy: Allow insert from authenticated users (for logging their actions)
CREATE POLICY "Authenticated users can insert audit logs"
ON public.admin_audit_logs
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_audit_logs;

-- Comment on table
COMMENT ON TABLE public.admin_audit_logs IS 'Audit trail for all administrative actions';