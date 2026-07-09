import { describe, expect, it } from "vitest";
import {
  calculateCartItemCount,
  calculateCartSubtotal,
  calculateCartTotals,
  FREE_DELIVERY_THRESHOLD,
  STANDARD_DELIVERY_FEE,
} from "./cartTotals";

const items = [
  { quantity: 2, product: { price: 12000 } },
  { quantity: 1, product: { price: 8000 } },
  { quantity: 3, product: null },
];

describe("cart totals", () => {
  it("calculates subtotal and item count without payment side effects", () => {
    expect(calculateCartSubtotal(items)).toBe(32000);
    expect(calculateCartItemCount(items)).toBe(6);
  });

  it("adds delivery fee below the free delivery threshold", () => {
    expect(calculateCartTotals(items)).toMatchObject({
      subtotal: 32000,
      deliveryFee: STANDARD_DELIVERY_FEE,
      total: 34000,
      freeDeliveryRemaining: 18000,
    });
  });

  it("keeps delivery free at and above threshold", () => {
    expect(calculateCartTotals([{ quantity: 1, product: { price: FREE_DELIVERY_THRESHOLD } }])).toMatchObject({
      deliveryFee: 0,
      total: FREE_DELIVERY_THRESHOLD,
      freeDeliveryRemaining: 0,
    });
  });
});
