import { useState } from "react";
import { FileText, Send, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Product } from "@/hooks/useProducts";
import { WholesaleTierPrice, useSubmitQuoteRequest } from "@/hooks/useWholesale";
import { useAuthContext } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

interface QuoteRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product;
  tier: WholesaleTierPrice;
  buyerType: "individual" | "business";
  hasNIU: boolean;
  niuValue: string;
}

const formatPrice = (price: number) => {
  return new Intl.NumberFormat("fr-FR").format(price);
};

export function QuoteRequestDialog({
  open,
  onOpenChange,
  product,
  tier,
  buyerType,
  hasNIU,
  niuValue,
}: QuoteRequestDialogProps) {
  const { t } = useTranslation();
  const { user } = useAuthContext();
  const submitQuote = useSubmitQuoteRequest();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    eventType: "",
    niu: niuValue || "",
    city: "",
    message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.email || !formData.phone || !formData.city) {
      toast({
        title: t("quote.errorRequiredTitle"),
        description: t("quote.errorRequiredDesc"),
        variant: "destructive",
      });
      return;
    }

    try {
      await submitQuote.mutateAsync({
        client_name: formData.name.trim(),
        client_email: formData.email.trim(),
        client_phone: formData.phone.trim(),
        company_name: buyerType === "business" ? (formData.company.trim() || undefined) : (formData.eventType.trim() ? `[Événement] ${formData.eventType.trim()}` : undefined),
        niu: buyerType === "business" && hasNIU ? formData.niu.trim() : undefined,
        city: formData.city.trim(),
        product_id: product.id,
        product_name: product.name,
        packaging_type: tier.type,
        quantity: tier.quantity,
        unit_price: product.price,
        total_price: tier.totalPrice,
        message: formData.message.trim() || undefined,
        user_id: user?.id || undefined,
      });

      toast({
        title: t("quote.successTitle"),
        description: t("quote.successDesc"),
      });

      onOpenChange(false);
      setFormData({ name: "", email: "", phone: "", company: "", eventType: "", niu: "", city: "", message: "" });
    } catch {
      toast({
        title: t("quote.errorTitle"),
        description: t("quote.errorDesc"),
        variant: "destructive",
      });
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-noir border-cream/10 text-cream max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            {t("quote.title")}
          </DialogTitle>
          <DialogDescription className="text-cream/60">
            {t("quote.desc")}
          </DialogDescription>
        </DialogHeader>

        {/* Order Summary */}
        <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 mb-4">
          <p className="font-medium text-sm text-cream">{product.name}</p>
          <p className="text-xs text-cream/60 mt-1">
            {tier.icon} {tier.label} — {t("quote.bottles", { count: tier.quantity })}
          </p>
          <p className="font-bold text-primary mt-1">
            {formatPrice(tier.totalPrice)} FCFA
            {hasNIU && <span className="text-xs text-cream/40 ml-1">HT</span>}
          </p>
          <p className="text-xs text-green-400">
            {t("quote.savings", { amount: formatPrice(tier.savings) })}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-cream/80 text-sm">{t("quote.name")}</Label>
              <Input
                value={formData.name}
                onChange={(e) => updateField("name", e.target.value)}
                placeholder={t("quote.namePlaceholder")}
                required
                className="bg-cream/5 border-cream/20 text-cream placeholder:text-cream/30"
              />
            </div>
            <div>
              <Label className="text-cream/80 text-sm">{t("quote.phone")}</Label>
              <Input
                value={formData.phone}
                onChange={(e) => updateField("phone", e.target.value)}
                placeholder="+237 6XX XXX XXX"
                required
                className="bg-cream/5 border-cream/20 text-cream placeholder:text-cream/30"
              />
            </div>
          </div>

          <div>
            <Label className="text-cream/80 text-sm">{t("quote.email")}</Label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => updateField("email", e.target.value)}
              placeholder={t("quote.emailPlaceholder")}
              required
              className="bg-cream/5 border-cream/20 text-cream placeholder:text-cream/30"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {buyerType === "business" ? (
              <div>
                <Label className="text-cream/80 text-sm">{t("quote.company")}</Label>
                <Input
                  value={formData.company}
                  onChange={(e) => updateField("company", e.target.value)}
                  placeholder={t("quote.companyPlaceholder")}
                  className="bg-cream/5 border-cream/20 text-cream placeholder:text-cream/30"
                />
              </div>
            ) : (
              <div>
                <Label className="text-cream/80 text-sm">{t("quote.event")}</Label>
                <Input
                  value={formData.eventType}
                  onChange={(e) => updateField("eventType", e.target.value)}
                  placeholder={t("quote.eventPlaceholder")}
                  className="bg-cream/5 border-cream/20 text-cream placeholder:text-cream/30"
                />
              </div>
            )}
            <div>
              <Label className="text-cream/80 text-sm">{t("quote.city")}</Label>
              <Input
                value={formData.city}
                onChange={(e) => updateField("city", e.target.value)}
                placeholder={t("quote.cityPlaceholder")}
                required
                className="bg-cream/5 border-cream/20 text-cream placeholder:text-cream/30"
              />
            </div>
          </div>

          {buyerType === "business" && hasNIU && (
            <div>
              <Label className="text-cream/80 text-sm">{t("quote.niu")}</Label>
              <Input
                value={formData.niu}
                onChange={(e) => updateField("niu", e.target.value.toUpperCase())}
                placeholder="M012345678901A"
                className="bg-cream/5 border-cream/20 text-cream font-mono placeholder:text-cream/30"
                maxLength={20}
              />
            </div>
          )}

          <div>
            <Label className="text-cream/80 text-sm">{t("quote.message")}</Label>
            <Textarea
              value={formData.message}
              onChange={(e) => updateField("message", e.target.value)}
              placeholder={t("quote.messagePlaceholder")}
              rows={3}
              className="bg-cream/5 border-cream/20 text-cream placeholder:text-cream/30 resize-none"
            />
          </div>

          <Button
            type="submit"
            disabled={submitQuote.isPending}
            className="w-full bg-gradient-gold text-noir font-semibold h-12 gap-2 rounded-full"
          >
            {submitQuote.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {t("quote.submit")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
