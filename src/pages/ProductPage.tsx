import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Minus,
  Plus,
  Star,
  ChevronRight,
  Truck,
  Shield,
  Gift,
  Sparkles,
} from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { ProductGallery } from "@/components/product/ProductGallery";
import { ProductDetails } from "@/components/product/ProductDetails";
import { ProductReviews } from "@/components/product/ProductReviews";
import { RelatedProducts } from "@/components/product/RelatedProducts";
import { RecentlyViewed } from "@/components/product/RecentlyViewed";
import { BackInStockAlert } from "@/components/product/BackInStockAlert";
import { ComparatorButton } from "@/components/product/ComparatorButton";
import { ProductShareButton } from "@/components/product/ProductShareButton";
import { ProductQRCode } from "@/components/product/ProductQRCode";
import { WishlistButton } from "@/components/wishlist/WishlistButton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { WholesalePanel } from "@/components/product/WholesalePanel";
import { useProduct, useRelatedProducts } from "@/hooks/useProducts";
import { useProductReferral } from "@/hooks/useProductReferral";
import { useRecentlyViewed } from "@/hooks/useRecentlyViewed";
import { useFormatPrice } from "@/hooks/useFormatPrice";

const ProductPage = () => {
  const formatPrice = useFormatPrice();
  const { slug } = useParams<{ slug: string }>();
  const { data: product, isLoading, error } = useProduct(slug || "");
  const { data: relatedProducts = [] } = useRelatedProducts(
    product?.id || "",
    product?.category_id || null
  );
  const [quantity, setQuantity] = useState(1);
  const { trackView } = useRecentlyViewed();
  
  // Initialize product referral tracking (captures ?ref= from URL)
  useProductReferral();
  
  // Track product view
  useEffect(() => {
    if (product?.id) {
      trackView(product.id);
    }
  }, [product?.id, trackView]);
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-24 pb-12">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
              <Skeleton className="aspect-[3/4] rounded-lg" />
              <div className="space-y-4">
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-10 w-40" />
                <Skeleton className="h-24 w-full" />
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-24 pb-12">
          <div className="container mx-auto px-4 text-center py-20">
            <h1 className="font-display text-3xl font-bold mb-4">
              Produit non trouvé
            </h1>
            <p className="text-muted-foreground mb-8">
              Le produit que vous recherchez n'existe pas ou n'est plus disponible.
            </p>
            <Button asChild>
              <Link to="/catalogue">Retour au catalogue</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const discount = product.original_price
    ? Math.round(
        ((product.original_price - product.price) / product.original_price) * 100
      )
    : 0;

  const isNew =
    new Date(product.created_at) >
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  return (
    <div className="min-h-screen bg-noir">
      <Header />

      <main className="pt-24 pb-12 relative">
        {/* Decorative Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-40 right-10 w-96 h-96 bg-secondary/5 rounded-full blur-3xl" />
        </div>
        
        <div className="container mx-auto px-4 relative z-10">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-cream/60 mb-8">
            <Link to="/" className="hover:text-primary transition-colors">
              Accueil
            </Link>
            <ChevronRight className="h-4 w-4 text-cream/40" />
            <Link to="/catalogue" className="hover:text-primary transition-colors">
              Catalogue
            </Link>
            {product.category && (
              <>
                <ChevronRight className="h-4 w-4 text-cream/40" />
                <Link
                  to={`/catalogue?category=${product.category.slug}`}
                  className="hover:text-primary transition-colors"
                >
                  {product.category.name}
                </Link>
              </>
            )}
            <ChevronRight className="h-4 w-4 text-cream/40" />
            <span className="text-cream font-medium truncate max-w-[200px]">
              {product.name}
            </span>
          </nav>

          {/* Product Layout */}
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-16">
            {/* Gallery */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <ProductGallery
                mainImage={product.image_url}
                galleryImages={product.gallery_urls}
                productName={product.name}
              />
            </motion.div>

            {/* Product Info */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="space-y-6"
            >
              {/* Category & Badges */}
              <div className="flex items-center gap-3 flex-wrap">
                {product.category && (
                  <Link
                    to={`/catalogue?category=${product.category.slug}`}
                    className="text-sm text-primary uppercase tracking-widest hover:underline font-medium"
                  >
                    {product.category.name}
                  </Link>
                )}
                {isNew && (
                  <Badge className="bg-gradient-gold text-noir font-semibold">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Nouveau
                  </Badge>
                )}
                {discount > 0 && (
                  <Badge className="bg-secondary text-cream font-semibold">-{discount}%</Badge>
                )}
              </div>

              {/* Name */}
              <h1 className="font-display text-3xl md:text-5xl font-semibold text-cream leading-tight">
                {product.name}
              </h1>

              {/* Rating */}
              {product.review_count > 0 && (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-5 w-5 ${
                          i < Math.round(product.average_rating)
                            ? "fill-primary text-primary"
                            : "text-cream/20"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="font-medium text-cream">
                    {product.average_rating.toFixed(1)}
                  </span>
                  <span className="text-cream/50">
                    ({product.review_count} avis)
                  </span>
                </div>
              )}

              {/* Short Description */}
              {product.short_description && (
                <p className="text-lg text-cream/70 leading-relaxed">
                  {product.short_description}
                </p>
              )}

              {/* Price */}
              <div className="flex items-baseline gap-4 py-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl md:text-5xl font-bold text-gradient-gold font-display">
                    {formatPrice(product.price)}
                  </span>
                </div>
                {product.original_price && (
                  <span className="text-xl text-cream/40 line-through">
                    {formatPrice(product.original_price)}
                  </span>
                )}
              </div>

              {/* Stock Status */}
              <div className="flex items-center gap-2">
                {product.stock_quantity > 0 ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    <span className="text-primary font-medium">En stock</span>
                    {product.stock_quantity <= 5 && (
                      <span className="text-secondary text-sm">
                        (Plus que {product.stock_quantity} disponibles)
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-destructive" />
                    <span className="text-destructive font-medium">Rupture de stock</span>
                  </>
                )}
              </div>

              {/* Back in Stock Alert (shown only when out of stock) */}
              {product.stock_quantity <= 0 && (
                <BackInStockAlert productId={product.id} productName={product.name} />
              )}

              {/* Quantity & Add to Cart */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex items-center border border-cream/20 rounded-full bg-cream/5">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                    className="text-cream hover:bg-cream/10 rounded-full"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-12 text-center font-semibold text-cream">{quantity}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setQuantity(quantity + 1)}
                    disabled={quantity >= product.stock_quantity}
                    className="text-cream hover:bg-cream/10 rounded-full"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                <AddToCartButton
                  productId={product.id}
                  productName={product.name}
                  quantity={quantity}
                  size="lg"
                  className="flex-1 bg-gradient-gold text-noir font-semibold gap-2 rounded-full hover:opacity-90 shadow-gold shine-effect py-6"
                  disabled={product.stock_quantity <= 0}
                />
              </div>

              {/* Wholesale Panel */}
              <WholesalePanel product={product} />

              {/* Secondary Actions */}
              <div className="flex gap-4 flex-wrap">
                <WishlistButton productId={product.id} variant="full" className="border-primary/40 text-cream bg-cream/5 hover:bg-primary/20 hover:border-primary rounded-full" />
                <ComparatorButton
                  product={{
                    id: product.id,
                    name: product.name,
                    slug: product.slug,
                    price: product.price,
                    original_price: product.original_price,
                    image_url: product.image_url,
                    alcohol_percentage: product.alcohol_percentage,
                    volume_ml: product.volume_ml,
                    origin_country: product.origin_country,
                    region: product.region,
                    grape_variety: product.grape_variety,
                    tasting_notes: product.tasting_notes,
                    average_rating: product.average_rating,
                    review_count: product.review_count,
                  }}
                  variant="full"
                />
                <ProductShareButton 
                  productSlug={product.slug}
                  productName={product.name}
                  shortDescription={product.short_description || undefined}
                />
                <ProductQRCode 
                  productSlug={product.slug}
                  productName={product.name}
                />
              </div>

              {/* Trust Badges */}
              <div className="grid grid-cols-3 gap-4 pt-8 border-t border-cream/10">
                <div className="text-center">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-primary/10 flex items-center justify-center">
                    <Truck className="h-5 w-5 text-primary" />
                  </div>
                  <p className="text-xs text-cream/60">
                    Livraison Yaoundé & Douala
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-primary/10 flex items-center justify-center">
                    <Shield className="h-5 w-5 text-primary" />
                  </div>
                  <p className="text-xs text-cream/60">
                    Paiement sécurisé
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-primary/10 flex items-center justify-center">
                    <Gift className="h-5 w-5 text-primary" />
                  </div>
                  <p className="text-xs text-cream/60">
                    Parrainez & Gagnez
                  </p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Product Tabs */}
          <motion.div 
            className="mt-16"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="w-full justify-start border-b border-cream/10 rounded-none bg-transparent h-auto p-0">
                <TabsTrigger
                  value="details"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary text-cream/60 px-6 py-4 font-medium"
                >
                  Détails du produit
                </TabsTrigger>
                <TabsTrigger
                  value="reviews"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary text-cream/60 px-6 py-4 font-medium"
                >
                  Avis clients ({product.review_count})
                </TabsTrigger>
              </TabsList>
              <TabsContent value="details" className="pt-8">
                <ProductDetails product={product} />
              </TabsContent>
              <TabsContent value="reviews" className="pt-8">
                <ProductReviews
                  productId={product.id}
                  averageRating={product.average_rating}
                  reviewCount={product.review_count}
                />
              </TabsContent>
            </Tabs>
          </motion.div>
        </div>

        {/* Related Products */}
        <RelatedProducts products={relatedProducts} />
        
        {/* Recently Viewed Products */}
        <RecentlyViewed currentProductId={product.id} />
      </main>

      <Footer />
    </div>
  );
};

export default ProductPage;
