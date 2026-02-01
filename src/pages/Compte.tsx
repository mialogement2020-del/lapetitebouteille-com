import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, User, Loader2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthContext } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { ProfileForm } from "@/components/account/ProfileForm";
import { OrderHistory } from "@/components/account/OrderHistory";
import { AddressManager } from "@/components/account/AddressManager";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

export default function Compte() {
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading } = useAuthContext();
  const { profile, orders, loading, ordersLoading, updateProfile } = useProfile();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/connexion?redirect=/compte");
    }
  }, [isAuthenticated, authLoading, navigate]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-noir">
        <Header />
        <main className="pt-24 pb-16">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-noir">
      <Header />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Back Link */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="mb-6"
          >
            <Button
              variant="ghost"
              className="text-cream/60 hover:text-cream hover:bg-cream/10"
              onClick={() => navigate("/")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour à l'accueil
            </Button>
          </motion.div>

          {/* Page Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <User className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h1 className="font-display text-3xl lg:text-4xl font-bold text-cream">
                  Mon Compte
                </h1>
                <p className="text-cream/60 mt-1">
                  Gérez votre profil et suivez vos commandes
                </p>
              </div>
            </div>
          </motion.div>

          {/* Tabs */}
          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="bg-cream/5 border border-gold/20 p-1 flex-wrap h-auto">
              <TabsTrigger
                value="profile"
                className="data-[state=active]:bg-primary data-[state=active]:text-noir text-cream/60"
              >
                Mon profil
              </TabsTrigger>
              <TabsTrigger
                value="addresses"
                className="data-[state=active]:bg-primary data-[state=active]:text-noir text-cream/60"
              >
                <MapPin className="h-4 w-4 mr-1.5" />
                Mes adresses
              </TabsTrigger>
              <TabsTrigger
                value="orders"
                className="data-[state=active]:bg-primary data-[state=active]:text-noir text-cream/60"
              >
                Mes commandes
                {orders.length > 0 && (
                  <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-primary/20 text-primary">
                    {orders.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile">
              {profile ? (
                <ProfileForm profile={profile} onUpdate={updateProfile} />
              ) : (
                <Skeleton className="h-96 w-full bg-cream/10" />
              )}
            </TabsContent>

            <TabsContent value="addresses">
              <AddressManager />
            </TabsContent>

            <TabsContent value="orders">
              <OrderHistory orders={orders} loading={ordersLoading} />
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
}
