import { useState } from "react";
import { ShoppingCart, Check, Loader2 } from "lucide-react";
import { Button, ButtonProps } from "@/components/ui/button";
import { useCartContext } from "@/contexts/CartContext";
import { toast } from "@/hooks/use-toast";

interface AddToCartButtonProps extends Omit<ButtonProps, "onClick"> {
  productId: string;
  productName: string;
  quantity?: number;
  disabled?: boolean;
  showText?: boolean;
  iconOnly?: boolean;
}

export function AddToCartButton({
  productId,
  productName,
  quantity = 1,
  disabled = false,
  showText = true,
  iconOnly = false,
  className,
  ...props
}: AddToCartButtonProps) {
  const { addItem } = useCartContext();
  const [isAdding, setIsAdding] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (disabled || isAdding) return;

    setIsAdding(true);

    try {
      await addItem(productId, quantity);
      setJustAdded(true);
      
      toast({
        title: "Ajouté au panier",
        description: `${productName} (${quantity}) a été ajouté à votre panier.`,
      });

      // Reset the "just added" state after 2 seconds
      setTimeout(() => setJustAdded(false), 2000);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter le produit au panier.",
        variant: "destructive",
      });
    } finally {
      setIsAdding(false);
    }
  };

  if (iconOnly) {
    return (
      <Button
        size="icon"
        onClick={handleAddToCart}
        disabled={disabled || isAdding}
        className={className}
        {...props}
      >
        {isAdding ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : justAdded ? (
          <Check className="h-4 w-4" />
        ) : (
          <ShoppingCart className="h-4 w-4" />
        )}
      </Button>
    );
  }

  return (
    <Button
      onClick={handleAddToCart}
      disabled={disabled || isAdding}
      className={className}
      {...props}
    >
      {isAdding ? (
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
      ) : justAdded ? (
        <Check className="h-5 w-5 mr-2" />
      ) : (
        <ShoppingCart className="h-5 w-5 mr-2" />
      )}
      {showText && (justAdded ? "Ajouté !" : "Ajouter au panier")}
    </Button>
  );
}
