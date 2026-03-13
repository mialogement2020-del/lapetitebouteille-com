import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Package, ChevronDown, ChevronUp, Check, FileText, ShoppingCart, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Product } from "@/hooks/useProducts";
import { useWholesalePricing, calculateWholesalePrices, WholesaleTierPrice, PackagingType } from "@/hooks/useWholesale";
import { useWholesaleTierConfig } from "@/hooks/useWholesaleTierConfig";
import { useCartContext } from "@/contexts/CartContext";
import { toast } from "@/hooks/use-toast";
import { QuoteRequestDialog } from "./QuoteRequestDialog";

interface WholesalePanelProps {
  product: Product;
}

const formatPrice = (price: number) => {
  return new Intl.NumberFormat("fr-FR").format(price);
};

export function WholesalePanel({ product }: WholesalePanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState<PackagingType | null>(null);
  const [buyerType, setBuyerType] = useState<"individual" | "business">("individual");
  const [hasNIU, setHasNIU] = useState(false);
  const [niuValue, setNiuValue] = useState("");
  const [showQuoteDialog, setShowQuoteDialog] = useState(false);
  const { data: customPricing } = useWholesalePricing(product.id);
  const { data: tierConfig } = useWholesaleTierConfig();
  const { addItem } = useCartContext();

  const allTiers = calculateWholesalePrices(product.price, customPricing || [], hasNIU && niuValue.length >= 10);
  const tiers = allTiers.filter(t => tierConfig?.visible_tiers?.includes(t.type));

  const handleAddToCart = async (tier: WholesaleTierPrice) => {
    try {
      await addItem(product.id, tier.quantity);
      toast({
        title: "📦 Ajouté au panier en gros",
        description: `${tier.label} de ${product.name} ajouté au panier`,
      });
    } catch {
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter au panier",
        variant: "destructive",
      });
    }
  };

  const selectedTierData = tiers.find((t) => t.type === selectedTier);

  return (
    <>
      <div className="mt-4">
        <Button
          onClick={() => setIsOpen(!isOpen)}
          variant="outline"
          className="w-full justify-between border-[#2c3e50] bg-[#2c3e50]/10 text-cream hover:bg-[#2c3e50]/20 hover:border-[#2c3e50] h-12 rounded-full font-semibold"
        >
          <span className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            📦 ACHETER EN GROS
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
                {/* Header */}
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  <h3 className="font-display text-lg font-semibold text-cream">
                    Tarifs professionnels
                  </h3>
                  <Badge className="bg-primary/20 text-primary border-0 text-xs">
                    Jusqu'à -25%
                  </Badge>
                </div>

                {/* Tiers */}
                <div className="space-y-3">
                  {tiers.map((tier) => (
                    <motion.div
                      key={tier.type}
                      className={`relative p-4 rounded-xl border cursor-pointer transition-all ${
                        selectedTier === tier.type
                          ? "border-primary bg-primary/10"
                          : "border-cream/10 bg-cream/5 hover:border-cream/20"
                      }`}
                      onClick={() => setSelectedTier(tier.type)}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                            selectedTier === tier.type
                              ? "border-primary bg-primary"
                              : "border-cream/30"
                          }`}>
                            {selectedTier === tier.type && (
                              <Check className="h-3.5 w-3.5 text-noir" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-cream text-sm">
                              {tier.icon} {tier.label}
                            </p>
                            <p className="text-xs text-cream/50">
                              {tier.quantity} bouteilles × {formatPrice(Math.round(tier.totalPrice / tier.quantity))} FCFA
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-cream">
                            {formatPrice(tier.totalPrice)} FCFA
                            {hasNIU && niuValue.length >= 10 && (
                              <span className="text-xs text-cream/40 ml-1">HT</span>
                            )}
                          </p>
                          <p className="text-xs font-semibold text-green-400">
                            Économie: {formatPrice(tier.savings)} FCFA (-{tier.discountPercent}%)
                          </p>
                        </div>
                      </div>
                      {tier.isCustom && (
                        <Badge className="absolute top-2 right-2 bg-secondary/20 text-secondary border-0 text-[10px]">
                          Prix spécial
                        </Badge>
                      )}
                    </motion.div>
                  ))}
                </div>

                {/* Buyer Type Section */}
                <div className="p-4 rounded-xl border border-cream/10 bg-cream/5 space-y-3">
                  <p className="text-sm font-medium text-cream">Vous êtes :</p>
                  <div className="flex gap-3">
                    {[
                      { value: "individual" as const, label: "🎉 Particulier / Événement", desc: "Mariage, fête, cérémonie..." },
                      { value: "business" as const, label: "🏢 Entreprise / Pro", desc: "Restaurant, bar, hôtel..." },
                    ].map((option) => (
                      <div
                        key={option.value}
                        onClick={() => setBuyerType(option.value)}
                        className={`flex-1 p-3 rounded-xl border cursor-pointer transition-all text-center ${
                          buyerType === option.value
                            ? "border-primary bg-primary/10"
                            : "border-cream/10 bg-cream/5 hover:border-cream/20"
                        }`}
                      >
                        <p className="text-sm font-medium text-cream">{option.label}</p>
                        <p className="text-[10px] text-cream/50 mt-0.5">{option.desc}</p>
                      </div>
                    ))}
                  </div>

                  <AnimatePresence>
                    {buyerType === "business" && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-2"
                      >
                        <div className="flex items-start gap-3">
                          <Checkbox
                            id="has-niu"
                            checked={hasNIU}
                            onCheckedChange={(checked) => setHasNIU(!!checked)}
                            className="mt-0.5 border-cream/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                          />
                          <div className="flex-1">
                            <Label htmlFor="has-niu" className="text-sm font-medium text-cream cursor-pointer">
                              J'ai un numéro de contribuable (NIU)
                            </Label>
                            <p className="text-xs text-cream/50 mt-0.5">
                              Prix affichés Hors Taxes (HT) - TVA 19,25%
                            </p>
                          </div>
                        </div>
                        <AnimatePresence>
                          {hasNIU && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                            >
                              <Input
                                placeholder="Entrez votre NIU (ex: M012345678901A)"
                                value={niuValue}
                                onChange={(e) => setNiuValue(e.target.value.toUpperCase())}
                                className="bg-cream/5 border-cream/20 text-cream placeholder:text-cream/30 font-mono"
                                maxLength={20}
                              />
                              {niuValue && niuValue.length < 10 && (
                                <p className="text-xs text-secondary mt-1">
                                  Le NIU doit contenir au moins 10 caractères
                                </p>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <Button
                    onClick={() => selectedTierData && handleAddToCart(selectedTierData)}
                    disabled={!selectedTier || product.stock_quantity <= 0}
                    className="flex-1 bg-gradient-gold text-noir font-semibold gap-2 rounded-full h-11"
                  >
                    <ShoppingCart className="h-4 w-4" />
                    Ajouter au panier
                  </Button>
                  <Button
                    onClick={() => setShowQuoteDialog(true)}
                    disabled={!selectedTier}
                    variant="outline"
                    className="flex-1 border-cream/20 text-cream hover:bg-cream/10 gap-2 rounded-full h-11"
                  >
                    <FileText className="h-4 w-4" />
                    Demander un devis
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Quote Request Dialog */}
      {selectedTierData && (
        <QuoteRequestDialog
          open={showQuoteDialog}
          onOpenChange={setShowQuoteDialog}
          product={product}
          tier={selectedTierData}
          buyerType={buyerType}
          hasNIU={hasNIU}
          niuValue={niuValue}
        />
      )}
    </>
  );
}
