import { useState } from "react";
import { Tag, Loader2, X, Check, Gift, Users } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";

// Validation schema for code
const codeSchema = z
  .string()
  .trim()
  .min(1, "Veuillez entrer un code")
  .max(20, "Code trop long")
  .regex(/^[A-Z0-9]+$/i, "Code invalide");

export interface AppliedPromoCode {
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  maxDiscountAmount?: number;
  discountAmount: number;
}

export interface AppliedReferralCode {
  code: string;
  referrerId: string;
  referrerName?: string;
}

export type AppliedCode = 
  | { type: "promo"; data: AppliedPromoCode }
  | { type: "referral"; data: AppliedReferralCode };

interface UnifiedCodeInputProps {
  subtotal: number;
  appliedCode: AppliedCode | null;
  onApply: (code: AppliedCode) => void;
  onRemove: () => void;
}

export function UnifiedCodeInput({
  subtotal,
  appliedCode,
  onApply,
  onRemove,
}: UnifiedCodeInputProps) {
  const [code, setCode] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

    return Math.min(discount, orderSubtotal);
  };

  const handleApply = async () => {
    setError(null);

    // Client-side validation
    const validation = codeSchema.safeParse(code);
    if (!validation.success) {
      setError(validation.error.errors[0].message);
      return;
    }

    const normalizedCode = code.trim().toUpperCase();
    setIsValidating(true);

    try {
      // First, try to find it as a promo code
      const { data: promoCode, error: promoError } = await supabase
        .from("promo_codes")
        .select("*")
        .eq("code", normalizedCode)
        .eq("is_active", true)
        .maybeSingle();

      if (promoError) throw promoError;

      if (promoCode) {
        // Validate promo code
        const now = new Date();
        if (promoCode.valid_from && new Date(promoCode.valid_from) > now) {
          setError("Ce code promo n'est pas encore valide");
          return;
        }

        if (promoCode.valid_until && new Date(promoCode.valid_until) < now) {
          setError("Ce code promo a expiré");
          return;
        }

        if (
          promoCode.usage_limit &&
          (promoCode.used_count || 0) >= promoCode.usage_limit
        ) {
          setError("Ce code promo a atteint sa limite d'utilisation");
          return;
        }

        if (promoCode.min_order_amount && subtotal < promoCode.min_order_amount) {
          setError(
            `Commande minimum de ${formatPrice(promoCode.min_order_amount)} FCFA requise`
          );
          return;
        }

        const discountAmount = calculateDiscount(
          promoCode.discount_type,
          promoCode.discount_value,
          promoCode.max_discount_amount,
          subtotal
        );

        onApply({
          type: "promo",
          data: {
            code: promoCode.code,
            discountType: promoCode.discount_type as "percentage" | "fixed",
            discountValue: promoCode.discount_value,
            maxDiscountAmount: promoCode.max_discount_amount || undefined,
            discountAmount,
          },
        });

        toast({
          title: "Code promo appliqué !",
          description: `Vous économisez ${formatPrice(discountAmount)} FCFA`,
        });

        setCode("");
        return;
      }

      // If not a promo code, try as a referral code
      const { data: referralCode, error: referralError } = await supabase
        .from("referral_codes")
        .select(`
          code,
          user_id,
          is_active
        `)
        .or(`code.eq.${normalizedCode},custom_code.eq.${normalizedCode}`)
        .eq("is_active", true)
        .maybeSingle();

      if (referralError) throw referralError;

      if (referralCode) {
        // Get referrer's name from profiles
        const { data: profile } = await supabase
          .from("profiles")
          .select("first_name, last_name")
          .eq("id", referralCode.user_id)
          .single();

        const referrerName = profile
          ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "Parrain"
          : "Parrain";

        onApply({
          type: "referral",
          data: {
            code: referralCode.code,
            referrerId: referralCode.user_id,
            referrerName,
          },
        });

        toast({
          title: "Code parrain appliqué !",
          description: `Parrainé par ${referrerName}`,
        });

        setCode("");
        return;
      }

      // Neither promo nor referral code found
      setError("Code invalide ou expiré");
    } catch (err: any) {
      console.error("Error validating code:", err);
      setError("Une erreur est survenue lors de la validation");
    } finally {
      setIsValidating(false);
    }
  };

  const handleRemove = () => {
    onRemove();
    toast({
      title: appliedCode?.type === "promo" ? "Code promo retiré" : "Code parrain retiré",
      description: appliedCode?.type === "promo" 
        ? "La réduction a été supprimée" 
        : "Le parrainage a été retiré",
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleApply();
    }
  };

  // Show applied code (promo or referral)
  if (appliedCode) {
    const isPromo = appliedCode.type === "promo";
    const bgColor = isPromo ? "bg-green-500/10 border-green-500/30" : "bg-primary/10 border-primary/30";
    const textColor = isPromo ? "text-green-400" : "text-primary";
    const Icon = isPromo ? Gift : Users;

    return (
      <div className={`${bgColor} border rounded-lg p-3`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className={`h-4 w-4 ${textColor}`} />
            <span className={`text-sm font-medium ${textColor}`}>
              {isPromo ? appliedCode.data.code : appliedCode.data.code}
            </span>
            <span className={`text-xs px-1.5 py-0.5 rounded ${isPromo ? "bg-green-500/20 text-green-400" : "bg-primary/20 text-primary"}`}>
              {isPromo ? "Promo" : "Parrain"}
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
        <p className={`text-xs ${textColor}/80 mt-1`}>
          {isPromo ? (
            <>
              {appliedCode.data.discountType === "percentage"
                ? `${appliedCode.data.discountValue}% de réduction`
                : `${formatPrice(appliedCode.data.discountValue)} FCFA de réduction`}
              {appliedCode.data.maxDiscountAmount &&
                appliedCode.data.discountType === "percentage" &&
                ` (max ${formatPrice(appliedCode.data.maxDiscountAmount)} FCFA)`}
            </>
          ) : (
            `Parrainé par ${appliedCode.data.referrerName}`
          )}
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
            placeholder="Code promo ou parrain"
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
            "Appliquer"
          )}
        </Button>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <p className="text-xs text-cream/40">
        Entrez un code promo ou un code parrain
      </p>
    </div>
  );
}
