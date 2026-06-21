import { useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { 
  Search, 
  RefreshCw, 
  Star,
  MessageSquare,
  CheckCircle,
  XCircle,
  Eye,
  Filter,
  X,
  Download
} from "lucide-react";
import { convertToCSV, downloadCSV } from "@/lib/csvExport";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import type { AdminReview } from "@/hooks/useAdmin";

interface ReviewsTableProps {
  reviews: AdminReview[];
  isLoading: boolean;
  onViewReview: (review: AdminReview) => void;
  onApproveReview: (review: AdminReview) => void;
  onRejectReview: (review: AdminReview) => void;
  onRefresh: () => void;
}

export function ReviewsTable({ 
  reviews, 
  isLoading, 
  onViewReview,
  onApproveReview,
  onRejectReview,
  onRefresh 
}: ReviewsTableProps) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [ratingFilter, setRatingFilter] = useState<string>("all");

  const filteredReviews = reviews.filter((review) => {
    const matchesSearch = 
      review.product?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      review.comment?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      review.title?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = 
      statusFilter === "all" ||
      (statusFilter === "pending" && !review.is_approved) ||
      (statusFilter === "approved" && review.is_approved);

    const matchesRating = 
      ratingFilter === "all" ||
      review.rating === parseInt(ratingFilter);

    return matchesSearch && matchesStatus && matchesRating;
  });

  const pendingCount = reviews.filter(r => !r.is_approved).length;

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setRatingFilter("all");
  };

  const hasActiveFilters = searchQuery || statusFilter !== "all" || ratingFilter !== "all";

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const exportToCSV = () => {
    const columns = [
      { key: "productName" as const, header: "Produit" },
      { key: "rating" as const, header: "Note" },
      { key: "title" as const, header: "Titre" },
      { key: "comment" as const, header: "Commentaire" },
      { key: "status" as const, header: "Statut" },
      { key: "verified" as const, header: "Achat vérifié" },
      { key: "created_at" as const, header: "Date" },
    ];

    const exportData = filteredReviews.map((r) => ({
      productName: r.product?.name || "",
      rating: r.rating,
      title: r.title || "",
      comment: r.comment || "",
      status: r.is_approved ? t("adminReviews.dialog.approved") : t("adminReviews.dialog.pendingModeration"),
      verified: r.is_verified_purchase ? t("adminReviews.table.verifiedPurchase") : "—",
      created_at: formatDate(r.created_at),
    }));

    const csv = convertToCSV(exportData, columns);
    const date = new Date().toISOString().split("T")[0];
    downloadCSV(csv, `avis-${date}.csv`);
    toast.success(t("adminReviews.table.exportSuccess", { count: filteredReviews.length }));
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-3 w-3 ${
              star <= rating
                ? "text-primary fill-primary"
                : "text-cream/20"
            }`}
          />
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full bg-cream/10" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      {pendingCount > 0 && (
        <div className="p-3 rounded-lg bg-warning/10 border border-warning/30 flex items-center gap-3">
          <MessageSquare className="h-5 w-5 text-warning" />
          <p className="text-cream text-sm">
            {t("adminReviews.table.pendingReview", { count: pendingCount })}
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-cream/40" />
          <Input
            placeholder={t("adminReviews.table.searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-cream/5 border-gold/20 text-cream placeholder:text-cream/40"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-44 bg-cream/5 border-gold/20 text-cream">
            <SelectValue placeholder={t("adminReviews.table.filterStatus")} />
          </SelectTrigger>
          <SelectContent className="bg-noir border-gold/20">
            <SelectItem value="all" className="text-cream">{t("adminReviews.table.allStatus")}</SelectItem>
            <SelectItem value="pending" className="text-cream">{t("adminReviews.table.pending")}</SelectItem>
            <SelectItem value="approved" className="text-cream">{t("adminReviews.table.approved")}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={ratingFilter} onValueChange={setRatingFilter}>
          <SelectTrigger className="w-full sm:w-36 bg-cream/5 border-gold/20 text-cream">
            <SelectValue placeholder={t("adminReviews.table.filterRating")} />
          </SelectTrigger>
          <SelectContent className="bg-noir border-gold/20">
            <SelectItem value="all" className="text-cream">{t("adminReviews.table.allRatings")}</SelectItem>
            <SelectItem value="5" className="text-cream">{t("adminReviews.table.starCount", { count: 5 })}</SelectItem>
            <SelectItem value="4" className="text-cream">{t("adminReviews.table.starCount", { count: 4 })}</SelectItem>
            <SelectItem value="3" className="text-cream">{t("adminReviews.table.starCount", { count: 3 })}</SelectItem>
            <SelectItem value="2" className="text-cream">{t("adminReviews.table.starCount", { count: 2 })}</SelectItem>
            <SelectItem value="1" className="text-cream">{t("adminReviews.table.starCount", { count: 1 })}</SelectItem>
          </SelectContent>
        </Select>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="icon"
            onClick={clearFilters}
            className="text-cream/60 hover:text-cream hover:bg-cream/10"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
        <Button
          variant="outline"
          size="icon"
          onClick={exportToCSV}
          className="border-gold/20 text-cream hover:bg-cream/10"
          title={t("adminReviews.table.exportCSV")}
        >
          <Download className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={onRefresh}
          className="border-gold/20 text-cream hover:bg-cream/10"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Table */}
      {filteredReviews.length === 0 ? (
        <div className="text-center py-12">
          <MessageSquare className="h-12 w-12 text-cream/30 mx-auto mb-4" />
          <p className="text-cream/60">{t("adminReviews.table.noReviews")}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-gold/20 hover:bg-transparent">
                <TableHead className="text-cream/60">{t("adminReviews.table.headerProduct")}</TableHead>
                <TableHead className="text-cream/60">{t("adminReviews.table.headerRating")}</TableHead>
                <TableHead className="text-cream/60">{t("adminReviews.table.headerReview")}</TableHead>
                <TableHead className="text-cream/60 text-center">{t("adminReviews.table.headerStatus")}</TableHead>
                <TableHead className="text-cream/60">{t("adminReviews.table.headerDate")}</TableHead>
                <TableHead className="text-cream/60 text-right">{t("adminReviews.table.headerActions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReviews.map((review, index) => (
                <motion.tr
                  key={review.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className={`border-gold/10 hover:bg-cream/5 cursor-pointer group ${
                    !review.is_approved ? "bg-warning/5" : ""
                  }`}
                  onClick={() => onViewReview(review)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {review.product?.image_url ? (
                        <img
                          src={review.product.image_url}
                          alt={review.product.name}
                          className="h-10 w-10 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-cream/10 flex items-center justify-center">
                          <Star className="h-5 w-5 text-cream/40" />
                        </div>
                      )}
                      <p className="text-cream font-medium truncate max-w-[150px]">
                        {review.product?.name || t("adminReviews.table.deletedProduct")}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {renderStars(review.rating)}
                  </TableCell>
                  <TableCell>
                    <div className="max-w-[250px]">
                      {review.title && (
                        <p className="text-cream font-medium truncate text-sm">
                          {review.title}
                        </p>
                      )}
                      <p className="text-cream/60 text-xs truncate">
                        {review.comment || t("adminReviews.table.noComment")}
                      </p>
                      {review.is_verified_purchase && (
                        <Badge variant="outline" className="mt-1 text-[10px] border-info/30 text-info">
                          {t("adminReviews.table.verifiedPurchase")}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge className={`${
                      review.is_approved 
                        ? "bg-success/20 text-success border-success/30" 
                        : "bg-warning/20 text-warning border-warning/30"
                    } border`}>
                      {review.is_approved ? t("adminReviews.dialog.approved") : t("adminReviews.table.pending")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-cream/60 text-sm">
                      {formatDate(review.created_at)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewReview(review);
                        }}
                        className="h-8 w-8 text-cream/60 hover:text-cream hover:bg-cream/10"
                        title={t("adminReviews.table.view")}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {!review.is_approved && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            onApproveReview(review);
                          }}
                          className="h-8 w-8 text-success hover:text-success hover:bg-success/10"
                          title={t("adminReviews.table.approve")}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRejectReview(review);
                        }}
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        title={review.is_approved ? t("adminReviews.table.unapprove") : t("adminReviews.table.reject")}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </motion.tr>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <p className="text-cream/40 text-sm text-right">
        {t("adminReviews.table.count", { count: filteredReviews.length })}
      </p>
    </div>
  );
}