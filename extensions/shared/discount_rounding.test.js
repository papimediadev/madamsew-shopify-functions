import { describe, expect, it } from 'vitest';
import {
  calculateDiscountedSubtotalCents,
  calculateLineDiscountAmountCents,
  formatDiscountAmountDecimal,
  moneyAmountToCents,
} from './discount_rounding';

describe('discount_rounding', () => {
  it('matches bundle PDP preview for wool pressing mat buy 2 @ 10%', () => {
    const subtotalCents = moneyAmountToCents('179.96');

    expect(calculateDiscountedSubtotalCents(subtotalCents, 10)).toBe(16196);
    expect(formatDiscountAmountDecimal(calculateLineDiscountAmountCents(subtotalCents, 10))).toBe(
      '18.00',
    );
  });

  it('matches bundle PDP preview for seam guide ruler buy 2 @ 10%', () => {
    const subtotalCents = moneyAmountToCents('27.98');

    expect(calculateDiscountedSubtotalCents(subtotalCents, 10)).toBe(2518);
    expect(formatDiscountAmountDecimal(calculateLineDiscountAmountCents(subtotalCents, 10))).toBe(
      '2.80',
    );
  });
});
