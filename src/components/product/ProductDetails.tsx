import { Wine, Thermometer, Utensils, Grape, MapPin, Calendar } from "lucide-react";
import { Product } from "@/hooks/useProducts";

interface ProductDetailsProps {
  product: Product;
}

export const ProductDetails = ({ product }: ProductDetailsProps) => {
  const details = [
    {
      icon: Wine,
      label: "Degré d'alcool",
      value: product.alcohol_percentage ? `${product.alcohol_percentage}%` : null,
    },
    {
      icon: Grape,
      label: "Cépage",
      value: product.grape_variety,
    },
    {
      icon: MapPin,
      label: "Région",
      value: product.region || product.origin_country,
    },
    {
      icon: Calendar,
      label: "Millésime",
      value: product.vintage_year?.toString(),
    },
    {
      icon: Thermometer,
      label: "Température de service",
      value: product.serving_temperature,
    },
  ].filter((d) => d.value);

  return (
    <div className="space-y-8">
      {/* Product Specs */}
      {details.length > 0 && (
        <div className="bg-muted/50 rounded-lg p-6">
          <h3 className="font-display text-lg font-semibold mb-4">
            Caractéristiques
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {details.map((detail, index) => (
              <div key={index} className="flex items-start gap-3">
                <detail.icon className="h-5 w-5 text-gold flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">{detail.label}</p>
                  <p className="font-medium">{detail.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tasting Notes */}
      {product.tasting_notes && (
        <div>
          <h3 className="font-display text-lg font-semibold mb-3 flex items-center gap-2">
            <Wine className="h-5 w-5 text-burgundy" />
            Notes de dégustation
          </h3>
          <p className="text-muted-foreground leading-relaxed">
            {product.tasting_notes}
          </p>
        </div>
      )}

      {/* Food Pairing */}
      {product.food_pairing && (
        <div>
          <h3 className="font-display text-lg font-semibold mb-3 flex items-center gap-2">
            <Utensils className="h-5 w-5 text-gold" />
            Accords mets-vins
          </h3>
          <p className="text-muted-foreground leading-relaxed">
            {product.food_pairing}
          </p>
        </div>
      )}

      {/* Full Description */}
      {product.description && (
        <div>
          <h3 className="font-display text-lg font-semibold mb-3">
            Description
          </h3>
          <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
            {product.description}
          </p>
        </div>
      )}
    </div>
  );
};
