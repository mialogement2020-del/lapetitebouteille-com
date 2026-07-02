import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import type { Product } from "@/hooks/useProducts";

export function useRecommendations(limit: number = 8) {
  const { user } = useAuthContext();

  return useQuery({
    queryKey: ["recommendations", user?.id ?? "guest", limit],
    queryFn: async (): Promise<Product[]> => {
      if (user?.id) {
        const { data: recs, error } = await supabase.rpc("get_user_recommendations", {
          _user_id: user.id,
          _limit: limit,
        });
        if (error) throw error;
        const ids = (recs ?? []).map((r: any) => r.product_id);
        if (!ids.length) return [];
        const { data: products } = await supabase
          .from("products")
          .select("*, category:categories(*)")
          .in("id", ids)
          .eq("is_active", true);
        // preserve reco ordering
        const map = new Map((products ?? []).map((p: any) => [p.id, p]));
        return ids.map((id: string) => map.get(id)).filter(Boolean) as Product[];
      }
      // guest: trending
      const { data } = await supabase
        .from("products")
        .select("*, category:categories(*)")
        .eq("is_active", true)
        .order("is_featured", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(limit);
      return (data ?? []) as Product[];
    },
    staleTime: 5 * 60 * 1000,
  });
}