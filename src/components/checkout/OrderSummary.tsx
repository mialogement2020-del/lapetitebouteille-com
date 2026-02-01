import { Link } from "react-router-dom";
import { ShoppingBag, Truck, Tag, ChevronRight } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useCartContext } from "@/contexts/CartContext";

const formatPrice = (price: number) => {
  return new Intl.NumberFormat("fr-FR").format(price);
};

interface OrderSummaryProps {
  promoCode?: string;
  discountAmount?: number;
}

export function OrderSummary({ promoCode, discountAmount = 0 }: OrderSummaryProps) {
  const { items, subtotal, itemCount } = useCartContext();

  const deliveryFee = subtotal >= 50000 ? 0 : 2000;
  const total = subtotal - discountAmount + deliveryFee;

  return (
    <div className="bg-cream/5 rounded-xl border border-gold/20 p-6 sticky top-24">
      <div className="flex items-center gap-3 mb-6">
        <ShoppingBag className="h-5 w-5 text-primary" />
        <h2 className="font-display text-xl text-cream">Récapitulatif</h2>
        <span className="text-sm text-cream/60">({itemCount} articles)</span>
      </div>

      {/* Products List */}
      <div className="space-y-4 max-h-[300px] overflow-y-auto mb-6">
        {items.map((item) => (
          <div key={item.id} className="flex gap-3">
            <img
              src={item.product?.image_url || "/placeholder.svg"}
              alt={item.product?.name}
              className="w-16 h-20 object-cover rounded-lg flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <Link
                to={`/produit/${item.product?.slug}`}
                className="font-medium text-cream text-sm line-clamp-2 hover:text-primary transition-colors"
              >
                {item.product?.name}
              </Link>
              <p className="text-cream/60 text-xs mt-1">Qté: {item.quantity}</p>
              <p className="text-primary font-semibold text-sm mt-1">
                {formatPrice((item.product?.price || 0) * item.quantity)} FCFA
              </p>
            </div>
          </div>
        ))}
      </div>

      <Separator className="bg-gold/20 mb-4" />

      {/* Totals */}
      <div className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-cream/70">Sous-total</span>
          <span className="text-cream">{formatPrice(subtotal)} FCFA</span>
        </div>

        {discountAmount > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-cream/70 flex items-center gap-1">
              <Tag className="h-3 w-3" />
              Réduction {promoCode && `(${promoCode})`}
            </span>
            <span className="text-green-500">-{formatPrice(discountAmount)} FCFA</span>
          </div>
        )}

        <div className="flex justify-between text-sm">
          <span className="text-cream/70 flex items-center gap-1">
            <Truck className="h-3 w-3" />
            Livraison
          </span>
          <span className={deliveryFee === 0 ? "text-primary" : "text-cream"}>
            {deliveryFee === 0 ? "Gratuite" : `${formatPrice(deliveryFee)} FCFA`}
          </span>
        </div>

        {subtotal < 50000 && (
          <p className="text-xs text-primary bg-primary/10 rounded-lg p-2">
            Plus que {formatPrice(50000 - subtotal)} FCFA pour la livraison gratuite !
          </p>
        )}

        <Separator className="bg-gold/20" />

        <div className="flex justify-between items-baseline">
          <span className="text-lg font-semibold text-cream">Total</span>
          <span className="text-2xl font-bold text-primary">
            {formatPrice(total)} FCFA
          </span>
        </div>
      </div>

      {/* Guarantees */}
      <div className="mt-6 space-y-2">
        <div className="flex items-center gap-2 text-xs text-cream/60">
          <ChevronRight className="h-3 w-3 text-primary" />
          <span>Emballage premium anti-casse</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-cream/60">
          <ChevronRight className="h-3 w-3 text-primary" />
          <span>Livraison express 24h</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-cream/60">
          <ChevronRight className="h-3 w-3 text-primary" />
          <span>Paiement 100% sécurisé</span>
        </div>
      </div>
    </div>
  );
}
