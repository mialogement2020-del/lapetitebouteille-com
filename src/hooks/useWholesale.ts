import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Default wholesale tiers with discount percentages
export const WHOLESALE_TIERS = [
  { type: "carton_6" as const, label: "Carton de 6 bouteilles", quantity: 6, discountPercent: 7, icon: "📦" },
  { type: "carton_12" as const, label: "Carton de 12 bouteilles", quantity: 12, discountPercent: 15, icon: "📦" },
  { type: "palette" as const, label: "Palette (60 bouteilles)", quantity: 60, discountPercent: 25, icon: "🏗️" },
];

export type PackagingType = "carton_6" | "carton_12" | "palette";

export interface WholesalePricing {
  id: string;
  product_id: string;
  packaging_type: PackagingType;
  quantity: number;
  discount_percentage: number;
  custom_price: number | null;
  is_active: boolean;
}

export interface WholesaleTierPrice {
  type: PackagingType;
  label: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  savings: number;
  discountPercent: number;
  icon: string;
  isCustom: boolean;
}

const TVA_RATE = 0.1925; // 19.25% Cameroon VAT

export function calculateWholesalePrices(
  unitPrice: number,
  customPricing?: WholesalePricing[],
  isHT: boolean = false
): WholesaleTierPrice[] {
  return WHOLESALE_TIERS.map((tier) => {
    const custom = customPricing?.find((p) => p.packaging_type === tier.type && p.is_active);
    
    let totalPrice: number;
    let discountPercent: number;
    let isCustom = false;

    if (custom?.custom_price) {
      totalPrice = custom.custom_price;
      discountPercent = custom.discount_percentage || Math.round((1 - totalPrice / (unitPrice * tier.quantity)) * 100);
      isCustom = true;
    } else {
      discountPercent = custom?.discount_percentage || tier.discountPercent;
      totalPrice = Math.round(unitPrice * tier.quantity * (1 - discountPercent / 100));
    }

    // If HT mode, remove TVA from displayed price
    if (isHT) {
      totalPrice = Math.round(totalPrice / (1 + TVA_RATE));
    }

    const fullPrice = isHT 
      ? Math.round((unitPrice * tier.quantity) / (1 + TVA_RATE))
      : unitPrice * tier.quantity;
    const savings = fullPrice - totalPrice;

    return {
      type: tier.type,
      label: tier.label,
      quantity: tier.quantity,
      unitPrice,
      totalPrice,
      savings,
      discountPercent,
      icon: tier.icon,
      isCustom,
    };
  });
}

export function useWholesalePricing(productId: string) {
  return useQuery({
    queryKey: ["wholesale-pricing", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wholesale_pricing")
        .select("*")
        .eq("product_id", productId)
        .eq("is_active", true);

      if (error) throw error;
      return (data || []) as WholesalePricing[];
    },
    enabled: !!productId,
  });
}

export interface QuoteRequestData {
  client_name: string;
  client_email: string;
  client_phone: string;
  company_name?: string;
  niu?: string;
  city: string;
  product_id: string;
  product_name: string;
  packaging_type: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  message?: string;
  user_id?: string;
}

export function useSubmitQuoteRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: QuoteRequestData) => {
      const { data: result, error } = await supabase
        .from("quote_requests")
        .insert(data)
        .select()
        .single();

      if (error) throw error;

      // Send notification via edge function
      try {
        await supabase.functions.invoke("send-quote-notification", {
          body: {
            quoteId: result.id,
            clientName: data.client_name,
            clientEmail: data.client_email,
            clientPhone: data.client_phone,
            companyName: data.company_name,
            niu: data.niu,
            city: data.city,
            productName: data.product_name,
            packagingType: data.packaging_type,
            quantity: data.quantity,
            totalPrice: data.total_price,
            message: data.message,
          },
        });
      } catch (e) {
        console.warn("Failed to send quote notification:", e);
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quote-requests"] });
    },
  });
}

// Admin hooks
export function useQuoteRequests() {
  return useQuery({
    queryKey: ["quote-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quote_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateQuoteStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes?: string }) => {
      const { error } = await supabase
        .from("quote_requests")
        .update({
          status,
          admin_notes: notes || null,
          processed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quote-requests"] });
    },
  });
}
