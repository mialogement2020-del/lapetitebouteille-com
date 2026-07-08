import { lazy, Suspense, useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";

const AppRuntimeProviders = lazy(() =>
  import("@/components/providers/AppRuntimeProviders").then((m) => ({ default: m.AppRuntimeProviders }))
);
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

const DeferredGlobalWidgets = () => {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const show = () => setEnabled(true);
    const timer = window.setTimeout(show, 15000);
    window.addEventListener("pointerdown", show, { once: true });
    window.addEventListener("keydown", show, { once: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pointerdown", show);
      window.removeEventListener("keydown", show);
    };
  }, []);

  if (!enabled) return null;

  return (
    <Suspense fallback={null}>
      <AppRuntimeProviders>
        <SommelierChat />
        <ComparatorFloatingBar />
      </AppRuntimeProviders>
    </Suspense>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <Suspense fallback={null}>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/catalogue" element={<AppRuntimeProviders><Catalogue /></AppRuntimeProviders>} />
          <Route path="/produit/:slug" element={<AppRuntimeProviders><ProductPage /></AppRuntimeProviders>} />
          <Route path="/inscription" element={<AppRuntimeProviders><Inscription /></AppRuntimeProviders>} />
          <Route path="/connexion" element={<AppRuntimeProviders><Connexion /></AppRuntimeProviders>} />
          <Route path="/mot-de-passe-oublie" element={<AppRuntimeProviders><MotDePasseOublie /></AppRuntimeProviders>} />
          <Route path="/reset-password" element={<AppRuntimeProviders><ResetPassword /></AppRuntimeProviders>} />
          <Route path="/checkout" element={<AppRuntimeProviders><Checkout /></AppRuntimeProviders>} />
          <Route path="/commande-confirmee" element={<AppRuntimeProviders><OrderConfirmation /></AppRuntimeProviders>} />
          <Route path="/ambassadeur" element={<AppRuntimeProviders><Ambassadeur /></AppRuntimeProviders>} />
          <Route path="/compte" element={<AppRuntimeProviders><Compte /></AppRuntimeProviders>} />
          <Route path="/admin" element={<AppRuntimeProviders><Admin /></AppRuntimeProviders>} />
          <Route path="/conditions" element={<AppRuntimeProviders><Conditions /></AppRuntimeProviders>} />
          <Route path="/confidentialite" element={<AppRuntimeProviders><Confidentialite /></AppRuntimeProviders>} />
          <Route path="/livraison" element={<AppRuntimeProviders><Livraison /></AppRuntimeProviders>} />
          <Route path="/mentions-legales" element={<AppRuntimeProviders><MentionsLegales /></AppRuntimeProviders>} />
          <Route path="/contact" element={<AppRuntimeProviders><Contact /></AppRuntimeProviders>} />
          <Route path="/suivi-commande" element={<AppRuntimeProviders><SuiviCommande /></AppRuntimeProviders>} />
          <Route path="/r/:code" element={<AppRuntimeProviders><ShortLinkRedirect /></AppRuntimeProviders>} />
          <Route path="/comparer" element={<AppRuntimeProviders><Comparer /></AppRuntimeProviders>} />
          <Route path="/vendeur" element={<AppRuntimeProviders><Vendeur /></AppRuntimeProviders>} />
          <Route path="/boutique/:slug" element={<AppRuntimeProviders><Boutique /></AppRuntimeProviders>} />
          <Route path="/grossiste" element={<AppRuntimeProviders><Grossiste /></AppRuntimeProviders>} />
          <Route path="/recherche-visuelle" element={<AppRuntimeProviders><RechercheVisuelle /></AppRuntimeProviders>} />
          <Route path="/magazine" element={<AppRuntimeProviders><Magazine /></AppRuntimeProviders>} />
          <Route path="/magazine/:slug" element={<AppRuntimeProviders><Article /></AppRuntimeProviders>} />

          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<AppRuntimeProviders><NotFound /></AppRuntimeProviders>} />
        </Routes>
      </Suspense>
      <DeferredGlobalWidgets />
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
