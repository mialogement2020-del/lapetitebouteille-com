import { motion } from "framer-motion";
import { Package } from "lucide-react";
import { ProductCard } from "./ProductCard";
import { Product } from "@/hooks/useProducts";
import { Skeleton } from "@/components/ui/skeleton";

interface ProductGridProps {
  products: Product[];
  isLoading: boolean;
}

const ProductSkeleton = () => (
  <div className="bg-card rounded-lg border overflow-hidden">
    <Skeleton className="aspect-[3/4]" />
    <div className="p-4 space-y-3">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-5 w-full" />
      <Skeleton className="h-4 w-24" />
      <div className="flex justify-between items-end">
        <div>
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-4 w-20 mt-1" />
        </div>
        <Skeleton className="h-10 w-10 rounded-full" />
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
        className="flex flex-col items-center justify-center py-16 text-center"
      >
        <Package className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="font-display text-xl font-semibold mb-2">
          Aucun produit trouvé
        </h3>
        <p className="text-muted-foreground max-w-md">
          Essayez de modifier vos filtres ou d'utiliser d'autres termes de recherche
        </p>
      </motion.div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {products.map((product, index) => (
        <ProductCard key={product.id} product={product} index={index} />
      ))}
    </div>
  );
};
