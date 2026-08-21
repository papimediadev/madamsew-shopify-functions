import { describe, expect, it } from 'vitest';
import {
  buildDiscountCandidates,
  getApplicableDiscountPercent,
  parseTiers,
} from '../src/bundle_pdp_logic';

describe('bundle_pdp_logic', () => {
  it('applies the 10/15/20 default tiers', () => {
    const line = {
      id: 'gid://shopify/CartLine/1',
      quantity: 2,
      cost: { subtotalAmount: { amount: '179.96' } },
      bundleId: { value: 'bundle-pdp' },
      discount0: { value: '10' },
      discount1: { value: '15' },
      discount2: { value: '20' },
      qty0: { value: '2' },
      qty1: { value: '4' },
      qty2: { value: '6' },
      merchandise: {
        __typename: 'ProductVariant',
        id: 'gid://shopify/ProductVariant/1',
        product: { id: 'gid://shopify/Product/1' },
      },
    };

    const candidates = buildDiscountCandidates([line]);

    expect(candidates).toHaveLength(1);
    expect(candidates[0].value.fixedAmount.amount).toBe('18.00');
  });

  it('applies the 11/31/41 project bag tiers', () => {
    const tiers = parseTiers({
      discount0: { value: '11' },
      discount1: { value: '31' },
      discount2: { value: '41' },
      qty0: { value: '3' },
      qty1: { value: '6' },
      qty2: { value: '9' },
    });

    expect(getApplicableDiscountPercent(3, tiers)).toBe(11);
    expect(getApplicableDiscountPercent(6, tiers)).toBe(31);
    expect(getApplicableDiscountPercent(10, tiers)).toBe(41);
  });

  it('groups multiple variant lines for the same product', () => {
    const sharedProps = {
      bundleId: { value: 'bundle-pdp' },
      cost: { subtotalAmount: { amount: '44.99' } },
      discount0: { value: '11' },
      discount1: { value: '31' },
      discount2: { value: '41' },
      qty0: { value: '3' },
      qty1: { value: '6' },
      qty2: { value: '9' },
      merchandise: {
        __typename: 'ProductVariant',
        product: { id: 'gid://shopify/Product/99' },
      },
    };

    const candidates = buildDiscountCandidates([
      {
        id: 'gid://shopify/CartLine/1',
        quantity: 1,
        ...sharedProps,
        merchandise: {
          ...sharedProps.merchandise,
          id: 'gid://shopify/ProductVariant/1',
        },
      },
      {
        id: 'gid://shopify/CartLine/2',
        quantity: 2,
        ...sharedProps,
        merchandise: {
          ...sharedProps.merchandise,
          id: 'gid://shopify/ProductVariant/2',
        },
      },
    ]);

    expect(candidates).toHaveLength(2);
    expect(candidates.every((candidate) => candidate.value.fixedAmount.amount === '4.95')).toBe(
      true,
    );
  });
});
