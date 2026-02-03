import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Heart,
  Share2,
  Minus,
  Plus,
  Star,
  ChevronRight,
  Truck,
  Shield,
  Gift,
} from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { ProductGallery } from "@/components/product/ProductGallery";
import { ProductDetails } from "@/components/product/ProductDetails";
import { ProductReviews } from "@/components/product/ProductReviews";
import { RelatedProducts } from "@/components/product/RelatedProducts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { useProduct, useRelatedProducts } from "@/hooks/useProducts";
import { toast } from "sonner";

const formatPrice = (price: number) => {
  return new Intl.NumberFormat("fr-FR").format(price);
};

const ProductPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { data: product, isLoading, error } = useProduct(slug || "");
  const { data: relatedProducts = [] } = useRelatedProducts(
    product?.id || "",
    product?.category_id || null
  );
  const [quantity, setQuantity] = useState(1);

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: product?.name,
        text: product?.short_description || "",
        url: window.location.href,
      });
    } else {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Lien copié dans le presse-papier");
    }
  };

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
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-24 pb-12">
        <div className="container mx-auto px-4">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
            <Link to="/" className="hover:text-foreground transition-colors">
              Accueil
            </Link>
            <ChevronRight className="h-4 w-4" />
            <Link to="/catalogue" className="hover:text-foreground transition-colors">
              Catalogue
            </Link>
            {product.category && (
              <>
                <ChevronRight className="h-4 w-4" />
                <Link
                  to={`/catalogue?category=${product.category.slug}`}
                  className="hover:text-foreground transition-colors"
                >
                  {product.category.name}
                </Link>
              </>
            )}
            <ChevronRight className="h-4 w-4" />
            <span className="text-foreground font-medium truncate max-w-[200px]">
              {product.name}
            </span>
          </nav>

          {/* Product Layout */}
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
            {/* Gallery */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
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
              className="space-y-6"
            >
              {/* Category & Badges */}
              <div className="flex items-center gap-3">
                {product.category && (
                  <Link
                    to={`/catalogue?category=${product.category.slug}`}
                    className="text-sm text-gold uppercase tracking-wider hover:underline"
                  >
                    {product.category.name}
                  </Link>
                )}
                {isNew && (
                  <Badge className="bg-gold text-black">Nouveau</Badge>
                )}
                {discount > 0 && (
                  <Badge className="bg-burgundy text-white">-{discount}%</Badge>
                )}
              </div>

              {/* Name */}
              <h1 className="font-display text-3xl md:text-4xl font-bold">
                {product.name}
              </h1>

              {/* Rating */}
              {product.review_count > 0 && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-5 w-5 ${
                          i < Math.round(product.average_rating)
                            ? "fill-gold text-gold"
                            : "text-muted"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="font-medium">
                    {product.average_rating.toFixed(1)}
                  </span>
                  <span className="text-muted-foreground">
                    ({product.review_count} avis)
                  </span>
                </div>
              )}

              {/* Short Description */}
              {product.short_description && (
                <p className="text-lg text-muted-foreground">
                  {product.short_description}
                </p>
              )}

              {/* Price */}
              <div className="flex items-baseline gap-4">
                <span className="text-3xl md:text-4xl font-bold text-foreground">
                  {formatPrice(product.price)} <span className="text-lg">FCFA</span>
                </span>
                {product.original_price && (
                  <span className="text-xl text-muted-foreground line-through">
                    {formatPrice(product.original_price)} FCFA
                  </span>
                )}
              </div>

              {/* Stock Status */}
              <div className="flex items-center gap-2">
                {product.stock_quantity > 0 ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-gold" />
                    <span className="text-gold font-medium">En stock</span>
                    {product.stock_quantity <= 5 && (
                      <span className="text-burgundy text-sm">
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

              {/* Quantity & Add to Cart */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex items-center border rounded-md">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-12 text-center font-semibold">{quantity}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setQuantity(quantity + 1)}
                    disabled={quantity >= product.stock_quantity}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                <AddToCartButton
                  productId={product.id}
                  productName={product.name}
                  quantity={quantity}
                  size="lg"
                  className="flex-1 bg-gold hover:bg-gold/90 text-black font-semibold gap-2"
                  disabled={product.stock_quantity <= 0}
                />
              </div>

              {/* Secondary Actions */}
              <div className="flex gap-4">
                <Button variant="outline" className="gap-2">
                  <Heart className="h-4 w-4" />
                  Favoris
                </Button>
                <Button variant="outline" className="gap-2" onClick={handleShare}>
                  <Share2 className="h-4 w-4" />
                  Partager
                </Button>
              </div>

              {/* Trust Badges */}
              <div className="grid grid-cols-3 gap-4 pt-6 border-t">
                <div className="text-center">
                  <Truck className="h-6 w-6 mx-auto text-gold mb-2" />
                  <p className="text-xs text-muted-foreground">
                    Livraison Yaoundé & Douala
                  </p>
                </div>
                <div className="text-center">
                  <Shield className="h-6 w-6 mx-auto text-gold mb-2" />
                  <p className="text-xs text-muted-foreground">
                    Paiement sécurisé
                  </p>
                </div>
                <div className="text-center">
                  <Gift className="h-6 w-6 mx-auto text-gold mb-2" />
                  <p className="text-xs text-muted-foreground">
                    Parrainez & Gagnez
                  </p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Product Tabs */}
          <div className="mt-12">
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="w-full justify-start border-b rounded-none bg-transparent h-auto p-0">
                <TabsTrigger
                  value="details"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-gold data-[state=active]:bg-transparent px-6 py-3"
                >
                  Détails du produit
                </TabsTrigger>
                <TabsTrigger
                  value="reviews"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-gold data-[state=active]:bg-transparent px-6 py-3"
                >
                  Avis clients ({product.review_count})
                </TabsTrigger>
              </TabsList>
              <TabsContent value="details" className="pt-6">
                <ProductDetails product={product} />
              </TabsContent>
              <TabsContent value="reviews" className="pt-6">
                <ProductReviews
                  productId={product.id}
                  averageRating={product.average_rating}
                  reviewCount={product.review_count}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Related Products */}
        <RelatedProducts products={relatedProducts} />
      </main>

      <Footer />
    </div>
  );
};

export default ProductPage;
