import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  short_description: string | null;
  category_id: string | null;
  price: number;
  original_price: number | null;
  stock_quantity: number;
  is_active: boolean;
  is_featured: boolean;
  alcohol_percentage: number | null;
  volume_ml: number | null;
  origin_country: string | null;
  region: string | null;
  grape_variety: string | null;
  vintage_year: number | null;
  tasting_notes: string | null;
  food_pairing: string | null;
  serving_temperature: string | null;
  image_url: string | null;
  gallery_urls: string[] | null;
  average_rating: number;
  review_count: number;
  created_at: string;
  category?: {
    id: string;
    name: string;
    slug: string;
  };
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  display_order: number;
  parent_id: string | null;
}

export interface ProductFilters {
  categorySlug?: string;
  minPrice?: number;
  maxPrice?: number;
  origin?: string;
  search?: string;
  sortBy?: "price_asc" | "price_desc" | "newest" | "popular" | "rating";
  featured?: boolean;
  limit?: number;
  enabled?: boolean;
}

export const useProducts = (filters: ProductFilters = {}) => {
  return useQuery({
    queryKey: ["products", filters],
    enabled: filters.enabled ?? true,
    queryFn: async () => {
      let query = supabase
        .from("products")
        .select(`
          *,
          category:categories(id, name, slug)
        `)
        .eq("is_active", true);

      // Filter by category (including subcategories)
      if (filters.categorySlug) {
        // Virtual "Caisse" category: filter by available_as_case flag
        if (filters.categorySlug === "caisse") {
          query = query.eq("available_as_case", true);
        } else {
        const { data: category } = await supabase
          .from("categories")
          .select("id")
          .eq("slug", filters.categorySlug)
          .maybeSingle();
        
        if (category) {
          // Also get subcategories of this category
          const { data: subcategories } = await supabase
            .from("categories")
            .select("id")
            .eq("parent_id", category.id);
          
          const categoryIds = [category.id, ...(subcategories?.map(s => s.id) || [])];
          query = query.in("category_id", categoryIds);
        }
        }
      }

      // Filter by price range
      if (filters.minPrice !== undefined) {
        query = query.gte("price", filters.minPrice);
      }
      if (filters.maxPrice !== undefined) {
        query = query.lte("price", filters.maxPrice);
      }

      // Filter by origin
      if (filters.origin) {
        query = query.eq("origin_country", filters.origin);
      }

      // Search
      if (filters.search) {
        query = query.ilike("name", `%${filters.search}%`);
      }

      // Featured only
      if (filters.featured) {
        query = query.eq("is_featured", true);
      }

      // Sorting
      switch (filters.sortBy) {
        case "price_asc":
          query = query.order("price", { ascending: true });
          break;
        case "price_desc":
          query = query.order("price", { ascending: false });
          break;
        case "newest":
          query = query.order("created_at", { ascending: false });
          break;
        case "rating":
          query = query.order("average_rating", { ascending: false });
          break;
        case "popular":
        default:
          query = query.order("review_count", { ascending: false });
          break;
      }

      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Deduplicate products by id
      const seen = new Set<string>();
      const unique = (data as Product[]).filter(p => {
        if (seen.has(p.id)) return false;
        seen.add(p.id);
        return true;
      });
      return unique;
    },
  });
};

export const useProduct = (slug: string) => {
  return useQuery({
    queryKey: ["product", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(`
          *,
          category:categories(id, name, slug)
        `)
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();

      if (error) throw error;
      return data as Product | null;
    },
    enabled: !!slug,
  });
};

export const useCategories = () => {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (error) throw error;
      return data as Category[];
    },
  });
};

export const useRelatedProducts = (productId: string, categoryId: string | null) => {
  return useQuery({
    queryKey: ["related-products", productId, categoryId],
    queryFn: async () => {
      if (!categoryId) return [];

      const { data, error } = await supabase
        .from("products")
        .select(`
          *,
          category:categories(id, name, slug)
        `)
        .eq("category_id", categoryId)
        .eq("is_active", true)
        .neq("id", productId)
        .limit(4);

      if (error) throw error;
      return data as Product[];
    },
    enabled: !!categoryId,
  });
};

export const useProductOrigins = () => {
  return useQuery({
    queryKey: ["product-origins"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("origin_country")
        .eq("is_active", true)
        .not("origin_country", "is", null);

      if (error) throw error;
      
      const origins = [...new Set(data.map(p => p.origin_country).filter(Boolean))] as string[];
      return origins.sort();
    },
  });
};
