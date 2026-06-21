import { useTranslation } from "react-i18next";
import { useState, useEffect, useRef, useMemo } from "react";
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
  Users,
  Shield,
  Lock,
  Award,
  ImageIcon,
  FileText,
  Building2
} from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAdmin, type AdminOrder, type AdminProduct, type AdminCategory, type AdminPromoCode, type AdminReview, type ProductFormData, type CategoryFormData, type PromoCodeFormData } from "@/hooks/useAdmin";
import { useAuthContext } from "@/contexts/AuthContext";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
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
import { AdminPermissionsManager } from "@/components/admin/AdminPermissionsManager";
import { MarketplaceRolesManager } from "@/components/admin/MarketplaceRolesManager";
import { WholesalerApplicationsManager } from "@/components/admin/WholesalerApplicationsManager";
import { WholesaleInvoicesManager } from "@/components/admin/WholesaleInvoicesManager";
import { EmbeddingsManager } from "@/components/admin/EmbeddingsManager";
import { FraudManager } from "@/components/admin/FraudManager";
import { ProductModerationManager } from "@/components/admin/ProductModerationManager";
import { BusinessAnalyticsDashboard } from "@/components/admin/BusinessAnalyticsDashboard";
import { ShieldAlert, Sparkles, LineChart } from "lucide-react";
import { TwoFASettings } from "@/components/admin/TwoFASettings";
import { TwoFAVerifyDialog } from "@/components/admin/TwoFAVerifyDialog";
import { LoyaltyDashboard } from "@/components/admin/LoyaltyDashboard";
import { ProductImageManager } from "@/components/admin/ProductImageManager";
import { QuotesTable } from "@/components/admin/QuotesTable";
import { WholesaleSettings } from "@/components/admin/WholesaleSettings";
import { useSensitiveOperation } from "@/hooks/useSensitiveOperation";
import { toast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type OrderStatus = Database["public"]["Enums"]["order_status"];

const Admin = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
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
  
  const { 
    canAccessTab, 
    hasFullAccess, 
    isLoadingMyPermissions,
    myPermissions 
  } = useAdminPermissions();
  
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

  // 2FA for sensitive operations
  const { 
    executeSensitiveOperation, 
    showVerifyDialog, 
    setShowVerifyDialog, 
    handleVerify,
    loading: twoFALoading,
    operationName,
    operationDescription
  } = useSensitiveOperation({
    operationName: t("adminPage.securityVerification"),
    description: t("adminPage.sensitiveOpDesc")
  });

  // Define available tabs based on permissions
  const availableTabs = useMemo(() => {
    const allTabs = [
      { id: 'performance', label: t("adminPage.tabs.performance"), icon: BarChart3 },
      { id: 'orders', label: t("adminPage.tabs.orders"), icon: Package },
      { id: 'products', label: t("adminPage.tabs.products"), icon: Wine },
      { id: 'categories', label: t("adminPage.tabs.categories"), icon: FolderOpen },
      { id: 'images', label: t("adminPage.tabs.images"), icon: ImageIcon },
      { id: 'promo-codes', label: t("adminPage.tabs.promoCodes"), icon: Ticket },
      { id: 'quotes', label: t("adminPage.tabs.quotes"), icon: FileText },
      { id: 'wholesaler-apps', label: t("adminPage.tabs.wholesalerApps"), icon: Building2 },
      { id: 'wholesale-invoices', label: t("adminPage.tabs.wholesaleInvoices"), icon: FileText },
      { id: 'fraud', label: t("adminPage.tabs.fraud"), icon: ShieldAlert },
      { id: 'moderation', label: t("adminPage.tabs.moderation"), icon: Sparkles },
      { id: 'analytics', label: t("adminPage.tabs.analytics"), icon: LineChart },
      { id: 'reviews', label: t("adminPage.tabs.reviews"), icon: MessageSquare },
      { id: 'loyalty', label: t("adminPage.tabs.loyalty"), icon: Award },
      { id: 'restock', label: t("adminPage.tabs.restock"), icon: RefreshCw },
      { id: 'stock-alerts', label: t("adminPage.tabs.stockAlerts"), icon: Bell },
      { id: 'audit', label: t("adminPage.tabs.audit"), icon: History },
      { id: 'mlm', label: t("adminPage.tabs.mlm"), icon: Users },
      { id: 'permissions', label: t("adminPage.tabs.permissions"), icon: Shield },
      { id: 'marketplace-roles', label: t("adminPage.tabs.marketplaceRoles"), icon: Users },
      { id: 'security', label: t("adminPage.tabs.security"), icon: Lock },
    ];
    
    return allTabs.filter(tab => {
      // Permissions and security tabs only for super admins or admins
      if (tab.id === 'permissions') return hasFullAccess;
      if (tab.id === 'marketplace-roles') return hasFullAccess;
      if (tab.id === 'security') return canAccessTab('permissions') || hasFullAccess;
      return canAccessTab(tab.id);
    });
  }, [canAccessTab, hasFullAccess, myPermissions]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/connexion");
    }
  }, [authLoading, isAuthenticated, navigate]);

  // Set active tab to first available tab if current is not accessible
  useEffect(() => {
    if (availableTabs.length > 0 && !availableTabs.some(t => t.id === activeTab)) {
      setActiveTab(availableTabs[0].id);
    }
  }, [availableTabs, activeTab]);

  // Handle status update
  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus, notes?: string, shippingPhone?: string | null, customerName?: string | null, customerEmail?: string | null, userId?: string | null) => {
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
        userId: userId || order?.user_id,
      });
      
      // Build notification message based on status
      const smsStatuses = ['shipped', 'delivered'];
      const smsMessage = smsStatuses.includes(newStatus) && shippingPhone
        ? t("adminPage.toastSmsSent")
        : "";
      
      const pushMessage = userId || order?.user_id
        ? t("adminPage.toastPushSent")
        : "";
      
      toast({
        title: t("adminPage.toastStatusUpdated"),
        description: notes ? t("adminPage.toastStatusUpdatedNotes", { status: newStatus, sms: smsMessage, push: pushMessage }) : t("adminPage.toastStatusUpdatedNoNotes", { status: newStatus, sms: smsMessage, push: pushMessage }),
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: t("adminPage.toastErrorStatus"),
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
          title: t("adminPage.toastProductModified"),
          description: t("adminPage.toastProductModifiedDesc", { name: data.name }),
        });
      } else {
        await createProduct.mutateAsync(data);
        toast({
          title: t("adminPage.toastProductCreated"),
          description: t("adminPage.toastProductCreatedDesc", { name: data.name }),
        });
      }
      setIsProductDialogOpen(false);
      setSelectedProduct(null);
    } catch (error) {
      toast({
        title: "Erreur",
        description: id ? t("adminPage.toastProductError") : t("adminPage.toastProductCreateError"),
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
        title: t("adminPage.toastProductDeleted"),
        description: t("adminPage.toastProductDeletedDesc", { name: product.name }),
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: t("adminPage.toastProductDeleteError"),
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
          title: t("adminPage.toastCategoryModified"),
          description: t("adminPage.toastCategoryModifiedDesc", { name: data.name }),
        });
      } else {
        await createCategory.mutateAsync(data);
        toast({
          title: t("adminPage.toastCategoryCreated"),
          description: t("adminPage.toastCategoryCreatedDesc", { name: data.name }),
        });
      }
      setIsCategoryDialogOpen(false);
      setSelectedCategory(null);
    } catch (error) {
      toast({
        title: "Erreur",
        description: id ? t("adminPage.toastCategoryError") : t("adminPage.toastCategoryCreateError"),
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
        title: t("adminPage.toastCategoryDeleted"),
        description: t("adminPage.toastCategoryDeletedDesc", { name: category.name }),
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: t("adminPage.toastCategoryDeleteError"),
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
          title: t("adminPage.toastPromoModified"),
          description: t("adminPage.toastPromoModifiedDesc", { code: data.code }),
        });
      } else {
        await createPromoCode.mutateAsync(data);
        toast({
          title: t("adminPage.toastPromoCreated"),
          description: t("adminPage.toastPromoCreatedDesc", { code: data.code }),
        });
      }
      setIsPromoCodeDialogOpen(false);
      setSelectedPromoCode(null);
    } catch (error) {
      toast({
        title: "Erreur",
        description: id ? t("adminPage.toastPromoError") : t("adminPage.toastPromoCreateError"),
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
        title: t("adminPage.toastPromoDeleted"),
        description: t("adminPage.toastPromoDeletedDesc", { code: promoCode.code }),
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: t("adminPage.toastPromoDeleteError"),
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
        title: t("adminPage.toastReviewApproved"),
        description: t("adminPage.toastReviewApprovedDesc"),
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: t("adminPage.toastReviewError"),
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
        title: review.is_approved ? t("adminPage.toastReviewRejected") : t("adminPage.toastReviewDeleted"),
        description: review.is_approved ? t("adminPage.toastReviewRejectedDesc") : t("adminPage.toastReviewDeletedDesc"),
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: t("adminPage.toastReviewDeleteError"),
        variant: "destructive",
      });
      throw error;
    }
  };

  // Loading state
  if (authLoading || isCheckingAdmin || isLoadingMyPermissions) {
    return (
      <div className="min-h-screen bg-noir flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-cream/60">t("adminPage.checkingAccess")</p>
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
                t("adminPage.accessDenied")
              </h1>
              <p className="text-cream/60 mb-8">
                t("adminPage.accessDeniedDesc")
              </p>
              <Button
                onClick={() => navigate("/")}
                className="bg-gradient-gold text-noir font-semibold"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                t("adminPage.backHome")
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
              <TabsList className="bg-noir/50 border border-gold/20 h-auto p-1 flex flex-nowrap overflow-x-auto scrollbar-thin scrollbar-thumb-gold/30 scrollbar-track-transparent w-full max-w-full !justify-start">
                {availableTabs.map(tab => {
                  const Icon = tab.icon;
                  return (
                    <TabsTrigger 
                      key={tab.id}
                      value={tab.id}
                      className="data-[state=active]:bg-primary data-[state=active]:text-noir flex-shrink-0"
                    >
                      <Icon className="h-4 w-4 mr-2" />
                      {tab.label}
                      {/* Badges for specific tabs */}
                      {tab.id === 'reviews' && stats.pendingReviews > 0 && (
                        <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-warning text-warning-foreground rounded-full">
                          {stats.pendingReviews}
                        </span>
                      )}
                      {tab.id === 'restock' && (
                        <>
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
                        </>
                      )}
                    </TabsTrigger>
                  );
                })}
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

              <TabsContent value="images" className="space-y-6">
                <EmbeddingsManager />
                <div className="bg-noir/50 border border-gold/20 rounded-lg p-6">
                  <ProductImageManager />
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

              <TabsContent value="quotes" className="space-y-6">
                <WholesaleSettings />
                <div className="bg-noir/50 border border-gold/20 rounded-lg p-6">
                  <QuotesTable />
                </div>
              </TabsContent>

              <TabsContent value="loyalty" className="space-y-6">
                <LoyaltyDashboard />
              </TabsContent>
 
              <TabsContent value="mlm" className="space-y-6">
                <MLMDashboard />
              </TabsContent>

              {/* Permissions Management - Super Admin Only */}
              <TabsContent value="permissions" className="space-y-6">
                <AdminPermissionsManager />
              </TabsContent>

              {/* Marketplace Roles - Super Admin Only */}
              <TabsContent value="marketplace-roles" className="space-y-6">
                <MarketplaceRolesManager />
              </TabsContent>

              {/* Wholesaler applications */}
              <TabsContent value="wholesaler-apps" className="space-y-6">
                <WholesalerApplicationsManager />
              </TabsContent>

              {/* Wholesale invoices */}
              <TabsContent value="wholesale-invoices" className="space-y-6">
                <WholesaleInvoicesManager />
              </TabsContent>

              {/* Anti-fraud */}
              <TabsContent value="fraud" className="space-y-6">
                <FraudManager />
              </TabsContent>

              {/* IA moderation */}
              <TabsContent value="moderation" className="space-y-6">
                <ProductModerationManager />
              </TabsContent>

              {/* Business analytics */}
              <TabsContent value="analytics" className="space-y-6">
                <BusinessAnalyticsDashboard />
              </TabsContent>

              {/* Security Settings - 2FA */}
              <TabsContent value="security" className="space-y-6">
                <div className="max-w-2xl">
                  <TwoFASettings />
                </div>
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
        allCategories={allCategories}
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

      {/* 2FA Verification Dialog */}
      <TwoFAVerifyDialog
        open={showVerifyDialog}
        onOpenChange={setShowVerifyDialog}
        onVerify={handleVerify}
        loading={twoFALoading}
        title={operationName}
        description={operationDescription}
      />

      <Footer />
    </div>
  );
};

export default Admin;
