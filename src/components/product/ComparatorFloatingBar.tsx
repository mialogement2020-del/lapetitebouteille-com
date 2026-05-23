import { forwardRef } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Scale, X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProductComparator } from "@/hooks/useProductComparator";
import { useTranslation } from "react-i18next";

export const ComparatorFloatingBar = forwardRef<HTMLDivElement>(function ComparatorFloatingBar(_, ref) {
  const { t } = useTranslation();
  const { products, removeProduct, clearAll } = useProductComparator();

  if (products.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-2xl"
      >
        <div className="bg-noir-light/95 backdrop-blur-lg border border-gold/20 rounded-2xl shadow-xl p-4">
          <div className="flex items-center justify-between gap-4">
            {/* Products preview */}
            <div className="flex items-center gap-3 flex-1 overflow-x-auto">
              <div className="flex items-center gap-2 shrink-0">
                <Scale className="h-5 w-5 text-primary" />
                <span className="text-cream font-medium text-sm">
                  {products.length}/3
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                {products.map((product) => (
                  <div
                    key={product.id}
                    className="relative group shrink-0"
                  >
                    <div className="w-12 h-12 rounded-lg overflow-hidden border border-gold/20 bg-noir">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-cream/30">
                          <Scale className="h-5 w-5" />
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => removeProduct(product.id)}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-destructive rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3 text-white" />
                    </button>
                  </div>
                ))}

                {/* Empty slots */}
                {Array.from({ length: 3 - products.length }).map((_, i) => (
                  <div
                    key={`empty-${i}`}
                    className="w-12 h-12 rounded-lg border-2 border-dashed border-gold/20 flex items-center justify-center shrink-0"
                  >
                    <span className="text-cream/30 text-xs">+</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAll}
                className="text-cream/60 hover:text-cream"
              >
                {t("comparator.clear")}
              </Button>
              <Button
                asChild
                size="sm"
                disabled={products.length < 2}
                className="bg-primary hover:bg-primary/90 text-noir"
              >
                <Link to="/comparer">
                  {t("comparator.compare")}
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
});

ComparatorFloatingBar.displayName = "ComparatorFloatingBar";
