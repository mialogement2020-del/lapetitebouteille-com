import { motion, useScroll, useTransform } from "framer-motion";
import { Link } from "react-router-dom";
import { Heart, ShoppingCart, Star, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRef } from "react";

// Mock data - will be replaced with real data from database
const featuredProducts = [
  {
    id: 1,
    name: "Château Margaux 2018",
    category: "Vin Rouge",
    price: 125000,
    originalPrice: 145000,
    image: "https://images.unsplash.com/photo-1586370434639-0fe43b2d32d6?q=80&w=600",
    rating: 4.9,
    isNew: true,
    inStock: true,
  },
  {
    id: 2,
    name: "Dom Pérignon Vintage",
    category: "Champagne",
    price: 185000,
    image: "https://images.unsplash.com/photo-1592483648228-b35146a4330c?q=80&w=600",
    rating: 5.0,
    isNew: false,
    inStock: true,
  },
  {
    id: 3,
    name: "Hennessy XO",
    category: "Cognac",
    price: 95000,
    image: "https://images.unsplash.com/photo-1569529465841-dfecdab7503b?q=80&w=600",
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
    image: "https://images.unsplash.com/photo-1594372365401-3b5ff14eaaed?q=80&w=600",
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
  const sectionRef = useRef<HTMLElement>(null);
  
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "center center"]
  });
  
  const opacity = useTransform(scrollYProgress, [0, 0.3], [0, 1]);
  const y = useTransform(scrollYProgress, [0, 0.3], [80, 0]);
  
  return (
    <section ref={sectionRef} className="py-24 lg:py-32 bg-marble relative overflow-hidden">
      {/* Subtle marble texture overlay */}
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
              Sélection Premium
            </motion.span>
            <motion.h2 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3, duration: 0.7 }}
              className="font-display text-4xl md:text-5xl lg:text-6xl font-semibold text-noir leading-tight"
            >
              Nos <span className="text-secondary">Nouveautés</span>
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
              Voir la collection
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </motion.div>
        </motion.div>

        {/* Products Grid */}
        <motion.div 
          className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-8"
          style={{ opacity, y }}
        >
          {featuredProducts.map((product, index) => (
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
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  
                  {/* Badges */}
                  <div className="absolute top-4 left-4 flex flex-col gap-2">
                    {product.isNew && (
                      <motion.span 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="px-3 py-1.5 bg-primary text-noir text-xs font-bold rounded-full shadow-gold"
                      >
                        Nouveau
                      </motion.span>
                    )}
                    {product.originalPrice && (
                      <span className="px-3 py-1.5 bg-secondary text-secondary-foreground text-xs font-bold rounded-full">
                        -{Math.round((1 - product.price / product.originalPrice) * 100)}%
                      </span>
                    )}
                    {!product.inStock && (
                      <span className="px-3 py-1.5 bg-noir/80 text-cream text-xs font-medium rounded-full backdrop-blur-sm">
                        Rupture
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
                      disabled={!product.inStock}
                    >
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      {product.inStock ? "Ajouter au panier" : "Indisponible"}
                    </Button>
                  </motion.div>
                </div>

                {/* Product Info */}
                <div className="p-5">
                  <div className="flex items-center gap-1.5 mb-3">
                    <Star className="h-4 w-4 text-primary fill-primary" />
                    <span className="text-sm font-medium text-foreground">{product.rating}</span>
                    <span className="text-xs text-muted-foreground">(50+ avis)</span>
                  </div>
                  
                  <p className="text-xs text-primary uppercase tracking-widest mb-2 font-medium">
                    {product.category}
                  </p>
                  
                  <Link to={`/produit/${product.id}`}>
                    <h3 className="font-display text-xl font-semibold text-foreground hover:text-secondary transition-colors line-clamp-2">
                      {product.name}
                    </h3>
                  </Link>
                  
                  <div className="mt-4 flex items-baseline gap-2">
                    <span className="text-2xl font-semibold text-secondary">
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
        </motion.div>
      </div>
    </section>
  );
};

export default FeaturedProducts;
