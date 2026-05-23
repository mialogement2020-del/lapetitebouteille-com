import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Star, CheckCircle, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { useTranslation } from "react-i18next";

interface ProductReviewsProps {
  productId: string;
  averageRating: number;
  reviewCount: number;
}

interface ReviewWithProfile {
  id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  is_verified_purchase: boolean;
  created_at: string;
  profile?: {
    first_name: string | null;
    last_name: string | null;
  } | null;
}

export const ProductReviews = ({
  productId,
  averageRating,
  reviewCount,
}: ProductReviewsProps) => {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language === "en" ? enUS : fr;
  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ["product-reviews", productId],
    queryFn: async () => {
      // Use the reviews_public view which excludes user_id for privacy
      // This view only shows approved reviews and protects user identity
      const { data, error } = await supabase
        .from("reviews_public" as any)
        .select(`
          id,
          rating,
          title,
          comment,
          is_verified_purchase,
          created_at
        `)
        .eq("product_id", productId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Map to ReviewWithProfile format (user_id excluded for privacy)
      return (data || []).map((review: any) => ({
        ...review,
        profile: null, // Privacy: user_id is not exposed through the view
      })) as ReviewWithProfile[];
    },
    enabled: !!productId,
  });

  // Calculate rating distribution
  const ratingDistribution = [5, 4, 3, 2, 1].map((rating) => ({
    rating,
    count: reviews.filter((r) => r.rating === rating).length,
    percentage:
      reviews.length > 0
        ? (reviews.filter((r) => r.rating === rating).length / reviews.length) * 100
        : 0,
  }));

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>{t("productReviews.empty")}</p>
        <p className="text-sm mt-2">
          {t("productReviews.emptyDesc")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Rating Summary */}
      <div className="grid md:grid-cols-2 gap-8 p-6 bg-muted/30 rounded-lg">
        {/* Average Rating */}
        <div className="text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-4">
            <span className="text-5xl font-bold text-foreground">
              {averageRating.toFixed(1)}
            </span>
            <div>
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-5 w-5 ${
                      i < Math.round(averageRating)
                        ? "fill-gold text-gold"
                        : "text-muted"
                    }`}
                  />
                ))}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {t("productReviews.basedOn", { count: reviewCount })}
              </p>
            </div>
          </div>
        </div>

        {/* Rating Distribution */}
        <div className="space-y-2">
          {ratingDistribution.map(({ rating, count, percentage }) => (
            <div key={rating} className="flex items-center gap-3">
              <span className="text-sm w-16 flex items-center gap-1">
                {rating} <Star className="h-3 w-3 fill-gold text-gold" />
              </span>
              <Progress value={percentage} className="h-2 flex-1" />
              <span className="text-sm text-muted-foreground w-8 text-right">
                {count}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-6">
        {reviews.map((review, index) => (
          <motion.div
            key={review.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="border-b pb-6 last:border-0"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                  <User className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{t("productReviews.verifiedCustomer")}</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(review.created_at), "d MMMM yyyy", {
                      locale: dateLocale,
                    })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${
                      i < review.rating ? "fill-gold text-gold" : "text-muted"
                    }`}
                  />
                ))}
              </div>
            </div>

            <div className="mt-4">
              {review.title && (
                <h4 className="font-semibold text-foreground mb-2">
                  {review.title}
                </h4>
              )}
              {review.comment && (
                <p className="text-muted-foreground">{review.comment}</p>
              )}
            </div>

            {review.is_verified_purchase && (
              <div className="flex items-center gap-1 mt-3 text-sm text-gold">
                <CheckCircle className="h-4 w-4" />
                <span>{t("productReviews.verifiedPurchase")}</span>
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
};
