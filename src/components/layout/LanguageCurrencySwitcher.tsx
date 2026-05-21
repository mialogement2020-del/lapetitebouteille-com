import { Globe } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCurrency, Currency } from "@/contexts/CurrencyContext";

const LANGS: { code: "fr" | "en"; label: string; flag: string }[] = [
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "en", label: "English", flag: "🇬🇧" },
];

const CURRENCIES: { code: Currency; label: string }[] = [
  { code: "XAF", label: "XAF · FCFA" },
  { code: "EUR", label: "EUR · €" },
  { code: "USD", label: "USD · $" },
];

export const LanguageCurrencySwitcher = () => {
  const { t, i18n } = useTranslation();
  const { currency, setCurrency } = useCurrency();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex items-center gap-1.5 px-2 py-1.5 rounded-full text-cream/80 hover:text-cream hover:bg-cream/5 transition-colors text-xs uppercase tracking-wider"
        aria-label="Langue et devise"
      >
        <Globe className="h-4 w-4" />
        <span className="hidden md:inline font-medium">
          {i18n.language?.toUpperCase().slice(0, 2)} · {currency}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 bg-noir border-gold/20 text-cream">
        <DropdownMenuLabel className="text-cream/60 text-xs">
          {t("common.language")}
        </DropdownMenuLabel>
        {LANGS.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => i18n.changeLanguage(lang.code)}
            className={`cursor-pointer ${
              i18n.language?.startsWith(lang.code) ? "text-primary" : ""
            }`}
          >
            <span className="mr-2">{lang.flag}</span>
            {lang.label}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator className="bg-gold/10" />
        <DropdownMenuLabel className="text-cream/60 text-xs">
          {t("common.currency")}
        </DropdownMenuLabel>
        {CURRENCIES.map((c) => (
          <DropdownMenuItem
            key={c.code}
            onClick={() => setCurrency(c.code)}
            className={`cursor-pointer ${currency === c.code ? "text-primary" : ""}`}
          >
            {c.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
