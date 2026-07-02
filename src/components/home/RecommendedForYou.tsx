import { Sparkles } from "lucide-react";
import { useRecommendations } from "@/hooks/useRecommendations";
import { ProductCard } from "@/components/catalog/ProductCard";
import { useAuthContext } from "@/contexts/AuthContext";

export default function RecommendedForYou() {
  const { user } = useAuthContext();
  const { data: products, isLoading } = useRecommendations(8);

  if (isLoading || !products || products.length === 0) return null;

  return (
    <section className="container mx-auto px-4 py-12 md:py-16">
      <div className="flex items-center gap-3 mb-6 md:mb-8">
        <Sparkles className="h-5 w-5 text-primary" />
        <h2 className="font-serif text-2xl md:text-3xl">
          {user ? "Sélectionné pour vous" : "Tendances du moment"}
        </h2>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
        {products.map((product, i) => (
          <ProductCard key={product.id} product={product} index={i} />
        ))}
      </div>
    </section>
  );
}