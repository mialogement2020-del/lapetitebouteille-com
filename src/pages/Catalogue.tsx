import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import { Search, Sparkles } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { ProductFilters } from "@/components/catalog/ProductFilters";
import { ProductGrid } from "@/components/catalog/ProductGrid";
import { SortSelect } from "@/components/catalog/SortSelect";
import { Input } from "@/components/ui/input";
import { useProducts, ProductFilters as Filters, useCategories } from "@/hooks/useProducts";
import { useRef } from "react";

const Catalogue = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSearch = searchParams.get("search") || "";
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const heroRef = useRef<HTMLElement>(null);
  
  const [filters, setFilters] = useState<Filters>({
    categorySlug: searchParams.get("category") || undefined,
    sortBy: (searchParams.get("sort") as Filters["sortBy"]) || "popular",
    origin: searchParams.get("origin") || undefined,
  });

  const { data: products = [], isLoading } = useProducts({
    ...filters,
    search: debouncedSearch,
  });

  const { data: categories = [] } = useCategories();
  
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"]
  });
  
  const heroOpacity = useTransform(scrollYProgress, [0, 1], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 1.1]);

  // Debounce search and sync to URL
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      syncToUrl(filters, searchQuery);
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  // Sync local search state when URL changes (header search, browser nav)
  useEffect(() => {
    const urlSearch = searchParams.get("search") || "";
    setSearchQuery(prev => prev !== urlSearch ? urlSearch : prev);
    setDebouncedSearch(prev => prev !== urlSearch ? urlSearch : prev);
    
    const urlCategory = searchParams.get("category") || undefined;
    const urlSort = (searchParams.get("sort") as Filters["sortBy"]) || "popular";
    const urlOrigin = searchParams.get("origin") || undefined;
    setFilters(prev => {
      if (prev.categorySlug !== urlCategory || prev.sortBy !== urlSort || prev.origin !== urlOrigin) {
        return { ...prev, categorySlug: urlCategory, sortBy: urlSort, origin: urlOrigin };
      }
      return prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Sync filters + search with URL (only when user changes them locally)
  const syncToUrl = (newFilters: Filters, search: string) => {
    const params = new URLSearchParams();
    if (newFilters.categorySlug) params.set("category", newFilters.categorySlug);
    if (newFilters.sortBy && newFilters.sortBy !== "popular") params.set("sort", newFilters.sortBy);
    if (newFilters.origin) params.set("origin", newFilters.origin);
    if (search.trim()) params.set("search", search.trim());
    setSearchParams(params, { replace: true });
  };

  // Get current category name
  const currentCategory = categories.find((c) => c.slug === filters.categorySlug);

  const handleFiltersChange = (newFilters: Filters) => {
    setFilters(newFilters);
    syncToUrl(newFilters, debouncedSearch);
  };

  return (
    <div className="min-h-screen bg-noir">
      <Header />
      
      <main className="pt-20">
        {/* Hero Banner */}
        <section 
          ref={heroRef}
          className="relative py-16 md:py-28 overflow-hidden"
        >
          {/* Background with parallax */}
          <motion.div 
            className="absolute inset-0"
            style={{ scale: heroScale }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-noir via-noir to-secondary/20" />
            <div className="absolute inset-0 opacity-30">
              <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/10 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-secondary/10 rounded-full blur-3xl" />
            </div>
            {/* Subtle pattern */}
            <div 
              className="absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)`,
                backgroundSize: '50px 50px'
              }}
            />
          </motion.div>
          
          {/* Gold accent lines */}
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
          
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center relative z-10"
              style={{ opacity: heroOpacity }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary/10 border border-primary/20 mb-8 backdrop-blur-sm"
              >
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-primary tracking-wide">
                  {products.length} Produit{products.length !== 1 ? "s" : ""} d'Exception
                </span>
              </motion.div>
              
              <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-semibold text-cream mb-6 leading-[0.95]">
                {currentCategory ? currentCategory.name : "Notre Collection"}
              </h1>
              <p className="text-cream/60 max-w-2xl mx-auto text-lg leading-relaxed">
                {currentCategory?.description ||
                  "Découvrez notre sélection exclusive de vins, champagnes et spiritueux d'exception"}
              </p>
            </motion.div>
          </div>
        </section>

        {/* Catalog Content */}
        <section className="py-12 md:py-16 relative">
          {/* Background decoration */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
            <div className="absolute bottom-40 right-10 w-96 h-96 bg-secondary/5 rounded-full blur-3xl" />
          </div>
          
          <div className="container mx-auto px-4">
            {/* Top Bar */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-10"
            >
              {/* Search */}
              <div className="relative w-full md:w-96">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-cream/40" />
                <Input
                  type="search"
                  placeholder="Rechercher un produit..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-11 bg-cream/5 border-cream/10 text-cream placeholder:text-cream/40 rounded-full h-12 focus:border-primary/50 focus:ring-primary/20"
                />
              </div>

              <div className="flex items-center gap-4">
                {/* Mobile Filters */}
                <div className="md:hidden">
                  <ProductFilters filters={filters} onFiltersChange={handleFiltersChange} />
                </div>

                {/* Results Count */}
                <span className="text-sm text-cream/50">
                  {products.length} produit{products.length !== 1 ? "s" : ""}
                  {debouncedSearch ? ` pour “${debouncedSearch}”` : ""}
                </span>

                {/* Sort */}
                <SortSelect
                  value={filters.sortBy}
                  onChange={(value) => setFilters({ ...filters, sortBy: value })}
                />
              </div>
            </motion.div>

            {/* Main Grid */}
            <div className="flex gap-8">
              {/* Desktop Filters */}
              <motion.div 
                className="hidden md:block"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                <ProductFilters filters={filters} onFiltersChange={handleFiltersChange} />
              </motion.div>

              {/* Products */}
              <motion.div 
                className="flex-1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                <ProductGrid products={products} isLoading={isLoading} />
              </motion.div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Catalogue;
