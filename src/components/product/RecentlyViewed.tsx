import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Clock, X } from "lucide-react";
import { useRecentlyViewed } from "@/hooks/useRecentlyViewed";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";

interface RecentlyViewedProps {
  currentProductId?: string;
}

export function RecentlyViewed({ currentProductId }: RecentlyViewedProps) {
  const { recentlyViewed, isLoading, clearHistory } = useRecentlyViewed();

  // Filter out current product and check if we have items to display
  const filteredProducts = recentlyViewed.filter(
    (item) => item.product_id !== currentProductId
  );

  if (isLoading || filteredProducts.length === 0) return null;

  return (
    <section className="py-12">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Clock className="h-5 w-5 text-primary" />
          <h2 className="font-display text-2xl text-cream">Vus récemment</h2>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => clearHistory()}
          className="text-cream/60 hover:text-cream"
        >
          <X className="h-4 w-4 mr-1" />
          Effacer
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {filteredProducts.slice(0, 6).map((item, index) => (
          <motion.div
            key={item.product_id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Link
              to={`/produit/${item.product?.slug || item.product_id}`}
              className="group block"
            >
              <div className="aspect-square rounded-lg overflow-hidden bg-noir-light/50 mb-2 border border-gold/10 group-hover:border-gold/30 transition-colors">
                {item.product?.image_url ? (
                  <img
                    src={item.product.image_url}
                    alt={item.product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-cream/30">
                    <Clock className="h-8 w-8" />
                  </div>
                )}
              </div>
              <h3 className="text-sm text-cream font-medium line-clamp-2 group-hover:text-primary transition-colors">
                {item.product?.name || "Produit"}
              </h3>
              <p className="text-primary font-semibold text-sm mt-1">
                {item.product?.price ? formatPrice(item.product.price) : ""}
              </p>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
