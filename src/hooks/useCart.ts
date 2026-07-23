import { useState, useEffect, useCallback } from "react";
import { calculateCartItemCount, calculateCartSubtotal } from "@/lib/cartTotals";
import type { ProductPackagingOption } from "@/lib/packagingPricing";

const getSupabase = () => import("@/integrations/supabase/client").then((m) => m.supabase);

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
  packaging_option_id?: string | null;
  packaging_option?: ProductPackagingOption | null;
  product?: CartProduct;
}

type CartProductRow = CartProduct & {
  category?: CartProduct["category"];
};

type CartItemRow = {
  id: string;
  product_id: string;
  quantity: number;
  packaging_option_id?: string | null;
  packaging_option?: ProductPackagingOption | null;
  products?: CartProductRow | null;
};

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
      const supabase = await getSupabase();
      // Authenticated user - fetch from Supabase
      const { data, error } = await supabase
        .from("cart_items")
        .select(`
          id,
          product_id,
          quantity,
          packaging_option_id,
          packaging_option:packaging_option_id (
            id,
            product_id,
            packaging_type,
            packaging_label,
            bottle_quantity,
            pricing_mode,
            total_price,
            discount_percent,
            calculated_unit_price,
            calculated_savings,
            show_discount,
            stock_quantity,
            sku,
            weight_kg,
            discount_tiers,
            is_active
          ),
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
        const cartItems: CartItem[] = (data as unknown as CartItemRow[]).map((item) => ({
          id: item.id,
          product_id: item.product_id,
          quantity: item.quantity,
          packaging_option_id: item.packaging_option_id || null,
          packaging_option: item.packaging_option || null,
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
        const supabase = await getSupabase();
        const productIds = localItems.map((item) => item.product_id);
        const packagingOptionIds = localItems
          .map((item) => item.packaging_option_id)
          .filter(Boolean) as string[];
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
        const { data: packagingOptions } = packagingOptionIds.length
          ? await supabase
              .from("active_product_packaging_options" as never)
              .select("*")
              .in("id", packagingOptionIds)
          : { data: [] };

        const hydratedItems = localItems.map((item) => ({
          ...item,
          product: (products as CartProductRow[] | null)?.find((p) => p.id === item.product_id),
          packaging_option: (packagingOptions as ProductPackagingOption[] | null)?.find((option) => option.id === item.packaging_option_id) || null,
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
    async (productId: string, quantity: number = 1, options?: { packagingOptionId?: string | null }) => {
      const packagingOptionId = options?.packagingOptionId || null;
      const existingItem = items.find(
        (item) => item.product_id === productId && (item.packaging_option_id || null) === packagingOptionId,
      );

      if (userId) {
        const supabase = await getSupabase();
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
            packaging_option_id: packagingOptionId,
          });
        }
      } else {
        // Guest user - update localStorage
        const localItems = getLocalCart();
        const existingLocal = localItems.find(
          (item) => item.product_id === productId && (item.packaging_option_id || null) === packagingOptionId,
        );

        if (existingLocal) {
          existingLocal.quantity += quantity;
        } else {
          localItems.push({
            id: `local_${Date.now()}`,
            product_id: productId,
            quantity,
            packaging_option_id: packagingOptionId,
          });
        }
        setLocalCart(localItems);
      }

      await fetchCart();
    },
    [userId, items, fetchCart]
  );

  // Remove item from cart
  const removeItem = useCallback(
    async (itemId: string) => {
      if (userId) {
        const supabase = await getSupabase();
        await supabase.from("cart_items").delete().eq("id", itemId);
      } else {
        const localItems = getLocalCart().filter((i) => i.id !== itemId);
        setLocalCart(localItems);
      }

      await fetchCart();
    },
    [userId, fetchCart]
  );

  // Update item quantity
  const updateQuantity = useCallback(
    async (itemId: string, quantity: number) => {
      if (quantity <= 0) {
        await removeItem(itemId);
        return;
      }

      if (userId) {
        const supabase = await getSupabase();
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
    [userId, fetchCart, removeItem]
  );

  // Clear cart
  const clearCart = useCallback(async () => {
    if (userId) {
      const supabase = await getSupabase();
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
      const supabase = await getSupabase();
      // Insert all local items to Supabase
      const itemsToInsert = localItems.map((item) => ({
        user_id: newUserId,
        product_id: item.product_id,
        quantity: item.quantity,
        packaging_option_id: item.packaging_option_id || null,
      }));

      for (const item of itemsToInsert) {
        // Check if item already exists
        let existingQuery = supabase
          .from("cart_items")
          .select("id, quantity")
          .eq("user_id", newUserId)
          .eq("product_id", item.product_id);

        existingQuery = item.packaging_option_id
          ? existingQuery.eq("packaging_option_id", item.packaging_option_id)
          : existingQuery.is("packaging_option_id", null);

        const { data: existing } = await existingQuery.maybeSingle();

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
  const subtotal = calculateCartSubtotal(items);
  const itemCount = calculateCartItemCount(items);

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
