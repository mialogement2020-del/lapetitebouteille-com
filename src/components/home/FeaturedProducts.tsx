import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Heart, ShoppingCart, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

// Mock data - will be replaced with real data from database
const featuredProducts = [
  {
    id: 1,
    name: "Château Margaux 2018",
    category: "Vin Rouge",
    price: 125000,
    originalPrice: 145000,
    image: "https://images.unsplash.com/photo-1586370434639-0fe43b2d32e6?q=80&w=400",
    rating: 4.9,
    isNew: true,
    inStock: true,
  },
  {
    id: 2,
    name: "Dom Pérignon Vintage",
    category: "Champagne",
    price: 185000,
    image: "https://images.unsplash.com/photo-1594372365401-d5551c1c5cd6?q=80&w=400",
    rating: 5.0,
    isNew: false,
    inStock: true,
  },
  {
    id: 3,
    name: "Hennessy XO",
    category: "Cognac",
    price: 95000,
    image: "https://images.unsplash.com/photo-1569529465841-dfecdab7503b?q=80&w=400",
    rating: 4.8,
    isNew: false,
    inStock: true,
  },
  {
    id: 4,
    name: "Moët & Chandon Impérial",
    category: "Champagne",
    price: 45000,
    originalPrice: 52000,
    image: "https://images.unsplash.com/photo-1578911373434-0cb395d2cbfb?q=80&w=400",
    rating: 4.7,
    isNew: true,
    inStock: false,
  },
];

const formatPrice = (price: number) => {
  return new Intl.NumberFormat("fr-CM", {
    style: "decimal",
    minimumFractionDigits: 0,
  }).format(price) + " FCFA";
};

const FeaturedProducts = () => {
  return (
    <section className="py-20 lg:py-28 bg-cream-dark">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-12"
        >
          <div>
            <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-noir mb-4">
              Nos <span className="text-secondary">Nouveautés</span>
            </h2>
            <p className="text-muted-foreground max-w-xl">
              Découvrez les dernières additions à notre collection exclusive
            </p>
          </div>
          <Button
            asChild
            variant="outline"
            className="border-secondary text-secondary hover:bg-secondary hover:text-secondary-foreground self-start md:self-auto"
          >
            <Link to="/catalogue">Voir tout le catalogue</Link>
          </Button>
        </motion.div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredProducts.map((product, index) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group"
            >
              <div className="bg-card rounded-xl overflow-hidden shadow-card hover:shadow-elegant transition-shadow">
                {/* Image Container */}
                <div className="relative aspect-[3/4] overflow-hidden bg-cream">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  
                  {/* Badges */}
                  <div className="absolute top-3 left-3 flex flex-col gap-2">
                    {product.isNew && (
                      <span className="px-3 py-1 bg-primary text-noir text-xs font-bold rounded-full">
                        Nouveau
                      </span>
                    )}
                    {product.originalPrice && (
                      <span className="px-3 py-1 bg-secondary text-secondary-foreground text-xs font-bold rounded-full">
                        Promo
                      </span>
                    )}
                    {!product.inStock && (
                      <span className="px-3 py-1 bg-muted text-muted-foreground text-xs font-medium rounded-full">
                        Rupture
                      </span>
                    )}
                  </div>

                  {/* Quick Actions */}
                  <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="w-10 h-10 rounded-full bg-card/90 backdrop-blur-sm flex items-center justify-center text-foreground hover:text-secondary transition-colors shadow-sm">
                      <Heart className="h-5 w-5" />
                    </button>
                  </div>

                  {/* Add to Cart Overlay */}
                  <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform">
                    <Button
                      className="w-full bg-noir text-cream hover:bg-noir/90"
                      disabled={!product.inStock}
                    >
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      {product.inStock ? "Ajouter au panier" : "Indisponible"}
                    </Button>
                  </div>
                </div>

                {/* Product Info */}
                <div className="p-4">
                  <div className="flex items-center gap-1 mb-2">
                    <Star className="h-4 w-4 text-primary fill-primary" />
                    <span className="text-sm font-medium">{product.rating}</span>
                  </div>
                  
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                    {product.category}
                  </p>
                  
                  <Link to={`/produit/${product.id}`}>
                    <h3 className="font-display text-lg font-semibold text-foreground hover:text-secondary transition-colors line-clamp-2">
                      {product.name}
                    </h3>
                  </Link>
                  
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-lg font-bold text-secondary">
                      {formatPrice(product.price)}
                    </span>
                    {product.originalPrice && (
                      <span className="text-sm text-muted-foreground line-through">
                        {formatPrice(product.originalPrice)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturedProducts;
