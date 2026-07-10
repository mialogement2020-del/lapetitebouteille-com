import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { Product } from "./useProducts";

interface MutationError {
  code?: string;
}

interface WishlistItem {
  id: string;
  product_id: string;
  user_id: string;
  created_at: string;
  product?: Product;
}

export function useWishlist() {
  const { user } = useAuthContext();
  const queryClient = useQueryClient();

  // Fetch user's wishlist with products
  const { data: wishlistItems = [], isLoading } = useQuery({
    queryKey: ["wishlist", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("wishlist")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      const items = (data ?? []) as WishlistItem[];
      const productIds = items.map((item) => item.product_id);
      if (productIds.length === 0) return items;

      const { data: products, error: productsError } = await supabase
        .from("public_products" as never)
        .select("id, name, slug, price, original_price, image_url, stock_quantity, average_rating, review_count, category_id")
        .in("id", productIds);

      if (productsError) throw productsError;

      const categoryIds = [
        ...new Set(((products ?? []) as unknown as Product[]).map((product) => product.category_id).filter(Boolean)),
      ] as string[];
      const { data: categories } = categoryIds.length
        ? await supabase.from("categories").select("id, name, slug").in("id", categoryIds)
        : { data: [] };
      const categoryById = new Map((categories ?? []).map((category) => [category.id, category]));
      const productById = new Map(
        ((products ?? []) as unknown as Product[]).map((product) => [
          product.id,
          {
            ...product,
            category: product.category_id ? categoryById.get(product.category_id) : undefined,
          } as Product,
        ]),
      );

      return items.map((item) => ({ ...item, product: productById.get(item.product_id) }));
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

      const { error } = await supabase
        .from("wishlist")
        .insert([{ user_id: user.id, product_id: productId }]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wishlist"] });
      toast.success("Ajouté à vos favoris");
    },
    onError: (error: MutationError) => {
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
