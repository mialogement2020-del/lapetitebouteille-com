import { Star, CheckCircle, XCircle, ShoppingBag, Calendar, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { AdminReview } from "@/hooks/useAdmin";

interface ReviewModerationDialogProps {
  review: AdminReview | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApprove: (review: AdminReview) => Promise<void>;
  onReject: (review: AdminReview) => Promise<void>;
  isUpdating: boolean;
}

export function ReviewModerationDialog({ 
  review, 
  open, 
  onOpenChange, 
  onApprove, 
  onReject,
  isUpdating 
}: ReviewModerationDialogProps) {
  if (!review) return null;

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-5 w-5 ${
              star <= rating
                ? "text-primary fill-primary"
                : "text-cream/20"
            }`}
          />
        ))}
      </div>
    );
  };

  const handleApprove = async () => {
    await onApprove(review);
    onOpenChange(false);
  };

  const handleReject = async () => {
    await onReject(review);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-noir border-gold/30 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-cream flex items-center gap-3">
            <Star className="h-5 w-5 text-primary" />
            Modération d'avis
          </DialogTitle>
          <DialogDescription className="text-cream/60">
            Examiner et modérer cet avis client
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Product Info */}
          <div className="flex items-center gap-4 p-4 rounded-lg bg-cream/5 border border-gold/20">
            {review.product?.image_url ? (
              <img
                src={review.product.image_url}
                alt={review.product.name}
                className="h-16 w-16 rounded-lg object-cover"
              />
            ) : (
              <div className="h-16 w-16 rounded-lg bg-cream/10 flex items-center justify-center">
                <ShoppingBag className="h-8 w-8 text-cream/40" />
              </div>
            )}
            <div>
              <p className="text-cream font-medium">
                {review.product?.name || "Produit supprimé"}
              </p>
              <div className="flex items-center gap-2 mt-1">
                {renderStars(review.rating)}
                <span className="text-cream/60 text-sm">({review.rating}/5)</span>
              </div>
            </div>
          </div>

          {/* Status & Badges */}
          <div className="flex flex-wrap gap-2">
            <Badge className={`${
              review.is_approved 
                ? "bg-green-500/20 text-green-500 border-green-500/30" 
                : "bg-orange-500/20 text-orange-500 border-orange-500/30"
            } border`}>
              {review.is_approved ? "Approuvé" : "En attente de modération"}
            </Badge>
            {review.is_verified_purchase && (
              <Badge className="bg-blue-500/20 text-blue-500 border-blue-500/30 border">
                <ShoppingBag className="h-3 w-3 mr-1" />
                Achat vérifié
              </Badge>
            )}
          </div>

          {/* Review Content */}
          <div className="space-y-3">
            {review.title && (
              <div>
                <p className="text-cream/60 text-xs mb-1">Titre</p>
                <p className="text-cream font-medium">{review.title}</p>
              </div>
            )}
            <div>
              <p className="text-cream/60 text-xs mb-1">Commentaire</p>
              <div className="p-3 rounded-lg bg-cream/5 border border-gold/10">
                <p className="text-cream text-sm whitespace-pre-wrap">
                  {review.comment || "Aucun commentaire"}
                </p>
              </div>
            </div>
          </div>

          {/* Meta Info */}
          <div className="flex items-center gap-4 text-sm text-cream/60">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {formatDate(review.created_at)}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gold/20">
            <Button
              variant="outline"
              className="flex-1 border-gold/30 text-cream hover:bg-cream/10"
              onClick={() => onOpenChange(false)}
            >
              Fermer
            </Button>
            {!review.is_approved ? (
              <>
                <Button
                  variant="outline"
                  className="flex-1 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-500"
                  onClick={handleReject}
                  disabled={isUpdating}
                >
                  {isUpdating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 mr-2" />
                      Supprimer
                    </>
                  )}
                </Button>
                <Button
                  className="flex-1 bg-green-600 text-white hover:bg-green-700"
                  onClick={handleApprove}
                  disabled={isUpdating}
                >
                  {isUpdating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approuver
                    </>
                  )}
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                className="flex-1 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-500"
                onClick={handleReject}
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <XCircle className="h-4 w-4 mr-2" />
                    Désapprouver
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}