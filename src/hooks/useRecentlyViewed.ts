import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";

export interface RecentlyViewedProduct {
  id: string;
  product_id: string;
  viewed_at: string;
  view_count: number;
  product?: {
    id: string;
    name: string;
    slug: string;
    price: number;
    original_price: number | null;
    image_url: string | null;
    average_rating: number | null;
  };
}

const LOCAL_STORAGE_KEY = "recently_viewed_products";
const MAX_ITEMS = 12;

// Helper for anonymous users
function getLocalRecentlyViewed(): string[] {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function setLocalRecentlyViewed(productIds: string[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(productIds.slice(0, MAX_ITEMS)));
  } catch {
    // Ignore storage errors
  }
}

export function useRecentlyViewed() {
  const { user } = useAuthContext();
  const queryClient = useQueryClient();

  const { data: recentlyViewed, isLoading } = useQuery({
    queryKey: ["recently-viewed", user?.id],
    queryFn: async (): Promise<RecentlyViewedProduct[]> => {
      if (user?.id) {
        // Authenticated user - fetch from database
        const { data, error } = await supabase
          .from("recently_viewed")
          .select(`
            id,
            product_id,
            viewed_at,
            view_count,
            product:products (
              id,
              name,
              slug,
              price,
              original_price,
              image_url,
              average_rating
            )
          `)
          .eq("user_id", user.id)
          .order("viewed_at", { ascending: false })
          .limit(MAX_ITEMS);

        if (error) throw error;
        return (data as any) || [];
      } else {
        // Anonymous user - fetch from localStorage + get product details
        const productIds = getLocalRecentlyViewed();
        if (productIds.length === 0) return [];

        const { data: products, error } = await supabase
          .from("products")
          .select("id, name, slug, price, original_price, image_url, average_rating")
          .in("id", productIds)
          .eq("is_active", true);

        if (error) throw error;

        // Maintain order from localStorage
        return productIds
          .map((pid) => {
            const product = products?.find((p) => p.id === pid);
            if (!product) return null;
            return {
              id: pid,
              product_id: pid,
              viewed_at: new Date().toISOString(),
              view_count: 1,
              product,
            };
          })
          .filter(Boolean) as RecentlyViewedProduct[];
      }
    },
  });

  const trackView = useMutation({
    mutationFn: async (productId: string) => {
      if (user?.id) {
        // Authenticated user - upsert to database
        const { error } = await supabase
          .from("recently_viewed")
          .upsert(
            {
              user_id: user.id,
              product_id: productId,
              viewed_at: new Date().toISOString(),
              view_count: 1,
            },
            {
              onConflict: "user_id,product_id",
            }
          );

        if (error) throw error;

        // Also update view_count
        await supabase
          .from("recently_viewed")
          .update({ 
            viewed_at: new Date().toISOString(),
            view_count: supabase.rpc ? 1 : 1 // Increment handled by trigger if needed
          })
          .eq("user_id", user.id)
          .eq("product_id", productId);
      } else {
        // Anonymous user - save to localStorage
        const current = getLocalRecentlyViewed();
        const filtered = current.filter((id) => id !== productId);
        setLocalRecentlyViewed([productId, ...filtered]);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recently-viewed"] });
    },
  });

  const clearHistory = useMutation({
    mutationFn: async () => {
      if (user?.id) {
        const { error } = await supabase
          .from("recently_viewed")
          .delete()
          .eq("user_id", user.id);

        if (error) throw error;
      } else {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recently-viewed"] });
    },
  });

  return {
    recentlyViewed: recentlyViewed || [],
    isLoading,
    trackView: trackView.mutate,
    clearHistory: clearHistory.mutate,
  };
}
