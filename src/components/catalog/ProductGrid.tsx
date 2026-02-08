import { motion } from "framer-motion";
import { Package, Wine } from "lucide-react";
import { ProductCard } from "./ProductCard";
import { Product } from "@/hooks/useProducts";
import { Skeleton } from "@/components/ui/skeleton";

interface ProductGridProps {
  products: Product[];
  isLoading: boolean;
}

const ProductSkeleton = () => (
  <div className="bg-cream/[0.03] rounded-2xl border border-cream/10 overflow-hidden">
    <Skeleton className="aspect-[3/4] bg-cream/5" />
    <div className="p-5 space-y-3">
      <Skeleton className="h-3 w-20 bg-cream/10" />
      <Skeleton className="h-5 w-full bg-cream/10" />
      <Skeleton className="h-4 w-24 bg-cream/10" />
      <div className="flex justify-between items-end">
        <div>
          <Skeleton className="h-6 w-28 bg-cream/10" />
          <Skeleton className="h-4 w-20 mt-1 bg-cream/10" />
        </div>
        <Skeleton className="h-11 w-11 rounded-full bg-cream/10" />
      </div>
    </div>
  </div>
);

export const ProductGrid = ({ products, isLoading }: ProductGridProps) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <ProductSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center py-20 text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200 }}
          className="w-20 h-20 rounded-full bg-cream/5 flex items-center justify-center mb-6"
        >
          <Wine className="h-10 w-10 text-cream/30" />
        </motion.div>
        <h3 className="font-display text-2xl font-semibold mb-3 text-cream">
          Aucun produit trouvé
        </h3>
        <p className="text-cream/50 max-w-md">
          Essayez de modifier vos filtres ou d'utiliser d'autres termes de recherche
        </p>
      </motion.div>
    );
  }

  return (
    <div className="grid grid-cols-3 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-6 lg:gap-8">
      {products.map((product, index) => (
        <ProductCard key={product.id} product={product} index={index} />
      ))}
    </div>
  );
};
