import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import type { Tables } from "@/integrations/supabase/types";

type Review = Tables<"reviews">;

export interface ReviewWithProduct extends Review {
  product?: {
    id: string;
    name: string;
    image_url: string | null;
  } | null;
}

export interface PurchasedProduct {
  product_id: string;
  product_name: string;
  product_image: string | null;
  order_id: string;
  order_number: string;
  order_date: string;
  hasReview: boolean;
}

export interface ReviewFormData {
  product_id: string;
  rating: number;
  title?: string;
  comment?: string;
}

export function useReviews() {
  const { user } = useAuthContext();
  const queryClient = useQueryClient();

  // Fetch user's reviews
  const { data: reviews = [], isLoading: isLoadingReviews, refetch: refetchReviews } = useQuery({
    queryKey: ["user-reviews", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("reviews")
        .select(`
          *,
          product:products(id, name, image_url)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as ReviewWithProduct[];
    },
    enabled: !!user?.id,
  });

  // Fetch products purchased by user (delivered orders only)
  const { data: purchasedProducts = [], isLoading: isLoadingProducts } = useQuery({
    queryKey: ["purchased-products", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Get delivered orders with items
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("id, order_number, created_at")
        .eq("user_id", user.id)
        .eq("status", "delivered");

      if (ordersError) throw ordersError;
      if (!orders || orders.length === 0) return [];

      // Get order items for these orders
      const orderIds = orders.map(o => o.id);
      const { data: items, error: itemsError } = await supabase
        .from("order_items")
        .select("product_id, product_name, product_image, order_id")
        .in("order_id", orderIds);

      if (itemsError) throw itemsError;

      // Get user's existing reviews
      const { data: userReviews } = await supabase
        .from("reviews")
        .select("product_id")
        .eq("user_id", user.id);

      const reviewedProductIds = new Set((userReviews || []).map(r => r.product_id));

      // Map items to purchased products with review status
      const products: PurchasedProduct[] = (items || [])
        .filter(item => item.product_id)
        .map(item => {
          const order = orders.find(o => o.id === item.order_id);
          return {
            product_id: item.product_id!,
            product_name: item.product_name,
            product_image: item.product_image,
            order_id: item.order_id,
            order_number: order?.order_number || "",
            order_date: order?.created_at || "",
            hasReview: reviewedProductIds.has(item.product_id!),
          };
        });

      // Remove duplicates (same product from different orders)
      const uniqueProducts = products.reduce((acc, product) => {
        const existing = acc.find(p => p.product_id === product.product_id);
        if (!existing) {
          acc.push(product);
        }
        return acc;
      }, [] as PurchasedProduct[]);

      return uniqueProducts;
    },
    enabled: !!user?.id,
  });

  // Products that can be reviewed (purchased but not yet reviewed)
  const reviewableProducts = purchasedProducts.filter(p => !p.hasReview);

  // Create review mutation
  const createReview = useMutation({
    mutationFn: async (data: ReviewFormData) => {
      if (!user?.id) throw new Error("Non authentifié");

      const { error } = await supabase
        .from("reviews")
        .insert([{
          product_id: data.product_id,
          user_id: user.id,
          rating: data.rating,
          title: data.title || null,
          comment: data.comment || null,
          is_verified_purchase: true,
          is_approved: false,
        }]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-reviews"] });
      queryClient.invalidateQueries({ queryKey: ["purchased-products"] });
    },
  });

  // Update review mutation
  const updateReview = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ReviewFormData> }) => {
      if (!user?.id) throw new Error("Non authentifié");

      const { error } = await supabase
        .from("reviews")
        .update({
          rating: data.rating,
          title: data.title,
          comment: data.comment,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-reviews"] });
    },
  });

  // Delete review mutation
  const deleteReview = useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id) throw new Error("Non authentifié");

      const { error } = await supabase
        .from("reviews")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-reviews"] });
      queryClient.invalidateQueries({ queryKey: ["purchased-products"] });
    },
  });

  return {
    reviews,
    isLoadingReviews,
    refetchReviews,
    purchasedProducts,
    reviewableProducts,
    isLoadingProducts,
    createReview,
    updateReview,
    deleteReview,
  };
}
