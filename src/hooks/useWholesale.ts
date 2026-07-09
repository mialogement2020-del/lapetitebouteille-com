import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface LooseSupabaseError {
  message?: string;
}

type LooseSupabaseResult = {
  data: unknown;
  error: LooseSupabaseError | null;
};

interface LooseSupabaseQuery extends PromiseLike<LooseSupabaseResult> {
  select(columns?: string): LooseSupabaseQuery;
  eq(column: string, value: unknown): LooseSupabaseQuery;
  order(column: string, options?: { ascending?: boolean }): LooseSupabaseQuery;
  insert(value: unknown): LooseSupabaseQuery;
  update(value: unknown): LooseSupabaseQuery;
  single(): Promise<LooseSupabaseResult>;
}

const looseSupabase = supabase as unknown as {
  from(table: string): LooseSupabaseQuery;
};

// Default wholesale tiers with discount percentages
const STORAGE_KEY = "wholesale_default_discounts";

function getStoredDiscounts(): Record<string, number> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {
    return {};
  }
  return {};
}

export const WHOLESALE_TIERS = [
  { type: "carton_6" as const, label: "Carton de 6 bouteilles", quantity: 6, discountPercent: 7, icon: "📦" },
  { type: "caisse_bois_6" as const, label: "Caisse bois de 6 bouteilles", quantity: 6, discountPercent: 5, icon: "🪵" },
  { type: "carton_12" as const, label: "Carton de 12 bouteilles", quantity: 12, discountPercent: 15, icon: "📦" },
  { type: "caisse_bois_12" as const, label: "Caisse bois de 12 bouteilles", quantity: 12, discountPercent: 10, icon: "🪵" },
  { type: "palette" as const, label: "Palette (60 bouteilles)", quantity: 60, discountPercent: 25, icon: "🏗️" },
];

// Apply stored overrides on load
const storedDiscounts = getStoredDiscounts();
WHOLESALE_TIERS.forEach((tier) => {
  if (storedDiscounts[tier.type] !== undefined) {
    tier.discountPercent = storedDiscounts[tier.type];
  }
});

export type PackagingType = "carton_6" | "caisse_bois_6" | "carton_12" | "caisse_bois_12" | "palette";

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

const DEFAULT_TVA_RATE = 0.1925; // 19.25% Cameroon VAT

export function calculateWholesalePrices(
  unitPrice: number,
  customPricing?: WholesalePricing[],
  isHT: boolean = false,
  options?: {
    discountOverrides?: Record<string, number>;
    tvaRate?: number;
    labels?: Record<string, { fr?: string; en?: string }>;
    lang?: string;
  }
): WholesaleTierPrice[] {
  const tvaRate = options?.tvaRate ?? DEFAULT_TVA_RATE;
  const overrides = options?.discountOverrides ?? {};
  const labels = options?.labels ?? {};
  const lang = options?.lang ?? "fr";
  return WHOLESALE_TIERS.map((tier) => {
    const custom = customPricing?.find((p) => p.packaging_type === tier.type && p.is_active);
    
    let totalPrice: number;
    let discountPercent: number;
    let isCustom = false;

    const baseDiscount = overrides[tier.type] ?? tier.discountPercent;

    if (custom?.custom_price) {
      totalPrice = custom.custom_price;
      discountPercent = custom.discount_percentage || Math.round((1 - totalPrice / (unitPrice * tier.quantity)) * 100);
      isCustom = true;
    } else {
      discountPercent = custom?.discount_percentage || baseDiscount;
      totalPrice = Math.round(unitPrice * tier.quantity * (1 - discountPercent / 100));
    }

    // If HT mode, remove TVA from displayed price
    if (isHT) {
      totalPrice = Math.round(totalPrice / (1 + tvaRate));
    }

    const fullPrice = isHT 
      ? Math.round((unitPrice * tier.quantity) / (1 + tvaRate))
      : unitPrice * tier.quantity;
    const savings = fullPrice - totalPrice;

    const customLabel = labels[tier.type]?.[lang as "fr" | "en"];

    return {
      type: tier.type,
      label: customLabel || tier.label,
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
      const { data, error } = await looseSupabase
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
      const { data: result, error } = await looseSupabase
        .from("quote_requests")
        .insert(data)
        .select()
        .single();

      if (error) throw error;

      // Send notification via edge function
      try {
        await supabase.functions.invoke("send-quote-notification", {
          body: {
            quoteId: (result as { id: string }).id,
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
      const { data, error } = await looseSupabase
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
      const { error } = await looseSupabase
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
