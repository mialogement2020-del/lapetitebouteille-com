import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  LayoutDashboard, 
  Package, 
  ShieldCheck,
  Loader2,
  ArrowLeft,
  Wine,
  FolderOpen,
  BarChart3,
  Ticket,
  MessageSquare,
  Bell,
  History,
   RefreshCw,
   Users
} from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAdmin, type AdminOrder, type AdminProduct, type AdminCategory, type AdminPromoCode, type AdminReview, type ProductFormData, type CategoryFormData, type PromoCodeFormData } from "@/hooks/useAdmin";
import { useAuthContext } from "@/contexts/AuthContext";
import { AdminStats } from "@/components/admin/AdminStats";
import { OrdersTable } from "@/components/admin/OrdersTable";
import { OrderStatusDialog } from "@/components/admin/OrderStatusDialog";
import { ProductsTable } from "@/components/admin/ProductsTable";
import { ProductFormDialog } from "@/components/admin/ProductFormDialog";
import { CategoriesTable } from "@/components/admin/CategoriesTable";
import { CategoryFormDialog } from "@/components/admin/CategoryFormDialog";
import { PerformanceCharts } from "@/components/admin/PerformanceCharts";
import { PromoCodesTable } from "@/components/admin/PromoCodesTable";
import { PromoCodeFormDialog } from "@/components/admin/PromoCodeFormDialog";
import { ReviewsTable } from "@/components/admin/ReviewsTable";
import { ReviewModerationDialog } from "@/components/admin/ReviewModerationDialog";
import { LowStockDashboard } from "@/components/admin/LowStockDashboard";
import { OrderNotifications } from "@/components/admin/OrderNotifications";
import { StockNotifications } from "@/components/admin/StockNotifications";
import { PushNotificationToggle } from "@/components/admin/PushNotificationToggle";
import { StockAlertsHistory } from "@/components/admin/StockAlertsHistory";
import { StockAlertsChart } from "@/components/admin/StockAlertsChart";
import { StockAlertSettings } from "@/components/admin/StockAlertSettings";
import { StockAlertsPDFExport } from "@/components/admin/StockAlertsPDFExport";
import { WeeklyReportSettings } from "@/components/admin/WeeklyReportSettings";
import { AuditLogsTable } from "@/components/admin/AuditLogsTable";
 import { MLMDashboard } from "@/components/admin/MLMDashboard";
import { toast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type OrderStatus = Database["public"]["Enums"]["order_status"];

const Admin = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("performance");
  const { isAuthenticated, loading: authLoading } = useAuthContext();
  const { 
    isAdmin, 
    isCheckingAdmin, 
    orders, 
    isLoadingOrders, 
    refetchOrders, 
    updateOrderStatus, 
    products,
    isLoadingProducts,
    refetchProducts,
    categories,
    allCategories,
    isLoadingCategories,
    refetchCategories,
    createProduct,
    updateProduct,
    restockProduct,
    deleteProduct,
    createCategory,
    updateCategory,
    deleteCategory,
    promoCodes,
    isLoadingPromoCodes,
    refetchPromoCodes,
    createPromoCode,
    updatePromoCode,
    deletePromoCode,
    reviews,
    isLoadingReviews,
    refetchReviews,
    approveReview,
    deleteReview,
    stats 
  } = useAdmin();
  
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<AdminProduct | null>(null);
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<AdminCategory | null>(null);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [selectedPromoCode, setSelectedPromoCode] = useState<AdminPromoCode | null>(null);
  const [isPromoCodeDialogOpen, setIsPromoCodeDialogOpen] = useState(false);
  const [selectedReview, setSelectedReview] = useState<AdminReview | null>(null);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [stockAlertPeriod, setStockAlertPeriod] = useState("30");
  const stockAlertsChartRef = useRef<HTMLDivElement>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/connexion");
    }
  }, [authLoading, isAuthenticated, navigate]);

  // Handle status update
  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus, notes?: string, shippingPhone?: string | null, customerName?: string | null, customerEmail?: string | null) => {
    const order = orders.find(o => o.id === orderId);
    try {
      await updateOrderStatus.mutateAsync({ 
        orderId, 
        newStatus, 
        notes,
        orderNumber: order?.order_number,
        previousStatus: order?.status || undefined,
        shippingPhone: shippingPhone || order?.shipping_phone,
        customerName: customerName || order?.shipping_full_name,
        customerEmail: customerEmail || order?.guest_email,
      });
      
      // Build notification message based on status
      const smsStatuses = ['shipped', 'delivered'];
      const smsMessage = smsStatuses.includes(newStatus) && shippingPhone
        ? " Un SMS de notification a été envoyé au client."
        : "";
      
      toast({
        title: "Statut mis à jour",
        description: notes 
          ? `La commande a été passée au statut "${newStatus}" avec une note.${smsMessage}`
          : `La commande a été passée au statut "${newStatus}".${smsMessage}`,
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le statut",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Handle product save (create or update)
  const handleSaveProduct = async (data: ProductFormData, id?: string) => {
    try {
      if (id) {
        const oldProduct = products.find(p => p.id === id);
        await updateProduct.mutateAsync({ 
          id, 
          data,
          oldData: oldProduct ? {
            name: oldProduct.name,
            price: oldProduct.price,
            stock_quantity: oldProduct.stock_quantity || 0
          } : undefined
        });
        toast({
          title: "Produit modifié",
          description: `Le produit "${data.name}" a été mis à jour.`,
        });
      } else {
        await createProduct.mutateAsync(data);
        toast({
          title: "Produit créé",
          description: `Le produit "${data.name}" a été ajouté au catalogue.`,
        });
      }
      setIsProductDialogOpen(false);
      setSelectedProduct(null);
    } catch (error) {
      toast({
        title: "Erreur",
        description: id ? "Impossible de modifier le produit" : "Impossible de créer le produit",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Handle product delete
  const handleDeleteProduct = async (product: AdminProduct) => {
    try {
      await deleteProduct.mutateAsync({ id: product.id, productName: product.name });
      toast({
        title: "Produit supprimé",
        description: `Le produit "${product.name}" a été supprimé.`,
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le produit",
        variant: "destructive",
      });
    }
  };

  // Handle category save (create or update)
  const handleSaveCategory = async (data: CategoryFormData, id?: string) => {
    try {
      if (id) {
        const oldCategory = allCategories.find(c => c.id === id);
        await updateCategory.mutateAsync({ id, data, oldName: oldCategory?.name });
        toast({
          title: "Catégorie modifiée",
          description: `La catégorie "${data.name}" a été mise à jour.`,
        });
      } else {
        await createCategory.mutateAsync(data);
        toast({
          title: "Catégorie créée",
          description: `La catégorie "${data.name}" a été ajoutée.`,
        });
      }
      setIsCategoryDialogOpen(false);
      setSelectedCategory(null);
    } catch (error) {
      toast({
        title: "Erreur",
        description: id ? "Impossible de modifier la catégorie" : "Impossible de créer la catégorie",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Handle category delete
  const handleDeleteCategory = async (category: AdminCategory) => {
    try {
      await deleteCategory.mutateAsync({ id: category.id, categoryName: category.name });
      toast({
        title: "Catégorie supprimée",
        description: `La catégorie "${category.name}" a été supprimée.`,
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la catégorie",
        variant: "destructive",
      });
    }
  };

  // Handle promo code save (create or update)
  const handleSavePromoCode = async (data: PromoCodeFormData, id?: string) => {
    try {
      if (id) {
        const oldPromo = promoCodes.find(p => p.id === id);
        await updatePromoCode.mutateAsync({ id, data, oldCode: oldPromo?.code });
        toast({
          title: "Code promo modifié",
          description: `Le code "${data.code}" a été mis à jour.`,
        });
      } else {
        await createPromoCode.mutateAsync(data);
        toast({
          title: "Code promo créé",
          description: `Le code "${data.code}" a été ajouté.`,
        });
      }
      setIsPromoCodeDialogOpen(false);
      setSelectedPromoCode(null);
    } catch (error) {
      toast({
        title: "Erreur",
        description: id ? "Impossible de modifier le code promo" : "Impossible de créer le code promo",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Handle promo code delete
  const handleDeletePromoCode = async (promoCode: AdminPromoCode) => {
    try {
      await deletePromoCode.mutateAsync({ id: promoCode.id, promoCode: promoCode.code });
      toast({
        title: "Code promo supprimé",
        description: `Le code "${promoCode.code}" a été supprimé.`,
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le code promo",
        variant: "destructive",
      });
    }
  };

  // Handle review approval
  const handleApproveReview = async (review: AdminReview) => {
    try {
      await approveReview.mutateAsync({ 
        reviewId: review.id, 
        productName: review.product?.name 
      });
      toast({
        title: "Avis approuvé",
        description: "L'avis a été publié avec succès.",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'approuver l'avis",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Handle review rejection/deletion
  const handleRejectReview = async (review: AdminReview) => {
    try {
      await deleteReview.mutateAsync({ 
        reviewId: review.id, 
        productName: review.product?.name 
      });
      toast({
        title: review.is_approved ? "Avis désapprouvé" : "Avis supprimé",
        description: review.is_approved 
          ? "L'avis n'est plus visible."
          : "L'avis a été supprimé.",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'avis",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Loading state
  if (authLoading || isCheckingAdmin) {
    return (
      <div className="min-h-screen bg-noir flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-cream/60">Vérification des droits d'accès...</p>
        </div>
      </div>
    );
  }

  // Not admin
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-noir">
        <Header />
        <main className="pt-24 pb-16">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-md mx-auto text-center py-16"
            >
              <div className="w-20 h-20 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-6">
                <ShieldCheck className="h-10 w-10 text-destructive" />
              </div>
              <h1 className="text-2xl font-display font-bold text-cream mb-4">
                Accès refusé
              </h1>
              <p className="text-cream/60 mb-8">
                Vous n'avez pas les droits d'administration nécessaires pour accéder à cette page.
              </p>
              <Button
                onClick={() => navigate("/")}
                className="bg-gradient-gold text-noir font-semibold"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour à l'accueil
              </Button>
            </motion.div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-noir">
      <Header />
      
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center justify-between gap-4 mb-2">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-gradient-gold flex items-center justify-center">
                  <LayoutDashboard className="h-7 w-7 text-noir" />
                </div>
                <div>
                  <h1 className="text-3xl font-display font-bold text-cream">
                    Administration
                  </h1>
                  <p className="text-cream/60">
                    Gérez les commandes, produits et suivez les performances
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <PushNotificationToggle />
                <StockNotifications
                  enabled={isAdmin}
                  onProductClick={(productId) => {
                    setActiveTab("products");
                    // Find and select the product
                    const product = products.find((p) => p.id === productId);
                    if (product) {
                      setSelectedProduct(product);
                      setIsProductDialogOpen(true);
                    }
                    refetchProducts();
                  }}
                />
                <OrderNotifications
                  enabled={isAdmin}
                  onOrderClick={(orderId) => {
                    setActiveTab("orders");
                    // Find and select the order
                    const order = orders.find((o) => o.id === orderId);
                    if (order) {
                      setSelectedOrder(order);
                      setIsStatusDialogOpen(true);
                    }
                    refetchOrders();
                  }}
                />
              </div>
            </div>
          </motion.div>

          {/* Stats */}
          <AdminStats stats={stats} />

          {/* Tabs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-8"
          >
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="bg-noir/50 border border-gold/20">
                <TabsTrigger 
                  value="performance"
                  className="data-[state=active]:bg-primary data-[state=active]:text-noir"
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Performance
                </TabsTrigger>
                <TabsTrigger 
                  value="orders"
                  className="data-[state=active]:bg-primary data-[state=active]:text-noir"
                >
                  <Package className="h-4 w-4 mr-2" />
                  Commandes
                </TabsTrigger>
                <TabsTrigger 
                  value="products"
                  className="data-[state=active]:bg-primary data-[state=active]:text-noir"
                >
                  <Wine className="h-4 w-4 mr-2" />
                  Produits
                </TabsTrigger>
                <TabsTrigger 
                  value="categories"
                  className="data-[state=active]:bg-primary data-[state=active]:text-noir"
                >
                  <FolderOpen className="h-4 w-4 mr-2" />
                  Catégories
                </TabsTrigger>
                <TabsTrigger 
                  value="promo-codes"
                  className="data-[state=active]:bg-primary data-[state=active]:text-noir"
                >
                  <Ticket className="h-4 w-4 mr-2" />
                  Codes Promo
                </TabsTrigger>
                <TabsTrigger 
                  value="reviews"
                  className="data-[state=active]:bg-primary data-[state=active]:text-noir"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Avis
                  {stats.pendingReviews > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-orange-500 text-white rounded-full">
                      {stats.pendingReviews}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger 
                  value="restock"
                  className="data-[state=active]:bg-primary data-[state=active]:text-noir"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Réappro.
                  {products.filter(p => (p.stock_quantity ?? 0) === 0 && p.is_active).length > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-destructive text-destructive-foreground rounded-full">
                      {products.filter(p => (p.stock_quantity ?? 0) === 0 && p.is_active).length}
                    </span>
                  )}
                  {products.filter(p => {
                    const stock = p.stock_quantity ?? 0;
                    return stock > 0 && stock <= 5 && p.is_active;
                  }).length > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-warning text-warning-foreground rounded-full">
                      {products.filter(p => {
                        const stock = p.stock_quantity ?? 0;
                        return stock > 0 && stock <= 5 && p.is_active;
                      }).length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger 
                  value="stock-alerts"
                  className="data-[state=active]:bg-primary data-[state=active]:text-noir"
                >
                  <Bell className="h-4 w-4 mr-2" />
                  Alertes Stock
                </TabsTrigger>
                <TabsTrigger 
                  value="audit"
                  className="data-[state=active]:bg-primary data-[state=active]:text-noir"
                >
                  <History className="h-4 w-4 mr-2" />
                  Audit
                </TabsTrigger>
                 <TabsTrigger 
                   value="mlm"
                   className="data-[state=active]:bg-primary data-[state=active]:text-noir"
                 >
                   <Users className="h-4 w-4 mr-2" />
                   MLM
                 </TabsTrigger>
              </TabsList>

              <TabsContent value="performance" className="space-y-8">
                <PerformanceCharts orders={orders} products={products} />
              </TabsContent>

              <TabsContent value="restock" className="space-y-8">
                <LowStockDashboard 
                  products={products} 
                  isLoading={isLoadingProducts}
                  onEditProduct={(product) => {
                    setSelectedProduct(product);
                    setIsProductDialogOpen(true);
                  }}
                  restockProduct={restockProduct}
                />
              </TabsContent>

              <TabsContent value="orders">
                <div className="bg-noir/50 border border-gold/20 rounded-lg p-6">
                  <OrdersTable
                    orders={orders}
                    isLoading={isLoadingOrders}
                    onOrderClick={(order) => {
                      setSelectedOrder(order);
                      setIsStatusDialogOpen(true);
                    }}
                    onRefresh={() => refetchOrders()}
                  />
                </div>
              </TabsContent>

              <TabsContent value="products">
                <div className="bg-noir/50 border border-gold/20 rounded-lg p-6">
                  <ProductsTable
                    products={products}
                    categories={categories}
                    isLoading={isLoadingProducts}
                    onAddProduct={() => {
                      setSelectedProduct(null);
                      setIsProductDialogOpen(true);
                    }}
                    onEditProduct={(product) => {
                      setSelectedProduct(product);
                      setIsProductDialogOpen(true);
                    }}
                    onDeleteProduct={handleDeleteProduct}
                    onRefresh={() => refetchProducts()}
                  />
                </div>
              </TabsContent>

              <TabsContent value="categories">
                <div className="bg-noir/50 border border-gold/20 rounded-lg p-6">
                  <CategoriesTable
                    categories={allCategories}
                    isLoading={isLoadingCategories}
                    onAddCategory={() => {
                      setSelectedCategory(null);
                      setIsCategoryDialogOpen(true);
                    }}
                    onEditCategory={(category) => {
                      setSelectedCategory(category);
                      setIsCategoryDialogOpen(true);
                    }}
                    onDeleteCategory={handleDeleteCategory}
                    onRefresh={() => refetchCategories()}
                  />
                </div>
              </TabsContent>

              <TabsContent value="promo-codes">
                <div className="bg-noir/50 border border-gold/20 rounded-lg p-6">
                  <PromoCodesTable
                    promoCodes={promoCodes}
                    isLoading={isLoadingPromoCodes}
                    onAddPromoCode={() => {
                      setSelectedPromoCode(null);
                      setIsPromoCodeDialogOpen(true);
                    }}
                    onEditPromoCode={(promoCode) => {
                      setSelectedPromoCode(promoCode);
                      setIsPromoCodeDialogOpen(true);
                    }}
                    onDeletePromoCode={handleDeletePromoCode}
                    onRefresh={() => refetchPromoCodes()}
                  />
                </div>
              </TabsContent>

              <TabsContent value="reviews">
                <div className="bg-noir/50 border border-gold/20 rounded-lg p-6">
                  <ReviewsTable
                    reviews={reviews}
                    isLoading={isLoadingReviews}
                    onViewReview={(review) => {
                      setSelectedReview(review);
                      setIsReviewDialogOpen(true);
                    }}
                    onApproveReview={handleApproveReview}
                    onRejectReview={handleRejectReview}
                    onRefresh={() => refetchReviews()}
                  />
                </div>
              </TabsContent>

              <TabsContent value="stock-alerts" className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-cream">Gestion des Alertes de Stock</h2>
                  <StockAlertsPDFExport chartRef={stockAlertsChartRef} period={stockAlertPeriod} />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <StockAlertSettings onSettingsApplied={() => refetchProducts()} />
                  <WeeklyReportSettings />
                </div>
                <div ref={stockAlertsChartRef}>
                  <StockAlertsChart />
                </div>
                <div className="bg-noir/50 border border-gold/20 rounded-lg p-6">
                  <StockAlertsHistory />
                </div>
              </TabsContent>

              <TabsContent value="audit" className="space-y-6">
                <AuditLogsTable />
              </TabsContent>
 
               <TabsContent value="mlm" className="space-y-6">
                 <MLMDashboard />
               </TabsContent>
            </Tabs>
          </motion.div>
        </div>
      </main>

      {/* Order Status Dialog */}
      <OrderStatusDialog
        order={selectedOrder}
        open={isStatusDialogOpen}
        onOpenChange={setIsStatusDialogOpen}
        onUpdateStatus={handleUpdateStatus}
        isUpdating={updateOrderStatus.isPending}
      />

      {/* Product Form Dialog */}
      <ProductFormDialog
        product={selectedProduct}
        open={isProductDialogOpen}
        onOpenChange={setIsProductDialogOpen}
        categories={categories}
        onSave={handleSaveProduct}
        isSaving={createProduct.isPending || updateProduct.isPending}
      />

      {/* Category Form Dialog */}
      <CategoryFormDialog
        category={selectedCategory}
        open={isCategoryDialogOpen}
        onOpenChange={setIsCategoryDialogOpen}
        onSave={handleSaveCategory}
        isSaving={createCategory.isPending || updateCategory.isPending}
      />

      {/* Promo Code Form Dialog */}
      <PromoCodeFormDialog
        promoCode={selectedPromoCode}
        open={isPromoCodeDialogOpen}
        onOpenChange={setIsPromoCodeDialogOpen}
        onSave={handleSavePromoCode}
        isSaving={createPromoCode.isPending || updatePromoCode.isPending}
      />

      {/* Review Moderation Dialog */}
      <ReviewModerationDialog
        review={selectedReview}
        open={isReviewDialogOpen}
        onOpenChange={setIsReviewDialogOpen}
        onApprove={handleApproveReview}
        onReject={handleRejectReview}
        isUpdating={approveReview.isPending || deleteReview.isPending}
      />

      <Footer />
    </div>
  );
};

export default Admin;
