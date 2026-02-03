import { Link } from "react-router-dom";
import { AlertTriangle, Package, XCircle, TrendingDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import type { AdminProduct } from "@/hooks/useAdmin";

interface LowStockDashboardProps {
  products: AdminProduct[];
  isLoading: boolean;
  onEditProduct: (product: AdminProduct) => void;
}

export function LowStockDashboard({ products, isLoading, onEditProduct }: LowStockDashboardProps) {
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
      warning: "border-orange-500/30 hover:border-orange-500/50",
      caution: "border-yellow-500/30 hover:border-yellow-500/50"
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
        <div className="text-right flex-shrink-0">
          {variant === "danger" ? (
            <Badge variant="destructive" className="text-xs">
              Rupture
            </Badge>
          ) : (
            <Badge 
              variant="outline" 
              className={variant === "warning" 
                ? "border-orange-500/50 text-orange-400 text-xs" 
                : "border-yellow-500/50 text-yellow-400 text-xs"
              }
            >
              {product.stock_quantity} en stock
            </Badge>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-noir/50 border-destructive/30">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-destructive" />
              <CardTitle className="text-lg text-cream">Rupture de stock</CardTitle>
            </div>
            <CardDescription className="text-cream/60">
              Produits actifs sans stock disponible
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">{outOfStock.length}</div>
            <p className="text-xs text-cream/50 mt-1">
              {outOfStock.length === 0 ? "Aucun produit en rupture" : "produits à réapprovisionner urgemment"}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-noir/50 border-orange-500/30">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <CardTitle className="text-lg text-cream">Stock faible</CardTitle>
            </div>
            <CardDescription className="text-cream/60">
              Produits avec 5 unités ou moins
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-500">{lowStock.length}</div>
            <p className="text-xs text-cream/50 mt-1">
              {lowStock.length === 0 ? "Tous les stocks sont suffisants" : "produits à surveiller"}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-noir/50 border-yellow-500/30">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-yellow-500" />
              <CardTitle className="text-lg text-cream">Stock critique</CardTitle>
            </div>
            <CardDescription className="text-cream/60">
              Produits avec 6 à 10 unités
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-500">{criticalStock.length}</div>
            <p className="text-xs text-cream/50 mt-1">
              {criticalStock.length === 0 ? "Aucun stock critique" : "produits à planifier"}
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
                Rupture de stock
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
                <p className="text-sm">Aucun produit en rupture</p>
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
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                Stock faible (1-5)
              </CardTitle>
              {lowStock.length > 0 && (
                <Badge variant="outline" className="border-orange-500/50 text-orange-400">
                  {lowStock.length}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {lowStock.length === 0 ? (
              <div className="text-center py-6 text-cream/50">
                <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Aucun produit en stock faible</p>
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
                <TrendingDown className="h-4 w-4 text-yellow-500" />
                Stock critique (6-10)
              </CardTitle>
              {criticalStock.length > 0 && (
                <Badge variant="outline" className="border-yellow-500/50 text-yellow-400">
                  {criticalStock.length}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {criticalStock.length === 0 ? (
              <div className="text-center py-6 text-cream/50">
                <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Aucun produit en stock critique</p>
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
