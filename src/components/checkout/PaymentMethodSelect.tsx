import { useState, useEffect, useRef } from "react";
import { CreditCard, Smartphone, Wallet, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { z } from "zod";
import { useTranslation } from "react-i18next";

export type PaymentMethod = "mtn_money" | "orange_money" | "cash_on_delivery";

interface PaymentMethodSelectProps {
  onSubmit: (method: PaymentMethod, phone?: string) => void;
  isLoading?: boolean;
}

const PAYMENT_METHODS = [
  { id: "mtn_money" as const, nameKey: "mtnName", descKey: "mtnDesc", icon: Smartphone, color: "bg-yellow-500", requiresPhone: true },
  { id: "orange_money" as const, nameKey: "orangeName", descKey: "orangeDesc", icon: Smartphone, color: "bg-orange-500", requiresPhone: true },
  { id: "cash_on_delivery" as const, nameKey: "codName", descKey: "codDesc", icon: Wallet, color: "bg-green-600", requiresPhone: false },
];

export function PaymentMethodSelect({ onSubmit, isLoading }: PaymentMethodSelectProps) {
  const { t } = useTranslation();
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [mobilePhone, setMobilePhone] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const phoneSchema = z.string().trim().min(9, t("payment.phoneInvalid")).max(15);

  // Auto-scroll to phone input when it appears
  useEffect(() => {
    if (selectedMethod && PAYMENT_METHODS.find(m => m.id === selectedMethod)?.requiresPhone) {
      setTimeout(() => {
        phoneInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        phoneInputRef.current?.focus();
      }, 100);
    }
  }, [selectedMethod]);

  const handleSubmit = () => {
    if (!selectedMethod) return;

    const method = PAYMENT_METHODS.find((m) => m.id === selectedMethod);
    
    if (method?.requiresPhone) {
      const result = phoneSchema.safeParse(mobilePhone);
      if (!result.success) {
        setPhoneError(result.error.errors[0].message);
        return;
      }
      setPhoneError("");
      onSubmit(selectedMethod, mobilePhone);
    } else {
      onSubmit(selectedMethod);
    }
  };

  const selectedPayment = PAYMENT_METHODS.find((m) => m.id === selectedMethod);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
          <CreditCard className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="font-display text-xl text-cream">{t("payment.title")}</h2>
          <p className="text-cream/60 text-sm">{t("payment.subtitle")}</p>
        </div>
      </div>

      <div className="space-y-3">
        {PAYMENT_METHODS.map((method) => (
          <button
            key={method.id}
            type="button"
            onClick={() => setSelectedMethod(method.id)}
            className={`w-full flex items-center gap-4 p-4 rounded-lg border transition-all ${
              selectedMethod === method.id
                ? "border-primary bg-primary/10"
                : "border-gold/20 bg-cream/5 hover:border-gold/40"
            }`}
          >
            <div className={`w-12 h-12 rounded-full ${method.color} flex items-center justify-center`}>
              <method.icon className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-medium text-cream">{t(`payment.${method.nameKey}`)}</p>
              <p className="text-sm text-cream/60">{t(`payment.${method.descKey}`)}</p>
            </div>
            {selectedMethod === method.id && (
              <CheckCircle2 className="h-6 w-6 text-primary" />
            )}
          </button>
        ))}
      </div>

      {/* Mobile Money Phone Input */}
      {selectedPayment?.requiresPhone && (
        <div className="space-y-2 animate-in fade-in slide-in-from-top-2 pt-2">
          <Label htmlFor="mobilePhone" className="text-cream/80 font-medium">
            {t("payment.phoneLabel", { name: t(`payment.${selectedPayment.nameKey}`) })}
          </Label>
          <div className="relative">
            <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-cream/40" />
            <Input
              ref={phoneInputRef}
              id="mobilePhone"
              name="mobilePhone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              value={mobilePhone}
              onChange={(e) => {
                setMobilePhone(e.target.value);
                setPhoneError("");
              }}
              placeholder={t("payment.phonePlaceholder")}
              className="pl-10 bg-cream/5 border-gold/20 text-cream placeholder:text-cream/40 focus:border-primary focus:ring-primary"
              aria-describedby="phone-hint"
            />
          </div>
          {phoneError && (
            <p className="text-destructive text-sm" role="alert">{phoneError}</p>
          )}
          <p id="phone-hint" className="text-xs text-cream/50">
            {t("payment.phoneHint")}
          </p>
        </div>
      )}

      <Button
        onClick={handleSubmit}
        disabled={!selectedMethod || isLoading}
        className="w-full bg-gradient-gold text-noir font-semibold h-12"
      >
        {isLoading ? t("payment.processing") : t("payment.confirm")}
      </Button>

      <p className="text-xs text-center text-cream/50">
        {t("payment.termsNotice")}
      </p>
    </div>
  );
}
