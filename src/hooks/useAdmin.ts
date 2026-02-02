import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import type { Database } from "@/integrations/supabase/types";

type OrderStatus = Database["public"]["Enums"]["order_status"];

export interface AdminOrder {
  id: string;
  order_number: string;
  status: OrderStatus | null;
  total: number;
  subtotal: number;
  delivery_fee: number | null;
  discount_amount: number | null;
  payment_method: string | null;
  payment_status: string | null;
  shipping_full_name: string | null;
  shipping_phone: string | null;
  shipping_city: string | null;
  shipping_neighborhood: string | null;
  shipping_street: string | null;
  shipping_notes: string | null;
  guest_email: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
  user_id: string | null;
  items: {
    id: string;
    product_name: string;
    product_image: string | null;
    quantity: number;
    unit_price: number;
    total_price: number;
  }[];
}

export interface AdminProduct {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  short_description: string | null;
  price: number;
  original_price: number | null;
  stock_quantity: number | null;
  category_id: string | null;
  image_url: string | null;
  is_active: boolean | null;
  is_featured: boolean | null;
  alcohol_percentage: number | null;
  volume_ml: number | null;
  vintage_year: number | null;
  origin_country: string | null;
  region: string | null;
  grape_variety: string | null;
  tasting_notes: string | null;
  food_pairing: string | null;
  serving_temperature: string | null;
  created_at: string | null;
  category?: { id: string; name: string } | null;
}

export interface AdminCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  display_order: number | null;
  is_active: boolean | null;
  created_at: string | null;
}

export interface CategoryFormData {
  name: string;
  slug: string;
  description?: string;
  image_url?: string;
  display_order?: number;
  is_active?: boolean;
}

export interface ProductFormData {
  name: string;
  slug: string;
  description?: string;
  short_description?: string;
  price: number;
  original_price?: number;
  stock_quantity?: number;
  category_id?: string;
  image_url?: string;
  is_active?: boolean;
  is_featured?: boolean;
  alcohol_percentage?: number;
  volume_ml?: number;
  vintage_year?: number;
  origin_country?: string;
  region?: string;
  grape_variety?: string;
  tasting_notes?: string;
  food_pairing?: string;
  serving_temperature?: string;
}

export function useAdmin() {
  const { user } = useAuthContext();
  const queryClient = useQueryClient();

  // Check if user is admin
  const { data: isAdmin, isLoading: isCheckingAdmin } = useQuery({
    queryKey: ["admin-check", user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      
      if (error) {
        console.error("Error checking admin status:", error);
        return false;
      }
      
      return !!data;
    },
    enabled: !!user?.id,
  });

  // Fetch all orders (admin only)
  const { data: orders = [], isLoading: isLoadingOrders, refetch: refetchOrders } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (ordersError) throw ordersError;

      // Fetch items for each order
      const ordersWithItems: AdminOrder[] = await Promise.all(
        (ordersData || []).map(async (order) => {
          const { data: items } = await supabase
            .from("order_items")
            .select("*")
            .eq("order_id", order.id);

          return {
            ...order,
            items: items || [],
          };
        })
      );

      return ordersWithItems;
    },
    enabled: isAdmin === true,
  });

  // Fetch all products (admin only)
  const { data: products = [], isLoading: isLoadingProducts, refetch: refetchProducts } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(`
          *,
          category:categories(id, name)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as AdminProduct[];
    },
    enabled: isAdmin === true,
  });

  // Fetch all categories (admin only - includes inactive)
  const { data: allCategories = [], isLoading: isLoadingCategories, refetch: refetchCategories } = useQuery({
    queryKey: ["admin-all-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;
      return data as AdminCategory[];
    },
    enabled: isAdmin === true,
  });

  // Fetch active categories for product form
  const { data: categories = [] } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, slug")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      return data;
    },
    enabled: isAdmin === true,
  });

  // Update order status mutation
  const updateOrderStatus = useMutation({
    mutationFn: async ({ orderId, newStatus }: { orderId: string; newStatus: OrderStatus }) => {
      const { error } = await supabase
        .from("orders")
        .update({ status: newStatus })
        .eq("id", orderId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
    },
  });

  // Create product mutation
  const createProduct = useMutation({
    mutationFn: async (data: ProductFormData) => {
      const { error } = await supabase
        .from("products")
        .insert([{
          name: data.name,
          slug: data.slug,
          description: data.description || null,
          short_description: data.short_description || null,
          price: data.price,
          original_price: data.original_price || null,
          stock_quantity: data.stock_quantity || 0,
          category_id: data.category_id || null,
          image_url: data.image_url || null,
          is_active: data.is_active ?? true,
          is_featured: data.is_featured ?? false,
          alcohol_percentage: data.alcohol_percentage || null,
          volume_ml: data.volume_ml || null,
          vintage_year: data.vintage_year || null,
          origin_country: data.origin_country || null,
          region: data.region || null,
          grape_variety: data.grape_variety || null,
          tasting_notes: data.tasting_notes || null,
          food_pairing: data.food_pairing || null,
          serving_temperature: data.serving_temperature || null,
        }]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    },
  });

  // Update product mutation
  const updateProduct = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ProductFormData> }) => {
      const { error } = await supabase
        .from("products")
        .update({
          name: data.name,
          slug: data.slug,
          description: data.description,
          short_description: data.short_description,
          price: data.price,
          original_price: data.original_price,
          stock_quantity: data.stock_quantity,
          category_id: data.category_id,
          image_url: data.image_url,
          is_active: data.is_active,
          is_featured: data.is_featured,
          alcohol_percentage: data.alcohol_percentage,
          volume_ml: data.volume_ml,
          vintage_year: data.vintage_year,
          origin_country: data.origin_country,
          region: data.region,
          grape_variety: data.grape_variety,
          tasting_notes: data.tasting_notes,
          food_pairing: data.food_pairing,
          serving_temperature: data.serving_temperature,
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    },
  });

  // Delete product mutation
  const deleteProduct = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    },
  });

  // Create category mutation
  const createCategory = useMutation({
    mutationFn: async (data: CategoryFormData) => {
      const { error } = await supabase
        .from("categories")
        .insert([{
          name: data.name,
          slug: data.slug,
          description: data.description || null,
          image_url: data.image_url || null,
          display_order: data.display_order || 0,
          is_active: data.is_active ?? true,
        }]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-all-categories"] });
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
    },
  });

  // Update category mutation
  const updateCategory = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CategoryFormData> }) => {
      const { error } = await supabase
        .from("categories")
        .update({
          name: data.name,
          slug: data.slug,
          description: data.description,
          image_url: data.image_url,
          display_order: data.display_order,
          is_active: data.is_active,
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-all-categories"] });
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
    },
  });

  // Delete category mutation
  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("categories")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-all-categories"] });
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
    },
  });

  // Get order statistics
  const stats = {
    total: orders.length,
    pending: orders.filter((o) => o.status === "pending").length,
    confirmed: orders.filter((o) => o.status === "confirmed").length,
    processing: orders.filter((o) => o.status === "processing").length,
    shipped: orders.filter((o) => o.status === "shipped").length,
    delivered: orders.filter((o) => o.status === "delivered").length,
    cancelled: orders.filter((o) => o.status === "cancelled").length,
    totalRevenue: orders
      .filter((o) => o.status !== "cancelled")
      .reduce((sum, o) => sum + o.total, 0),
    totalProducts: products.length,
    activeProducts: products.filter((p) => p.is_active).length,
    lowStock: products.filter((p) => (p.stock_quantity || 0) <= 5).length,
    totalCategories: allCategories.length,
    activeCategories: allCategories.filter((c) => c.is_active).length,
  };

  return {
    isAdmin,
    isCheckingAdmin,
    orders,
    isLoadingOrders,
    refetchOrders,
    updateOrderStatus,
    products,
    isLoadingProducts,
    refetchProducts,
    categories,
    allCategories,
    isLoadingCategories,
    refetchCategories,
    createProduct,
    updateProduct,
    deleteProduct,
    createCategory,
    updateCategory,
    deleteCategory,
    stats,
  };
}
