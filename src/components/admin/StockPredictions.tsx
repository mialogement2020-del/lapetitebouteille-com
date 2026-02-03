import { useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  AlertTriangle, 
  Clock, 
  Package,
  ChevronDown,
  ChevronUp,
  Calendar,
  BarChart3
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { StockPrediction } from "@/hooks/useStockPredictions";
import type { AdminProduct } from "@/hooks/useAdmin";

interface StockPredictionsProps {
  predictions: StockPrediction[];
  isLoading: boolean;
  onEditProduct: (product: AdminProduct) => void;
}

export function StockPredictions({ predictions, isLoading, onEditProduct }: StockPredictionsProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Filter to show only products with predictions (sales activity or low stock)
  const relevantPredictions = predictions.filter(p => 
    p.urgency !== "safe" || p.salesLast30Days > 0
  );

  const criticalCount = predictions.filter(p => p.urgency === "critical").length;
  const warningCount = predictions.filter(p => p.urgency === "warning").length;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("fr-FR").format(price);
  };

  const getTrendIcon = (trend: StockPrediction["trend"]) => {
    switch (trend) {
      case "increasing":
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case "decreasing":
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-cream/50" />;
    }
  };

  const getUrgencyBadge = (urgency: StockPrediction["urgency"]) => {
    switch (urgency) {
      case "critical":
        return <Badge variant="destructive">Critique</Badge>;
      case "warning":
        return <Badge variant="outline" className="border-orange-500/50 text-orange-400">Attention</Badge>;
      case "moderate":
        return <Badge variant="outline" className="border-yellow-500/50 text-yellow-400">Modéré</Badge>;
      default:
        return <Badge variant="outline" className="border-green-500/50 text-green-400">Stable</Badge>;
    }
  };

  const formatDaysUntilStockout = (days: number | null): string => {
    if (days === null) return "N/A";
    if (days === 0) return "Rupture";
    if (days === 1) return "Demain";
    if (days <= 7) return `${days} jours`;
    if (days <= 30) return `~${Math.ceil(days / 7)} sem.`;
    return `~${Math.ceil(days / 30)} mois`;
  };

  if (isLoading) {
    return (
      <Card className="bg-noir/50 border-gold/20">
        <CardHeader>
          <Skeleton className="h-6 w-48 bg-cream/10" />
          <Skeleton className="h-4 w-64 bg-cream/10" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full bg-cream/10" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <Card className="bg-noir/50 border-gold/20">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-gold/5 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BarChart3 className="h-5 w-5 text-gold" />
                <div>
                  <CardTitle className="text-lg text-cream">Prévisions de rupture</CardTitle>
                  <CardDescription className="text-cream/60">
                    Basées sur les ventes des 30 derniers jours
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {criticalCount > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {criticalCount} critique{criticalCount > 1 ? "s" : ""}
                  </Badge>
                )}
                {warningCount > 0 && (
                  <Badge variant="outline" className="border-orange-500/50 text-orange-400 text-xs">
                    {warningCount} attention
                  </Badge>
                )}
                {isExpanded ? (
                  <ChevronUp className="h-5 w-5 text-cream/50" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-cream/50" />
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0">
            {relevantPredictions.length === 0 ? (
              <div className="text-center py-8 text-cream/50">
                <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Aucune prévision disponible</p>
                <p className="text-xs mt-1">Les prévisions apparaîtront lorsque des ventes seront enregistrées</p>
              </div>
            ) : (
              <ScrollArea className="h-[400px] pr-2">
                <div className="space-y-3">
                  {relevantPredictions.map((prediction) => (
                    <div
                      key={prediction.product.id}
                      className="flex items-start gap-4 p-4 rounded-lg border border-gold/20 bg-noir/30 hover:border-gold/40 cursor-pointer transition-colors"
                      onClick={() => onEditProduct(prediction.product)}
                    >
                      {/* Product Image */}
                      <div className="w-14 h-14 rounded-md overflow-hidden bg-cream/10 flex-shrink-0">
                        {prediction.product.image_url ? (
                          <img
                            src={prediction.product.image_url}
                            alt={prediction.product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="h-6 w-6 text-cream/30" />
                          </div>
                        )}
                      </div>

                      {/* Product Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-medium text-cream truncate">{prediction.product.name}</p>
                            <p className="text-xs text-cream/60">{formatPrice(prediction.product.price)} FCFA</p>
                          </div>
                          {getUrgencyBadge(prediction.urgency)}
                        </div>

                        {/* Stats Row */}
                        <div className="flex items-center gap-4 mt-3 text-xs text-cream/70">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center gap-1">
                                  <Package className="h-3.5 w-3.5" />
                                  <span className="font-medium">{prediction.product.stock_quantity ?? 0}</span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Stock actuel</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>

                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center gap-1">
                                  <BarChart3 className="h-3.5 w-3.5" />
                                  <span>{prediction.dailySalesRate}/jour</span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Taux de vente quotidien moyen</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>

                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center gap-1">
                                  {getTrendIcon(prediction.trend)}
                                  <span>
                                    {prediction.trend === "increasing" ? "Hausse" : 
                                     prediction.trend === "decreasing" ? "Baisse" : "Stable"}
                                  </span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Tendance des ventes (7j vs 30j)</p>
                                <p className="text-xs text-cream/60">
                                  7 derniers jours: {prediction.salesLast7Days} vendus
                                </p>
                                <p className="text-xs text-cream/60">
                                  30 derniers jours: {prediction.salesLast30Days} vendus
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>

                          {prediction.daysUntilStockout !== null && (
                            <>
                              <div className="h-3 w-px bg-cream/20" />
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex items-center gap-1">
                                      <Clock className={`h-3.5 w-3.5 ${
                                        prediction.urgency === "critical" ? "text-destructive" :
                                        prediction.urgency === "warning" ? "text-orange-500" : ""
                                      }`} />
                                      <span className={`font-medium ${
                                        prediction.urgency === "critical" ? "text-destructive" :
                                        prediction.urgency === "warning" ? "text-orange-400" : ""
                                      }`}>
                                        {formatDaysUntilStockout(prediction.daysUntilStockout)}
                                      </span>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Rupture prévue dans {prediction.daysUntilStockout} jours</p>
                                    {prediction.predictedStockoutDate && (
                                      <p className="text-xs text-cream/60">
                                        {format(prediction.predictedStockoutDate, "EEEE d MMMM yyyy", { locale: fr })}
                                      </p>
                                    )}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
