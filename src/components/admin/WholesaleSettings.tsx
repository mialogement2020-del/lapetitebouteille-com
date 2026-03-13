import { useState } from "react";
import { Save, Percent, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WHOLESALE_TIERS } from "@/hooks/useWholesale";
import { toast } from "@/hooks/use-toast";

// Store default tier percentages in localStorage for now
// (can be migrated to DB config table later)
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
  const [discounts, setDiscounts] = useState<Record<string, number>>(
    WHOLESALE_TIERS.reduce((acc, tier) => {
      acc[tier.type] = stored[tier.type] ?? tier.discountPercent;
      return acc;
    }, {} as Record<string, number>)
  );
  const [saving, setSaving] = useState(false);

  const handleSave = () => {
    setSaving(true);
    // Validate
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

    // Also update the WHOLESALE_TIERS in memory
    WHOLESALE_TIERS.forEach((tier) => {
      tier.discountPercent = discounts[tier.type];
    });

    toast({
      title: "✅ Paramètres sauvegardés",
      description: "Les pourcentages de remise en gros ont été mis à jour.",
    });
    setSaving(false);
  };

  return (
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
        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-gradient-gold text-noir font-semibold gap-2 rounded-full h-11"
        >
          <Save className="h-4 w-4" />
          Sauvegarder les pourcentages
        </Button>
      </CardContent>
    </Card>
  );
}
