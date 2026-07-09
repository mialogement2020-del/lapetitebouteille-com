import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Star } from "lucide-react";
import { useProducts, useCategories } from "@/hooks/useProducts";
import { useFormatPrice } from "@/hooks/useFormatPrice";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useRef, useState } from "react";
import type { SyntheticEvent } from "react";
import { optimizeProductImage } from "@/lib/imageOptimization";
import { useTranslation } from "react-i18next";

const FALLBACK_IMAGE = "/placeholder.svg";

const CategoryRow = ({ categorySlug, categoryName }: { categorySlug: string; categoryName: string }) => {
  const { t } = useTranslation();
  const rowRef = useRef<HTMLDivElement>(null);
  const formatPrice = useFormatPrice();
  const [shouldLoad, setShouldLoad] = useState(false);
  const { data: products, isLoading } = useProducts({ categorySlug, sortBy: "popular", limit: 10, enabled: shouldLoad });
  const displayProducts = products || [];

  useEffect(() => {
    const node = rowRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: "700px 0px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const handleImageError = (event: SyntheticEvent<HTMLImageElement>) => {
    const image = event.currentTarget;
    if (image.src.endsWith(FALLBACK_IMAGE)) return;
    image.src = FALLBACK_IMAGE;
  };

  if (shouldLoad && !isLoading && displayProducts.length === 0) return null;

  return (
    <div ref={rowRef} data-home-category-row className="mb-14 last:mb-0">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="flex items-end justify-between mb-8"
      >
        <h3 className="font-display text-2xl md:text-3xl font-semibold text-foreground">
          {categoryName}
        </h3>
        <Link
          to={`/catalogue/${categorySlug}`}
          className="inline-flex items-center gap-1.5 text-sm text-secondary font-medium hover:text-secondary/80 transition-colors group"
        >
          {t("categoryRow.seeAll")}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </motion.div>

      <div className="-mx-4 overflow-x-auto px-4 pb-4 [scrollbar-width:thin]">
        <div data-home-product-rail className="flex gap-3 sm:gap-5">
          {!shouldLoad || isLoading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="w-[168px] flex-none overflow-hidden rounded-xl border border-border/50 bg-card sm:w-[210px] md:w-[230px]">
                  <Skeleton className="aspect-[3/4] w-full" />
                  <div className="p-3 space-y-2">
                    <Skeleton className="h-3 w-12" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-5 w-1/2" />
                  </div>
                </div>
              ))
            : displayProducts.map((product, index) => {
                const hasDiscount = product.original_price && product.original_price > product.price;
                const inStock = (product.stock_quantity ?? 0) > 0;

                return (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: index * 0.06 }}
                    whileHover={{ y: -5 }}
                    className="group w-[168px] flex-none sm:w-[210px] md:w-[230px]"
                  >
                    <div className="bg-card rounded-xl overflow-hidden shadow-sm hover:shadow-card transition-all duration-500 border border-border/50">
                      <Link to={`/produit/${product.slug}`} className="block">
                        <div className="relative aspect-[3/4] overflow-hidden bg-gradient-to-b from-muted/30 to-muted/60">
                          <img
                            src={optimizeProductImage(product.image_url, { width: 320, height: 426 })}
                            alt={product.name}
                            className="w-full h-full object-contain p-3 transition-transform duration-500 group-hover:scale-105"
                            loading="lazy"
                            decoding="async"
                            onError={handleImageError}
                          />
                          {hasDiscount && (
                            <span className="absolute top-2 left-2 px-2 py-1 bg-secondary text-secondary-foreground text-[10px] font-bold rounded-full">
                              -{Math.round((1 - product.price / product.original_price!) * 100)}%
                            </span>
                          )}
                          {!inStock && (
                            <span className="absolute top-2 right-2 px-2 py-1 bg-noir/80 text-cream text-[10px] font-medium rounded-full backdrop-blur-sm">
                              {t("categoryRow.outOfStockBadge")}
                            </span>
                          )}
                        </div>
                      </Link>

                      <div className="p-3">
                        {product.average_rating > 0 && (
                          <div className="flex items-center gap-1 mb-1">
                            <Star className="h-3 w-3 text-primary fill-primary" />
                            <span className="text-xs font-medium text-foreground">{product.average_rating}</span>
                          </div>
                        )}

                        <Link to={`/produit/${product.slug}`}>
                          <h4 className="text-sm font-medium text-foreground hover:text-secondary transition-colors line-clamp-2 leading-tight mb-2">
                            {product.name}
                          </h4>
                        </Link>

                        <div className="flex items-baseline gap-1.5">
                          <span className="text-base font-semibold text-secondary">
                            {formatPrice(product.price)}
                          </span>
                          {hasDiscount && (
                            <span className="text-[10px] text-muted-foreground line-through">
                              {formatPrice(product.original_price!)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
        </div>
      </div>
    </div>
  );
};

const CategoryProductsSection = () => {
  const { t } = useTranslation();
  const { data: categories, isLoading } = useCategories();

  if (isLoading || !categories || categories.length === 0) return null;
  const homeCategories = categories
    .filter((category) => !category.parent_id)
    .slice(0, 6);

  if (homeCategories.length === 0) return null;

  return (
    <section className="py-16 lg:py-24 bg-background">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="text-center mb-12"
        >
          <span className="text-primary text-sm uppercase tracking-[0.3em] font-medium mb-4 block">
            {t("categoryRow.sectionEyebrow")}
          </span>
          <h2 className="font-display text-4xl md:text-5xl font-semibold text-foreground">
            {t("categoryRow.sectionTitlePart1")} <span className="text-secondary">{t("categoryRow.sectionTitleHighlight")}</span>
          </h2>
        </motion.div>

        {homeCategories.map((cat) => (
          <CategoryRow key={cat.id} categorySlug={cat.slug} categoryName={cat.name} />
        ))}
      </div>
    </section>
  );
};

export default CategoryProductsSection;
