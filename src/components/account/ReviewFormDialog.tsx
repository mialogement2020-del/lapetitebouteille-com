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
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
  const [rating, setRating] = useState(existingReview?.rating || 0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [title, setTitle] = useState(existingReview?.title || "");
  const [comment, setComment] = useState(existingReview?.comment || "");

  const isEdit = !!existingReview;
  const productName = product?.product_name || existingReview?.product?.name || t("reviewForm.defaultProduct");
  const productImage = product?.product_image || existingReview?.product?.image_url;
  const productId = product?.product_id || existingReview?.product_id || "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (rating === 0) {
      toast.error(t("reviewForm.errorRating"));
      return;
    }

    if (title.trim().length > 100) {
      toast.error(t("reviewForm.errorTitleLong"));
      return;
    }

    if (comment.trim().length > 1000) {
      toast.error(t("reviewForm.errorCommentLong"));
      return;
    }

    try {
      await onSubmit({
        product_id: productId,
        rating,
        title: title.trim() || undefined,
        comment: comment.trim() || undefined,
      });

      toast.success(isEdit ? t("reviewForm.editedTitle") : t("reviewForm.sentTitle"), {
        description: isEdit ? t("reviewForm.editedDesc") : t("reviewForm.sentDesc"),
      });

      onOpenChange(false);
      resetForm();
    } catch (error) {
      toast.error(t("reviewForm.errorSubmit"));
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
            {isEdit ? t("reviewForm.editTitle") : t("reviewForm.newTitle")}
          </DialogTitle>
          <DialogDescription className="text-cream/60">
            {isEdit ? t("reviewForm.editDesc") : t("reviewForm.newDesc")}
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
              <p className="text-cream/50 text-sm">{t("reviewForm.orderLabel", { order: product.order_number })}</p>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Star Rating */}
          <div className="space-y-2">
            <Label className="text-cream">{t("reviewForm.ratingLabel")}</Label>
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
                {rating > 0 ? `${rating}/5` : t("reviewForm.ratingPlaceholder")}
              </span>
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-cream">
              {t("reviewForm.titleLabel")}
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("reviewForm.titlePlaceholder")}
              maxLength={100}
              className="bg-cream/5 border-gold/20 text-cream placeholder:text-cream/40"
            />
            <p className="text-cream/40 text-xs">{t("reviewForm.chars", { count: title.length, max: 100 })}</p>
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <Label htmlFor="comment" className="text-cream">
              {t("reviewForm.commentLabel")}
            </Label>
            <Textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={t("reviewForm.commentPlaceholder")}
              maxLength={1000}
              rows={4}
              className="bg-cream/5 border-gold/20 text-cream placeholder:text-cream/40 resize-none"
            />
            <p className="text-cream/40 text-xs">{t("reviewForm.chars", { count: comment.length, max: 1000 })}</p>
          </div>

          {/* Info Notice */}
          {!isEdit && (
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
              <p className="text-primary text-sm">
                {t("reviewForm.infoNotice")}
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
              {t("reviewForm.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || rating === 0}
              className="bg-primary text-noir hover:bg-primary/90"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t("reviewForm.sending")}
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  {isEdit ? t("reviewForm.edit") : t("reviewForm.submit")}
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
