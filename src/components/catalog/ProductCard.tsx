import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Star, Sparkles, Share2, Check } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { WishlistButton } from "@/components/wishlist/WishlistButton";
import { Product } from "@/hooks/useProducts";
import { toast } from "sonner";

interface ProductCardProps {
  product: Product;
  index?: number;
}

const formatPrice = (price: number) => {
  return new Intl.NumberFormat("fr-FR").format(price);
};

export const ProductCard = ({ product, index = 0 }: ProductCardProps) => {
  const [copied, setCopied] = useState(false);
  
  const discount = product.original_price
    ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
    : 0;

  const isNew =
    new Date(product.created_at) >
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const handleShare = async () => {
    const url = `${window.location.origin}/produit/${product.slug}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: product.name,
          text: product.short_description || `Découvrez ${product.name}`,
          url: url,
        });
      } catch (error) {
        // User cancelled or error
        if ((error as Error).name !== 'AbortError') {
          copyToClipboard(url);
        }
      }
    } else {
      copyToClipboard(url);
    }
  };

  const copyToClipboard = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Lien copié !");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Impossible de copier le lien");
    }
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -5 }}
      className="group relative bg-cream/[0.03] rounded-2xl border border-cream/10 overflow-hidden hover:border-primary/30 hover:shadow-luxury transition-all duration-500 flex flex-col"
    >
      {/* Image Container */}
      <Link to={`/produit/${product.slug}`} className="block relative aspect-[3/4] overflow-hidden bg-gradient-to-b from-noir to-noir/80">
        <img
          src={product.image_url || "/placeholder.svg"}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        
        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          {isNew && (
            <Badge className="bg-gradient-gold text-noir font-semibold shadow-gold">
              <Sparkles className="h-3 w-3 mr-1" />
              Nouveau
            </Badge>
          )}
          {discount > 0 && (
            <Badge className="bg-secondary text-cream font-semibold">
              -{discount}%
            </Badge>
          )}
        </div>

        {/* Stock Status */}
        {product.stock_quantity <= 0 && (
          <div className="absolute inset-0 bg-noir/70 backdrop-blur-sm flex items-center justify-center">
            <span className="bg-cream text-noir px-4 py-2 rounded-full font-semibold text-sm">
              Rupture de stock
            </span>
          </div>
        )}
        
        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-noir/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      </Link>

      {/* Content */}
      <div className="p-5 flex flex-col flex-1">
        {/* Category */}
        {product.category && (
          <Link
            to={`/catalogue?category=${product.category.slug}`}
            className="text-xs text-primary uppercase tracking-widest hover:underline font-medium"
          >
            {product.category.name}
          </Link>
        )}

        {/* Name */}
        <Link to={`/produit/${product.slug}`}>
          <h3 className="font-display text-lg font-semibold mt-2 line-clamp-2 text-cream group-hover:text-primary transition-colors">
            {product.name}
          </h3>
        </Link>

        {/* Rating */}
        {product.review_count > 0 && (
          <div className="flex items-center gap-1 mt-2">
            <Star className="h-4 w-4 fill-primary text-primary" />
            <span className="text-sm font-medium text-cream">{product.average_rating.toFixed(1)}</span>
            <span className="text-sm text-cream/50">
              ({product.review_count} avis)
            </span>
          </div>
        )}

        {/* Price & Cart */}
        <div className="flex items-end justify-between mt-4">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold text-gradient-gold font-display">
                {formatPrice(product.price)}
              </span>
              <span className="text-xs text-cream/50">FCFA</span>
            </div>
            {product.original_price && (
              <span className="text-sm text-cream/40 line-through">
                {formatPrice(product.original_price)} FCFA
              </span>
            )}
          </div>

          <AddToCartButton
            productId={product.id}
            productName={product.name}
            iconOnly
            className="h-11 w-11 rounded-full bg-gradient-gold hover:opacity-90 text-noir shadow-gold shine-effect"
            disabled={product.stock_quantity <= 0}
          />
        </div>

        {/* Origin & Volume */}
        <div className="flex items-center gap-3 mt-4 text-xs text-cream/40">
          {product.origin_country && <span>{product.origin_country}</span>}
          {product.volume_ml && <span>{product.volume_ml}ml</span>}
          {product.alcohol_percentage && <span>{product.alcohol_percentage}%</span>}
        </div>

        {/* Action Buttons - Always visible at bottom */}
        <div className="flex items-center gap-2 mt-auto pt-4 border-t border-cream/10">
          <WishlistButton 
            productId={product.id} 
            className="flex-1 h-9 border-primary/40 text-cream bg-cream/5 hover:bg-primary/20 hover:border-primary rounded-full text-xs"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={handleShare}
            className="flex-1 h-9 gap-1.5 border-primary/40 text-cream bg-cream/5 hover:bg-primary/20 hover:border-primary rounded-full text-xs"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Share2 className="h-3.5 w-3.5" />}
            {copied ? "Copié" : "Partager"}
          </Button>
        </div>
      </div>
    </motion.article>
  );
};
