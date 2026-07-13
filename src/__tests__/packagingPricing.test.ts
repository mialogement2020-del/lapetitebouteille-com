import { describe, expect, it } from "vitest";
import {
  calculatePackagingDiscount,
  calculatePackagingLineTotal,
  calculatePackagingUnitPrice,
  normalizeDiscountTiers,
} from "@/lib/packagingPricing";

describe("packaging pricing", () => {
  it("normalizes and sorts valid discount tiers", () => {
    expect(
      normalizeDiscountTiers([
        { min_quantity: 6, discount_percent: 10 },
        { min_quantity: 3, discount_percent: 5 },
        { min_quantity: 0, discount_percent: 50 },
        { min_quantity: 9, discount_percent: 150 },
      ]),
    ).toEqual([
      { min_quantity: 3, discount_percent: 5 },
      { min_quantity: 6, discount_percent: 10 },
    ]);
  });

  it("uses the best applicable tier before the default discount", () => {
    const option = {
      discount_percent: 2,
      discount_tiers: [
        { min_quantity: 3, discount_percent: 5 },
        { min_quantity: 6, discount_percent: 10 },
      ],
    };

    expect(calculatePackagingDiscount(option, 1)).toBe(2);
    expect(calculatePackagingDiscount(option, 3)).toBe(5);
    expect(calculatePackagingDiscount(option, 8)).toBe(10);
  });

  it("calculates line total from configured package price only", () => {
    const result = calculatePackagingLineTotal(
      {
        total_price: 60000,
        discount_percent: null,
        discount_tiers: [{ min_quantity: 3, discount_percent: 5 }],
      },
      3,
    );

    expect(result).toEqual({
      baseTotal: 180000,
      discountPercent: 5,
      discountAmount: 9000,
      total: 171000,
    });
  });

  it("calculates unit price from configured total and bottle count", () => {
    expect(calculatePackagingUnitPrice({ total_price: 60000, bottle_quantity: 6 })).toBe(10000);
  });
});
