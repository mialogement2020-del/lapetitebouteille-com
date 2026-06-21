import { useState } from "react";
import { Tag, Loader2, X, Check } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

export interface AppliedPromoCode {
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  maxDiscountAmount?: number;
  discountAmount: number;
}

interface PromoCodeInputProps {
  subtotal: number;
  appliedCode: AppliedPromoCode | null;
  onApply: (promoCode: AppliedPromoCode) => void;
  onRemove: () => void;
}

export function PromoCodeInput({
  subtotal,
  appliedCode,
  onApply,
  onRemove,
}: PromoCodeInputProps) {
  const { t } = useTranslation();
  const [code, setCode] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const promoCodeSchema = z
    .string()
    .trim()
    .min(1, t("codeInput.errEmpty"))
    .max(20, t("codeInput.errTooLong"))
    .regex(/^[A-Z0-9]+$/i, t("codeInput.errInvalidChars"));

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("fr-FR").format(price);
  };

  const calculateDiscount = (
    discountType: string,
    discountValue: number,
    maxDiscountAmount: number | null,
    orderSubtotal: number
  ): number => {
    let discount = 0;

    if (discountType === "percentage") {
      discount = (orderSubtotal * discountValue) / 100;
      if (maxDiscountAmount && discount > maxDiscountAmount) {
        discount = maxDiscountAmount;
      }
    } else {
      discount = discountValue;
    }

    // Ensure discount doesn't exceed subtotal
    return Math.min(discount, orderSubtotal);
  };

  const handleApply = async () => {
    setError(null);

    // Client-side validation
    const validation = promoCodeSchema.safeParse(code);
    if (!validation.success) {
      setError(validation.error.errors[0].message);
      return;
    }

    const normalizedCode = code.trim().toUpperCase();
    setIsValidating(true);

    try {
      // Query promo code from database
      const { data: promoCode, error: dbError } = await supabase
        .from("promo_codes")
        .select("*")
        .eq("code", normalizedCode)
        .eq("is_active", true)
        .maybeSingle();

      if (dbError) throw dbError;

      if (!promoCode) {
        setError(t("codeInput.errPromoInvalid"));
        return;
      }

      // Check validity dates
      const now = new Date();
      if (promoCode.valid_from && new Date(promoCode.valid_from) > now) {
        setError(t("codeInput.errPromoNotYet"));
        return;
      }

      if (promoCode.valid_until && new Date(promoCode.valid_until) < now) {
        setError(t("codeInput.errPromoExpired"));
        return;
      }

      // Check usage limit
      if (
        promoCode.usage_limit &&
        (promoCode.used_count || 0) >= promoCode.usage_limit
      ) {
        setError(t("codeInput.errPromoLimit"));
        return;
      }

      // Check minimum order amount
      if (promoCode.min_order_amount && subtotal < promoCode.min_order_amount) {
        setError(t("codeInput.errMinOrder", { amount: formatPrice(promoCode.min_order_amount) }));
        return;
      }

      // Calculate discount
      const discountAmount = calculateDiscount(
        promoCode.discount_type,
        promoCode.discount_value,
        promoCode.max_discount_amount,
        subtotal
      );

      // Apply the code
      onApply({
        code: promoCode.code,
        discountType: promoCode.discount_type as "percentage" | "fixed",
        discountValue: promoCode.discount_value,
        maxDiscountAmount: promoCode.max_discount_amount || undefined,
        discountAmount,
      });

      toast({
        title: t("codeInput.appliedPromoTitle"),
        description: t("codeInput.appliedPromoDesc", { amount: formatPrice(discountAmount) }),
      });

      setCode("");
    } catch (err: any) {
      console.error("Error validating promo code:", err);
      setError(t("codeInput.errValidation"));
    } finally {
      setIsValidating(false);
    }
  };

  const handleRemove = () => {
    onRemove();
    toast({
      title: t("codeInput.removedPromoTitle"),
      description: t("codeInput.removedPromoDesc"),
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleApply();
    }
  };

  // Show applied code
  if (appliedCode) {
    return (
      <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-green-500" />
            <span className="text-sm font-medium text-green-400">
              {appliedCode.code}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRemove}
            className="h-6 w-6 p-0 text-cream/60 hover:text-red-400 hover:bg-red-500/10"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-green-400/80 mt-1">
          {appliedCode.discountType === "percentage"
            ? t("codeInput.percentReduction", { value: appliedCode.discountValue })
            : t("codeInput.fixedReduction", { value: formatPrice(appliedCode.discountValue) })}
          {appliedCode.maxDiscountAmount &&
            appliedCode.discountType === "percentage" &&
            t("codeInput.maxReduction", { value: formatPrice(appliedCode.maxDiscountAmount) })}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-cream/40" />
          <Input
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""));
              setError(null);
            }}
            onKeyDown={handleKeyDown}
            placeholder={t("codeInput.placeholderPromo")}
            className="pl-9 bg-noir/50 border-gold/20 font-mono uppercase"
            maxLength={20}
            disabled={isValidating}
          />
        </div>
        <Button
          onClick={handleApply}
          disabled={isValidating || !code.trim()}
          variant="outline"
          className="border-gold/20 hover:bg-primary hover:text-noir hover:border-primary"
        >
          {isValidating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            t("codeInput.apply")
          )}
        </Button>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
