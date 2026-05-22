import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Heart, ShoppingCart, Trash2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useWishlist } from "@/hooks/useWishlist";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { useTranslation } from "react-i18next";
import { useFormatPrice } from "@/hooks/useFormatPrice";

export const MyWishlist = () => {
  const { t } = useTranslation();
  const formatPrice = useFormatPrice();
  const { wishlistItems, isLoading, removeFromWishlist } = useWishlist();

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  if (wishlistItems.length === 0) {
    return (
      <div className="text-center py-12">
        <Heart className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-semibold mb-2">{t("wishlist.emptyTitle")}</h3>
        <p className="text-muted-foreground mb-6">
          {t("wishlist.emptyDesc")}
        </p>
        <Button asChild>
          <Link to="/catalogue">{t("wishlist.discover")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          {t("wishlist.count", { count: wishlistItems.length })}
        </h3>
      </div>

      <div className="grid gap-4">
        {wishlistItems.map((item, index) => {
          const product = item.product;
          if (!product) return null;

          const discount = product.original_price
            ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
            : 0;

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex gap-4 p-4 bg-card rounded-lg border"
            >
              {/* Product Image */}
              <Link
                to={`/produit/${product.slug}`}
                className="shrink-0 w-24 h-24 rounded-md overflow-hidden bg-muted"
              >
                <img
                  src={product.image_url || "/placeholder.svg"}
                  alt={product.name}
                  className="w-full h-full object-cover hover:scale-105 transition-transform"
                />
              </Link>

              {/* Product Info */}
              <div className="flex-1 min-w-0">
                <Link to={`/produit/${product.slug}`}>
                  <h4 className="font-semibold text-foreground hover:text-gold transition-colors line-clamp-1">
                    {product.name}
                  </h4>
                </Link>

                {product.category && (
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mt-1">
                    {product.category.name}
                  </p>
                )}

                {/* Rating */}
                {product.review_count > 0 && (
                  <div className="flex items-center gap-1 mt-1">
                    <Star className="h-3 w-3 fill-gold text-gold" />
                    <span className="text-xs text-muted-foreground">
                      {product.average_rating.toFixed(1)} ({product.review_count})
                    </span>
                  </div>
                )}

                {/* Price */}
                <div className="flex items-center gap-2 mt-2">
                  <span className="font-bold text-foreground">
                    {formatPrice(product.price)}
                  </span>
                  {discount > 0 && (
                    <>
                      <span className="text-sm text-muted-foreground line-through">
                        {formatPrice(product.original_price!)}
                      </span>
                      <span className="text-xs bg-burgundy text-white px-2 py-0.5 rounded">
                        -{discount}%
                      </span>
                    </>
                  )}
                </div>

                {/* Stock Status */}
                {product.stock_quantity <= 0 && (
                  <p className="text-sm text-destructive mt-1">{t("wishlist.outOfStock")}</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2 shrink-0">
                <AddToCartButton
                  productId={product.id}
                  productName={product.name}
                  iconOnly
                  disabled={product.stock_quantity <= 0}
                  className="h-9 w-9 rounded-full bg-gold hover:bg-gold/90 text-black"
                />
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => removeFromWishlist.mutate(product.id)}
                  className="h-9 w-9 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
