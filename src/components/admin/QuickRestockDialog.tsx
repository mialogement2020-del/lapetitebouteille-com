import { useState } from "react";
import { Package, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import type { AdminProduct } from "@/hooks/useAdmin";

interface QuickRestockDialogProps {
  product: AdminProduct | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRestock: (productId: string, newQuantity: number) => void;
  isLoading?: boolean;
}

export function QuickRestockDialog({
  product,
  open,
  onOpenChange,
  onRestock,
  isLoading,
}: QuickRestockDialogProps) {
  const [quantity, setQuantity] = useState<number>(0);
  const [addMode, setAddMode] = useState(true);

  const currentStock = product?.stock_quantity ?? 0;
  const newStock = addMode ? currentStock + quantity : quantity;

  const handleSubmit = () => {
    if (product && newStock >= 0) {
      onRestock(product.id, newStock);
    }
  };

  const handleQuantityChange = (value: string) => {
    const num = parseInt(value, 10);
    if (!isNaN(num) && num >= 0) {
      setQuantity(num);
    } else if (value === "") {
      setQuantity(0);
    }
  };

  const quickAddAmounts = [10, 25, 50, 100];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-noir border-gold/20 text-cream sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-cream flex items-center gap-2">
            <Package className="h-5 w-5 text-gold" />
            Réapprovisionnement rapide
          </DialogTitle>
          <DialogDescription className="text-cream/60">
            Mettez à jour le stock rapidement
          </DialogDescription>
        </DialogHeader>

        {product && (
          <div className="space-y-6">
            {/* Product Info */}
            <div className="flex items-center gap-4 p-4 rounded-lg bg-cream/5 border border-gold/10">
              <div className="w-16 h-16 rounded-md overflow-hidden bg-cream/10 flex-shrink-0">
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="h-8 w-8 text-cream/30" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-cream truncate">{product.name}</h4>
                <p className="text-sm text-cream/60">{product.category?.name || "Sans catégorie"}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-cream/50">Stock actuel:</span>
                  <Badge
                    variant={currentStock === 0 ? "destructive" : "outline"}
                    className={currentStock === 0 ? "" : "border-orange-500/50 text-orange-400"}
                  >
                    {currentStock} unités
                  </Badge>
                </div>
              </div>
            </div>

            {/* Mode Toggle */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant={addMode ? "default" : "outline"}
                className={addMode ? "flex-1 bg-gold text-noir hover:bg-gold/90" : "flex-1 border-gold/30 text-cream hover:bg-gold/10"}
                onClick={() => setAddMode(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Ajouter au stock
              </Button>
              <Button
                type="button"
                variant={!addMode ? "default" : "outline"}
                className={!addMode ? "flex-1 bg-gold text-noir hover:bg-gold/90" : "flex-1 border-gold/30 text-cream hover:bg-gold/10"}
                onClick={() => setAddMode(false)}
              >
                <Package className="h-4 w-4 mr-2" />
                Définir le stock
              </Button>
            </div>

            {/* Quantity Input */}
            <div className="space-y-3">
              <Label htmlFor="quantity" className="text-cream">
                {addMode ? "Quantité à ajouter" : "Nouveau stock"}
              </Label>
              <Input
                id="quantity"
                type="number"
                min="0"
                value={quantity}
                onChange={(e) => handleQuantityChange(e.target.value)}
                className="bg-noir border-gold/30 text-cream text-center text-2xl font-bold h-14"
                placeholder="0"
              />
            </div>

            {/* Quick Add Buttons */}
            {addMode && (
              <div className="space-y-2">
                <Label className="text-cream/60 text-xs">Ajout rapide</Label>
                <div className="flex gap-2">
                  {quickAddAmounts.map((amount) => (
                    <Button
                      key={amount}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="flex-1 border-gold/30 text-cream hover:bg-gold/10"
                      onClick={() => setQuantity(quantity + amount)}
                    >
                      +{amount}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Preview */}
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
              <div className="flex items-center justify-between">
                <span className="text-sm text-cream/70">Nouveau stock:</span>
                <span className="text-2xl font-bold text-green-400">{newStock} unités</span>
              </div>
              {addMode && quantity > 0 && (
                <p className="text-xs text-cream/50 mt-1">
                  {currentStock} + {quantity} = {newStock}
                </p>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-gold/30 text-cream hover:bg-gold/10"
          >
            Annuler
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading || (addMode && quantity === 0)}
            className="bg-gold text-noir hover:bg-gold/90"
          >
            {isLoading ? "Mise à jour..." : "Mettre à jour le stock"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
