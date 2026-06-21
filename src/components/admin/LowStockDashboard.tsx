import { useState } from "react";
import { AlertTriangle, Package, XCircle, TrendingDown, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { QuickRestockDialog } from "./QuickRestockDialog";
import { StockPredictions } from "./StockPredictions";
import { useStockPredictions } from "@/hooks/useStockPredictions";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import type { AdminProduct } from "@/hooks/useAdmin";
import type { UseMutationResult } from "@tanstack/react-query";

interface LowStockDashboardProps {
  products: AdminProduct[];
  isLoading: boolean;
  onEditProduct: (product: AdminProduct) => void;
  restockProduct?: UseMutationResult<void, Error, { id: string; newQuantity: number; oldQuantity: number; productName: string }>;
}

export function LowStockDashboard({ products, isLoading, onEditProduct, restockProduct: restockProductMutation }: LowStockDashboardProps) {
  const { t } = useTranslation();
  const [selectedRestockProduct, setSelectedRestockProduct] = useState<AdminProduct | null>(null);
  const [restockDialogOpen, setRestockDialogOpen] = useState(false);

  // Get stock predictions
  const { data: predictions = [], isLoading: isPredictionsLoading } = useStockPredictions(products, !isLoading);

  // Filter products by stock status
  const outOfStock = products.filter(p => (p.stock_quantity ?? 0) === 0 && p.is_active);
  const lowStock = products.filter(p => {
    const stock = p.stock_quantity ?? 0;
    return stock > 0 && stock <= 5 && p.is_active;
  });
  const criticalStock = products.filter(p => {
    const stock = p.stock_quantity ?? 0;
    return stock > 5 && stock <= 10 && p.is_active;
  });

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("fr-FR").format(price);
  };

  const handleQuickRestock = (product: AdminProduct, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedRestockProduct(product);
    setRestockDialogOpen(true);
  };

  const handleRestock = async (productId: string, newQuantity: number) => {
    if (!restockProductMutation) {
      console.error("restockProductMutation is not available");
      toast.error(t("adminStock.mutationUnavailable"));
      return;
    }
    if (!selectedRestockProduct) {
      console.error("No product selected for restock");
      toast.error(t("adminStock.noProductSelected"));
      return;
    }
    
    try {
      console.log("Restocking product:", {
        id: productId,
        newQuantity,
        oldQuantity: selectedRestockProduct.stock_quantity ?? 0,
        productName: selectedRestockProduct.name
      });
      
      await restockProductMutation.mutateAsync({
        id: productId,
        newQuantity,
        oldQuantity: selectedRestockProduct.stock_quantity ?? 0,
        productName: selectedRestockProduct.name
      });
      
      console.log("Restock successful, audit log should be created");
      toast.success(t("adminStock.updateSuccess"));
      setRestockDialogOpen(false);
      setSelectedRestockProduct(null);
    } catch (error) {
      console.error("Error during restock:", error);
      toast.error(t("adminStock.updateError"));
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="bg-noir/50 border-gold/20">
            <CardHeader>
              <Skeleton className="h-6 w-32 bg-cream/10" />
              <Skeleton className="h-4 w-48 bg-cream/10" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-24 w-full bg-cream/10" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const ProductItem = ({ product, variant }: { product: AdminProduct; variant: "danger" | "warning" | "caution" }) => {
    const variantStyles = {
      danger: "border-destructive/30 hover:border-destructive/50",
      warning: "border-warning/30 hover:border-warning/50",
      caution: "border-warning/30 hover:border-warning/50"
    };

    return (
      <div 
        className={`flex items-center gap-3 p-3 rounded-lg border bg-noir/30 cursor-pointer transition-colors ${variantStyles[variant]}`}
        onClick={() => onEditProduct(product)}
      >
        <div className="w-12 h-12 rounded-md overflow-hidden bg-cream/10 flex-shrink-0">
          {product.image_url ? (
            <img 
              src={product.image_url} 
              alt={product.name} 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="h-6 w-6 text-cream/30" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-cream truncate">{product.name}</p>
          <p className="text-xs text-cream/60">{formatPrice(product.price)} FCFA</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            size="sm"
            variant="outline"
            className="h-8 w-8 p-0 border-gold/30 text-gold hover:bg-gold/10"
            onClick={(e) => handleQuickRestock(product, e)}
            title={t("adminStock.restock")}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          {variant === "danger" ? (
            <Badge variant="destructive" className="text-xs">
              {t("adminStock.outOfStockBadge", "Rupture")}
            </Badge>
          ) : (
            <Badge 
              variant="outline" 
              className={variant === "warning" 
                ? "border-warning/50 text-warning text-xs" 
                : "border-warning/50 text-warning text-xs"
              }
            >
              {product.stock_quantity}
            </Badge>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Stock Predictions */}
      <StockPredictions 
        predictions={predictions} 
        isLoading={isPredictionsLoading} 
        onEditProduct={onEditProduct} 
      />

      {/* Quick Restock Dialog */}
      <QuickRestockDialog
        product={selectedRestockProduct}
        open={restockDialogOpen}
        onOpenChange={setRestockDialogOpen}
        onRestock={handleRestock}
        isLoading={restockProductMutation?.isPending}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-noir/50 border-destructive/30">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-destructive" />
              <CardTitle className="text-lg text-cream">{t("adminStock.outOfStock")}</CardTitle>
            </div>
            <CardDescription className="text-cream/60">
              {t("adminStock.activeProductsNoStock")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">{outOfStock.length}</div>
            <p className="text-xs text-cream/50 mt-1">
              {outOfStock.length === 0 ? t("adminStock.noOutOfStock") : t("adminStock.urgentRestock")}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-noir/50 border-warning/30">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              <CardTitle className="text-lg text-cream">{t("adminStock.lowStock")}</CardTitle>
            </div>
            <CardDescription className="text-cream/60">
              {t("adminStock.fiveUnitsOrLess")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-warning">{lowStock.length}</div>
            <p className="text-xs text-cream/50 mt-1">
              {lowStock.length === 0 ? t("adminStock.sufficientStock") : t("adminStock.productsToWatch")}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-noir/50 border-warning/30">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-warning" />
              <CardTitle className="text-lg text-cream">{t("adminStock.criticalStock")}</CardTitle>
            </div>
            <CardDescription className="text-cream/60">
              {t("adminStock.sixToTenUnits")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-warning">{criticalStock.length}</div>
            <p className="text-xs text-cream/50 mt-1">
              {criticalStock.length === 0 ? t("adminStock.noCriticalStock") : t("adminStock.productsToPlan")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Product Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Out of Stock */}
        <Card className="bg-noir/50 border-gold/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base text-cream flex items-center gap-2">
                <XCircle className="h-4 w-4 text-destructive" />
                {t("adminStock.outOfStock")}
              </CardTitle>
              {outOfStock.length > 0 && (
                <Badge variant="destructive">{outOfStock.length}</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {outOfStock.length === 0 ? (
              <div className="text-center py-6 text-cream/50">
                <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">{t("adminStock.noOutOfStock")}</p>
              </div>
            ) : (
              <ScrollArea className="h-[280px] pr-2">
                <div className="space-y-2">
                  {outOfStock.map((product) => (
                    <ProductItem key={product.id} product={product} variant="danger" />
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Low Stock */}
        <Card className="bg-noir/50 border-gold/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base text-cream flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" />
                {t("adminStock.lowStockRange")}
              </CardTitle>
              {lowStock.length > 0 && (
                <Badge variant="outline" className="border-warning/50 text-warning">
                  {lowStock.length}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {lowStock.length === 0 ? (
              <div className="text-center py-6 text-cream/50">
                <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">{t("adminStock.noLowStock")}</p>
              </div>
            ) : (
              <ScrollArea className="h-[280px] pr-2">
                <div className="space-y-2">
                  {lowStock.map((product) => (
                    <ProductItem key={product.id} product={product} variant="warning" />
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Critical Stock */}
        <Card className="bg-noir/50 border-gold/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base text-cream flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-warning" />
                {t("adminStock.criticalStockRange")}
              </CardTitle>
              {criticalStock.length > 0 && (
                <Badge variant="outline" className="border-warning/50 text-warning">
                  {criticalStock.length}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {criticalStock.length === 0 ? (
              <div className="text-center py-6 text-cream/50">
                <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">{t("adminStock.noCriticalStock")}</p>
              </div>
            ) : (
              <ScrollArea className="h-[280px] pr-2">
                <div className="space-y-2">
                  {criticalStock.map((product) => (
                    <ProductItem key={product.id} product={product} variant="caution" />
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
