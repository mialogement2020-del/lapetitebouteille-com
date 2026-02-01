import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { ProductFilters } from "@/components/catalog/ProductFilters";
import { ProductGrid } from "@/components/catalog/ProductGrid";
import { SortSelect } from "@/components/catalog/SortSelect";
import { Input } from "@/components/ui/input";
import { useProducts, ProductFilters as Filters, useCategories } from "@/hooks/useProducts";

const Catalogue = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  
  const [filters, setFilters] = useState<Filters>({
    categorySlug: searchParams.get("category") || undefined,
    sortBy: (searchParams.get("sort") as Filters["sortBy"]) || "popular",
  });

  const { data: products = [], isLoading } = useProducts({
    ...filters,
    search: debouncedSearch,
  });

  const { data: categories = [] } = useCategories();

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Sync filters with URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.categorySlug) params.set("category", filters.categorySlug);
    if (filters.sortBy && filters.sortBy !== "popular") params.set("sort", filters.sortBy);
    if (filters.origin) params.set("origin", filters.origin);
    setSearchParams(params, { replace: true });
  }, [filters, setSearchParams]);

  // Get current category name
  const currentCategory = categories.find((c) => c.slug === filters.categorySlug);

  const handleFiltersChange = (newFilters: Filters) => {
    setFilters(newFilters);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-20">
        {/* Hero Banner */}
        <section className="bg-gradient-to-r from-black to-burgundy py-12 md:py-20">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <h1 className="font-display text-3xl md:text-5xl font-bold text-white mb-4">
                {currentCategory ? currentCategory.name : "Notre Collection"}
              </h1>
              <p className="text-cream/80 max-w-2xl mx-auto">
                {currentCategory?.description ||
                  "Découvrez notre sélection exclusive de vins, champagnes et spiritueux d'exception"}
              </p>
            </motion.div>
          </div>
        </section>

        {/* Catalog Content */}
        <section className="py-8 md:py-12">
          <div className="container mx-auto px-4">
            {/* Top Bar */}
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-8">
              {/* Search */}
              <div className="relative w-full md:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Rechercher un produit..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="flex items-center gap-4">
                {/* Mobile Filters */}
                <div className="md:hidden">
                  <ProductFilters filters={filters} onFiltersChange={handleFiltersChange} />
                </div>

                {/* Results Count */}
                <span className="text-sm text-muted-foreground">
                  {products.length} produit{products.length !== 1 ? "s" : ""}
                </span>

                {/* Sort */}
                <SortSelect
                  value={filters.sortBy}
                  onChange={(value) => setFilters({ ...filters, sortBy: value })}
                />
              </div>
            </div>

            {/* Main Grid */}
            <div className="flex gap-8">
              {/* Desktop Filters */}
              <div className="hidden md:block">
                <ProductFilters filters={filters} onFiltersChange={handleFiltersChange} />
              </div>

              {/* Products */}
              <div className="flex-1">
                <ProductGrid products={products} isLoading={isLoading} />
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Catalogue;
