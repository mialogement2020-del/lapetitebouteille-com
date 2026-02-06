import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gift, Check, Sparkles, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

interface GiftPackagingOption {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  display_order: number | null;
}

interface GiftPackagingSelectProps {
  selectedId: string | null;
  giftMessage: string;
  onSelect: (option: GiftPackagingOption | null) => void;
  onMessageChange: (message: string) => void;
}

export function GiftPackagingSelect({
  selectedId,
  giftMessage,
  onSelect,
  onMessageChange,
}: GiftPackagingSelectProps) {
  const [options, setOptions] = useState<GiftPackagingOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const fetchOptions = async () => {
      const { data, error } = await supabase
        .from("gift_packaging_options")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (!error && data) {
        setOptions(data);
        // Auto-select first free option if nothing selected
        if (!selectedId && data.length > 0) {
          const freeOption = data.find((o) => o.price === 0);
          if (freeOption) {
            onSelect(freeOption);
          }
        }
      }
      setIsLoading(false);
    };

    fetchOptions();
  }, []);

  const formatPrice = (price: number) => {
    if (price === 0) return "Gratuit";
    return new Intl.NumberFormat("fr-FR").format(price) + " FCFA";
  };

  const selectedOption = options.find((o) => o.id === selectedId);
  const showMessage = selectedOption && selectedOption.price > 0;

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-6 w-40" />
        <div className="grid grid-cols-3 gap-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with toggle */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 rounded-lg bg-cream/5 border border-gold/20 hover:border-gold/40 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Gift className="h-5 w-5 text-primary" />
          </div>
          <div className="text-left">
            <p className="font-medium text-cream">Emballage cadeau</p>
            {selectedOption && (
              <p className="text-sm text-cream/60">
                {selectedOption.name} - {formatPrice(selectedOption.price)}
              </p>
            )}
          </div>
        </div>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          className="text-cream/60"
        >
          ▼
        </motion.div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4 overflow-hidden"
          >
            {/* Options Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {options.map((option) => {
                const isSelected = selectedId === option.id;
                const isPremium = option.price > 0;

                return (
                  <motion.button
                    key={option.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onSelect(option)}
                    className={`
                      relative p-4 rounded-xl border-2 text-left transition-all
                      ${isSelected
                        ? "border-primary bg-primary/10"
                        : "border-gold/20 bg-cream/5 hover:border-gold/40"
                      }
                    `}
                  >
                    {/* Premium badge */}
                    {isPremium && (
                      <div className="absolute -top-2 -right-2">
                        <div className="bg-gradient-gold text-noir text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Sparkles className="h-3 w-3" />
                          Premium
                        </div>
                      </div>
                    )}

                    {/* Check mark */}
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center"
                      >
                        <Check className="h-3 w-3 text-noir" />
                      </motion.div>
                    )}

                    <div className="flex flex-col items-center text-center gap-2">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        isPremium ? "bg-gradient-gold" : "bg-cream/10"
                      }`}>
                        <Package className={`h-6 w-6 ${isPremium ? "text-noir" : "text-cream/60"}`} />
                      </div>
                      <div>
                        <p className={`font-medium ${isSelected ? "text-primary" : "text-cream"}`}>
                          {option.name}
                        </p>
                        <p className="text-xs text-cream/60 mt-0.5">
                          {option.description}
                        </p>
                      </div>
                      <p className={`text-sm font-semibold ${
                        option.price === 0 ? "text-green-500" : "text-primary"
                      }`}>
                        {formatPrice(option.price)}
                      </p>
                    </div>
                  </motion.button>
                );
              })}
            </div>

            {/* Gift Message */}
            <AnimatePresence>
              {showMessage && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2"
                >
                  <Label className="text-cream/80 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Message personnalisé (optionnel)
                  </Label>
                  <Textarea
                    value={giftMessage}
                    onChange={(e) => onMessageChange(e.target.value)}
                    placeholder="Écrivez votre message pour le destinataire..."
                    maxLength={200}
                    className="bg-cream/5 border-gold/30 text-cream placeholder:text-cream/40 resize-none"
                    rows={3}
                  />
                  <p className="text-xs text-cream/40 text-right">
                    {giftMessage.length}/200 caractères
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
