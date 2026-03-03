import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import HeroSection from "@/components/home/HeroSection";
import CategoriesSection from "@/components/home/CategoriesSection";
import FeaturedProducts from "@/components/home/FeaturedProducts";
import CategoryProductsSection from "@/components/home/CategoryProductsSection";
import MLMTeaser from "@/components/home/MLMTeaser";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <HeroSection />
        <CategoriesSection />
        <FeaturedProducts />
        <CategoryProductsSection />
        <MLMTeaser />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
