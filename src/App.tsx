import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import Index from "./pages/Index";

const Catalogue = lazy(() => import("./pages/Catalogue"));
const ProductPage = lazy(() => import("./pages/ProductPage"));
const Inscription = lazy(() => import("./pages/Inscription"));
const Connexion = lazy(() => import("./pages/Connexion"));
const MotDePasseOublie = lazy(() => import("./pages/MotDePasseOublie"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Checkout = lazy(() => import("./pages/Checkout"));
const OrderConfirmation = lazy(() => import("./pages/OrderConfirmation"));
const Ambassadeur = lazy(() => import("./pages/Ambassadeur"));
const Compte = lazy(() => import("./pages/Compte"));
const Admin = lazy(() => import("./pages/Admin"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Conditions = lazy(() => import("./pages/Conditions"));
const Confidentialite = lazy(() => import("./pages/Confidentialite"));
const Livraison = lazy(() => import("./pages/Livraison"));
const MentionsLegales = lazy(() => import("./pages/MentionsLegales"));
const Contact = lazy(() => import("./pages/Contact"));
const SuiviCommande = lazy(() => import("./pages/SuiviCommande"));
const ShortLinkRedirect = lazy(() => import("./pages/ShortLinkRedirect"));
const Comparer = lazy(() => import("./pages/Comparer"));
const Vendeur = lazy(() => import("./pages/Vendeur"));
const Boutique = lazy(() => import("./pages/Boutique"));
const Grossiste = lazy(() => import("./pages/Grossiste"));
const RechercheVisuelle = lazy(() => import("./pages/RechercheVisuelle"));
const Magazine = lazy(() => import("./pages/Magazine"));
const Article = lazy(() => import("./pages/Article"));

const SommelierChat = lazy(() =>
  import("./components/chat/SommelierChat").then((m) => ({ default: m.SommelierChat }))
);
const ComparatorFloatingBar = lazy(() =>
  import("./components/product/ComparatorFloatingBar").then((m) => ({ default: m.ComparatorFloatingBar }))
);

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <CurrencyProvider>
      <CartProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Suspense fallback={null}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/catalogue" element={<Catalogue />} />
              <Route path="/produit/:slug" element={<ProductPage />} />
              <Route path="/inscription" element={<Inscription />} />
              <Route path="/connexion" element={<Connexion />} />
              <Route path="/mot-de-passe-oublie" element={<MotDePasseOublie />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/commande-confirmee" element={<OrderConfirmation />} />
              <Route path="/ambassadeur" element={<Ambassadeur />} />
              <Route path="/compte" element={<Compte />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/conditions" element={<Conditions />} />
              <Route path="/confidentialite" element={<Confidentialite />} />
              <Route path="/livraison" element={<Livraison />} />
              <Route path="/mentions-legales" element={<MentionsLegales />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/suivi-commande" element={<SuiviCommande />} />
              <Route path="/r/:code" element={<ShortLinkRedirect />} />
              <Route path="/comparer" element={<Comparer />} />
              <Route path="/vendeur" element={<Vendeur />} />
              <Route path="/boutique/:slug" element={<Boutique />} />
              <Route path="/grossiste" element={<Grossiste />} />
              <Route path="/recherche-visuelle" element={<RechercheVisuelle />} />
              <Route path="/magazine" element={<Magazine />} />
              <Route path="/magazine/:slug" element={<Article />} />
              
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            <SommelierChat />
            <ComparatorFloatingBar />
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </CartProvider>
      </CurrencyProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
