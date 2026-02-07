import { Scale, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProductComparator } from "@/hooks/useProductComparator";
import { toast } from "sonner";

interface ComparatorButtonProps {
  product: {
    id: string;
    name: string;
    slug: string;
    price: number;
    original_price?: number | null;
    image_url?: string | null;
    alcohol_percentage?: number | null;
    volume_ml?: number | null;
    origin_country?: string | null;
    region?: string | null;
    grape_variety?: string | null;
    tasting_notes?: string | null;
    average_rating?: number | null;
    review_count?: number | null;
  };
  variant?: "icon" | "full";
  className?: string;
}

export function ComparatorButton({
  product,
  variant = "icon",
  className = "",
}: ComparatorButtonProps) {
  const { addProduct, removeProduct, isInComparator, products } =
    useProductComparator();
  const isAdded = isInComparator(product.id);

  const handleClick = () => {
    if (isAdded) {
      removeProduct(product.id);
      toast.success("Retiré du comparateur");
    } else {
      const success = addProduct(product);
      if (success) {
        toast.success("Ajouté au comparateur", {
          description: `${products.length + 1}/3 produits`,
          action: {
            label: "Comparer",
            onClick: () => (window.location.href = "/comparer"),
          },
        });
      } else {
        toast.error("Comparateur plein", {
          description: "Retirez un produit pour en ajouter un nouveau (max 3)",
        });
      }
    }
  };

  if (variant === "icon") {
    return (
      <Button
        variant="outline"
        size="icon"
        onClick={handleClick}
        className={`${
          isAdded
            ? "bg-primary/20 border-primary text-primary"
            : "border-gold/30 text-cream hover:border-gold/50"
        } ${className}`}
      >
        {isAdded ? (
          <Check className="h-4 w-4" />
        ) : (
          <Scale className="h-4 w-4" />
        )}
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      onClick={handleClick}
      className={`${
        isAdded
          ? "bg-primary/20 border-primary text-primary"
          : "border-gold/30 text-cream hover:border-gold/50"
      } ${className}`}
    >
      {isAdded ? (
        <>
          <Check className="h-4 w-4 mr-2" />
          Dans le comparateur
        </>
      ) : (
        <>
          <Scale className="h-4 w-4 mr-2" />
          Comparer
        </>
      )}
    </Button>
  );
}
