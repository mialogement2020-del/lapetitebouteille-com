export interface CartTotalsInput {
  quantity: number;
  packaging_option_id?: string | null;
  packaging_option?: {
    bottle_quantity?: number | null;
    total_price?: number | null;
    discount_percent?: number | null;
    discount_tiers?: unknown;
  } | null;
  product?: {
    price?: number | null;
  } | null;
}

export const FREE_DELIVERY_THRESHOLD = 50000;
export const STANDARD_DELIVERY_FEE = 2000;

const normalizeDiscountTiers = (tiers: unknown) => {
  if (!Array.isArray(tiers)) return [];
  return tiers
    .map((tier) => {
      if (!tier || typeof tier !== "object") return null;
      const row = tier as { min_quantity?: unknown; discount_percent?: unknown };
      return {
        min_quantity: Number(row.min_quantity || 0),
        discount_percent: Number(row.discount_percent || 0),
      };
    })
    .filter((tier): tier is { min_quantity: number; discount_percent: number } =>
      !!tier && tier.min_quantity > 0 && tier.discount_percent >= 0 && tier.discount_percent <= 100,
    )
    .sort((a, b) => a.min_quantity - b.min_quantity);
};

export const calculateCartLineTotal = (item: CartTotalsInput) => {
  const option = item.packaging_option;
  if (item.packaging_option_id && option?.bottle_quantity && option.total_price) {
    const packageCount = Math.max(1, Math.floor(item.quantity / option.bottle_quantity));
    const baseTotal = Math.round(option.total_price * packageCount);
    const tierDiscount = [...normalizeDiscountTiers(option.discount_tiers)]
      .reverse()
      .find((tier) => packageCount >= tier.min_quantity)?.discount_percent;
    const discountPercent = tierDiscount ?? Number(option.discount_percent || 0);
    return Math.max(0, baseTotal - Math.round((baseTotal * discountPercent) / 100));
  }
  return (item.product?.price || 0) * item.quantity;
};

export const calculateCartSubtotal = (items: CartTotalsInput[]) =>
  items.reduce((sum, item) => sum + calculateCartLineTotal(item), 0);

export const calculateCartItemCount = (items: CartTotalsInput[]) =>
  items.reduce((sum, item) => sum + item.quantity, 0);

export const calculateDeliveryFee = (subtotal: number) =>
  subtotal >= FREE_DELIVERY_THRESHOLD || subtotal <= 0 ? 0 : STANDARD_DELIVERY_FEE;

export const calculateCartTotals = (items: CartTotalsInput[]) => {
  const subtotal = calculateCartSubtotal(items);
  const deliveryFee = calculateDeliveryFee(subtotal);

  return {
    subtotal,
    itemCount: calculateCartItemCount(items),
    deliveryFee,
    total: subtotal + deliveryFee,
    freeDeliveryRemaining: Math.max(0, FREE_DELIVERY_THRESHOLD - subtotal),
  };
};
