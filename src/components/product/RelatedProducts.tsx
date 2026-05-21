import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Product } from "@/hooks/useProducts";
import { optimizeProductImage } from "@/lib/imageOptimization";

interface RelatedProductsProps {
  products: Product[];
}

const formatPrice = (price: number) => {
  return new Intl.NumberFormat("fr-FR").format(price);
};

export const RelatedProducts = ({ products }: RelatedProductsProps) => {
  if (products.length === 0) return null;

  return (
    <section className="py-12 border-t">
      <div className="container mx-auto px-4">
        <h2 className="font-display text-2xl md:text-3xl font-bold mb-8">
          Vous aimerez aussi
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
          {products.map((product, index) => (
            <motion.article
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="group"
            >
              <Link to={`/produit/${product.slug}`}>
                <div className="aspect-[3/4] rounded-lg overflow-hidden bg-gradient-to-b from-muted/30 to-muted/60 mb-3">
                  <img
                    src={optimizeProductImage(product.image_url, { width: 320, height: 426 })}
                    alt={product.name}
                    className="w-full h-full object-contain p-3 transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <h3 className="font-semibold line-clamp-2 group-hover:text-gold transition-colors">
                  {product.name}
                </h3>
                <p className="text-gold font-bold mt-1">
                  {formatPrice(product.price)} FCFA
                </p>
              </Link>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
};
