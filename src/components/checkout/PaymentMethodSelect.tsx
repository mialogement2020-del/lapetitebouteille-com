import { useState, useEffect, useRef } from "react";
import { CreditCard, Smartphone, Wallet, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { z } from "zod";

const phoneSchema = z.string().trim().min(9, "Numéro invalide").max(15);

export type PaymentMethod = "mtn_money" | "orange_money" | "cash_on_delivery";

interface PaymentMethodSelectProps {
  onSubmit: (method: PaymentMethod, phone?: string) => void;
  isLoading?: boolean;
}

const PAYMENT_METHODS = [
  {
    id: "mtn_money" as const,
    name: "MTN Mobile Money",
    description: "Paiement sécurisé via MTN MoMo",
    icon: Smartphone,
    color: "bg-yellow-500",
    requiresPhone: true,
  },
  {
    id: "orange_money" as const,
    name: "Orange Money",
    description: "Paiement sécurisé via Orange Money",
    icon: Smartphone,
    color: "bg-orange-500",
    requiresPhone: true,
  },
  {
    id: "cash_on_delivery" as const,
    name: "Paiement à la livraison",
    description: "Payez en espèces à la réception",
    icon: Wallet,
    color: "bg-green-600",
    requiresPhone: false,
  },
];

export function PaymentMethodSelect({ onSubmit, isLoading }: PaymentMethodSelectProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [mobilePhone, setMobilePhone] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const phoneInputRef = useRef<HTMLInputElement>(null);

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
          <h2 className="font-display text-xl text-cream">Mode de paiement</h2>
          <p className="text-cream/60 text-sm">Choisissez comment vous souhaitez payer</p>
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
              <p className="font-medium text-cream">{method.name}</p>
              <p className="text-sm text-cream/60">{method.description}</p>
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
            Numéro {selectedPayment.name}
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
              placeholder="6 XX XX XX XX"
              className="pl-10 bg-cream/5 border-gold/20 text-cream placeholder:text-cream/40 focus:border-primary focus:ring-primary"
              aria-describedby="phone-hint"
            />
          </div>
          {phoneError && (
            <p className="text-destructive text-sm" role="alert">{phoneError}</p>
          )}
          <p id="phone-hint" className="text-xs text-cream/50">
            Vous recevrez une demande de paiement sur ce numéro
          </p>
        </div>
      )}

      <Button
        onClick={handleSubmit}
        disabled={!selectedMethod || isLoading}
        className="w-full bg-gradient-gold text-noir font-semibold h-12"
      >
        {isLoading ? "Traitement..." : "Confirmer la commande"}
      </Button>

      <p className="text-xs text-center text-cream/50">
        En confirmant, vous acceptez nos conditions générales de vente
      </p>
    </div>
  );
}
