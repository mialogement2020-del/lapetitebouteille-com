import { create } from "zustand";
import { persist } from "zustand/middleware";

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  original_price?: number | null;
  image_url?: string | null;
  alcohol_percentage?: number | null;
  volume_ml?: number | null;
  origin_country?: string | null;
  region?: string | null;
  grape_variety?: string | null;
  tasting_notes?: string | null;
  average_rating?: number | null;
  review_count?: number | null;
}

interface ComparatorState {
  products: Product[];
  addProduct: (product: Product) => boolean;
  removeProduct: (productId: string) => void;
  clearAll: () => void;
  isInComparator: (productId: string) => boolean;
}

const MAX_PRODUCTS = 3;

export const useProductComparator = create<ComparatorState>()(
  persist(
    (set, get) => ({
      products: [],
      
      addProduct: (product) => {
        const { products } = get();
        if (products.length >= MAX_PRODUCTS) {
          return false;
        }
        if (products.some((p) => p.id === product.id)) {
          return true; // Already added
        }
        set({ products: [...products, product] });
        return true;
      },
      
      removeProduct: (productId) => {
        set({ products: get().products.filter((p) => p.id !== productId) });
      },
      
      clearAll: () => {
        set({ products: [] });
      },
      
      isInComparator: (productId) => {
        return get().products.some((p) => p.id === productId);
      },
    }),
    {
      name: "product-comparator",
    }
  )
);
