import { motion, useScroll, useTransform } from "framer-motion";
import { Link } from "react-router-dom";
import { Heart, ShoppingCart, Star, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRef } from "react";
import { useProducts } from "@/hooks/useProducts";
import { useFormatPrice } from "@/hooks/useFormatPrice";
import { Skeleton } from "@/components/ui/skeleton";
import { optimizeProductImage } from "@/lib/imageOptimization";
import { useTranslation } from "react-i18next";
import { useFeaturedHomeProducts } from "@/hooks/useFeaturedHomeProducts";

const FeaturedProducts = () => {
  const { t, i18n } = useTranslation();
  const sectionRef = useRef<HTMLElement>(null);
  const formatPrice = useFormatPrice();
  const { data: featuredRows, isLoading: featuredLoading } = useFeaturedHomeProducts({ visibleOnly: true });
  const { data: fallbackProducts, isLoading: fallbackLoading } = useProducts({ featured: true, sortBy: "newest", limit: 4 });
  const isEn = i18n.language?.startsWith("en");
  const useAdminList = (featuredRows?.length ?? 0) > 0;
  const isLoading = useAdminList ? featuredLoading : fallbackLoading;

  const displayProducts = useAdminList
    ? (featuredRows ?? []).slice(0, 8).map(r => ({
        ...r.product,
        name: (isEn ? r.custom_title_en : r.custom_title_fr) || r.product?.name,
        price: r.custom_price ?? r.product?.price,
      }))
    : (fallbackProducts || []);
  
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "center center"]
  });
  
  const opacity = useTransform(scrollYProgress, [0, 0.3], [0, 1]);
  const y = useTransform(scrollYProgress, [0, 0.3], [80, 0]);

  if (!isLoading && displayProducts.length === 0) return null;
  
  return (
    <section ref={sectionRef} className="py-24 lg:py-32 bg-marble relative overflow-hidden">
      <div className="absolute inset-0 opacity-50">
        <div className="absolute inset-0 bg-gradient-to-br from-cream via-cream-dark to-cream" />
      </div>

      <div className="container mx-auto px-4">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-16"
        >
          <div>
            <motion.span 
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="text-primary text-sm uppercase tracking-[0.3em] font-medium mb-4 block"
            >
              {t("featuredSection.eyebrow")}
            </motion.span>
            <motion.h2 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3, duration: 0.7 }}
              className="font-display text-4xl md:text-5xl lg:text-6xl font-semibold text-noir leading-tight"
            >
              {t("featuredSection.titlePart1")} <span className="text-secondary">{t("featuredSection.titleHighlight")}</span>
            </motion.h2>
          </div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4, duration: 0.6 }}
            whileHover={{ x: 10 }}
          >
            <Link 
              to="/catalogue"
              className="inline-flex items-center gap-2 text-secondary font-medium hover:text-secondary/80 transition-colors group"
            >
              {t("featuredSection.viewCollection")}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </motion.div>
        </motion.div>

        {/* Products Grid */}
        <motion.div 
          className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-8"
          style={{ opacity, y }}
        >
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-card rounded-2xl overflow-hidden border border-border/50">
                  <Skeleton className="aspect-[3/4] w-full" />
                  <div className="p-5 space-y-3">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-6 w-1/2" />
                  </div>
                </div>
              ))
            : displayProducts.map((product, index) => {
                const hasDiscount = product.original_price && product.original_price > product.price;
                const inStock = (product.stock_quantity ?? 0) > 0;

                return (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 50, scale: 0.9 }}
                    whileInView={{ opacity: 1, y: 0, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ 
                      duration: 0.6, 
                      delay: index * 0.12,
                      ease: [0.25, 0.46, 0.45, 0.94]
                    }}
                    whileHover={{ y: -8 }}
                    className="group will-change-transform"
                  >
                    <div className="bg-card rounded-2xl overflow-hidden shadow-card hover:shadow-luxury transition-all duration-700 border border-border/50 shine-effect">
                      {/* Image Container */}
                      <div className="relative aspect-[3/4] overflow-hidden bg-gradient-to-b from-cream to-cream-dark">
                        <img
                          src={optimizeProductImage(product.image_url, { width: 420, height: 560 })}
                          alt={product.name}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                          loading={index < 2 ? "eager" : "lazy"}
                          decoding="async"
                          fetchPriority={index < 2 ? "high" : "auto"}
                        />
                        
                        {/* Badges */}
                        <div className="absolute top-4 left-4 flex flex-col gap-2">
                          {hasDiscount && (
                            <span className="px-3 py-1.5 bg-secondary text-secondary-foreground text-xs font-bold rounded-full">
                              -{Math.round((1 - product.price / product.original_price!) * 100)}%
                            </span>
                          )}
                          {!inStock && (
                            <span className="px-3 py-1.5 bg-noir/80 text-cream text-xs font-medium rounded-full backdrop-blur-sm">
                              {t("featuredSection.outOfStockBadge")}
                            </span>
                          )}
                        </div>

                        {/* Quick Actions */}
                        <motion.div 
                          initial={{ opacity: 0, x: 20 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          className="absolute top-4 right-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                        >
                          <motion.button 
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            aria-label="Ajouter aux favoris"
                            type="button"
                            className="w-11 h-11 rounded-full bg-card/95 backdrop-blur-sm flex items-center justify-center text-foreground hover:text-secondary transition-colors shadow-lg"
                          >
                            <Heart className="h-5 w-5" />
                          </motion.button>
                        </motion.div>

                        {/* Add to Cart Overlay */}
                        <motion.div 
                          className="absolute bottom-0 left-0 right-0 p-5 translate-y-full group-hover:translate-y-0 transition-transform duration-300"
                        >
                          <Button
                            className="w-full bg-noir text-cream hover:bg-noir/90 h-12 rounded-xl font-medium"
                            disabled={!inStock}
                          >
                            <ShoppingCart className="h-4 w-4 mr-2" />
                            {inStock ? t("featuredSection.addToCart") : t("featuredSection.unavailable")}
                          </Button>
                        </motion.div>
                      </div>

                      {/* Product Info */}
                      <div className="p-5">
                        {product.average_rating > 0 && (
                          <div className="flex items-center gap-1.5 mb-3">
                            <Star className="h-4 w-4 text-primary fill-primary" />
                            <span className="text-sm font-medium text-foreground">{product.average_rating}</span>
                            {product.review_count > 0 && (
                              <span className="text-xs text-muted-foreground">{t("featuredSection.reviewsCount", { count: product.review_count })}</span>
                            )}
                          </div>
                        )}
                        
                        <p className="text-xs text-primary uppercase tracking-widest mb-2 font-medium">
                          {product.category?.name || ""}
                        </p>
                        
                        <Link to={`/produit/${product.slug}`}>
                          <h3 className="font-display text-xl font-semibold text-foreground hover:text-secondary transition-colors line-clamp-2">
                            {product.name}
                          </h3>
                        </Link>
                        
                        <div className="mt-4 flex items-baseline gap-2">
                          <span className="text-2xl font-semibold text-secondary">
                            {formatPrice(product.price)}
                          </span>
                          {hasDiscount && (
                            <span className="text-sm text-muted-foreground line-through">
                              {formatPrice(product.original_price!)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
        </motion.div>
      </div>
    </section>
  );
};

export default FeaturedProducts;
