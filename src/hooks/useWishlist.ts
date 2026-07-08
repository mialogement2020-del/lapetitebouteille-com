import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthContext } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { Product } from "./useProducts";

const getSupabase = () => import("@/integrations/supabase/client").then((m) => m.supabase);

interface WishlistItem {
  id: string;
  product_id: string;
  user_id: string;
  created_at: string;
  product?: Product;
}

type WishlistError = {
  code?: string;
};

export function useWishlist() {
  const { user } = useAuthContext();
  const queryClient = useQueryClient();

  // Fetch user's wishlist with products
  const { data: wishlistItems = [], isLoading } = useQuery({
    queryKey: ["wishlist", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const supabase = await getSupabase();
      const { data, error } = await supabase
        .from("wishlist")
        .select(`
          *,
          product:products(
            id, name, slug, price, original_price, image_url, 
            stock_quantity, average_rating, review_count,
            category:categories(id, name, slug)
          )
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as WishlistItem[];
    },
    enabled: !!user?.id,
  });

  // Check if product is in wishlist
  const isInWishlist = (productId: string) => {
    return wishlistItems.some((item) => item.product_id === productId);
  };

  // Add to wishlist
  const addToWishlist = useMutation({
    mutationFn: async (productId: string) => {
      if (!user?.id) throw new Error("Non authentifié");

      const supabase = await getSupabase();
      const { error } = await supabase
        .from("wishlist")
        .insert([{ user_id: user.id, product_id: productId }]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wishlist"] });
      toast.success("Ajouté à vos favoris");
    },
    onError: (error: WishlistError) => {
      if (error.code === "23505") {
        toast.info("Ce produit est déjà dans vos favoris");
      } else {
        toast.error("Erreur lors de l'ajout aux favoris");
      }
    },
  });

  // Remove from wishlist
  const removeFromWishlist = useMutation({
    mutationFn: async (productId: string) => {
      if (!user?.id) throw new Error("Non authentifié");

      const supabase = await getSupabase();
      const { error } = await supabase
        .from("wishlist")
        .delete()
        .eq("user_id", user.id)
        .eq("product_id", productId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wishlist"] });
      toast.success("Retiré de vos favoris");
    },
    onError: () => {
      toast.error("Erreur lors de la suppression");
    },
  });

  // Toggle wishlist
  const toggleWishlist = async (productId: string) => {
    if (!user) {
      toast.error("Connectez-vous pour ajouter aux favoris");
      return;
    }

    if (isInWishlist(productId)) {
      await removeFromWishlist.mutateAsync(productId);
    } else {
      await addToWishlist.mutateAsync(productId);
    }
  };

  return {
    wishlistItems,
    isLoading,
    isInWishlist,
    addToWishlist,
    removeFromWishlist,
    toggleWishlist,
    wishlistCount: wishlistItems.length,
  };
}
