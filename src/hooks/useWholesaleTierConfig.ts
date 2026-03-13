import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface WholesaleTierConfig {
  id: string;
  visible_tiers: string[];
  card_tiers: string[];
  updated_at: string;
}

export function useWholesaleTierConfig() {
  return useQuery({
    queryKey: ["wholesale-tier-config"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("wholesale_tier_config")
        .select("*")
        .eq("id", "default")
        .single();

      if (error) throw error;
      return data as WholesaleTierConfig;
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useUpdateWholesaleTierConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (config: { visible_tiers: string[]; card_tiers: string[] }) => {
      const { error } = await (supabase as any)
        .from("wholesale_tier_config")
        .update({
          visible_tiers: config.visible_tiers,
          card_tiers: config.card_tiers,
          updated_at: new Date().toISOString(),
        })
        .eq("id", "default");

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wholesale-tier-config"] });
    },
  });
}
