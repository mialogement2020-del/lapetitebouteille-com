import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";

export interface VendorShop {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  banner_url: string | null;
  city: string | null;
  country: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  is_active: boolean;
  is_verified: boolean;
  trust_score: number;
  total_sales: number;
  created_at: string;
  updated_at: string;
}

const slugify = (input: string) =>
  input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 60);

/** Current vendor's own shop (one per vendor). */
export const useMyVendorShop = () => {
  const { user } = useAuthContext();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["my-vendor-shop", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendor_shops")
        .select("*")
        .eq("owner_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as VendorShop | null;
    },
  });

  const createShop = useMutation({
    mutationFn: async (payload: { name: string; description?: string; city?: string; contact_email?: string; contact_phone?: string }) => {
      if (!user) throw new Error("Non connecté");
      const baseSlug = slugify(payload.name) || `shop-${user.id.slice(0, 6)}`;
      // try base slug then append random suffix if taken
      let slug = baseSlug;
      for (let i = 0; i < 4; i++) {
        const { data: existing } = await supabase
          .from("vendor_shops")
          .select("id")
          .eq("slug", slug)
          .maybeSingle();
        if (!existing) break;
        slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
      }
      const { data, error } = await supabase
        .from("vendor_shops")
        .insert({
          owner_id: user.id,
          name: payload.name,
          slug,
          description: payload.description ?? null,
          city: payload.city ?? null,
          contact_email: payload.contact_email ?? null,
          contact_phone: payload.contact_phone ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as VendorShop;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-vendor-shop"] }),
  });

  const updateShop = useMutation({
    mutationFn: async (patch: Partial<VendorShop>) => {
      if (!query.data) throw new Error("Aucune boutique");
      const { data, error } = await supabase
        .from("vendor_shops")
        .update(patch)
        .eq("id", query.data.id)
        .select()
        .single();
      if (error) throw error;
      return data as VendorShop;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-vendor-shop"] }),
  });

  return { ...query, createShop, updateShop };
};

/** Public lookup by slug. */
export const useVendorShopBySlug = (slug: string | undefined) =>
  useQuery({
    queryKey: ["vendor-shop-slug", slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendor_shops")
        .select("*")
        .eq("slug", slug!)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      return data as VendorShop | null;
    },
  });

/** Products of a given shop. */
export const useVendorShopProducts = (shopId: string | undefined) =>
  useQuery({
    queryKey: ["vendor-shop-products", shopId],
    enabled: !!shopId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, category:categories(id, name, slug)")
        .eq("vendor_id", shopId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });