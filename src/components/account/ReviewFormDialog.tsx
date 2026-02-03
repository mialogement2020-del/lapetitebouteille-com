import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, X, Send, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import type { PurchasedProduct, ReviewWithProduct, ReviewFormData } from "@/hooks/useReviews";

interface ReviewFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: PurchasedProduct | null;
  existingReview?: ReviewWithProduct | null;
  onSubmit: (data: ReviewFormData) => Promise<void>;
  isSubmitting: boolean;
}

export function ReviewFormDialog({
  open,
  onOpenChange,
  product,
  existingReview,
  onSubmit,
  isSubmitting,
}: ReviewFormDialogProps) {
  const [rating, setRating] = useState(existingReview?.rating || 0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [title, setTitle] = useState(existingReview?.title || "");
  const [comment, setComment] = useState(existingReview?.comment || "");

  const isEdit = !!existingReview;
  const productName = product?.product_name || existingReview?.product?.name || "Produit";
  const productImage = product?.product_image || existingReview?.product?.image_url;
  const productId = product?.product_id || existingReview?.product_id || "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (rating === 0) {
      toast.error("Veuillez sélectionner une note");
      return;
    }

    if (title.trim().length > 100) {
      toast.error("Le titre doit faire moins de 100 caractères");
      return;
    }

    if (comment.trim().length > 1000) {
      toast.error("Le commentaire doit faire moins de 1000 caractères");
      return;
    }

    try {
      await onSubmit({
        product_id: productId,
        rating,
        title: title.trim() || undefined,
        comment: comment.trim() || undefined,
      });

      toast.success(isEdit ? "Avis modifié !" : "Avis envoyé !", {
        description: isEdit 
          ? "Votre avis a été mis à jour."
          : "Votre avis sera visible après modération.",
      });

      onOpenChange(false);
      resetForm();
    } catch (error) {
      toast.error("Erreur lors de l'envoi de l'avis");
    }
  };

  const resetForm = () => {
    if (!existingReview) {
      setRating(0);
      setTitle("");
      setComment("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-noir border-gold/30 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-cream font-display text-xl">
            {isEdit ? "Modifier mon avis" : "Laisser un avis"}
          </DialogTitle>
          <DialogDescription className="text-cream/60">
            {isEdit 
              ? "Modifiez votre avis sur ce produit"
              : "Partagez votre expérience avec ce produit"
            }
          </DialogDescription>
        </DialogHeader>

        {/* Product Preview */}
        <div className="flex items-center gap-4 p-4 rounded-lg bg-cream/5 border border-gold/20">
          {productImage ? (
            <img
              src={productImage}
              alt={productName}
              className="h-16 w-16 rounded-lg object-cover"
            />
          ) : (
            <div className="h-16 w-16 rounded-lg bg-cream/10 flex items-center justify-center">
              <Star className="h-6 w-6 text-cream/30" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-cream font-medium truncate">{productName}</p>
            {product?.order_number && (
              <p className="text-cream/50 text-sm">Commande {product.order_number}</p>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Star Rating */}
          <div className="space-y-2">
            <Label className="text-cream">Votre note *</Label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <motion.button
                  key={star}
                  type="button"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  className="p-1 focus:outline-none focus:ring-2 focus:ring-primary rounded"
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  onClick={() => setRating(star)}
                >
                  <Star
                    className={`h-8 w-8 transition-colors ${
                      star <= (hoveredRating || rating)
                        ? "fill-primary text-primary"
                        : "text-cream/30"
                    }`}
                  />
                </motion.button>
              ))}
              <span className="ml-3 text-cream/60 text-sm">
                {rating > 0 ? `${rating}/5` : "Sélectionnez une note"}
              </span>
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-cream">
              Titre de l'avis (optionnel)
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Excellent rapport qualité-prix"
              maxLength={100}
              className="bg-cream/5 border-gold/20 text-cream placeholder:text-cream/40"
            />
            <p className="text-cream/40 text-xs">{title.length}/100 caractères</p>
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <Label htmlFor="comment" className="text-cream">
              Votre commentaire (optionnel)
            </Label>
            <Textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Décrivez votre expérience avec ce produit..."
              maxLength={1000}
              rows={4}
              className="bg-cream/5 border-gold/20 text-cream placeholder:text-cream/40 resize-none"
            />
            <p className="text-cream/40 text-xs">{comment.length}/1000 caractères</p>
          </div>

          {/* Info Notice */}
          {!isEdit && (
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
              <p className="text-primary text-sm">
                Votre avis sera vérifié avant d'être publié. Les avis vérifiés aident 
                les autres clients à faire leur choix.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-gold/30 text-cream hover:bg-cream/10"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || rating === 0}
              className="bg-primary text-noir hover:bg-primary/90"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Envoi...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  {isEdit ? "Modifier" : "Envoyer"}
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
