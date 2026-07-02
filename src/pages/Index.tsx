import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import HeroSection from "@/components/home/HeroSection";
import CategoriesSection from "@/components/home/CategoriesSection";
import FeaturedProducts from "@/components/home/FeaturedProducts";
import CategoryProductsSection from "@/components/home/CategoryProductsSection";
import MLMTeaser from "@/components/home/MLMTeaser";
import RecommendedForYou from "@/components/home/RecommendedForYou";
import Seo from "@/components/seo/Seo";

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
        <CategoriesSection />
        <FeaturedProducts />
        <RecommendedForYou />
        <CategoryProductsSection />
        <MLMTeaser />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
