import { describe, expect, it } from 'vitest';
import {
  buildDiscountCandidates,
  getByobDiscountPercent,
  isByobLine,
} from '../src/byob_logic';

describe('byob_logic', () => {
  it('detects bundle product lines from lowercase and uppercase properties', () => {
    expect(
      isByobLine({
        bundleType: { value: 'Bundle Product' },
      }),
    ).toBe(true);

    expect(
      isByobLine({
        bundleTypeAlt: { value: 'Bundle Product' },
      }),
    ).toBe(true);

    expect(isByobLine({ bundleType: { value: 'regular' } })).toBe(false);
  });

  it('returns 0 below five items and tiered discounts at five and seven items', () => {
    expect(getByobDiscountPercent(4)).toBe(0);
    expect(getByobDiscountPercent(5)).toBe(10);
    expect(getByobDiscountPercent(7)).toBe(15);
  });

  it('applies the same discount to every BYOB line', () => {
    const candidates = buildDiscountCandidates([
      {
        id: 'gid://shopify/CartLine/1',
        quantity: 4,
        cost: { subtotalAmount: { amount: '55.96' } },
        bundleType: { value: 'Bundle Product' },
      },
      {
        id: 'gid://shopify/CartLine/2',
        quantity: 3,
        cost: { subtotalAmount: { amount: '41.97' } },
        bundleType: { value: 'Bundle Product' },
      },
      {
        id: 'gid://shopify/CartLine/3',
        quantity: 1,
        bundleType: { value: 'regular' },
      },
    ]);

    expect(candidates).toHaveLength(2);
    expect(candidates[0].value.fixedAmount.amount).toBe('8.40');
    expect(candidates[1].value.fixedAmount.amount).toBe('6.30');
  });
});
