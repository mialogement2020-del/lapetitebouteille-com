import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Star, 
  MessageSquare, 
  Edit2, 
  Trash2, 
  CheckCircle, 
  Clock, 
  ShoppingBag,
  Plus
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useReviews, type ReviewWithProduct, type PurchasedProduct, type ReviewFormData } from "@/hooks/useReviews";
import { ReviewFormDialog } from "./ReviewFormDialog";

export function MyReviews() {
  const { 
    reviews, 
    isLoadingReviews, 
    reviewableProducts, 
    isLoadingProducts,
    createReview,
    updateReview,
    deleteReview,
  } = useReviews();

  const [selectedProduct, setSelectedProduct] = useState<PurchasedProduct | null>(null);
  const [selectedReview, setSelectedReview] = useState<ReviewWithProduct | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [reviewToDelete, setReviewToDelete] = useState<string | null>(null);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const handleNewReview = (product: PurchasedProduct) => {
    setSelectedProduct(product);
    setSelectedReview(null);
    setIsFormOpen(true);
  };

  const handleEditReview = (review: ReviewWithProduct) => {
    setSelectedReview(review);
    setSelectedProduct(null);
    setIsFormOpen(true);
  };

  const handleSubmitReview = async (data: ReviewFormData) => {
    if (selectedReview) {
      await updateReview.mutateAsync({ id: selectedReview.id, data });
    } else {
      await createReview.mutateAsync(data);
    }
  };

  const handleDeleteReview = async () => {
    if (!reviewToDelete) return;

    try {
      await deleteReview.mutateAsync(reviewToDelete);
      toast.success("Avis supprimé", {
        description: "Votre avis a été supprimé avec succès.",
      });
    } catch (error) {
      toast.error("Erreur lors de la suppression");
    } finally {
      setReviewToDelete(null);
    }
  };

  const isLoading = isLoadingReviews || isLoadingProducts;

  if (isLoading) {
    return (
      <Card className="bg-noir/50 border-gold/20">
        <CardHeader>
          <Skeleton className="h-6 w-48 bg-cream/10" />
          <Skeleton className="h-4 w-64 bg-cream/10" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full bg-cream/10" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className="space-y-6"
    >
      {/* Products to Review */}
      {reviewableProducts.length > 0 && (
        <Card className="bg-noir/50 border-gold/20">
          <CardHeader>
            <CardTitle className="text-cream flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-primary" />
              Produits à évaluer
            </CardTitle>
            <CardDescription className="text-cream/60">
              Partagez votre avis sur vos achats récents
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              {reviewableProducts.map((product) => (
                <motion.div
                  key={product.product_id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-4 p-4 rounded-lg bg-cream/5 border border-gold/20 hover:border-primary/50 transition-colors"
                >
                  {product.product_image ? (
                    <img
                      src={product.product_image}
                      alt={product.product_name}
                      className="h-16 w-16 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-lg bg-cream/10 flex items-center justify-center">
                      <Star className="h-6 w-6 text-cream/30" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-cream font-medium truncate">{product.product_name}</p>
                    <p className="text-cream/50 text-sm">
                      Livré le {formatDate(product.order_date)}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleNewReview(product)}
                    className="bg-primary text-noir hover:bg-primary/90"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Évaluer
                  </Button>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* My Reviews */}
      <Card className="bg-noir/50 border-gold/20">
        <CardHeader>
          <CardTitle className="text-cream flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Mes avis
            {reviews.length > 0 && (
              <Badge variant="secondary" className="bg-primary/20 text-primary ml-2">
                {reviews.length}
              </Badge>
            )}
          </CardTitle>
          <CardDescription className="text-cream/60">
            Consultez et gérez vos avis publiés
          </CardDescription>
        </CardHeader>
        <CardContent>
          {reviews.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="h-16 w-16 mx-auto text-cream/20 mb-4" />
              <p className="text-cream/60 text-lg mb-2">Aucun avis</p>
              <p className="text-cream/40 text-sm mb-4">
                {reviewableProducts.length > 0 
                  ? "Vous n'avez pas encore donné d'avis. Partagez votre expérience !"
                  : "Passez une commande et recevez-la pour pouvoir laisser un avis."
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <AnimatePresence>
                {reviews.map((review, index) => (
                  <motion.div
                    key={review.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-4 rounded-lg bg-cream/5 border border-gold/20"
                  >
                    {/* Product Info */}
                    <div className="flex items-start gap-4">
                      {review.product?.image_url ? (
                        <img
                          src={review.product.image_url}
                          alt={review.product.name}
                          className="h-16 w-16 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="h-16 w-16 rounded-lg bg-cream/10 flex items-center justify-center">
                          <Star className="h-6 w-6 text-cream/30" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-cream font-medium">
                              {review.product?.name || "Produit"}
                            </p>
                            {/* Rating Stars */}
                            <div className="flex items-center gap-1 mt-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`h-4 w-4 ${
                                    star <= review.rating
                                      ? "fill-primary text-primary"
                                      : "text-cream/20"
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                          {/* Status Badge */}
                          <Badge
                            className={
                              review.is_approved
                                ? "bg-green-500/20 text-green-500 border-green-500/30"
                                : "bg-yellow-500/20 text-yellow-500 border-yellow-500/30"
                            }
                          >
                            {review.is_approved ? (
                              <>
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Publié
                              </>
                            ) : (
                              <>
                                <Clock className="h-3 w-3 mr-1" />
                                En attente
                              </>
                            )}
                          </Badge>
                        </div>

                        {/* Review Content */}
                        {review.title && (
                          <p className="text-cream font-medium mt-3">{review.title}</p>
                        )}
                        {review.comment && (
                          <p className="text-cream/70 text-sm mt-1">{review.comment}</p>
                        )}

                        {/* Meta & Actions */}
                        <div className="flex items-center justify-between mt-4 pt-3 border-t border-gold/10">
                          <p className="text-cream/40 text-xs">
                            {formatDate(review.created_at || "")}
                          </p>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditReview(review)}
                              className="text-cream/60 hover:text-cream hover:bg-cream/10"
                            >
                              <Edit2 className="h-4 w-4 mr-1" />
                              Modifier
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setReviewToDelete(review.id)}
                              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Supprimer
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review Form Dialog */}
      <ReviewFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        product={selectedProduct}
        existingReview={selectedReview}
        onSubmit={handleSubmitReview}
        isSubmitting={createReview.isPending || updateReview.isPending}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!reviewToDelete} onOpenChange={() => setReviewToDelete(null)}>
        <AlertDialogContent className="bg-noir border-gold/30">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-cream">Supprimer cet avis ?</AlertDialogTitle>
            <AlertDialogDescription className="text-cream/60">
              Cette action est irréversible. Votre avis sera définitivement supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gold/30 text-cream hover:bg-cream/10">
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteReview}
              className="bg-red-500 text-white hover:bg-red-600"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
