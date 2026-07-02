import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface MediaArticle {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  cover_image_url: string | null;
  category_id: string | null;
  author_name: string | null;
  tags: string[];
  status: string;
  published_at: string | null;
  reading_time_minutes: number;
  view_count: number;
  seo_title: string | null;
  seo_description: string | null;
  featured: boolean;
  created_at: string;
  updated_at: string;
}

export interface MediaCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  display_order: number;
}

export function useMediaCategories() {
  return useQuery({
    queryKey: ["media_categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("media_categories")
        .select("*")
        .order("display_order", { ascending: true });
      if (error) throw error;
      return data as MediaCategory[];
    },
  });
}

export function usePublishedArticles(opts: { categorySlug?: string; limit?: number; featuredOnly?: boolean } = {}) {
  return useQuery({
    queryKey: ["media_articles", "published", opts],
    queryFn: async () => {
      let query = supabase
        .from("media_articles")
        .select("*, category:media_categories(name, slug)")
        .eq("status", "published")
        .order("published_at", { ascending: false });

      if (opts.featuredOnly) query = query.eq("featured", true);
      if (opts.limit) query = query.limit(opts.limit);

      const { data, error } = await query;
      if (error) throw error;

      let filtered = data ?? [];
      if (opts.categorySlug) {
        filtered = filtered.filter((a: any) => a.category?.slug === opts.categorySlug);
      }
      return filtered as (MediaArticle & { category?: { name: string; slug: string } | null })[];
    },
  });
}

export function useArticleBySlug(slug: string | undefined) {
  return useQuery({
    queryKey: ["media_article", slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("media_articles")
        .select("*, category:media_categories(name, slug)")
        .eq("slug", slug!)
        .maybeSingle();
      if (error) throw error;
      if (data && data.status === "published") {
        void supabase.rpc("increment_article_views", { _slug: slug! });
      }
      return data as (MediaArticle & { category?: { name: string; slug: string } | null }) | null;
    },
  });
}

export function useAdminArticles() {
  return useQuery({
    queryKey: ["media_articles", "admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("media_articles")
        .select("*, category:media_categories(name, slug)")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as (MediaArticle & { category?: { name: string; slug: string } | null })[];
    },
  });
}

export function useSaveArticle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<MediaArticle> & { title: string; slug: string; content: string }) => {
      const payload: any = { ...input };
      if (input.status === "published" && !input.published_at) {
        payload.published_at = new Date().toISOString();
      }
      if (input.id) {
        const { error } = await supabase.from("media_articles").update(payload).eq("id", input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("media_articles").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["media_articles"] });
    },
  });
}

export function useDeleteArticle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("media_articles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["media_articles"] });
    },
  });
}