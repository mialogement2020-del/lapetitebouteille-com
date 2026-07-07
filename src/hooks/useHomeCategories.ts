import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface HomeCategory {
  id: string;
  slug: string;
  title_fr: string;
  title_en: string;
  description_fr: string;
  description_en: string;
  image_url: string;
  href: string;
  display_order: number;
  is_visible: boolean;
  created_at?: string;
  updated_at?: string;
}

export function useHomeCategories(opts: { visibleOnly?: boolean } = {}) {
  return useQuery({
    queryKey: ["home_categories", opts],
    queryFn: async () => {
      let q = supabase
        .from("home_categories")
        .select("*")
        .order("display_order", { ascending: true });
      if (opts.visibleOnly) q = q.eq("is_visible", true);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as HomeCategory[];
    },
  });
}

export function useSaveHomeCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<HomeCategory> & { slug: string; title_fr: string }) => {
      const payload: any = { ...input };
      if (input.id) {
        const { id, ...rest } = payload;
        const { error } = await supabase.from("home_categories").update(rest).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("home_categories").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["home_categories"] }),
  });
}

export function useDeleteHomeCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("home_categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["home_categories"] }),
  });
}

export async function uploadHomeCategoryImage(file: File, slug: string): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `home-categories/${slug}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from("product-images")
    .upload(path, file, { contentType: file.type, upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from("product-images").getPublicUrl(path);
  return data.publicUrl;
}