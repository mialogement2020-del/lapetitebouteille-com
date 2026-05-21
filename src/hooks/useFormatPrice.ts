import { useCurrency } from "@/contexts/CurrencyContext";

/**
 * Hook qui retourne une fonction de formatage de prix
 * convertie depuis XAF vers la devise active de l'utilisateur.
 */
export const useFormatPrice = () => {
  const { format } = useCurrency();
  return format;
};
