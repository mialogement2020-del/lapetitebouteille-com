import { useState, useEffect } from "react";
import { Settings, AlertTriangle, Save, RefreshCw, Check, Info } from "lucide-react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface StockAlertSettingsProps {
  onSettingsApplied?: () => void;
}

export function StockAlertSettings({ onSettingsApplied }: StockAlertSettingsProps) {
  const [globalThreshold, setGlobalThreshold] = useState(5);
  const [isApplying, setIsApplying] = useState(false);
  const [productsUpdated, setProductsUpdated] = useState<number | null>(null);

  const handleApplyToAll = async () => {
    setIsApplying(true);
    setProductsUpdated(null);

    try {
      // Update all products with the new global threshold
      const { data, error } = await supabase
        .from("products")
        .update({ low_stock_threshold: globalThreshold })
        .select("id");

      if (error) throw error;

      const count = data?.length || 0;
      setProductsUpdated(count);

      toast({
        title: "Seuils mis à jour",
        description: `Le seuil d'alerte de ${count} produit${count > 1 ? "s" : ""} a été défini à ${globalThreshold} unités.`,
      });

      onSettingsApplied?.();
    } catch (error) {
      console.error("Error applying global threshold:", error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour les seuils d'alerte",
        variant: "destructive",
      });
    } finally {
      setIsApplying(false);
    }
  };

  const handleApplyToProductsWithoutThreshold = async () => {
    setIsApplying(true);
    setProductsUpdated(null);

    try {
      // Update only products that have the default threshold (5) or null
      const { data, error } = await supabase
        .from("products")
        .update({ low_stock_threshold: globalThreshold })
        .or("low_stock_threshold.is.null,low_stock_threshold.eq.5")
        .select("id");

      if (error) throw error;

      const count = data?.length || 0;
      setProductsUpdated(count);

      toast({
        title: "Seuils mis à jour",
        description: `Le seuil de ${count} produit${count > 1 ? "s" : ""} (sans seuil personnalisé) a été défini à ${globalThreshold} unités.`,
      });

      onSettingsApplied?.();
    } catch (error) {
      console.error("Error applying threshold:", error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour les seuils",
        variant: "destructive",
      });
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <Card className="bg-noir/50 border-gold/20">
      <CardHeader>
        <CardTitle className="text-cream flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary" />
          Paramètres des alertes de stock
        </CardTitle>
        <CardDescription className="text-cream/60">
          Configurez les seuils d'alerte globaux pour tous les produits
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Global Threshold Setting */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="threshold" className="text-cream font-medium">
              Seuil d'alerte global
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="threshold"
                type="number"
                min={1}
                max={100}
                value={globalThreshold}
                onChange={(e) => setGlobalThreshold(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-20 bg-noir border-gold/30 text-cream text-center"
              />
              <span className="text-cream/60 text-sm">unités</span>
            </div>
          </div>

          <Slider
            value={[globalThreshold]}
            onValueChange={(value) => setGlobalThreshold(value[0])}
            min={1}
            max={50}
            step={1}
            className="py-4"
          />

          <div className="flex justify-between text-xs text-cream/40">
            <span>1 unité</span>
            <span>25 unités</span>
            <span>50 unités</span>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-cream/5 border border-gold/10 rounded-lg p-4">
          <div className="flex gap-3">
            <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="text-sm text-cream/70">
              <p className="mb-2">
                Le seuil d'alerte détermine quand une notification est envoyée :
              </p>
              <ul className="list-disc list-inside space-y-1 text-cream/60">
                <li>
                  <strong className="text-orange-400">Stock faible</strong> : quand le stock atteint le seuil
                </li>
                <li>
                  <strong className="text-destructive">Rupture de stock</strong> : quand le stock atteint 0
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
          {/* Apply to products without custom threshold */}
          <Button
            variant="outline"
            onClick={handleApplyToProductsWithoutThreshold}
            disabled={isApplying}
            className="border-gold/30 hover:bg-cream/5 text-cream"
          >
            {isApplying ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Appliquer aux produits sans seuil
          </Button>

          {/* Apply to ALL products - with confirmation */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="default"
                disabled={isApplying}
                className="bg-gradient-gold text-noir font-semibold hover:opacity-90"
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                Appliquer à TOUS les produits
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-noir border-gold/30">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-cream">
                  Confirmer la modification globale
                </AlertDialogTitle>
                <AlertDialogDescription className="text-cream/70">
                  Cette action va définir le seuil d'alerte de <strong className="text-primary">tous les produits</strong> à{" "}
                  <strong className="text-orange-400">{globalThreshold} unités</strong>.
                  <br /><br />
                  Les seuils personnalisés existants seront écrasés. Cette action est irréversible.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="border-gold/30 text-cream hover:bg-cream/5">
                  Annuler
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleApplyToAll}
                  className="bg-orange-500 text-white hover:bg-orange-600"
                >
                  Confirmer
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {/* Success feedback */}
        {productsUpdated !== null && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg"
          >
            <Check className="h-5 w-5 text-green-500" />
            <span className="text-green-400 text-sm">
              {productsUpdated} produit{productsUpdated > 1 ? "s" : ""} mis à jour avec succès
            </span>
          </motion.div>
        )}

        {/* Current Thresholds Overview */}
        <ThresholdOverview />
      </CardContent>
    </Card>
  );
}

// Sub-component to show current threshold distribution
function ThresholdOverview() {
  const [stats, setStats] = useState<{ threshold: number; count: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data, error } = await supabase
          .from("products")
          .select("low_stock_threshold");

        if (error) throw error;

        // Group by threshold
        const thresholdMap = new Map<number, number>();
        (data || []).forEach((p) => {
          const threshold = p.low_stock_threshold ?? 5;
          thresholdMap.set(threshold, (thresholdMap.get(threshold) || 0) + 1);
        });

        // Convert to array and sort
        const statsArray = Array.from(thresholdMap.entries())
          .map(([threshold, count]) => ({ threshold, count }))
          .sort((a, b) => a.threshold - b.threshold);

        setStats(statsArray);
      } catch (error) {
        console.error("Error fetching threshold stats:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (isLoading || stats.length === 0) return null;

  const totalProducts = stats.reduce((sum, s) => sum + s.count, 0);

  return (
    <div className="pt-4 border-t border-gold/10">
      <h4 className="text-sm font-medium text-cream mb-3">
        Distribution actuelle des seuils
      </h4>
      <div className="space-y-2">
        {stats.map(({ threshold, count }) => {
          const percentage = Math.round((count / totalProducts) * 100);
          return (
            <div key={threshold} className="flex items-center gap-3">
              <span className="text-xs text-cream/60 w-20">
                {threshold} unité{threshold > 1 ? "s" : ""}
              </span>
              <div className="flex-1 h-2 bg-cream/10 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="h-full bg-gradient-to-r from-primary to-orange-400 rounded-full"
                />
              </div>
              <span className="text-xs text-cream/60 w-16 text-right">
                {count} ({percentage}%)
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
