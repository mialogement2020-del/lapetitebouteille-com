import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface TwoFAStatus {
  is_enabled: boolean;
  has_backup_codes: boolean;
  last_verified_at: string | null;
  session_valid: boolean;
}

interface SetupData {
  secret: string;
  totp_url: string;
  backup_codes: string[];
}

export function useAdmin2FA() {
  const [status, setStatus] = useState<TwoFAStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [setupData, setSetupData] = useState<SetupData | null>(null);
  const { toast } = useToast();

  const fetchStatus = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke("admin-2fa", {
        body: { action: "status" }
      });

      if (error) throw error;
      setStatus(data);
    } catch (error: any) {
      console.error("Error fetching 2FA status:", error);
      // Don't show error toast - might not be admin
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const initiateSetup = async (): Promise<SetupData | null> => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke("admin-2fa", {
        body: { action: "setup" }
      });

      if (error) throw error;
      setSetupData(data);
      return data;
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'initialiser la configuration 2FA",
        variant: "destructive"
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const verifySetup = async (code: string): Promise<boolean> => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke("admin-2fa", {
        body: { action: "verify-setup", code }
      });

      if (error) throw error;
      
      toast({
        title: "2FA activé",
        description: "L'authentification à deux facteurs est maintenant active"
      });
      
      setSetupData(null);
      await fetchStatus();
      return true;
    } catch (error: any) {
      toast({
        title: "Code invalide",
        description: "Le code de vérification est incorrect. Réessayez.",
        variant: "destructive"
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const verify = async (code: string): Promise<boolean> => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke("admin-2fa", {
        body: { action: "verify", code }
      });

      if (error) throw error;
      
      await fetchStatus();
      return true;
    } catch (error: any) {
      toast({
        title: "Vérification échouée",
        description: error.message || "Code incorrect ou expiré",
        variant: "destructive"
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const disable = async (code: string): Promise<boolean> => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke("admin-2fa", {
        body: { action: "disable", code }
      });

      if (error) throw error;
      
      toast({
        title: "2FA désactivé",
        description: "L'authentification à deux facteurs a été désactivée"
      });
      
      await fetchStatus();
      return true;
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de désactiver le 2FA",
        variant: "destructive"
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const requiresVerification = useCallback((): boolean => {
    if (!status) return false;
    return status.is_enabled && !status.session_valid;
  }, [status]);

  return {
    status,
    loading,
    setupData,
    initiateSetup,
    verifySetup,
    verify,
    disable,
    requiresVerification,
    refreshStatus: fetchStatus
  };
}
