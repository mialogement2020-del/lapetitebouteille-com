import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Trash2, Calculator, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFormatPrice } from "@/hooks/useFormatPrice";
import {
  usePricingConfig,
  useUpdatePricingConfig,
  computePricingBreakdown,
  computePointsForPrice,
  type PointsTier,
} from "@/hooks/usePricingConfig";

export function PricingSettings() {
  const { data: config, isLoading } = usePricingConfig();
  const updateMutation = useUpdatePricingConfig();
  const formatPrice = useFormatPrice();

  const [markup, setMarkup] = useState(30);
  const [ambassador, setAmbassador] = useState(5);
  const [platform, setPlatform] = useState(95);
  const [tiers, setTiers] = useState<PointsTier[]>([]);
  const [previewPurchase, setPreviewPurchase] = useState(10000);

  useEffect(() => {
    if (config) {
      setMarkup(Number(config.global_markup_percent) || 0);
      setAmbassador(Number(config.ambassador_percent) || 0);
      setPlatform(Number(config.platform_percent) || 0);
      setTiers(config.points_tiers || []);
    }
  }, [config]);

  const breakdown = useMemo(
    () => computePricingBreakdown(previewPurchase || 0, markup, ambassador),
    [previewPurchase, markup, ambassador]
  );
  const previewPoints = useMemo(
    () => computePointsForPrice(breakdown.salePrice, tiers),
    [breakdown.salePrice, tiers]
  );

  const addTier = () =>
    setTiers((prev) => [...prev, { max: null, points: 10 }]);
  const removeTier = (idx: number) =>
    setTiers((prev) => prev.filter((_, i) => i !== idx));
  const updateTier = (idx: number, patch: Partial<PointsTier>) =>
    setTiers((prev) => prev.map((t, i) => (i === idx ? { ...t, ...patch } : t)));

  const save = () => {
    if (!config) return;
    updateMutation.mutate({
      id: config.id,
      global_markup_percent: markup,
      ambassador_percent: ambassador,
      platform_percent: platform,
      points_tiers: tiers,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-noir/50 border-gold/20">
        <CardHeader>
          <CardTitle className="text-cream flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            Marge & Commissions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-cream/80">Marge globale (%)</Label>
              <Input
                type="number"
                step="0.1"
                value={markup}
                onChange={(e) => setMarkup(Number(e.target.value))}
                className="bg-cream/5 border-gold/20 text-cream"
              />
              <p className="text-xs text-cream/50">Appliqué au prix d'achat pour calculer le prix de vente (par défaut).</p>
            </div>
            <div className="space-y-2">
              <Label className="text-cream/80">Commission ambassadeur (%)</Label>
              <Input
                type="number"
                step="0.1"
                value={ambassador}
                onChange={(e) => setAmbassador(Number(e.target.value))}
                className="bg-cream/5 border-gold/20 text-cream"
              />
              <p className="text-xs text-cream/50">% fixe du prix de vente reversé à l'ambassadeur.</p>
            </div>
            <div className="space-y-2">
              <Label className="text-cream/80">Part plateforme (%)</Label>
              <Input
                type="number"
                step="0.1"
                value={platform}
                onChange={(e) => setPlatform(Number(e.target.value))}
                className="bg-cream/5 border-gold/20 text-cream"
              />
              <p className="text-xs text-cream/50">Reste conservé par la plateforme.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-noir/50 border-gold/20">
        <CardHeader>
          <CardTitle className="text-cream flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Points ambassadeur par tranche de prix
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {tiers.map((tier, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-6 space-y-1">
                <Label className="text-cream/70 text-xs">Prix jusqu'à (FCFA)</Label>
                <Input
                  type="number"
                  placeholder="Illimité"
                  value={tier.max ?? ""}
                  onChange={(e) =>
                    updateTier(idx, { max: e.target.value ? Number(e.target.value) : null })
                  }
                  className="bg-cream/5 border-gold/20 text-cream"
                />
              </div>
              <div className="col-span-4 space-y-1">
                <Label className="text-cream/70 text-xs">Points</Label>
                <Input
                  type="number"
                  value={tier.points}
                  onChange={(e) => updateTier(idx, { points: Number(e.target.value) })}
                  className="bg-cream/5 border-gold/20 text-cream"
                />
              </div>
              <div className="col-span-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive"
                  onClick={() => removeTier(idx)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={addTier}
            className="border-gold/30 text-cream hover:bg-cream/10"
          >
            <Plus className="h-4 w-4 mr-1" /> Ajouter un palier
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-noir/50 border-gold/20">
        <CardHeader>
          <CardTitle className="text-cream">Aperçu en direct</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-cream/80">Prix d'achat de simulation (FCFA)</Label>
            <Input
              type="number"
              value={previewPurchase}
              onChange={(e) => setPreviewPurchase(Number(e.target.value))}
              className="bg-cream/5 border-gold/20 text-cream max-w-xs"
            />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
            <div className="p-3 rounded-lg bg-cream/5 border border-gold/10">
              <p className="text-cream/50 text-xs">Prix d'achat</p>
              <p className="text-cream font-semibold">{formatPrice(previewPurchase)}</p>
            </div>
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/30">
              <p className="text-cream/60 text-xs">Prix de vente</p>
              <p className="text-primary font-bold">{formatPrice(breakdown.salePrice)}</p>
            </div>
            <div className="p-3 rounded-lg bg-cream/5 border border-gold/10">
              <p className="text-cream/50 text-xs">Marge totale</p>
              <p className="text-cream font-semibold">{formatPrice(breakdown.margin)}</p>
            </div>
            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
              <p className="text-cream/60 text-xs">Ambassadeur</p>
              <p className="text-green-400 font-semibold">{formatPrice(breakdown.ambassadorEarning)}</p>
              <p className="text-[10px] text-cream/40">{previewPoints} pts</p>
            </div>
            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
              <p className="text-cream/60 text-xs">Plateforme</p>
              <p className="text-blue-400 font-semibold">{formatPrice(breakdown.platformEarning)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          onClick={save}
          disabled={updateMutation.isPending}
          className="bg-gradient-gold text-noir font-semibold hover:opacity-90"
        >
          {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Enregistrer
        </Button>
      </div>
    </div>
  );
}