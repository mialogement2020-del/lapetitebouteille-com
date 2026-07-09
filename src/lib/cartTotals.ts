export interface CartTotalsInput {
  quantity: number;
  product?: {
    price?: number | null;
  } | null;
}

export const FREE_DELIVERY_THRESHOLD = 50000;
export const STANDARD_DELIVERY_FEE = 2000;

export const calculateCartSubtotal = (items: CartTotalsInput[]) =>
  items.reduce((sum, item) => sum + (item.product?.price || 0) * item.quantity, 0);

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
