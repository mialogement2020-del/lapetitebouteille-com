import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";

export interface WholesalerProfile {
  id: string;
  user_id: string;
  company_name: string;
  business_type: string;
  niu: string | null;
  city: string | null;
  address: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  credit_limit: number;
  payment_terms: string | null;
  is_active: boolean;
  total_orders: number;
  total_spent: number;
}

export type ApplicationStatus = "pending" | "approved" | "rejected";

export interface WholesalerApplication {
  id: string;
  user_id: string;
  company_name: string;
  business_type: string;
  niu: string | null;
  city: string;
  contact_phone: string;
  contact_email: string | null;
  estimated_monthly_volume: number | null;
  message: string | null;
  status: ApplicationStatus;
  admin_notes: string | null;
  created_at: string;
  processed_at: string | null;
}

export const useMyWholesalerProfile = () => {
  const { user } = useAuthContext();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["my-wholesaler-profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wholesaler_profiles")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as WholesalerProfile | null;
    },
  });

  const updateProfile = useMutation({
    mutationFn: async (payload: Partial<WholesalerProfile>) => {
      const { data, error } = await supabase
        .from("wholesaler_profiles")
        .update(payload)
        .eq("user_id", user!.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-wholesaler-profile"] }),
  });

  return { ...query, updateProfile };
};

export const useMyWholesalerApplications = () => {
  const { user } = useAuthContext();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["my-wholesaler-applications", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wholesaler_applications")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as WholesalerApplication[];
    },
  });

  const apply = useMutation({
    mutationFn: async (payload: Omit<WholesalerApplication, "id" | "user_id" | "status" | "admin_notes" | "created_at" | "processed_at">) => {
      const { data, error } = await supabase
        .from("wholesaler_applications")
        .insert({ ...payload, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-wholesaler-applications"] }),
  });

  return { ...query, apply };
};

export const useMyQuotes = () => {
  const { user } = useAuthContext();
  return useQuery({
    queryKey: ["my-quotes", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quote_requests")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
};

// Admin
export const useAllWholesalerApplications = () => {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["all-wholesaler-applications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wholesaler_applications")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as WholesalerApplication[];
    },
  });

  const approve = useMutation({
    mutationFn: async (appId: string) => {
      const { data, error } = await supabase.rpc("approve_wholesaler_application", { _app_id: appId });
      if (error) throw error;
      const result = data as { success: boolean; error?: string };
      if (!result.success) throw new Error(result.error ?? "Approval failed");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["all-wholesaler-applications"] }),
  });

  const reject = useMutation({
    mutationFn: async ({ appId, notes }: { appId: string; notes?: string }) => {
      const { error } = await supabase
        .from("wholesaler_applications")
        .update({ status: "rejected", admin_notes: notes ?? null, processed_at: new Date().toISOString() })
        .eq("id", appId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["all-wholesaler-applications"] }),
  });

  return { ...query, approve, reject };
};