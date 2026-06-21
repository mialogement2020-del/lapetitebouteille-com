import { Link } from "react-router-dom";
import { ShoppingBag, Truck, ChevronRight, Gift } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useCartContext } from "@/contexts/CartContext";
import { UnifiedCodeInput, AppliedCode } from "./UnifiedCodeInput";
import { GiftPackagingSelect } from "./GiftPackagingSelect";
import { useFormatPrice } from "@/hooks/useFormatPrice";
import { useTranslation } from "react-i18next";

interface GiftPackagingOption {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  display_order: number | null;
}

interface OrderSummaryProps {
  appliedCode?: AppliedCode | null;
  onCodeApply?: (code: AppliedCode) => void;
  onCodeRemove?: () => void;
  giftPackaging?: GiftPackagingOption | null;
  giftMessage?: string;
  onGiftPackagingChange?: (option: GiftPackagingOption | null) => void;
  onGiftMessageChange?: (message: string) => void;
}

export function OrderSummary({ 
  appliedCode = null,
  onCodeApply,
  onCodeRemove,
  giftPackaging = null,
  giftMessage = "",
  onGiftPackagingChange,
  onGiftMessageChange,
}: OrderSummaryProps) {
  const { t } = useTranslation();
  const formatPrice = useFormatPrice();
  const { items, subtotal, itemCount } = useCartContext();

  // Calculate discount only if it's a promo code
  const discountAmount = appliedCode?.type === "promo" 
    ? appliedCode.data.discountAmount 
    : 0;
  const giftPackagingPrice = giftPackaging?.price || 0;
  const deliveryFee = subtotal >= 50000 ? 0 : 2000;
  const total = subtotal - discountAmount + giftPackagingPrice + deliveryFee;

  return (
    <div className="bg-cream/5 rounded-xl border border-gold/20 p-6 sticky top-24">
      <div className="flex items-center gap-3 mb-6">
        <ShoppingBag className="h-5 w-5 text-primary" />
        <h2 className="font-display text-xl text-cream">{t("orderSummary.title")}</h2>
        <span className="text-sm text-cream/60">{t("orderSummary.itemsCount", { count: itemCount })}</span>
      </div>

      {/* Products List */}
      <div className="space-y-4 max-h-[200px] overflow-y-auto mb-6">
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
              <p className="text-cream/60 text-xs mt-1">{t("orderSummary.qty", { n: item.quantity })}</p>
              <p className="text-primary font-semibold text-sm mt-1">
                {formatPrice((item.product?.price || 0) * item.quantity)}
              </p>
            </div>
          </div>
        ))}
      </div>

      <Separator className="bg-gold/20 mb-4" />

      {/* Gift Packaging */}
      {onGiftPackagingChange && onGiftMessageChange && (
        <div className="mb-4">
          <GiftPackagingSelect
            selectedId={giftPackaging?.id || null}
            giftMessage={giftMessage}
            onSelect={onGiftPackagingChange}
            onMessageChange={onGiftMessageChange}
          />
        </div>
      )}

      {/* Unified Code Input (Promo or Referral) */}
      {onCodeApply && onCodeRemove && (
        <div className="mb-4">
          <UnifiedCodeInput
            subtotal={subtotal}
            appliedCode={appliedCode}
            onApply={onCodeApply}
            onRemove={onCodeRemove}
          />
        </div>
      )}

      {/* Totals */}
      <div className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-cream/70">{t("orderSummary.subtotal")}</span>
          <span className="text-cream">{formatPrice(subtotal)}</span>
        </div>

        {giftPackagingPrice > 0 && giftPackaging && (
          <div className="flex justify-between text-sm">
            <span className="text-cream/70 flex items-center gap-1">
              <Gift className="h-3 w-3" />
              {giftPackaging.name}
            </span>
            <span className="text-cream">+{formatPrice(giftPackagingPrice)}</span>
          </div>
        )}

        {discountAmount > 0 && appliedCode?.type === "promo" && (
          <div className="flex justify-between text-sm">
            <span className="text-cream/70 flex items-center gap-1">
              {t("orderSummary.reduction", { code: appliedCode.data.code })}
            </span>
            <span className="text-green-500">-{formatPrice(discountAmount)}</span>
          </div>
        )}

        <div className="flex justify-between text-sm">
          <span className="text-cream/70 flex items-center gap-1">
            <Truck className="h-3 w-3" />
            {t("orderSummary.delivery")}
          </span>
          <span className={deliveryFee === 0 ? "text-primary" : "text-cream"}>
            {deliveryFee === 0 ? t("orderSummary.free") : formatPrice(deliveryFee)}
          </span>
        </div>

        {subtotal < 50000 && (
          <p className="text-xs text-primary bg-primary/10 rounded-lg p-2">
            {t("orderSummary.freeHint", { amount: formatPrice(50000 - subtotal) })}
          </p>
        )}

        <Separator className="bg-gold/20" />

        <div className="flex justify-between items-baseline">
          <span className="text-lg font-semibold text-cream">{t("orderSummary.total")}</span>
          <span className="text-2xl font-bold text-primary">
            {formatPrice(total)}
          </span>
        </div>
      </div>

      {/* Guarantees */}
      <div className="mt-6 space-y-2">
        <div className="flex items-center gap-2 text-xs text-cream/60">
          <ChevronRight className="h-3 w-3 text-primary" />
          <span>{t("orderSummary.guarantee1")}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-cream/60">
          <ChevronRight className="h-3 w-3 text-primary" />
          <span>{t("orderSummary.guarantee2")}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-cream/60">
          <ChevronRight className="h-3 w-3 text-primary" />
          <span>{t("orderSummary.guarantee3")}</span>
        </div>
      </div>
    </div>
  );
}
