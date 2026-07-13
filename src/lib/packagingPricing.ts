export type PackagingPricingMode = "manual_total" | "discount_percent";
export type ProductPackagingType = "carton" | "wooden_case" | "standard_case" | "custom";

export interface PackagingDiscountTier {
  min_quantity: number;
  discount_percent: number;
}

export interface ProductPackagingOption {
  id: string;
  product_id: string;
  packaging_type: ProductPackagingType;
  packaging_label: string;
  bottle_quantity: number;
  pricing_mode: PackagingPricingMode;
  total_price: number;
  discount_percent: number | null;
  calculated_unit_price: number | null;
  calculated_savings: number | null;
  show_discount: boolean;
  stock_quantity: number | null;
  sku: string | null;
  weight_kg: number | null;
  discount_tiers: PackagingDiscountTier[] | null;
  is_active: boolean;
}

export const normalizeDiscountTiers = (tiers: unknown): PackagingDiscountTier[] => {
  if (!Array.isArray(tiers)) return [];
  return tiers
    .map((tier) => {
      if (!tier || typeof tier !== "object") return null;
      const raw = tier as Partial<PackagingDiscountTier>;
      return {
        min_quantity: Number(raw.min_quantity || 0),
        discount_percent: Number(raw.discount_percent || 0),
      };
    })
    .filter((tier): tier is PackagingDiscountTier =>
      !!tier &&
      Number.isFinite(tier.min_quantity) &&
      Number.isFinite(tier.discount_percent) &&
      tier.min_quantity > 0 &&
      tier.discount_percent >= 0 &&
      tier.discount_percent <= 100,
    )
    .sort((a, b) => a.min_quantity - b.min_quantity);
};

export const getPackagingIcon = (type: ProductPackagingType) => {
  if (type === "carton") return "BOX";
  if (type === "wooden_case") return "WOOD";
  if (type === "standard_case") return "CASE";
  return "PACK";
};

export const calculatePackagingDiscount = (
  option: Pick<ProductPackagingOption, "discount_tiers" | "discount_percent">,
  packageCount: number,
) => {
  const tiers = normalizeDiscountTiers(option.discount_tiers);
  const tier = [...tiers].reverse().find((candidate) => packageCount >= candidate.min_quantity);
  return tier?.discount_percent ?? Number(option.discount_percent || 0);
};

export const calculatePackagingLineTotal = (
  option: Pick<ProductPackagingOption, "total_price" | "discount_tiers" | "discount_percent">,
  packageCount: number,
) => {
  const baseTotal = Math.round(Number(option.total_price || 0) * packageCount);
  const discountPercent = calculatePackagingDiscount(option, packageCount);
  const discountAmount = Math.round((baseTotal * discountPercent) / 100);
  return {
    baseTotal,
    discountPercent,
    discountAmount,
    total: Math.max(0, baseTotal - discountAmount),
  };
};

export const calculatePackagingUnitPrice = (
  option: Pick<ProductPackagingOption, "total_price" | "bottle_quantity">,
) => Math.round(Number(option.total_price || 0) / Math.max(1, Number(option.bottle_quantity || 1)));
