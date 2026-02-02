import { useState, useEffect } from "react";
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
  BarChart3
} from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAdmin, type AdminOrder, type AdminProduct, type AdminCategory, type ProductFormData, type CategoryFormData } from "@/hooks/useAdmin";
import { useAuthContext } from "@/contexts/AuthContext";
import { AdminStats } from "@/components/admin/AdminStats";
import { OrdersTable } from "@/components/admin/OrdersTable";
import { OrderStatusDialog } from "@/components/admin/OrderStatusDialog";
import { ProductsTable } from "@/components/admin/ProductsTable";
import { ProductFormDialog } from "@/components/admin/ProductFormDialog";
import { CategoriesTable } from "@/components/admin/CategoriesTable";
import { CategoryFormDialog } from "@/components/admin/CategoryFormDialog";
import { PerformanceCharts } from "@/components/admin/PerformanceCharts";
import { toast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type OrderStatus = Database["public"]["Enums"]["order_status"];

const Admin = () => {
  const navigate = useNavigate();
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
    deleteProduct,
    createCategory,
    updateCategory,
    deleteCategory,
    stats 
  } = useAdmin();
  
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<AdminProduct | null>(null);
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<AdminCategory | null>(null);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/connexion");
    }
  }, [authLoading, isAuthenticated, navigate]);

  // Handle status update
  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      await updateOrderStatus.mutateAsync({ orderId, newStatus });
      toast({
        title: "Statut mis à jour",
        description: `La commande a été passée au statut "${newStatus}". Un email de notification a été envoyé au client.`,
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
        await updateProduct.mutateAsync({ id, data });
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
      await deleteProduct.mutateAsync(product.id);
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
        await updateCategory.mutateAsync({ id, data });
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
      await deleteCategory.mutateAsync(category.id);
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
            <div className="flex items-center gap-4 mb-2">
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
            <Tabs defaultValue="performance" className="space-y-6">
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
              </TabsList>

              <TabsContent value="performance">
                <PerformanceCharts orders={orders} products={products} />
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

      <Footer />
    </div>
  );
};

export default Admin;
