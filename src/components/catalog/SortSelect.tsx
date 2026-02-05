import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProductFilters } from "@/hooks/useProducts";

interface SortSelectProps {
  value: ProductFilters["sortBy"];
  onChange: (value: ProductFilters["sortBy"]) => void;
}

const sortOptions = [
  { value: "popular", label: "Popularité" },
  { value: "newest", label: "Nouveautés" },
  { value: "price_asc", label: "Prix croissant" },
  { value: "price_desc", label: "Prix décroissant" },
  { value: "rating", label: "Meilleures notes" },
] as const;

export const SortSelect = ({ value, onChange }: SortSelectProps) => {
  return (
    <Select value={value || "popular"} onValueChange={onChange as (value: string) => void}>
      <SelectTrigger className="w-[180px] bg-cream/5 border-cream/10 text-cream rounded-full focus:border-primary/50 focus:ring-primary/20">
        <SelectValue placeholder="Trier par" />
      </SelectTrigger>
      <SelectContent className="bg-noir border-cream/10">
        {sortOptions.map((option) => (
          <SelectItem 
            key={option.value} 
            value={option.value}
            className="text-cream/70 focus:bg-cream/10 focus:text-cream"
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
