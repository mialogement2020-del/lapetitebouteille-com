import { useState } from "react";
import { motion } from "framer-motion";
import { Filter, X, ChevronDown } from "lucide-react";
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
          className="w-full border-burgundy text-burgundy hover:bg-burgundy hover:text-white"
        >
          <X className="w-4 h-4 mr-2" />
          Effacer les filtres
        </Button>
      )}

      {/* Categories */}
      <Collapsible open={openSections.category} onOpenChange={() => toggleSection("category")}>
        <CollapsibleTrigger className="flex items-center justify-between w-full py-2 font-semibold text-foreground">
          <span>Catégories</span>
          <ChevronDown
            className={`w-4 h-4 transition-transform ${
              openSections.category ? "rotate-180" : ""
            }`}
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2 space-y-2">
          <button
            onClick={() => onFiltersChange({ ...filters, categorySlug: undefined })}
            className={`block w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
              !filters.categorySlug
                ? "bg-gold/20 text-gold font-medium"
                : "hover:bg-muted"
            }`}
          >
            Toutes les catégories
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() =>
                onFiltersChange({ ...filters, categorySlug: category.slug })
              }
              className={`block w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                filters.categorySlug === category.slug
                  ? "bg-gold/20 text-gold font-medium"
                  : "hover:bg-muted"
              }`}
            >
              {category.name}
            </button>
          ))}
        </CollapsibleContent>
      </Collapsible>

      {/* Price Range */}
      <Collapsible open={openSections.price} onOpenChange={() => toggleSection("price")}>
        <CollapsibleTrigger className="flex items-center justify-between w-full py-2 font-semibold text-foreground">
          <span>Prix</span>
          <ChevronDown
            className={`w-4 h-4 transition-transform ${
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
            className="w-full"
          />
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{formatPrice(priceRange[0])}</span>
            <span>{formatPrice(priceRange[1])}</span>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Origin */}
      <Collapsible open={openSections.origin} onOpenChange={() => toggleSection("origin")}>
        <CollapsibleTrigger className="flex items-center justify-between w-full py-2 font-semibold text-foreground">
          <span>Origine</span>
          <ChevronDown
            className={`w-4 h-4 transition-transform ${
              openSections.origin ? "rotate-180" : ""
            }`}
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2 space-y-2">
          <button
            onClick={() => onFiltersChange({ ...filters, origin: undefined })}
            className={`block w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
              !filters.origin
                ? "bg-gold/20 text-gold font-medium"
                : "hover:bg-muted"
            }`}
          >
            Toutes les origines
          </button>
          {origins.map((origin) => (
            <button
              key={origin}
              onClick={() => onFiltersChange({ ...filters, origin })}
              className={`block w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                filters.origin === origin
                  ? "bg-gold/20 text-gold font-medium"
                  : "hover:bg-muted"
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
          <Button variant="outline" className="gap-2">
            <Filter className="w-4 h-4" />
            Filtres
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-80">
          <SheetHeader>
            <SheetTitle>Filtres</SheetTitle>
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
      <div className="sticky top-24 bg-card rounded-lg border p-6">
        <h2 className="font-display text-lg font-semibold mb-4">Filtres</h2>
        <FilterContent filters={filters} onFiltersChange={onFiltersChange} />
      </div>
    </motion.aside>
  );
};
