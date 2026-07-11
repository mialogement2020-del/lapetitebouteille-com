import { useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { 
  Search, 
  RefreshCw, 
  Plus, 
  Edit, 
  Trash2, 
  Wine,
  Package,
  Star,
  AlertTriangle,
  Filter,
  X,
  Download
} from "lucide-react";
import { convertToCSV, downloadCSV, formatPriceForCSV } from "@/lib/csvExport";
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
import { Skeleton } from "@/components/ui/skeleton";
import type { AdminProduct } from "@/hooks/useAdmin";

interface ProductsTableProps {
  products: AdminProduct[];
  categories: { id: string; name: string }[];
  isLoading: boolean;
  onAddProduct: () => void;
  onEditProduct: (product: AdminProduct) => void;
  onDeleteProduct: (product: AdminProduct) => void;
  onRefresh: () => void;
}

export function ProductsTable({ 
  products, 
  categories,
  isLoading, 
  onAddProduct,
  onEditProduct,
  onDeleteProduct, 
  onRefresh 
}: ProductsTableProps) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priceMin, setPriceMin] = useState<string>("");
  const [priceMax, setPriceMax] = useState<string>("");
  const [deleteConfirmProduct, setDeleteConfirmProduct] = useState<AdminProduct | null>(null);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const hasMissingPurchaseCost = (product: AdminProduct) =>
    product.purchase_price == null || Number(product.purchase_price) <= 0;

  const missingPurchaseCostCount = products.filter(
    (product) => product.is_active !== false && hasMissingPurchaseCost(product),
  ).length;

  const filteredProducts = products.filter((product) => {
    const matchesSearch = 
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.slug.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = categoryFilter === "all" || product.category_id === categoryFilter;
    
    const matchesStatus = 
      statusFilter === "all" ||
      (statusFilter === "active" && product.is_active) ||
      (statusFilter === "inactive" && !product.is_active) ||
      (statusFilter === "featured" && product.is_featured) ||
      (statusFilter === "low_stock" && (product.stock_quantity || 0) <= 5) ||
      (statusFilter === "missing_cost" && hasMissingPurchaseCost(product));

    const minPrice = priceMin ? parseFloat(priceMin) : 0;
    const maxPrice = priceMax ? parseFloat(priceMax) : Infinity;
    const matchesPrice = product.price >= minPrice && product.price <= maxPrice;

    return matchesSearch && matchesCategory && matchesStatus && matchesPrice;
  });

  const clearFilters = () => {
    setSearchQuery("");
    setCategoryFilter("all");
    setStatusFilter("all");
    setPriceMin("");
    setPriceMax("");
  };

  const hasActiveFilters = searchQuery || categoryFilter !== "all" || statusFilter !== "all" || priceMin || priceMax;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("fr-FR").format(price) + " FCFA";
  };

  const exportToCSV = () => {
    const columns = [
      { key: "name" as const, header: "Nom" },
      { key: "slug" as const, header: "Slug" },
      { key: "categoryName" as const, header: "Catégorie" },
      { key: "price" as const, header: "Prix" },
      { key: "purchasePrice" as const, header: "Prix d'achat" },
      { key: "marginStatus" as const, header: "Statut marge" },
      { key: "original_price" as const, header: "Prix original" },
      { key: "stock_quantity" as const, header: "Stock" },
      { key: "is_active" as const, header: "Actif" },
      { key: "is_featured" as const, header: "En vedette" },
      { key: "origin_country" as const, header: "Pays d'origine" },
      { key: "region" as const, header: "Région" },
      { key: "grape_variety" as const, header: "Cépage" },
      { key: "alcohol_percentage" as const, header: "Alcool %" },
      { key: "volume_ml" as const, header: "Volume (ml)" },
      { key: "vintage_year" as const, header: "Millésime" },
    ];

    const exportData = filteredProducts.map((p) => ({
      ...p,
      categoryName: p.category?.name || "",
      price: formatPriceForCSV(p.price),
      purchasePrice: p.purchase_price ? formatPriceForCSV(p.purchase_price) : "",
      marginStatus: hasMissingPurchaseCost(p) ? "Prix d'achat manquant" : "OK",
      original_price: p.original_price ? formatPriceForCSV(p.original_price) : "",
      is_active: p.is_active ? "Oui" : "Non",
      is_featured: p.is_featured ? "Oui" : "Non",
    }));

    const csv = convertToCSV(exportData, columns);
    const date = new Date().toISOString().split("T")[0];
    downloadCSV(csv, `produits-${date}.csv`);
    toast.success(t("adminProducts.table.exportSuccess", { count: filteredProducts.length }));
  };

  const handleDeleteConfirm = () => {
    if (deleteConfirmProduct) {
      onDeleteProduct(deleteConfirmProduct);
      setDeleteConfirmProduct(null);
    }
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
      {/* Main Filters Row */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-cream/40" />
          <Input
            placeholder={t("adminProducts.table.searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-cream/5 border-gold/20 text-cream placeholder:text-cream/40"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-48 bg-cream/5 border-gold/20 text-cream">
            <SelectValue placeholder={t("adminProducts.table.filterCategory")} />
          </SelectTrigger>
          <SelectContent className="bg-noir border-gold/20">
            <SelectItem value="all" className="text-cream">{t("adminProducts.table.allCategories")}</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id} className="text-cream">
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40 bg-cream/5 border-gold/20 text-cream">
            <SelectValue placeholder={t("adminProducts.table.filterStatus")} />
          </SelectTrigger>
          <SelectContent className="bg-noir border-gold/20">
            <SelectItem value="all" className="text-cream">{t("adminProducts.table.statusAll")}</SelectItem>
            <SelectItem value="active" className="text-cream">{t("adminProducts.table.statusActive")}</SelectItem>
            <SelectItem value="inactive" className="text-cream">{t("adminProducts.table.statusInactive")}</SelectItem>
            <SelectItem value="featured" className="text-cream">{t("adminProducts.table.statusFeatured")}</SelectItem>
            <SelectItem value="low_stock" className="text-cream">{t("adminProducts.table.statusLowStock")}</SelectItem>
            <SelectItem value="missing_cost" className="text-cream">Prix d'achat manquant</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          className={`border-gold/20 text-cream hover:bg-cream/10 ${showAdvancedFilters ? 'bg-cream/10' : ''}`}
        >
          <Filter className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={exportToCSV}
          className="border-gold/20 text-cream hover:bg-cream/10"
          title={t("adminProducts.table.exportCSV")}
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
        <Button
          onClick={onAddProduct}
          className="bg-gradient-gold text-noir font-semibold hover:opacity-90"
        >
          <Plus className="h-4 w-4 mr-2" />
          {t("adminProducts.table.addProduct")}
        </Button>
      </div>

      {/* Advanced Filters */}
      {showAdvancedFilters && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="flex flex-wrap gap-4 p-4 bg-cream/5 rounded-lg border border-gold/20"
        >
          <div className="flex items-center gap-2">
            <span className="text-cream/60 text-sm whitespace-nowrap">{t("adminProducts.table.priceMin")}</span>
            <Input
              type="number"
              placeholder="0"
              value={priceMin}
              onChange={(e) => setPriceMin(e.target.value)}
              className="w-28 bg-cream/5 border-gold/20 text-cream placeholder:text-cream/40"
            />
            <span className="text-cream/40 text-xs">FCFA</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-cream/60 text-sm whitespace-nowrap">{t("adminProducts.table.priceMax")}</span>
            <Input
              type="number"
              placeholder="∞"
              value={priceMax}
              onChange={(e) => setPriceMax(e.target.value)}
              className="w-28 bg-cream/5 border-gold/20 text-cream placeholder:text-cream/40"
            />
            <span className="text-cream/40 text-xs">FCFA</span>
          </div>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-cream/60 hover:text-cream hover:bg-cream/10 ml-auto"
            >
              <X className="h-4 w-4 mr-1" />
              {t("adminProducts.table.resetFilters")}
            </Button>
          )}
        </motion.div>
      )}

      {missingPurchaseCostCount > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-100">
                {missingPurchaseCostCount} produit(s) actif(s) sans prix d'achat
              </p>
              <p className="text-xs text-red-100/70">
                Les marges restent incomplètes tant que ces coûts ne sont pas renseignés.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setStatusFilter("missing_cost")}
            className="border-red-400/40 text-red-100 hover:bg-red-500/20"
          >
            Voir les produits
          </Button>
        </div>
      )}

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 text-xs">
          {searchQuery && (
            <Badge variant="outline" className="border-gold/30 text-cream/70">
              Recherche: "{searchQuery}"
            </Badge>
          )}
          {categoryFilter !== "all" && (
            <Badge variant="outline" className="border-gold/30 text-cream/70">
              Catégorie: {categories.find(c => c.id === categoryFilter)?.name}
            </Badge>
          )}
          {statusFilter !== "all" && (
            <Badge variant="outline" className="border-gold/30 text-cream/70">
              Statut: {statusFilter === "active" ? "Actifs" : statusFilter === "inactive" ? "Inactifs" : statusFilter === "featured" ? "En vedette" : statusFilter === "missing_cost" ? "Prix d'achat manquant" : "Stock faible"}
            </Badge>
          )}
          {priceMin && (
            <Badge variant="outline" className="border-gold/30 text-cream/70">
              Prix min: {new Intl.NumberFormat("fr-FR").format(parseFloat(priceMin))} FCFA
            </Badge>
          )}
          {priceMax && (
            <Badge variant="outline" className="border-gold/30 text-cream/70">
              Prix max: {new Intl.NumberFormat("fr-FR").format(parseFloat(priceMax))} FCFA
            </Badge>
          )}
        </div>
      )}

      {/* Table */}
      {filteredProducts.length === 0 ? (
        <div className="text-center py-12">
          <Wine className="h-12 w-12 text-cream/30 mx-auto mb-4" />
          <p className="text-cream/60">{t("adminProducts.table.noProducts")}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-gold/20 hover:bg-transparent">
                <TableHead className="text-cream/60">{t("adminProducts.table.headerProduct")}</TableHead>
                <TableHead className="text-cream/60">{t("adminProducts.table.headerCategory")}</TableHead>
                <TableHead className="text-cream/60 text-right">{t("adminProducts.table.headerPrice")}</TableHead>
                <TableHead className="text-cream/60 text-center">{t("adminProducts.table.headerStock")}</TableHead>
                <TableHead className="text-cream/60 text-center">{t("adminProducts.table.headerStatus")}</TableHead>
                <TableHead className="text-cream/60 text-right">{t("adminProducts.table.headerActions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((product, index) => (
                <motion.tr
                  key={product.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="border-gold/10 hover:bg-cream/5 cursor-pointer group"
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="h-12 w-12 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-lg bg-cream/10 flex items-center justify-center">
                          <Package className="h-6 w-6 text-cream/40" />
                        </div>
                      )}
                      <div>
                        <p className="text-cream font-medium flex items-center gap-2">
                          {product.name}
                          {product.is_featured && (
                            <Star className="h-3 w-3 text-primary fill-primary" />
                          )}
                          {hasMissingPurchaseCost(product) && (
                            <Badge className="bg-red-500/20 text-red-300 border border-red-500/30 text-[10px]">
                              Coût manquant
                            </Badge>
                          )}
                        </p>
                        <p className="text-cream/50 text-xs">{product.slug}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-cream/70">
                      {product.category?.name || "—"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div>
                      <p className="text-primary font-medium">{formatPrice(product.price)}</p>
                      {product.original_price && product.original_price > product.price && (
                        <p className="text-cream/40 text-xs line-through">
                          {formatPrice(product.original_price)}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      {(product.stock_quantity || 0) <= 5 && (
                        <AlertTriangle className="h-3 w-3 text-orange-500" />
                      )}
                      <span className={`${(product.stock_quantity || 0) <= 5 ? 'text-orange-500' : 'text-cream/70'}`}>
                        {product.stock_quantity || 0}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge className={`${
                      product.is_active 
                        ? "bg-green-500/20 text-green-500 border-green-500/30" 
                        : "bg-red-500/20 text-red-500 border-red-500/30"
                    } border`}>
                      {product.is_active ? t("adminProducts.table.statusActive") : t("adminProducts.table.statusInactive")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditProduct(product);
                        }}
                        className="h-8 w-8 text-cream/60 hover:text-cream hover:bg-cream/10"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirmProduct(product);
                        }}
                        className="h-8 w-8 text-red-400 hover:text-red-500 hover:bg-red-500/10"
                      >
                        <Trash2 className="h-4 w-4" />
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
        {t("adminProducts.table.count", { count: filteredProducts.length })}
      </p>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmProduct} onOpenChange={() => setDeleteConfirmProduct(null)}>
        <AlertDialogContent className="bg-noir border-gold/30">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-cream">{t("adminProducts.table.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription className="text-cream/60">
              {t("adminProducts.table.deleteDescription", { name: deleteConfirmProduct?.name ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gold/30 text-cream hover:bg-cream/10">
              {t("adminProducts.table.deleteCancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-500 text-white hover:bg-red-600"
            >
              {t("adminProducts.table.deleteConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
