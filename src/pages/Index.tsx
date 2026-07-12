import { lazy, Suspense } from "react";
import type { ReactNode } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import HeroSection from "@/components/home/HeroSection";
import Seo from "@/components/seo/Seo";
import { DeferredSection } from "@/components/performance/DeferredSection";

const CategoriesSection = lazy(() => import("@/components/home/CategoriesSection"));
const FeaturedProducts = lazy(() => import("@/components/home/FeaturedProducts"));
const RecommendedForYou = lazy(() => import("@/components/home/RecommendedForYou"));
const CategoryProductsSection = lazy(() => import("@/components/home/CategoryProductsSection"));
const MagazineTeaser = lazy(() => import("@/components/home/MagazineTeaser"));
const MLMTeaser = lazy(() => import("@/components/home/MLMTeaser"));

const DeferredHomeSection = ({
  children,
  minHeight = 1,
}: {
  children: ReactNode;
  minHeight?: number;
}) => (
  <DeferredSection minHeight={minHeight}>
    <Suspense fallback={null}>{children}</Suspense>
  </DeferredSection>
);

const Index = () => {
  return (
    <div className="min-h-screen">
      <Seo
        title="La Petite Bouteille – Vins & Spiritueux au Cameroun"
        description="Cave en ligne premium au Cameroun : vins, champagnes et spiritueux livrés à Yaoundé, Douala et partout au Cameroun. Paiement Mobile Money."
        path="/"
      />
      <Header />
      <main>
        <HeroSection />
        <DeferredHomeSection minHeight={320}>
          <CategoriesSection />
        </DeferredHomeSection>
        <DeferredHomeSection minHeight={360}>
          <FeaturedProducts />
        </DeferredHomeSection>
        <DeferredHomeSection>
          <RecommendedForYou />
        </DeferredHomeSection>
        <DeferredHomeSection>
          <CategoryProductsSection />
        </DeferredHomeSection>
        <DeferredHomeSection>
          <MagazineTeaser />
        </DeferredHomeSection>
        <DeferredHomeSection>
          <MLMTeaser />
        </DeferredHomeSection>
      </main>
      <Footer />
    </div>
  );
};

export default Index;
