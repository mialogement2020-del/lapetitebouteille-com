import { Scale, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProductComparator } from "@/hooks/useProductComparator";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
  const { addProduct, removeProduct, isInComparator, products } =
    useProductComparator();
  const isAdded = isInComparator(product.id);

  const handleClick = () => {
    if (isAdded) {
      removeProduct(product.id);
      toast.success(t("comparator.removed"));
    } else {
      const success = addProduct(product);
      if (success) {
        toast.success(t("comparator.added"), {
          description: t("comparator.addedDesc", { count: products.length + 1 }),
          action: {
            label: t("comparator.compareAction"),
            onClick: () => (window.location.href = "/comparer"),
          },
        });
      } else {
        toast.error(t("comparator.full"), {
          description: t("comparator.fullDesc"),
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
          {t("comparator.inCompare")}
        </>
      ) : (
        <>
          <Scale className="h-4 w-4 mr-2" />
          {t("comparator.compare")}
        </>
      )}
    </Button>
  );
}
