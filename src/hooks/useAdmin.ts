import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import type { Database } from "@/integrations/supabase/types";
import { logAuditAction } from "@/hooks/useAuditLogs";

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
  gallery_urls: string[] | null;
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
  low_stock_threshold: number | null;
  parent_id: string | null;
  created_at: string | null;
}

export interface AdminPromoCode {
  id: string;
  code: string;
  description: string | null;
  discount_type: string;
  discount_value: number;
  min_order_amount: number | null;
  max_discount_amount: number | null;
  usage_limit: number | null;
  used_count: number;
  is_active: boolean | null;
  valid_from: string | null;
  valid_until: string | null;
  created_at: string | null;
}

export interface AdminReview {
  id: string;
  product_id: string;
  user_id: string | null;
  rating: number;
  title: string | null;
  comment: string | null;
  is_approved: boolean | null;
  is_verified_purchase: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  product?: {
    id: string;
    name: string;
    image_url: string | null;
  } | null;
}

export interface CategoryFormData {
  name: string;
  slug: string;
  description?: string;
  image_url?: string;
  display_order?: number;
  is_active?: boolean;
  low_stock_threshold?: number | null;
  parent_id?: string | null;
}

export interface PromoCodeFormData {
  code: string;
  description?: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  min_order_amount?: number;
  max_discount_amount?: number;
  usage_limit?: number;
  valid_from?: string;
  valid_until?: string;
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
  gallery_urls?: string[];
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
      
      // Deduplicate products by id
      const seen = new Set<string>();
      const unique = (data as AdminProduct[]).filter(p => {
        if (seen.has(p.id)) return false;
        seen.add(p.id);
        return true;
      });
      return unique;
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

  // Fetch all promo codes (admin only)
  const { data: promoCodes = [], isLoading: isLoadingPromoCodes, refetch: refetchPromoCodes } = useQuery({
    queryKey: ["admin-promo-codes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("promo_codes")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as AdminPromoCode[];
    },
    enabled: isAdmin === true,
  });

  // Fetch all reviews (admin only)
  const { data: reviews = [], isLoading: isLoadingReviews, refetch: refetchReviews } = useQuery({
    queryKey: ["admin-reviews"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select(`
          *,
          product:products(id, name, image_url)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as AdminReview[];
    },
    enabled: isAdmin === true,
  });

  // Approve review mutation
  const approveReview = useMutation({
    mutationFn: async ({ reviewId, productName }: { reviewId: string; productName?: string }) => {
      const { error } = await supabase
        .from("reviews")
        .update({ is_approved: true })
        .eq("id", reviewId);

      if (error) throw error;
      
      // Log audit action
      await logAuditAction(
        "approve",
        "review",
        reviewId,
        productName ? `Avis sur ${productName}` : "Avis client",
        { is_approved: false },
        { is_approved: true }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
    },
  });

  // Reject/delete review mutation
  const deleteReview = useMutation({
    mutationFn: async ({ reviewId, productName }: { reviewId: string; productName?: string }) => {
      const { error } = await supabase
        .from("reviews")
        .delete()
        .eq("id", reviewId);

      if (error) throw error;
      
      // Log audit action
      await logAuditAction(
        "reject",
        "review",
        reviewId,
        productName ? `Avis sur ${productName}` : "Avis client"
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
    },
  });

  // Update order status mutation
  const updateOrderStatus = useMutation({
    mutationFn: async ({ orderId, newStatus, notes, orderNumber, previousStatus, shippingPhone, customerName, customerEmail, userId }: { 
      orderId: string; 
      newStatus: OrderStatus; 
      notes?: string;
      orderNumber?: string;
      previousStatus?: OrderStatus;
      shippingPhone?: string | null;
      customerName?: string | null;
      customerEmail?: string | null;
      userId?: string | null;
    }) => {
      // First, update the order status
      const { error: orderError } = await supabase
        .from("orders")
        .update({ status: newStatus })
        .eq("id", orderId);

      if (orderError) throw orderError;

      // If notes are provided, update the latest history entry with the notes
      if (notes) {
        // Find the most recent history entry for this order and update it with the notes
        const { data: historyEntries, error: historyFetchError } = await supabase
          .from("order_status_history")
          .select("id")
          .eq("order_id", orderId)
          .eq("new_status", newStatus)
          .order("changed_at", { ascending: false })
          .limit(1);

        if (!historyFetchError && historyEntries && historyEntries.length > 0) {
          await supabase
            .from("order_status_history")
            .update({ notes })
            .eq("id", historyEntries[0].id);
        }
      }

      // Create in-app notification for user
      if (userId && orderNumber) {
        try {
          const statusMessages: Record<string, { title: string; message: string }> = {
            'pending': { 
              title: '🛒 Commande enregistrée', 
              message: `Votre commande ${orderNumber} a été enregistrée et est en attente de confirmation.` 
            },
            'confirmed': { 
              title: '✓ Commande confirmée', 
              message: `Votre commande ${orderNumber} a été confirmée et est en cours de préparation.` 
            },
            'processing': { 
              title: '📦 Préparation en cours', 
              message: `Votre commande ${orderNumber} est en cours de préparation.` 
            },
            'shipped': { 
              title: '🚚 Commande expédiée', 
              message: `Votre commande ${orderNumber} est en route ! Notre livreur vous contactera bientôt.` 
            },
            'delivered': { 
              title: '✅ Commande livrée', 
              message: `Votre commande ${orderNumber} a été livrée avec succès. Merci de votre confiance !` 
            },
            'cancelled': { 
              title: '❌ Commande annulée', 
              message: `Votre commande ${orderNumber} a été annulée.` 
            },
          };
          
          const notifContent = statusMessages[newStatus] || { 
            title: '📋 Mise à jour commande', 
            message: `Statut de votre commande ${orderNumber}: ${newStatus}` 
          };

          // Insert in-app notification using service role through edge function or direct insert
          const { error: notifError } = await supabase
            .from('user_notifications')
            .insert({
              user_id: userId,
              type: 'order_update',
              title: notifContent.title,
              message: notifContent.message,
              reference_type: 'order',
              reference_id: orderId,
            });

          if (notifError) {
            console.warn('Failed to create in-app notification:', notifError);
          } else {
            console.log('In-app notification created for user:', userId);
          }
        } catch (notifErr) {
          console.warn('Error creating in-app notification:', notifErr);
        }

        // Send push notification
        try {
          const pushResponse = await supabase.functions.invoke('send-order-push-notification', {
            body: {
              userId,
              orderNumber,
              status: newStatus,
              customerName: customerName || 'Client',
            },
          });
          
          if (pushResponse.error) {
            console.warn('Push notification failed:', pushResponse.error);
          } else if (pushResponse.data?.skipped) {
            console.log('Push notification skipped:', pushResponse.data.message);
          } else {
            console.log('Push notification sent:', pushResponse.data);
          }
        } catch (pushError) {
          console.warn('Failed to send push notification:', pushError);
          // Don't fail the status update if push fails
        }
      }

      // Send SMS notification for specific status changes (shipped, delivered)
      if (shippingPhone && orderNumber && ['shipped', 'delivered'].includes(newStatus)) {
        try {
          const smsResponse = await supabase.functions.invoke('send-order-status-sms', {
            body: {
              orderNumber,
              phoneNumber: shippingPhone,
              newStatus,
              customerName: customerName || 'Client',
            },
          });
          
          if (smsResponse.error) {
            console.warn('SMS notification failed:', smsResponse.error);
          } else if (smsResponse.data?.skipped) {
            console.log('SMS notification skipped:', smsResponse.data.message);
          } else {
            console.log('SMS notification sent successfully');
          }
        } catch (smsError) {
          console.warn('Failed to send SMS notification:', smsError);
          // Don't fail the status update if SMS fails
        }
      }

      // Send email notification for status updates
      if (customerEmail && orderNumber) {
        try {
          await supabase.functions.invoke('send-order-status-update', {
            body: { orderNumber },
          });
        } catch (emailError) {
          console.warn('Failed to send email notification:', emailError);
          // Don't fail the status update if email fails
        }
      }
      
      // Log audit action
      await logAuditAction(
        "status_change",
        "order",
        orderId,
        orderNumber || `Commande ${orderId.slice(0, 8)}`,
        { status: previousStatus || "unknown" },
        { status: newStatus, notes }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      queryClient.invalidateQueries({ queryKey: ["order-status-history"] });
    },
  });

  // Create product mutation
  const createProduct = useMutation({
    mutationFn: async (data: ProductFormData) => {
      const { data: insertedData, error } = await supabase
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
          gallery_urls: data.gallery_urls || null,
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
        }])
        .select("id")
        .single();

      if (error) throw error;
      
      // Log audit action
      await logAuditAction(
        "create",
        "product",
        insertedData?.id,
        data.name,
        null,
        { name: data.name, price: data.price, stock_quantity: data.stock_quantity }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    },
  });

  // Update product mutation
  const updateProduct = useMutation({
    mutationFn: async ({ id, data, oldData }: { id: string; data: Partial<ProductFormData>; oldData?: Partial<ProductFormData> }) => {
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
      
      // Log audit action
      await logAuditAction(
        "update",
        "product",
        id,
        data.name || "Produit",
        oldData ? { name: oldData.name, price: oldData.price, stock_quantity: oldData.stock_quantity } : null,
        { name: data.name, price: data.price, stock_quantity: data.stock_quantity }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    },
  });

  // Restock product mutation (dedicated for audit logging)
  const restockProduct = useMutation({
    mutationFn: async ({ 
      id, 
      newQuantity, 
      oldQuantity, 
      productName 
    }: { 
      id: string; 
      newQuantity: number; 
      oldQuantity: number; 
      productName: string;
    }) => {
      const { error } = await supabase
        .from("products")
        .update({ stock_quantity: newQuantity })
        .eq("id", id);

      if (error) throw error;
      
      // Log audit action with restock type
      await logAuditAction(
        "restock",
        "stock",
        id,
        productName,
        { stock_quantity: oldQuantity },
        { stock_quantity: newQuantity, quantity_added: newQuantity - oldQuantity }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    },
  });

  // Delete product mutation
  const deleteProduct = useMutation({
    mutationFn: async ({ id, productName }: { id: string; productName?: string }) => {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", id);

      if (error) throw error;
      
      // Log audit action
      await logAuditAction(
        "delete",
        "product",
        id,
        productName || "Produit supprimé"
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    },
  });

  // Create category mutation
  const createCategory = useMutation({
    mutationFn: async (data: CategoryFormData) => {
      const { data: insertedData, error } = await supabase
        .from("categories")
        .insert([{
          name: data.name,
          slug: data.slug,
          description: data.description || null,
          image_url: data.image_url || null,
          display_order: data.display_order || 0,
          is_active: data.is_active ?? true,
          low_stock_threshold: data.low_stock_threshold || null,
        }])
        .select("id")
        .single();

      if (error) throw error;
      
      // Log audit action
      await logAuditAction(
        "create",
        "category",
        insertedData?.id,
        data.name,
        null,
        { name: data.name, is_active: data.is_active }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-all-categories"] });
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
    },
  });

  // Update category mutation
  const updateCategory = useMutation({
    mutationFn: async ({ id, data, oldName }: { id: string; data: Partial<CategoryFormData>; oldName?: string }) => {
      const { error } = await supabase
        .from("categories")
        .update({
          name: data.name,
          slug: data.slug,
          description: data.description,
          image_url: data.image_url,
          display_order: data.display_order,
          is_active: data.is_active,
          low_stock_threshold: data.low_stock_threshold,
        })
        .eq("id", id);

      if (error) throw error;
      
      // Log audit action
      await logAuditAction(
        "update",
        "category",
        id,
        data.name || oldName || "Catégorie",
        oldName ? { name: oldName } : null,
        { name: data.name, is_active: data.is_active }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-all-categories"] });
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
    },
  });

  // Delete category mutation
  const deleteCategory = useMutation({
    mutationFn: async ({ id, categoryName }: { id: string; categoryName?: string }) => {
      const { error } = await supabase
        .from("categories")
        .delete()
        .eq("id", id);

      if (error) throw error;
      
      // Log audit action
      await logAuditAction(
        "delete",
        "category",
        id,
        categoryName || "Catégorie supprimée"
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-all-categories"] });
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
    },
  });

  // Create promo code mutation
  const createPromoCode = useMutation({
    mutationFn: async (data: PromoCodeFormData) => {
      const { data: insertedData, error } = await supabase
        .from("promo_codes")
        .insert([{
          code: data.code,
          description: data.description || null,
          discount_type: data.discount_type,
          discount_value: data.discount_value,
          min_order_amount: data.min_order_amount || 0,
          max_discount_amount: data.max_discount_amount || null,
          usage_limit: data.usage_limit || null,
          valid_from: data.valid_from || null,
          valid_until: data.valid_until || null,
          is_active: data.is_active ?? true,
        }])
        .select("id")
        .single();

      if (error) throw error;
      
      // Log audit action
      await logAuditAction(
        "create",
        "promo_code",
        insertedData?.id,
        data.code,
        null,
        { code: data.code, discount_type: data.discount_type, discount_value: data.discount_value }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-promo-codes"] });
    },
  });

  // Update promo code mutation
  const updatePromoCode = useMutation({
    mutationFn: async ({ id, data, oldCode }: { id: string; data: Partial<PromoCodeFormData>; oldCode?: string }) => {
      const { error } = await supabase
        .from("promo_codes")
        .update({
          code: data.code,
          description: data.description,
          discount_type: data.discount_type,
          discount_value: data.discount_value,
          min_order_amount: data.min_order_amount,
          max_discount_amount: data.max_discount_amount,
          usage_limit: data.usage_limit,
          valid_from: data.valid_from,
          valid_until: data.valid_until,
          is_active: data.is_active,
        })
        .eq("id", id);

      if (error) throw error;
      
      // Log audit action
      await logAuditAction(
        "update",
        "promo_code",
        id,
        data.code || oldCode || "Code promo",
        oldCode ? { code: oldCode } : null,
        { code: data.code, discount_type: data.discount_type, discount_value: data.discount_value, is_active: data.is_active }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-promo-codes"] });
    },
  });

  // Delete promo code mutation
  const deletePromoCode = useMutation({
    mutationFn: async ({ id, promoCode }: { id: string; promoCode?: string }) => {
      const { error } = await supabase
        .from("promo_codes")
        .delete()
        .eq("id", id);

      if (error) throw error;
      
      // Log audit action
      await logAuditAction(
        "delete",
        "promo_code",
        id,
        promoCode || "Code promo supprimé"
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-promo-codes"] });
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
    totalPromoCodes: promoCodes.length,
    activePromoCodes: promoCodes.filter((p) => p.is_active).length,
    totalReviews: reviews.length,
    pendingReviews: reviews.filter((r) => !r.is_approved).length,
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
    restockProduct,
    deleteProduct,
    createCategory,
    updateCategory,
    deleteCategory,
    promoCodes,
    isLoadingPromoCodes,
    refetchPromoCodes,
    createPromoCode,
    updatePromoCode,
    deletePromoCode,
    reviews,
    isLoadingReviews,
    refetchReviews,
    approveReview,
    deleteReview,
    stats,
  };
}
