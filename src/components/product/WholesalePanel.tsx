import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Package, ChevronDown, ChevronUp, Check, ShoppingCart, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Product } from "@/hooks/useProducts";
import { useActiveProductPackagingOptions } from "@/hooks/useProductPackagingOptions";
import { useWholesaleTierConfig } from "@/hooks/useWholesaleTierConfig";
import { useCartContext } from "@/contexts/CartContext";
import { toast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import {
  calculatePackagingDiscount,
  calculatePackagingLineTotal,
  getPackagingIcon,
  type ProductPackagingOption,
} from "@/lib/packagingPricing";

interface WholesalePanelProps {
  product: Product;
}

const formatPrice = (price: number) => new Intl.NumberFormat("fr-FR").format(price);

export function WholesalePanel({ product }: WholesalePanelProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const { data: tierConfig } = useWholesaleTierConfig();
  const { data: options = [] } = useActiveProductPackagingOptions(product.id);
  const { addItem } = useCartContext();

  const activeOptions = useMemo(
    () => options.filter((option) => option.is_active && option.total_price > 0 && option.bottle_quantity > 0),
    [options],
  );
  const selectedOption = activeOptions.find((option) => option.id === selectedOptionId) || null;
  const maxVisibleDiscount = Math.max(
    0,
    ...activeOptions
      .filter((option) => option.show_discount)
      .map((option) => calculatePackagingDiscount(option, 999)),
  );

  if (tierConfig && tierConfig.enabled === false) return null;
  if (activeOptions.length === 0) return null;

  const handleAddToCart = async (option: ProductPackagingOption) => {
    try {
      await addItem(product.id, option.bottle_quantity, { packagingOptionId: option.id });
      toast({
        title: t("wholesale.addedTitle"),
        description: t("wholesale.addedDesc", { label: option.packaging_label, name: product.name }),
      });
    } catch {
      toast({
        title: t("wholesale.errorTitle"),
        description: t("wholesale.errorDesc"),
        variant: "destructive",
      });
    }
  };

  return (
    <div className="mt-4">
      <Button
        onClick={() => setIsOpen(!isOpen)}
        variant="outline"
        className="w-full justify-between border-[#2c3e50] bg-[#2c3e50]/10 text-cream hover:bg-[#2c3e50]/20 hover:border-[#2c3e50] h-12 rounded-full font-semibold"
      >
        <span className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          {t("wholesale.cta")}
        </span>
        {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </Button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="mt-4 p-5 rounded-2xl border border-cream/10 bg-cream/5 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="h-5 w-5 text-primary" />
                <h3 className="font-display text-lg font-semibold text-cream">
                  {t("wholesale.proTitle")}
                </h3>
                {maxVisibleDiscount > 0 && (
                  <Badge className="bg-primary/20 text-primary border-0 text-xs">
                    {t("product.wholesaleDiscount", { percent: maxVisibleDiscount })}
                  </Badge>
                )}
              </div>

              <div className="space-y-3">
                {activeOptions.map((option) => {
                  const selected = selectedOptionId === option.id;
                  return (
                    <motion.div
                      key={option.id}
                      className={`relative p-4 rounded-xl border cursor-pointer transition-all ${
                        selected
                          ? "border-primary bg-primary/10"
                          : "border-cream/10 bg-cream/5 hover:border-cream/20"
                      }`}
                      onClick={() => setSelectedOptionId(option.id)}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                              selected ? "border-primary bg-primary" : "border-cream/30"
                            }`}
                          >
                            {selected && <Check className="h-3.5 w-3.5 text-noir" />}
                          </div>
                          <div>
                            <p className="font-medium text-cream text-sm">
                              {getPackagingIcon(option.packaging_type)} {option.packaging_label}
                            </p>
                            <p className="text-xs text-cream/50">
                              {option.bottle_quantity} {t("wholesale.bottles")} x{" "}
                              {formatPrice(Math.round(option.total_price / option.bottle_quantity))} FCFA
                            </p>
                            {option.stock_quantity !== null && (
                              <p className="text-[11px] text-cream/40">
                                Stock indicatif: {option.stock_quantity}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-cream">{formatPrice(option.total_price)} FCFA</p>
                          {option.show_discount && (option.calculated_savings || 0) > 0 && (
                            <p className="text-xs font-semibold text-green-400">
                              {t("wholesale.savings", {
                                amount: formatPrice(option.calculated_savings || 0),
                                percent: calculatePackagingDiscount(option, 1),
                              })}
                            </p>
                          )}
                        </div>
                      </div>

                      {option.show_discount && option.discount_tiers && option.discount_tiers.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-cream/60">
                          {option.discount_tiers.map((tier) => {
                            const line = calculatePackagingLineTotal(option, tier.min_quantity);
                            return (
                              <span
                                key={`${option.id}-${tier.min_quantity}-${tier.discount_percent}`}
                                className="rounded-full bg-cream/5 border border-cream/10 px-2 py-1"
                              >
                                -{tier.discount_percent}% des {tier.min_quantity} lots:{" "}
                                {formatPrice(line.total)} FCFA
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>

              <Button
                onClick={() => selectedOption && handleAddToCart(selectedOption)}
                disabled={!selectedOption || product.stock_quantity < (selectedOption?.bottle_quantity || 1)}
                className="w-full bg-gradient-gold text-noir font-semibold gap-2 rounded-full h-11"
              >
                <ShoppingCart className="h-4 w-4" />
                {t("wholesale.addToCart")}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
