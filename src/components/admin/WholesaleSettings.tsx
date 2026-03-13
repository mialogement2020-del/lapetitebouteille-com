import { useState, useEffect } from "react";
import { Save, Percent, Package, Eye, CreditCard, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WHOLESALE_TIERS } from "@/hooks/useWholesale";
import { useWholesaleTierConfig, useUpdateWholesaleTierConfig } from "@/hooks/useWholesaleTierConfig";
import { toast } from "@/hooks/use-toast";

const STORAGE_KEY = "wholesale_default_discounts";

function getStoredDiscounts(): Record<string, number> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return {};
}

export function WholesaleSettings() {
  const stored = getStoredDiscounts();
  const { data: tierConfig } = useWholesaleTierConfig();
  const updateConfig = useUpdateWholesaleTierConfig();

  const [discounts, setDiscounts] = useState<Record<string, number>>(
    WHOLESALE_TIERS.reduce((acc, tier) => {
      acc[tier.type] = stored[tier.type] ?? tier.discountPercent;
      return acc;
    }, {} as Record<string, number>)
  );

  const [cardTiers, setCardTiers] = useState<string[]>(["carton_6"]);
  const [visibleTiers, setVisibleTiers] = useState<string[]>(["carton_6"]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (tierConfig) {
      setCardTiers(tierConfig.card_tiers || ["carton_6"]);
      setVisibleTiers(tierConfig.visible_tiers || ["carton_6"]);
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
          title: "Erreur",
          description: `Le pourcentage pour ${tier.label} doit être entre 0% et 50%`,
          variant: "destructive",
        });
        setSaving(false);
        return;
      }
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(discounts));
    WHOLESALE_TIERS.forEach((tier) => {
      tier.discountPercent = discounts[tier.type];
    });

    try {
      await updateConfig.mutateAsync({
        visible_tiers: visibleTiers,
        card_tiers: cardTiers,
      });

      toast({
        title: "✅ Paramètres sauvegardés",
        description: "Les remises et la visibilité des paliers ont été mis à jour.",
      });
    } catch {
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder la configuration des paliers.",
        variant: "destructive",
      });
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      {/* Discount Percentages */}
      <Card className="bg-noir/50 border-cream/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-cream font-display text-lg">
            <Percent className="h-5 w-5 text-primary" />
            Pourcentages de remise par défaut
          </CardTitle>
          <p className="text-sm text-cream/50">
            Ces remises s'appliquent à tous les produits sauf ceux avec un prix personnalisé.
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
                <p className="text-xs text-cream/40">{tier.quantity} bouteilles</p>
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

      {/* Tier Visibility */}
      <Card className="bg-noir/50 border-cream/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-cream font-display text-lg">
            <Eye className="h-5 w-5 text-primary" />
            Visibilité des paliers
          </CardTitle>
          <p className="text-sm text-cream/50">
            Choisissez quels paliers sont visibles pour les clients.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {WHOLESALE_TIERS.map((tier) => (
            <div key={tier.type} className="p-4 rounded-lg border border-cream/10 bg-cream/5 space-y-3">
              <p className="text-sm font-medium text-cream">
                {tier.icon} {tier.label} ({tier.quantity} bouteilles)
              </p>
              <div className="flex flex-col gap-3 pl-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <LayoutGrid className="h-4 w-4 text-cream/50" />
                    <Label className="text-xs text-cream/70 cursor-pointer">
                      Afficher sur les fiches produit (catalogue)
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
                      Afficher sur la page détail du produit
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
        Sauvegarder tous les paramètres
      </Button>
    </div>
  );
}
