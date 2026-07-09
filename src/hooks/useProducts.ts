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
  // Sensitive pricing helpers are intentionally not fetched by public product hooks.
  // Admin screens use their own admin-only queries.
  purchase_price?: number | null;
  markup_percent_override?: number | null;
  points_override?: number | null;
  points_tiers_override?: unknown;
  available_as_case?: boolean | null;
  units_per_case?: number | null;
  case_price?: number | null;
  category?: {
    id: string;
    name: string;
    slug: string;
    points_tiers_override?: unknown;
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
  page?: number;
  pageSize?: number;
  enabled?: boolean;
}

export const DEFAULT_CATALOG_PAGE_SIZE = 24;

interface ProductQueryOptions {
  includeCount?: boolean;
}

interface ProductQueryResult {
  products: Product[];
  count: number | null;
}

const PRODUCT_COLUMNS = `
  id,
  name,
  slug,
  description,
  short_description,
  category_id,
  price,
  original_price,
  stock_quantity,
  is_active,
  is_featured,
  alcohol_percentage,
  volume_ml,
  origin_country,
  region,
  grape_variety,
  vintage_year,
  tasting_notes,
  food_pairing,
  serving_temperature,
  image_url,
  gallery_urls,
  average_rating,
  review_count,
  created_at,
  points_tiers_override,
  available_as_case,
  units_per_case,
  case_price
`;

const SELECT_WITH_CATEGORY = `
  ${PRODUCT_COLUMNS},
  category:categories(id, name, slug, points_tiers_override)
`;

const applyProductFilters = async (filters: ProductFilters, options: ProductQueryOptions = {}) => {
  let categoryIds: string[] | null = null;
  let query = supabase
    .from("products")
    .select(SELECT_WITH_CATEGORY, options.includeCount ? { count: "exact" } : undefined)
    .eq("is_active", true);

  if (filters.categorySlug) {
    if (filters.categorySlug === "caisse") {
      query = query.eq("available_as_case", true);
    } else {
      const { data: category } = await supabase
        .from("categories")
        .select("id")
        .eq("slug", filters.categorySlug)
        .maybeSingle();

      if (category) {
        const { data: subcategories } = await supabase
          .from("categories")
          .select("id")
          .eq("parent_id", category.id);

        categoryIds = [category.id, ...(subcategories?.map((s) => s.id) || [])];
        query = query.in("category_id", categoryIds);
      } else {
        return { products: [], count: 0 } satisfies ProductQueryResult;
      }
    }
  }

  if (filters.minPrice !== undefined) query = query.gte("price", filters.minPrice);
  if (filters.maxPrice !== undefined) query = query.lte("price", filters.maxPrice);
  if (filters.origin) query = query.eq("origin_country", filters.origin);
  if (filters.search) query = query.ilike("name", `%${filters.search}%`);
  if (filters.featured) query = query.eq("is_featured", true);

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

  if (filters.pageSize) {
    const page = Math.max(1, filters.page || 1);
    const from = (page - 1) * filters.pageSize;
    query = query.range(from, from + filters.pageSize - 1);
  } else if (filters.limit) {
    query = query.limit(filters.limit);
  }

  const queryResult = await query;
  let data = queryResult.data as unknown[] | null;
  let error = queryResult.error;
  let count = queryResult.count;

  if (error && /has_role|permission denied|categories/i.test(error.message)) {
    let fallbackQuery = supabase
      .from("products")
      .select(PRODUCT_COLUMNS, options.includeCount ? { count: "exact" } : undefined)
      .eq("is_active", true);

    if (filters.categorySlug && filters.categorySlug === "caisse") {
      fallbackQuery = fallbackQuery.eq("available_as_case", true);
    } else if (categoryIds) {
      fallbackQuery = fallbackQuery.in("category_id", categoryIds);
    }
    if (filters.minPrice !== undefined) fallbackQuery = fallbackQuery.gte("price", filters.minPrice);
    if (filters.maxPrice !== undefined) fallbackQuery = fallbackQuery.lte("price", filters.maxPrice);
    if (filters.origin) fallbackQuery = fallbackQuery.eq("origin_country", filters.origin);
    if (filters.search) fallbackQuery = fallbackQuery.ilike("name", `%${filters.search}%`);
    if (filters.featured) fallbackQuery = fallbackQuery.eq("is_featured", true);

    switch (filters.sortBy) {
      case "price_asc":
        fallbackQuery = fallbackQuery.order("price", { ascending: true });
        break;
      case "price_desc":
        fallbackQuery = fallbackQuery.order("price", { ascending: false });
        break;
      case "newest":
        fallbackQuery = fallbackQuery.order("created_at", { ascending: false });
        break;
      case "rating":
        fallbackQuery = fallbackQuery.order("average_rating", { ascending: false });
        break;
      case "popular":
      default:
        fallbackQuery = fallbackQuery.order("review_count", { ascending: false });
        break;
    }

    if (filters.pageSize) {
      const page = Math.max(1, filters.page || 1);
      const from = (page - 1) * filters.pageSize;
      fallbackQuery = fallbackQuery.range(from, from + filters.pageSize - 1);
    } else if (filters.limit) {
      fallbackQuery = fallbackQuery.limit(filters.limit);
    }

    const fallbackResult = await fallbackQuery;
    data = fallbackResult.data as unknown[] | null;
    error = fallbackResult.error;
    count = fallbackResult.count;
  }

  if (
    !error &&
    (!data || data.length === 0) &&
    !filters.categorySlug &&
    !filters.minPrice &&
    !filters.maxPrice &&
    !filters.origin &&
    !filters.search &&
    !filters.featured &&
    !filters.pageSize
  ) {
    const fallbackResult = await supabase
      .from("products")
      .select(PRODUCT_COLUMNS, options.includeCount ? { count: "exact" } : undefined)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(filters.limit ?? 120);
    data = fallbackResult.data as unknown[] | null;
    error = fallbackResult.error;
    count = fallbackResult.count;
  }

  if (error) throw error;

  const seen = new Set<string>();
  const products = ((data || []) as Product[]).filter((p) => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });

  return { products, count: count ?? products.length } satisfies ProductQueryResult;
};

export const useProducts = (filters: ProductFilters = {}) => {
  return useQuery({
    queryKey: ["products", filters],
    enabled: filters.enabled ?? true,
    queryFn: async () => {
      const result = await applyProductFilters(filters);
      return result.products;
    },
  });
};

export const useProductPage = (filters: ProductFilters = {}) => {
  const pageSize = filters.pageSize ?? DEFAULT_CATALOG_PAGE_SIZE;

  return useQuery({
    queryKey: ["products-page", { ...filters, pageSize }],
    enabled: filters.enabled ?? true,
    queryFn: async () => {
      const result = await applyProductFilters({ ...filters, pageSize }, { includeCount: true });
      return {
        products: result.products,
        total: result.count ?? result.products.length,
        page: Math.max(1, filters.page || 1),
        pageSize,
        pageCount: Math.max(1, Math.ceil((result.count ?? result.products.length) / pageSize)),
      };
    },
    placeholderData: (previousData) => previousData,
  });
};

export const useProduct = (slug: string) => {
  return useQuery({
    queryKey: ["product", slug],
    queryFn: async () => {
      const productResult = await supabase
        .from("products")
        .select(SELECT_WITH_CATEGORY)
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();
      let data: unknown = productResult.data;
      let error = productResult.error;

      if (error && /has_role|permission denied|categories/i.test(error.message)) {
        const fallbackResult = await supabase
          .from("products")
          .select(PRODUCT_COLUMNS)
          .eq("slug", slug)
          .eq("is_active", true)
          .maybeSingle();
        data = fallbackResult.data;
        error = fallbackResult.error;
      }

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

      if (error && /has_role|permission denied/i.test(error.message)) {
        console.warn("Categories unavailable because of RLS helper permissions:", error.message);
        return [] as Category[];
      }
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

      const relatedResult = await supabase
        .from("products")
        .select(SELECT_WITH_CATEGORY)
        .eq("category_id", categoryId)
        .eq("is_active", true)
        .neq("id", productId)
        .limit(4);
      let data = relatedResult.data as unknown[] | null;
      let error = relatedResult.error;

      if (error && /has_role|permission denied|categories/i.test(error.message)) {
        const fallbackResult = await supabase
          .from("products")
          .select(PRODUCT_COLUMNS)
          .eq("category_id", categoryId)
          .eq("is_active", true)
          .neq("id", productId)
          .limit(4);
        data = fallbackResult.data as unknown[] | null;
        error = fallbackResult.error;
      }

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
