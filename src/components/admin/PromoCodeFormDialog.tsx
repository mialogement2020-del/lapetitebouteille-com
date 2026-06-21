import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  Dialog{t("adminPromo.form.descriptionLabel")},
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AdminPromoCode, PromoCodeFormData } from "@/hooks/useAdmin";

interface PromoCodeFormDialogProps {
  promoCode: AdminPromoCode | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: PromoCodeFormData, id?: string) => Promise<void>;
  isSaving: boolean;
}

export function PromoCodeFormDialog({
  promoCode,
  open,
  onOpenChange,
  onSave,
  isSaving,
}: PromoCodeFormDialogProps) {
  const [formData, setFormData] = useState<PromoCodeFormData>({
    code: "",
    description: "",
    discount_type: "percentage",
    discount_value: 10,
    min_order_amount: 0,
    max_discount_amount: undefined,
    usage_limit: undefined,
    valid_from: undefined,
    valid_until: undefined,
    is_active: true,
  });

  useEffect(() => {
    if (promoCode) {
      setFormData({
        code: promoCode.code,
        description: promoCode.description || "",
        discount_type: promoCode.discount_type as "percentage" | "fixed",
        discount_value: promoCode.discount_value,
        min_order_amount: promoCode.min_order_amount || 0,
        max_discount_amount: promoCode.max_discount_amount || undefined,
        usage_limit: promoCode.usage_limit || undefined,
        valid_from: promoCode.valid_from || undefined,
        valid_until: promoCode.valid_until || undefined,
        is_active: promoCode.is_active ?? true,
      });
    } else {
      setFormData({
        code: "",
        description: "",
        discount_type: "percentage",
        discount_value: 10,
        min_order_amount: 0,
        max_discount_amount: undefined,
        usage_limit: undefined,
        valid_from: undefined,
        valid_until: undefined,
        is_active: true,
      });
    }
  }, [promoCode, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.code || formData.discount_value <= 0) {
      return;
    }

    await onSave(formData, promoCode?.id);
  };

  const generateCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData((prev) => ({ ...prev, code }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-noir border-gold/20 max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-cream">
            promoCode ? t("adminPromo.form.editTitle") : t("adminPromo.form.addTitle")
          </DialogTitle>
          <Dialog{t("adminPromo.form.descriptionLabel")}>
            {promoCode
              ? "Modifiez les paramètres du code promo"
              : "Créez un nouveau code de réduction"}
          </Dialog{t("adminPromo.form.descriptionLabel")}>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Code et {t("adminPromo.form.descriptionLabel")} */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="code">{t("adminPromo.form.codeLabel")}</Label>
              <div className="flex gap-2">
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""),
                    }))
                  }
                  placeholder={t("adminPromo.form.codePlaceholder")}
                  className="bg-noir/50 border-gold/20 font-mono uppercase"
                  maxLength={20}
                  required
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={generateCode}
                  className="border-gold/20 shrink-0"
                >
                  {t("adminPromo.form.generate")}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">{t("adminPromo.form.descriptionLabel")}</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="{t("adminPromo.form.descriptionLabel")} interne"
                className="bg-noir/50 border-gold/20"
              />
            </div>
          </div>

          {/* Type et Valeur de réduction */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="discount_type">{t("adminPromo.form.typeLabel")}</Label>
              <Select
                value={formData.discount_type}
                onValueChange={(value: "percentage" | "fixed") =>
                  setFormData((prev) => ({ ...prev, discount_type: value }))
                }
              >
                <SelectTrigger className="bg-noir/50 border-gold/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-noir border-gold/20">
                  <SelectItem value="percentage">{t("adminPromo.form.typePercentage")}</SelectItem>
                  <SelectItem value="fixed">{t("adminPromo.form.typeFixed")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="discount_value">
                {t("adminPromo.form.valueLabel")} {formData.discount_type === "percentage" ? "(%)" : "(FCFA)"}
              </Label>
              <Input
                id="discount_value"
                type="number"
                min={0}
                max={formData.discount_type === "percentage" ? 100 : undefined}
                value={formData.discount_value}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    discount_value: parseFloat(e.target.value) || 0,
                  }))
                }
                className="bg-noir/50 border-gold/20"
                required
              />
            </div>

            {formData.discount_type === "percentage" && (
              <div className="space-y-2">
                <Label htmlFor="max_discount">{t("adminPromo.form.maxDiscountLabel")}</Label>
                <Input
                  id="max_discount"
                  type="number"
                  min={0}
                  value={formData.max_discount_amount || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      max_discount_amount: e.target.value ? parseFloat(e.target.value) : undefined,
                    }))
                  }
                  placeholder="Optionnel"
                  className="bg-noir/50 border-gold/20"
                />
              </div>
            )}
          </div>

          {/* Conditions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="min_order">{t("adminPromo.form.minOrderLabel")}</Label>
              <Input
                id="min_order"
                type="number"
                min={0}
                value={formData.min_order_amount || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    min_order_amount: e.target.value ? parseFloat(e.target.value) : 0,
                  }))
                }
                placeholder="0"
                className="bg-noir/50 border-gold/20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="usage_limit">{t("adminPromo.form.usageLimitLabel")}</Label>
              <Input
                id="usage_limit"
                type="number"
                min={1}
                value={formData.usage_limit || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    usage_limit: e.target.value ? parseInt(e.target.value) : undefined,
                  }))
                }
                placeholder={t("adminPromo.form.usageLimitPlaceholder")}
                className="bg-noir/50 border-gold/20"
              />
            </div>
          </div>

          {/* Dates de validité */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("adminPromo.form.startDate")}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal bg-noir/50 border-gold/20",
                      !formData.valid_from && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.valid_from
                      ? format(new Date(formData.valid_from), "PPP", { locale: fr })
                      : "{t("adminPromo.form.immediately")}"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-noir border-gold/20" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.valid_from ? new Date(formData.valid_from) : undefined}
                    onSelect={(date) =>
                      setFormData((prev) => ({
                        ...prev,
                        valid_from: date?.toISOString(),
                      }))
                    }
                    initialFocus
                    className="pointer-events-auto"
                  />
                  {formData.valid_from && (
                    <div className="p-2 border-t border-gold/20">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full"
                        onClick={() =>
                          setFormData((prev) => ({ ...prev, valid_from: undefined }))
                        }
                      >
                        {t("adminPromo.form.clear")}
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>{t("adminPromo.form.endDate")}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal bg-noir/50 border-gold/20",
                      !formData.valid_until && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.valid_until
                      ? format(new Date(formData.valid_until), "PPP", { locale: fr })
                      : "{t("adminPromo.form.noLimit")}"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-noir border-gold/20" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.valid_until ? new Date(formData.valid_until) : undefined}
                    onSelect={(date) =>
                      setFormData((prev) => ({
                        ...prev,
                        valid_until: date?.toISOString(),
                      }))
                    }
                    disabled={(date) =>
                      formData.valid_from ? date < new Date(formData.valid_from) : false
                    }
                    initialFocus
                    className="pointer-events-auto"
                  />
                  {formData.valid_until && (
                    <div className="p-2 border-t border-gold/20">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full"
                        onClick={() =>
                          setFormData((prev) => ({ ...prev, valid_until: undefined }))
                        }
                      >
                        {t("adminPromo.form.clear")}
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Statut actif */}
          <div className="flex items-center justify-between p-4 rounded-lg border border-gold/20 bg-noir/30">
            <div>
              <Label htmlFor="is_active" className="text-base">
                {t("adminPromo.form.activeLabel")}
              </Label>
              <p className="text-sm text-cream/60">
                {t("adminPromo.form.activeDesc")}
              </p>
            </div>
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({ ...prev, is_active: checked }))
              }
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-gold/20"
            >
              {t("adminPromo.form.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={isSaving || !formData.code || formData.discount_value <= 0}
              className="bg-gradient-gold text-noir font-semibold"
            >
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              promoCode ? t("adminPromo.form.modify") : t("adminPromo.form.create")
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
