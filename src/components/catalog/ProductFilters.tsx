import { useState } from "react";
import { motion } from "framer-motion";
import { Filter, X, ChevronDown, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useCategories, useProductOrigins, ProductFilters as Filters } from "@/hooks/useProducts";
import { useIsMobile } from "@/hooks/use-mobile";

interface ProductFiltersProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
}

const formatPrice = (price: number) => {
  return new Intl.NumberFormat("fr-FR").format(price) + " FCFA";
};

const FilterContent = ({ filters, onFiltersChange }: ProductFiltersProps) => {
  const { data: categories = [] } = useCategories();
  const { data: origins = [] } = useProductOrigins();
  const [priceRange, setPriceRange] = useState([
    filters.minPrice || 0,
    filters.maxPrice || 500000,
  ]);
  const [openSections, setOpenSections] = useState({
    category: true,
    price: true,
    origin: true,
  });

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const handlePriceChange = (value: number[]) => {
    setPriceRange(value);
  };

  const applyPriceFilter = () => {
    onFiltersChange({
      ...filters,
      minPrice: priceRange[0],
      maxPrice: priceRange[1],
    });
  };

  const clearFilters = () => {
    setPriceRange([0, 500000]);
    onFiltersChange({});
  };

  const hasActiveFilters =
    filters.categorySlug ||
    filters.minPrice ||
    filters.maxPrice ||
    filters.origin;

  return (
    <div className="space-y-6">
      {hasActiveFilters && (
        <Button
          variant="outline"
          size="sm"
          onClick={clearFilters}
          className="w-full border-secondary/50 text-secondary hover:bg-secondary hover:text-cream rounded-full"
        >
          <X className="w-4 h-4 mr-2" />
          Effacer les filtres
        </Button>
      )}

      {/* Categories */}
      <Collapsible open={openSections.category} onOpenChange={() => toggleSection("category")}>
        <CollapsibleTrigger className="flex items-center justify-between w-full py-3 font-semibold text-cream border-b border-cream/10">
          <span className="text-sm uppercase tracking-wider">Catégories</span>
          <ChevronDown
            className={`w-4 h-4 transition-transform text-cream/50 ${
              openSections.category ? "rotate-180" : ""
            }`}
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3 space-y-1">
          <button
            onClick={() => onFiltersChange({ ...filters, categorySlug: undefined })}
            className={`block w-full text-left px-4 py-2.5 rounded-xl text-sm transition-all ${
              !filters.categorySlug
                ? "bg-primary/20 text-primary font-medium border border-primary/30"
                : "text-cream/70 hover:bg-cream/5 hover:text-cream"
            }`}
          >
            Toutes les catégories
          </button>
          {categories.filter(c => !c.parent_id).map((parent) => {
            const children = categories.filter(c => c.parent_id === parent.id);
            return (
              <div key={parent.id}>
                <button
                  onClick={() =>
                    onFiltersChange({ ...filters, categorySlug: parent.slug })
                  }
                  className={`block w-full text-left px-4 py-2.5 rounded-xl text-sm transition-all font-medium ${
                    filters.categorySlug === parent.slug
                      ? "bg-primary/20 text-primary border border-primary/30"
                      : "text-cream/80 hover:bg-cream/5 hover:text-cream"
                  }`}
                >
                  {parent.name}
                </button>
                {children.length > 0 && (
                  <div className="ml-4 border-l border-cream/10 pl-2 space-y-0.5">
                    {children.map((child) => (
                      <button
                        key={child.id}
                        onClick={() =>
                          onFiltersChange({ ...filters, categorySlug: child.slug })
                        }
                        className={`block w-full text-left px-3 py-2 rounded-lg text-xs transition-all ${
                          filters.categorySlug === child.slug
                            ? "bg-primary/20 text-primary font-medium border border-primary/30"
                            : "text-cream/60 hover:bg-cream/5 hover:text-cream/80"
                        }`}
                      >
                        {child.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </CollapsibleContent>
      </Collapsible>

      {/* Price Range */}
      <Collapsible open={openSections.price} onOpenChange={() => toggleSection("price")}>
        <CollapsibleTrigger className="flex items-center justify-between w-full py-3 font-semibold text-cream border-b border-cream/10">
          <span className="text-sm uppercase tracking-wider">Prix</span>
          <ChevronDown
            className={`w-4 h-4 transition-transform text-cream/50 ${
              openSections.price ? "rotate-180" : ""
            }`}
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-4 space-y-4">
          <Slider
            value={priceRange}
            onValueChange={handlePriceChange}
            onValueCommit={applyPriceFilter}
            min={0}
            max={500000}
            step={5000}
            className="w-full [&_[role=slider]]:bg-primary [&_[role=slider]]:border-primary [&_.relative]:bg-cream/20 [&_[data-orientation=horizontal]>.absolute]:bg-primary"
          />
          <div className="flex items-center justify-between text-sm text-cream/60">
            <span>{formatPrice(priceRange[0])}</span>
            <span>{formatPrice(priceRange[1])}</span>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Origin */}
      <Collapsible open={openSections.origin} onOpenChange={() => toggleSection("origin")}>
        <CollapsibleTrigger className="flex items-center justify-between w-full py-3 font-semibold text-cream border-b border-cream/10">
          <span className="text-sm uppercase tracking-wider">Origine</span>
          <ChevronDown
            className={`w-4 h-4 transition-transform text-cream/50 ${
              openSections.origin ? "rotate-180" : ""
            }`}
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3 space-y-1">
          <button
            onClick={() => onFiltersChange({ ...filters, origin: undefined })}
            className={`block w-full text-left px-4 py-2.5 rounded-xl text-sm transition-all ${
              !filters.origin
                ? "bg-primary/20 text-primary font-medium border border-primary/30"
                : "text-cream/70 hover:bg-cream/5 hover:text-cream"
            }`}
          >
            Toutes les origines
          </button>
          {origins.map((origin) => (
            <button
              key={origin}
              onClick={() => onFiltersChange({ ...filters, origin })}
              className={`block w-full text-left px-4 py-2.5 rounded-xl text-sm transition-all ${
                filters.origin === origin
                  ? "bg-primary/20 text-primary font-medium border border-primary/30"
                  : "text-cream/70 hover:bg-cream/5 hover:text-cream"
              }`}
            >
              {origin}
            </button>
          ))}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

export const ProductFilters = ({ filters, onFiltersChange }: ProductFiltersProps) => {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" className="gap-2 border-cream/20 bg-transparent text-cream hover:bg-cream/5 rounded-full">
            <Filter className="w-4 h-4" />
            Filtres
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-80 bg-noir border-cream/10">
          <SheetHeader>
            <SheetTitle className="text-cream font-display">Filtres</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <FilterContent filters={filters} onFiltersChange={onFiltersChange} />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <motion.aside
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="w-64 flex-shrink-0"
    >
      <div className="sticky top-24 glass-premium rounded-2xl border border-cream/10 p-6">
        <div className="flex items-center gap-2 mb-6">
          <Sparkles className="h-4 w-4 text-primary" />
          <h2 className="font-display text-lg font-semibold text-cream">Filtres</h2>
        </div>
        <FilterContent filters={filters} onFiltersChange={onFiltersChange} />
      </div>
    </motion.aside>
  );
};
