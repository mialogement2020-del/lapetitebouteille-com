import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWishlist } from "@/hooks/useWishlist";
import { useAuthContext } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface WishlistButtonProps {
  productId: string;
  variant?: "icon" | "full";
  className?: string;
  size?: "sm" | "default" | "lg" | "icon";
}

export const WishlistButton = ({
  productId,
  variant = "icon",
  className,
  size = "icon",
}: WishlistButtonProps) => {
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const { isInWishlist, toggleWishlist, addToWishlist, removeFromWishlist } = useWishlist();
  
  const inWishlist = isInWishlist(productId);
  const isLoading = addToWishlist.isPending || removeFromWishlist.isPending;

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) {
      toast.error("Connectez-vous pour ajouter aux favoris");
      navigate("/connexion");
      return;
    }
    
    await toggleWishlist(productId);
  };

  if (variant === "full") {
    return (
      <Button
        variant="outline"
        size={size}
        onClick={handleClick}
        disabled={isLoading}
        className={cn(
          "gap-2",
          inWishlist && "border-burgundy text-burgundy hover:bg-burgundy/10",
          className
        )}
      >
        <Heart
          className={cn(
            "h-4 w-4 transition-all",
            inWishlist && "fill-burgundy text-burgundy"
          )}
        />
        {inWishlist ? "Dans mes favoris" : "Favoris"}
      </Button>
    );
  }

  return (
    <Button
      size="icon"
      variant="secondary"
      onClick={handleClick}
      disabled={isLoading}
      className={cn(
        "h-9 w-9 rounded-full bg-white/90 hover:bg-white transition-all",
        inWishlist ? "text-burgundy" : "text-muted-foreground hover:text-burgundy",
        className
      )}
    >
      <Heart
        className={cn(
          "h-4 w-4 transition-all",
          inWishlist && "fill-burgundy"
        )}
      />
    </Button>
  );
};
