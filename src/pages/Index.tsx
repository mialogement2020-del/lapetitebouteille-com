import { lazy, Suspense } from "react";
import HeroSection from "@/components/home/HeroSection";
import Seo from "@/components/seo/Seo";

const Header = lazy(() => import("@/components/layout/Header"));
const Footer = lazy(() => import("@/components/layout/Footer"));
const CategoriesSection = lazy(() => import("@/components/home/CategoriesSection"));
const FeaturedProducts = lazy(() => import("@/components/home/FeaturedProducts"));
const RecommendedForYou = lazy(() => import("@/components/home/RecommendedForYou"));
const CategoryProductsSection = lazy(() => import("@/components/home/CategoryProductsSection"));
const MagazineTeaser = lazy(() => import("@/components/home/MagazineTeaser"));
const MLMTeaser = lazy(() => import("@/components/home/MLMTeaser"));

const Index = () => {
  return (
    <div className="min-h-screen">
      <Seo
        title="La Petite Bouteille - Vins & Spiritueux au Cameroun"
        description="Cave en ligne premium au Cameroun : vins, champagnes et spiritueux livres a Yaounde, Douala et partout au Cameroun. Paiement Mobile Money."
        path="/"
      />
      <Suspense fallback={null}>
        <Header />
      </Suspense>
      <main>
        <HeroSection />
        <Suspense fallback={null}>
          <CategoriesSection />
          <FeaturedProducts />
          <RecommendedForYou />
          <CategoryProductsSection />
          <MagazineTeaser />
          <MLMTeaser />
        </Suspense>
      </main>
      <Suspense fallback={null}>
        <Footer />
      </Suspense>
    </div>
  );
};

export default Index;
