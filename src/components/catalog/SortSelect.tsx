import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProductFilters } from "@/hooks/useProducts";
import { useTranslation } from "react-i18next";

interface SortSelectProps {
  value: ProductFilters["sortBy"];
  onChange: (value: ProductFilters["sortBy"]) => void;
}

const sortValues = ["popular", "newest", "price_asc", "price_desc", "rating"] as const;

export const SortSelect = ({ value, onChange }: SortSelectProps) => {
  const { t } = useTranslation();
  return (
    <Select value={value || "popular"} onValueChange={onChange as (value: string) => void}>
      <SelectTrigger className="w-[180px] bg-cream/5 border-cream/10 text-cream rounded-full focus:border-primary/50 focus:ring-primary/20">
        <SelectValue placeholder={t("catalogue.sortBy")} />
      </SelectTrigger>
      <SelectContent className="bg-noir border-cream/10">
        {sortValues.map((v) => (
          <SelectItem 
            key={v}
            value={v}
            className="text-cream/70 focus:bg-cream/10 focus:text-cream"
          >
            {t(`catalogue.sort.${v}`)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
