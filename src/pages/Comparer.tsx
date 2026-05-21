import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Scale, X, ArrowLeft, Plus, Star, Wine, MapPin, Thermometer } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useProductComparator } from "@/hooks/useProductComparator";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { formatPrice } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export default function Comparer() {
  const { t } = useTranslation();
  const { products, removeProduct, clearAll } = useProductComparator();

  const comparisonFields: { key: string; labelKey: string; format: (v: any) => string }[] = [
    { key: "price", labelKey: "compare.fieldPrice", format: (v: number) => formatPrice(v) },
    { key: "alcohol_percentage", labelKey: "compare.fieldAlcohol", format: (v: number | null) => v ? `${v}%` : "-" },
    { key: "volume_ml", labelKey: "compare.fieldVolume", format: (v: number | null) => v ? `${v} ml` : "-" },
    { key: "origin_country", labelKey: "compare.fieldOrigin", format: (v: string | null) => v || "-" },
    { key: "region", labelKey: "compare.fieldRegion", format: (v: string | null) => v || "-" },
    { key: "grape_variety", labelKey: "compare.fieldGrape", format: (v: string | null) => v || "-" },
    { key: "average_rating", labelKey: "compare.fieldRating", format: (v: number | null) => v ? t("compare.ratingSuffix", { value: v.toFixed(1) }) : "-" },
    { key: "review_count", labelKey: "compare.fieldReviewsCount", format: (v: number | null) => v ? t("compare.reviewsSuffix", { count: v }) : "-" },
  ];

  return (
    <div className="min-h-screen bg-noir">
      <Header />

      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Back Link */}
          <Link
            to="/catalogue"
            className="inline-flex items-center gap-2 text-cream/60 hover:text-primary transition-colors mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("compare.back")}
          </Link>

          {/* Page Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-gradient-gold flex items-center justify-center">
                <Scale className="h-7 w-7 text-noir" />
              </div>
              <div>
                <h1 className="font-display text-3xl text-cream">{t("compare.title")}</h1>
                <p className="text-cream/60">{t("compare.subtitle")}</p>
              </div>
            </div>
            {products.length > 0 && (
              <Button
                variant="outline"
                onClick={clearAll}
                className="border-gold/30 text-cream hover:bg-cream/10"
              >
                <X className="h-4 w-4 mr-2" />
                {t("compare.clearAll")}
              </Button>
            )}
          </motion.div>

          {products.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16"
            >
              <Scale className="h-16 w-16 text-cream/20 mx-auto mb-4" />
              <h2 className="text-xl text-cream mb-2">{t("compare.emptyTitle")}</h2>
              <p className="text-cream/60 mb-6">
                {t("compare.emptyDesc")}
              </p>
              <Button asChild className="bg-primary hover:bg-primary/90 text-noir">
                <Link to="/catalogue">
                  <Plus className="h-4 w-4 mr-2" />
                  {t("compare.browse")}
                </Link>
              </Button>
            </motion.div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr>
                    <th className="p-4 text-left text-cream/60 font-medium border-b border-gold/10 w-40">
                      {t("compare.characteristics")}
                    </th>
                    {products.map((product, index) => (
                      <th key={product.id} className="p-4 border-b border-gold/10">
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="relative"
                        >
                          <button
                            onClick={() => removeProduct(product.id)}
                            className="absolute -top-2 -right-2 w-6 h-6 bg-destructive rounded-full flex items-center justify-center hover:bg-destructive/80 transition-colors z-10"
                          >
                            <X className="h-3 w-3 text-white" />
                          </button>
                          <Link to={`/produit/${product.slug}`} className="block group">
                            <div className="aspect-square w-32 mx-auto rounded-xl overflow-hidden bg-noir-light/50 border border-gold/10 mb-3 group-hover:border-primary/50 transition-colors">
                              {product.image_url ? (
                                <img
                                  src={product.image_url}
                                  alt={product.name}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-cream/30">
                                  <Wine className="h-10 w-10" />
                                </div>
                              )}
                            </div>
                            <h3 className="text-cream font-medium text-center line-clamp-2 group-hover:text-primary transition-colors">
                              {product.name}
                            </h3>
                          </Link>
                        </motion.div>
                      </th>
                    ))}
                    {/* Empty slot */}
                    {products.length < 3 && (
                      <th className="p-4 border-b border-gold/10">
                        <Link
                          to="/catalogue"
                          className="block aspect-square w-32 mx-auto rounded-xl border-2 border-dashed border-gold/20 flex items-center justify-center hover:border-primary/50 transition-colors"
                        >
                          <div className="text-center">
                            <Plus className="h-8 w-8 text-cream/30 mx-auto mb-2" />
                            <span className="text-sm text-cream/40">{t("compare.add")}</span>
                          </div>
                        </Link>
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {comparisonFields.map((field, rowIndex) => (
                    <tr key={field.key} className={rowIndex % 2 === 0 ? "bg-noir-light/20" : ""}>
                      <td className="p-4 text-cream/60 font-medium border-b border-gold/5">
                        {t(field.labelKey)}
                      </td>
                      {products.map((product) => {
                        const value = (product as Record<string, any>)[field.key];
                        const formattedValue = field.format(value);
                        
                        // Highlight best value for certain fields
                        const isBestPrice =
                          field.key === "price" &&
                          products.length > 1 &&
                          product.price === Math.min(...products.map((p) => p.price));
                        const isBestRating =
                          field.key === "average_rating" &&
                          products.length > 1 &&
                          value &&
                          value === Math.max(...products.map((p) => p.average_rating || 0));
                        
                        return (
                          <td
                            key={product.id}
                            className="p-4 text-center border-b border-gold/5"
                          >
                            <span
                              className={`${
                                isBestPrice || isBestRating
                                  ? "text-success font-semibold"
                                  : "text-cream"
                              }`}
                            >
                              {formattedValue}
                            </span>
                            {isBestPrice && (
                              <Badge className="ml-2 bg-success/20 text-success text-xs">
                                {t("compare.bestPrice")}
                              </Badge>
                            )}
                            {isBestRating && (
                              <Badge className="ml-2 bg-success/20 text-success text-xs">
                                {t("compare.bestRated")}
                              </Badge>
                            )}
                          </td>
                        );
                      })}
                      {products.length < 3 && <td className="border-b border-gold/5" />}
                    </tr>
                  ))}
                  
                  {/* Tasting notes (special row) */}
                  <tr className="bg-noir-light/20">
                    <td className="p-4 text-cream/60 font-medium border-b border-gold/5 align-top">
                      {t("compare.tastingNotes")}
                    </td>
                    {products.map((product) => (
                      <td
                        key={product.id}
                        className="p-4 text-center border-b border-gold/5 align-top"
                      >
                        <p className="text-cream/80 text-sm">
                          {product.tasting_notes || "-"}
                        </p>
                      </td>
                    ))}
                    {products.length < 3 && <td className="border-b border-gold/5" />}
                  </tr>
                  
                  {/* Add to cart row */}
                  <tr>
                    <td className="p-4" />
                    {products.map((product) => (
                      <td key={product.id} className="p-4 text-center">
                        <AddToCartButton
                          productId={product.id}
                          productName={product.name}
                          className="w-full max-w-[200px] mx-auto"
                        />
                      </td>
                    ))}
                    {products.length < 3 && <td />}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
