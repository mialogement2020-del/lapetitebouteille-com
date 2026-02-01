import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CartProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  original_price: number | null;
  image_url: string | null;
  stock_quantity: number;
  category?: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

export interface CartItem {
  id: string;
  product_id: string;
  quantity: number;
  product?: CartProduct;
}

const CART_STORAGE_KEY = "prestigevins_cart";

// Get cart from localStorage for guests
function getLocalCart(): CartItem[] {
  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

// Save cart to localStorage for guests
function setLocalCart(items: CartItem[]) {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
}

export function useCart(userId: string | null) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch cart items
  const fetchCart = useCallback(async () => {
    setIsLoading(true);

    if (userId) {
      // Authenticated user - fetch from Supabase
      const { data, error } = await supabase
        .from("cart_items")
        .select(`
          id,
          product_id,
          quantity,
          products:product_id (
            id,
            name,
            slug,
            price,
            original_price,
            image_url,
            stock_quantity,
            category:categories (
              id,
              name,
              slug
            )
          )
        `)
        .eq("user_id", userId);

      if (!error && data) {
        const cartItems: CartItem[] = data.map((item: any) => ({
          id: item.id,
          product_id: item.product_id,
          quantity: item.quantity,
          product: item.products ? {
            ...item.products,
            category: item.products.category,
          } : undefined,
        }));
        setItems(cartItems);
      }
    } else {
      // Guest user - fetch from localStorage and hydrate with product data
      const localItems = getLocalCart();
      
      if (localItems.length > 0) {
        const productIds = localItems.map((item) => item.product_id);
        const { data: products } = await supabase
          .from("products")
          .select(`
            id,
            name,
            slug,
            price,
            original_price,
            image_url,
            stock_quantity,
            category:categories (
              id,
              name,
              slug
            )
          `)
          .in("id", productIds);

        const hydratedItems = localItems.map((item) => ({
          ...item,
          product: products?.find((p: any) => p.id === item.product_id),
        }));
        setItems(hydratedItems);
      } else {
        setItems([]);
      }
    }

    setIsLoading(false);
  }, [userId]);

  // Initial fetch
  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  // Add item to cart
  const addItem = useCallback(
    async (productId: string, quantity: number = 1) => {
      const existingItem = items.find((item) => item.product_id === productId);

      if (userId) {
        // Authenticated user
        if (existingItem) {
          // Update quantity
          await supabase
            .from("cart_items")
            .update({ quantity: existingItem.quantity + quantity })
            .eq("id", existingItem.id);
        } else {
          // Insert new item
          await supabase.from("cart_items").insert({
            user_id: userId,
            product_id: productId,
            quantity,
          });
        }
      } else {
        // Guest user - update localStorage
        const localItems = getLocalCart();
        const existingLocal = localItems.find((item) => item.product_id === productId);

        if (existingLocal) {
          existingLocal.quantity += quantity;
        } else {
          localItems.push({
            id: `local_${Date.now()}`,
            product_id: productId,
            quantity,
          });
        }
        setLocalCart(localItems);
      }

      await fetchCart();
    },
    [userId, items, fetchCart]
  );

  // Update item quantity
  const updateQuantity = useCallback(
    async (itemId: string, quantity: number) => {
      if (quantity <= 0) {
        await removeItem(itemId);
        return;
      }

      if (userId) {
        await supabase
          .from("cart_items")
          .update({ quantity })
          .eq("id", itemId);
      } else {
        const localItems = getLocalCart();
        const item = localItems.find((i) => i.id === itemId);
        if (item) {
          item.quantity = quantity;
          setLocalCart(localItems);
        }
      }

      await fetchCart();
    },
    [userId, fetchCart]
  );

  // Remove item from cart
  const removeItem = useCallback(
    async (itemId: string) => {
      if (userId) {
        await supabase.from("cart_items").delete().eq("id", itemId);
      } else {
        const localItems = getLocalCart().filter((i) => i.id !== itemId);
        setLocalCart(localItems);
      }

      await fetchCart();
    },
    [userId, fetchCart]
  );

  // Clear cart
  const clearCart = useCallback(async () => {
    if (userId) {
      await supabase.from("cart_items").delete().eq("user_id", userId);
    } else {
      localStorage.removeItem(CART_STORAGE_KEY);
    }

    setItems([]);
  }, [userId]);

  // Sync local cart to Supabase when user logs in
  const syncLocalCartToSupabase = useCallback(async (newUserId: string) => {
    const localItems = getLocalCart();
    
    if (localItems.length > 0) {
      // Insert all local items to Supabase
      const itemsToInsert = localItems.map((item) => ({
        user_id: newUserId,
        product_id: item.product_id,
        quantity: item.quantity,
      }));

      for (const item of itemsToInsert) {
        // Check if item already exists
        const { data: existing } = await supabase
          .from("cart_items")
          .select("id, quantity")
          .eq("user_id", newUserId)
          .eq("product_id", item.product_id)
          .maybeSingle();

        if (existing) {
          // Update quantity
          await supabase
            .from("cart_items")
            .update({ quantity: existing.quantity + item.quantity })
            .eq("id", existing.id);
        } else {
          // Insert new
          await supabase.from("cart_items").insert(item);
        }
      }

      // Clear local cart
      localStorage.removeItem(CART_STORAGE_KEY);
    }
  }, []);

  // Calculate totals
  const subtotal = items.reduce((sum, item) => {
    return sum + (item.product?.price || 0) * item.quantity;
  }, 0);

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return {
    items,
    isLoading,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
    syncLocalCartToSupabase,
    subtotal,
    itemCount,
    refetch: fetchCart,
  };
}
