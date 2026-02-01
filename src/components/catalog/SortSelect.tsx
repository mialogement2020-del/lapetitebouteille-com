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
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Trier par" />
      </SelectTrigger>
      <SelectContent>
        {sortOptions.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
