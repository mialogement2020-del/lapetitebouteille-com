import { useState, useEffect } from "react";
import { Save, Percent, Package, Eye, CreditCard, LayoutGrid, Power, Receipt, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WHOLESALE_TIERS } from "@/hooks/useWholesale";
import { useWholesaleTierConfig, useUpdateWholesaleTierConfig } from "@/hooks/useWholesaleTierConfig";
import { toast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

export function WholesaleSettings() {
  const { t } = useTranslation();
  const { data: tierConfig } = useWholesaleTierConfig();
  const updateConfig = useUpdateWholesaleTierConfig();

  const [discounts, setDiscounts] = useState<Record<string, number>>(
    WHOLESALE_TIERS.reduce((acc, tier) => {
      acc[tier.type] = tier.discountPercent;
      return acc;
    }, {} as Record<string, number>)
  );
  const [labels, setLabels] = useState<Record<string, { fr?: string; en?: string }>>({});
  const [enabled, setEnabled] = useState(true);
  const [tvaRate, setTvaRate] = useState<number>(19.25);

  const [cardTiers, setCardTiers] = useState<string[]>(["carton_6"]);
  const [visibleTiers, setVisibleTiers] = useState<string[]>(["carton_6"]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (tierConfig) {
      setCardTiers(tierConfig.card_tiers || ["carton_6"]);
      setVisibleTiers(tierConfig.visible_tiers || ["carton_6"]);
      setEnabled(tierConfig.enabled ?? true);
      setTvaRate(((tierConfig.tva_rate ?? 0.1925) * 100));
      setLabels(tierConfig.labels || {});
      if (tierConfig.discount_overrides) {
        setDiscounts((prev) => {
          const next = { ...prev };
          for (const tier of WHOLESALE_TIERS) {
            const v = (tierConfig.discount_overrides as Record<string, number>)[tier.type];
            if (typeof v === "number") next[tier.type] = v;
          }
          return next;
        });
      }
    }
  }, [tierConfig]);

  const toggleTier = (type: string, list: string[], setList: (v: string[]) => void) => {
    if (list.includes(type)) {
      setList(list.filter((t) => t !== type));
    } else {
      setList([...list, type]);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    for (const tier of WHOLESALE_TIERS) {
      const val = discounts[tier.type];
      if (val < 0 || val > 50) {
        toast({
          title: t("wholesaleSettings.errTitle"),
          description: t("wholesaleSettings.errRange", { label: tier.label }),
          variant: "destructive",
        });
        setSaving(false);
        return;
      }
    }
    if (tvaRate < 0 || tvaRate > 100) {
      toast({
        title: t("wholesaleSettings.errTitle"),
        description: "TVA 0–100%",
        variant: "destructive",
      });
      setSaving(false);
      return;
    }

    WHOLESALE_TIERS.forEach((tier) => {
      tier.discountPercent = discounts[tier.type];
    });

    try {
      await updateConfig.mutateAsync({
        visible_tiers: visibleTiers,
        card_tiers: cardTiers,
        enabled,
        discount_overrides: discounts,
        tva_rate: Number((tvaRate / 100).toFixed(4)),
        labels,
      });

      toast({
        title: t("wholesaleSettings.savedTitle"),
        description: t("wholesaleSettings.savedDesc"),
      });
    } catch {
      toast({
        title: t("wholesaleSettings.errTitle"),
        description: t("wholesaleSettings.saveError"),
        variant: "destructive",
      });
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      {/* Master switch + TVA */}
      <Card className="bg-noir/50 border-cream/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-cream font-display text-lg">
            <Power className="h-5 w-5 text-primary" />
            Paramètres généraux
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg border border-cream/10 bg-cream/5">
            <div>
              <p className="text-sm font-medium text-cream">Activer la vente en gros</p>
              <p className="text-xs text-cream/50">Affiche ou masque toute la section "Acheter en gros" sur le site.</p>
            </div>
            <Switch
              checked={enabled}
              onCheckedChange={setEnabled}
              className="data-[state=checked]:bg-primary"
            />
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg border border-cream/10 bg-cream/5 gap-3">
            <div className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-cream/60" />
              <div>
                <p className="text-sm font-medium text-cream">Taux de TVA (%)</p>
                <p className="text-xs text-cream/50">Utilisé pour l'affichage HT (clients avec NIU).</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                max={100}
                step="0.01"
                value={tvaRate}
                onChange={(e) => setTvaRate(Number(e.target.value))}
                className="w-24 bg-cream/5 border-cream/20 text-cream text-center"
              />
              <Label className="text-cream/60 text-sm">%</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Discount Percentages */}
      <Card className="bg-noir/50 border-cream/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-cream font-display text-lg">
            <Percent className="h-5 w-5 text-primary" />
            {t("wholesaleSettings.discountsTitle")}
          </CardTitle>
          <p className="text-sm text-cream/50">
            {t("wholesaleSettings.discountsHelp")}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {WHOLESALE_TIERS.map((tier) => (
            <div key={tier.type} className="flex items-center gap-4 p-3 rounded-lg border border-cream/10 bg-cream/5">
              <Package className="h-5 w-5 text-cream/60 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-cream">
                  {tier.icon} {tier.label}
                </p>
                <p className="text-xs text-cream/40">{t("wholesaleSettings.bottles", { count: tier.quantity })}</p>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  max={50}
                  value={discounts[tier.type]}
                  onChange={(e) =>
                    setDiscounts((prev) => ({
                      ...prev,
                      [tier.type]: Number(e.target.value),
                    }))
                  }
                  className="w-20 bg-cream/5 border-cream/20 text-cream text-center"
                />
                <Label className="text-cream/60 text-sm">%</Label>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Custom labels FR/EN */}
      <Card className="bg-noir/50 border-cream/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-cream font-display text-lg">
            <Tag className="h-5 w-5 text-primary" />
            Libellés personnalisés
          </CardTitle>
          <p className="text-sm text-cream/50">
            Laissez vide pour conserver le libellé par défaut.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {WHOLESALE_TIERS.map((tier) => (
            <div key={tier.type} className="p-3 rounded-lg border border-cream/10 bg-cream/5 space-y-2">
              <p className="text-xs text-cream/50">{tier.icon} {tier.label}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <Input
                  placeholder="Libellé FR"
                  value={labels[tier.type]?.fr ?? ""}
                  onChange={(e) =>
                    setLabels((prev) => ({
                      ...prev,
                      [tier.type]: { ...prev[tier.type], fr: e.target.value },
                    }))
                  }
                  className="bg-cream/5 border-cream/20 text-cream"
                />
                <Input
                  placeholder="Label EN"
                  value={labels[tier.type]?.en ?? ""}
                  onChange={(e) =>
                    setLabels((prev) => ({
                      ...prev,
                      [tier.type]: { ...prev[tier.type], en: e.target.value },
                    }))
                  }
                  className="bg-cream/5 border-cream/20 text-cream"
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Tier Visibility */}
      <Card className="bg-noir/50 border-cream/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-cream font-display text-lg">
            <Eye className="h-5 w-5 text-primary" />
            {t("wholesaleSettings.visibilityTitle")}
          </CardTitle>
          <p className="text-sm text-cream/50">
            {t("wholesaleSettings.visibilityHelp")}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {WHOLESALE_TIERS.map((tier) => (
            <div key={tier.type} className="p-4 rounded-lg border border-cream/10 bg-cream/5 space-y-3">
              <p className="text-sm font-medium text-cream">
                {tier.icon} {tier.label} ({t("wholesaleSettings.bottles", { count: tier.quantity })})
              </p>
              <div className="flex flex-col gap-3 pl-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <LayoutGrid className="h-4 w-4 text-cream/50" />
                    <Label className="text-xs text-cream/70 cursor-pointer">
                      {t("wholesaleSettings.showOnCards")}
                    </Label>
                  </div>
                  <Switch
                    checked={cardTiers.includes(tier.type)}
                    onCheckedChange={() => toggleTier(tier.type, cardTiers, setCardTiers)}
                    className="data-[state=checked]:bg-primary"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-cream/50" />
                    <Label className="text-xs text-cream/70 cursor-pointer">
                      {t("wholesaleSettings.showOnDetail")}
                    </Label>
                  </div>
                  <Switch
                    checked={visibleTiers.includes(tier.type)}
                    onCheckedChange={() => toggleTier(tier.type, visibleTiers, setVisibleTiers)}
                    className="data-[state=checked]:bg-primary"
                  />
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-gradient-gold text-noir font-semibold gap-2 rounded-full h-11"
      >
        <Save className="h-4 w-4" />
        {t("wholesaleSettings.save")}
      </Button>
    </div>
  );
}
