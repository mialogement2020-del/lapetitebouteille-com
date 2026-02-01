import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Heart, ShoppingCart, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Product } from "@/hooks/useProducts";

interface ProductCardProps {
  product: Product;
  index?: number;
}

const formatPrice = (price: number) => {
  return new Intl.NumberFormat("fr-FR").format(price);
};

export const ProductCard = ({ product, index = 0 }: ProductCardProps) => {
  const discount = product.original_price
    ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
    : 0;

  const isNew =
    new Date(product.created_at) >
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="group relative bg-card rounded-lg border overflow-hidden hover:shadow-elegant transition-all duration-300"
    >
      {/* Image Container */}
      <Link to={`/produit/${product.slug}`} className="block relative aspect-[3/4] overflow-hidden">
        <img
          src={product.image_url || "/placeholder.svg"}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        
        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          {isNew && (
            <Badge className="bg-gold text-black font-semibold">Nouveau</Badge>
          )}
          {discount > 0 && (
            <Badge className="bg-burgundy text-white font-semibold">
              -{discount}%
            </Badge>
          )}
        </div>

        {/* Quick Actions */}
        <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            size="icon"
            variant="secondary"
            className="h-9 w-9 rounded-full bg-white/90 hover:bg-white text-burgundy"
          >
            <Heart className="h-4 w-4" />
          </Button>
        </div>

        {/* Stock Status */}
        {product.stock_quantity <= 0 && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="bg-white text-black px-4 py-2 rounded-full font-semibold text-sm">
              Rupture de stock
            </span>
          </div>
        )}
      </Link>

      {/* Content */}
      <div className="p-4">
        {/* Category */}
        {product.category && (
          <Link
            to={`/catalogue?category=${product.category.slug}`}
            className="text-xs text-gold uppercase tracking-wider hover:underline"
          >
            {product.category.name}
          </Link>
        )}

        {/* Name */}
        <Link to={`/produit/${product.slug}`}>
          <h3 className="font-display text-lg font-semibold mt-1 line-clamp-2 group-hover:text-gold transition-colors">
            {product.name}
          </h3>
        </Link>

        {/* Rating */}
        {product.review_count > 0 && (
          <div className="flex items-center gap-1 mt-2">
            <Star className="h-4 w-4 fill-gold text-gold" />
            <span className="text-sm font-medium">{product.average_rating.toFixed(1)}</span>
            <span className="text-sm text-muted-foreground">
              ({product.review_count} avis)
            </span>
          </div>
        )}

        {/* Price & Cart */}
        <div className="flex items-end justify-between mt-3">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold text-foreground">
                {formatPrice(product.price)}
              </span>
              <span className="text-sm text-muted-foreground">FCFA</span>
            </div>
            {product.original_price && (
              <span className="text-sm text-muted-foreground line-through">
                {formatPrice(product.original_price)} FCFA
              </span>
            )}
          </div>

          <Button
            size="icon"
            className="h-10 w-10 rounded-full bg-gold hover:bg-gold/90 text-black"
            disabled={product.stock_quantity <= 0}
          >
            <ShoppingCart className="h-4 w-4" />
          </Button>
        </div>

        {/* Origin & Volume */}
        <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
          {product.origin_country && <span>{product.origin_country}</span>}
          {product.volume_ml && <span>{product.volume_ml}ml</span>}
          {product.alcohol_percentage && <span>{product.alcohol_percentage}%</span>}
        </div>
      </div>
    </motion.article>
  );
};
