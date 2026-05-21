import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";

export type Currency = "XAF" | "EUR" | "USD";

// Taux de change indicatifs depuis XAF (1 XAF = X)
// XAF est ancré à l'EUR (1 EUR ≈ 655,957 XAF, taux fixe CEMAC)
const RATES_FROM_XAF: Record<Currency, number> = {
  XAF: 1,
  EUR: 1 / 655.957,
  USD: 1 / 605, // approximation, à raffraîchir via API si besoin
};

const LOCALE_BY_CURRENCY: Record<Currency, string> = {
  XAF: "fr-FR",
  EUR: "fr-FR",
  USD: "en-US",
};

interface CurrencyContextValue {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  convert: (amountXaf: number) => number;
  format: (amountXaf: number) => string;
  symbol: string;
}

const CurrencyContext = createContext<CurrencyContextValue | undefined>(undefined);

const STORAGE_KEY = "lpb_currency";

const SYMBOLS: Record<Currency, string> = {
  XAF: "FCFA",
  EUR: "€",
  USD: "$",
};

export const CurrencyProvider = ({ children }: { children: ReactNode }) => {
  const [currency, setCurrencyState] = useState<Currency>(() => {
    if (typeof window === "undefined") return "XAF";
    const stored = window.localStorage.getItem(STORAGE_KEY) as Currency | null;
    return stored && SYMBOLS[stored] ? stored : "XAF";
  });

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, currency);
  }, [currency]);

  const value = useMemo<CurrencyContextValue>(() => {
    const convert = (amountXaf: number) => amountXaf * RATES_FROM_XAF[currency];
    const format = (amountXaf: number) => {
      const converted = convert(amountXaf);
      if (currency === "XAF") {
        return new Intl.NumberFormat("fr-FR", {
          style: "decimal",
          maximumFractionDigits: 0,
        }).format(converted) + " FCFA";
      }
      return new Intl.NumberFormat(LOCALE_BY_CURRENCY[currency], {
        style: "currency",
        currency,
        maximumFractionDigits: 2,
      }).format(converted);
    };
    return {
      currency,
      setCurrency: setCurrencyState,
      convert,
      format,
      symbol: SYMBOLS[currency],
    };
  }, [currency]);

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
};

export const useCurrency = () => {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used within CurrencyProvider");
  return ctx;
};
