import { Wine, Thermometer, Utensils, Grape, MapPin, Calendar } from "lucide-react";
import { Product } from "@/hooks/useProducts";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

interface ProductDetailsProps {
  product: Product;
}

export const ProductDetails = ({ product }: ProductDetailsProps) => {
  const { t } = useTranslation();
  const details = [
    {
      icon: Wine,
      label: t("productDetails.alcohol"),
      value: product.alcohol_percentage ? `${product.alcohol_percentage}%` : null,
    },
    {
      icon: Grape,
      label: t("productDetails.grape"),
      value: product.grape_variety,
    },
    {
      icon: MapPin,
      label: t("productDetails.region"),
      value: product.region || product.origin_country,
    },
    {
      icon: Calendar,
      label: t("productDetails.vintage"),
      value: product.vintage_year?.toString(),
    },
    {
      icon: Thermometer,
      label: t("productDetails.servingTemp"),
      value: product.serving_temperature,
    },
  ].filter((d) => d.value);

  return (
    <div className="space-y-10">
      {/* Product Specs */}
      {details.length > 0 && (
        <motion.div 
          className="glass-premium rounded-2xl p-8 border border-cream/10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h3 className="font-display text-xl font-semibold mb-6 text-cream flex items-center gap-2">
            <span className="w-8 h-px bg-gradient-gold" />
            {t("productDetails.characteristics")}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {details.map((detail, index) => (
              <motion.div 
                key={index} 
                className="flex items-start gap-3 p-4 rounded-xl bg-cream/5 hover:bg-cream/10 transition-colors overflow-hidden"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <detail.icon className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-cream/50 truncate">{detail.label}</p>
                  <p className="font-medium text-cream break-words text-sm">{detail.value}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Tasting Notes */}
      {product.tasting_notes && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="p-6 rounded-2xl border border-secondary/20 bg-secondary/5"
        >
          <h3 className="font-display text-xl font-semibold mb-4 flex items-center gap-3 text-cream">
            <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center">
              <Wine className="h-5 w-5 text-secondary" />
            </div>
            {t("productDetails.tastingNotes")}
          </h3>
          <p className="text-cream/70 leading-relaxed pl-[52px]">
            {product.tasting_notes}
          </p>
        </motion.div>
      )}

      {/* Food Pairing */}
      {product.food_pairing && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="p-6 rounded-2xl border border-primary/20 bg-primary/5"
        >
          <h3 className="font-display text-xl font-semibold mb-4 flex items-center gap-3 text-cream">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Utensils className="h-5 w-5 text-primary" />
            </div>
            {t("productDetails.foodPairing")}
          </h3>
          <p className="text-cream/70 leading-relaxed pl-[52px]">
            {product.food_pairing}
          </p>
        </motion.div>
      )}

      {/* Full Description */}
      {product.description && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <h3 className="font-display text-xl font-semibold mb-4 text-cream flex items-center gap-2">
            <span className="w-8 h-px bg-gradient-gold" />
            {t("productDetails.description")}
          </h3>
          <p className="text-cream/70 leading-relaxed whitespace-pre-line">
            {product.description}
          </p>
        </motion.div>
      )}
    </div>
  );
};
