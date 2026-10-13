import { describe, expect, it } from 'vitest';

import { DiscountClass, ProductDiscountSelectionStrategy } from '../generated/api';
import { cartLinesDiscountsGenerateRun } from './cart_lines_discounts_generate_run';
import {
  buildDiscountCandidates,
  getLineDiscountCents,
  isEligibleLine,
  parseConfig,
} from './pick_your_own_logic';

const VARIANT_A = 'gid://shopify/ProductVariant/1001';
const VARIANT_B = 'gid://shopify/ProductVariant/1002';

const eligibleLine = ({
  id = 'gid://shopify/CartLine/1',
  variantId = VARIANT_A,
  quantity = 1,
  hasProperty = true,
  amount = '24.99',
  currencyCode = 'USD',
} = {}) => ({
  id,
  quantity,
  pickyourown: { value: hasProperty ? 'true' : null },
  cost: {
    amountPerQuantity: { amount, currencyCode },
    subtotalAmount: { amount: String((Number(amount) * quantity).toFixed(2)) },
  },
  merchandise: {
    __typename: 'ProductVariant',
    id: variantId,
  },
});

const defaultConfig = parseConfig({
  targetPrice: '9.90',
  currencyCodes: ['USD'],
  allowedVariantIds: [],
});

describe('pick_your_own_logic', () => {
  it('parses discount config with defaults', () => {
    expect(parseConfig(null)).toEqual({
      targetPrice: '9.90',
      currencyCodes: ['USD'],
      allowedVariantIds: [],
    });
    expect(
      parseConfig({
        targetPrice: '9.90',
        currencyCodes: ['USD'],
        allowedVariantIds: [VARIANT_A],
      }),
    ).toEqual({
      targetPrice: '9.90',
      currencyCodes: ['USD'],
      allowedVariantIds: [VARIANT_A],
    });
  });

  it('requires the landing line property', () => {
    expect(isEligibleLine(eligibleLine({ hasProperty: false }), defaultConfig)).toBe(false);
    expect(isEligibleLine(eligibleLine(), defaultConfig)).toBe(true);
  });

  it('skips lines outside the optional variant allowlist', () => {
    const config = parseConfig({ allowedVariantIds: [VARIANT_A] });

    expect(isEligibleLine(eligibleLine({ variantId: VARIANT_A }), config)).toBe(true);
    expect(isEligibleLine(eligibleLine({ variantId: VARIANT_B }), config)).toBe(false);
  });

  it('skips non-USD lines when currency is restricted', () => {
    expect(
      isEligibleLine(eligibleLine({ currencyCode: 'CAD' }), defaultConfig),
    ).toBe(false);
  });

  it('discounts each unit down to $9.90', () => {
    expect(getLineDiscountCents(eligibleLine({ amount: '24.99', quantity: 1 }), '9.90')).toBe(1509);
    expect(getLineDiscountCents(eligibleLine({ amount: '24.99', quantity: 2 }), '9.90')).toBe(3018);
    expect(getLineDiscountCents(eligibleLine({ amount: '9.90', quantity: 1 }), '9.90')).toBe(0);
    expect(getLineDiscountCents(eligibleLine({ amount: '8.00', quantity: 1 }), '9.90')).toBe(0);
  });

  it('builds one candidate per eligible cart line', () => {
    const candidates = buildDiscountCandidates(
      [
        eligibleLine({ id: 'gid://shopify/CartLine/1', variantId: VARIANT_A, amount: '24.99' }),
        eligibleLine({ id: 'gid://shopify/CartLine/2', variantId: VARIANT_B, amount: '19.99' }),
        eligibleLine({ id: 'gid://shopify/CartLine/3', hasProperty: false }),
      ],
      defaultConfig,
    );

    expect(candidates).toHaveLength(2);
    expect(candidates[0]).toMatchObject({
      message: 'PICKYOUROWN',
      targets: [{ cartLine: { id: 'gid://shopify/CartLine/1' } }],
      value: { fixedAmount: { amount: '15.09' } },
    });
    expect(candidates[1]).toMatchObject({
      value: { fixedAmount: { amount: '10.09' } },
    });
  });
});

describe('cartLinesDiscountsGenerateRun', () => {
  it('returns empty operations when product discount class is missing', () => {
    const result = cartLinesDiscountsGenerateRun({
      cart: { lines: [eligibleLine()] },
      discount: {
        discountClasses: [],
        metafield: { jsonValue: defaultConfig },
      },
    });

    expect(result.operations).toEqual([]);
  });

  it('returns empty operations when the line was not added from the landing', () => {
    const result = cartLinesDiscountsGenerateRun({
      cart: { lines: [eligibleLine({ hasProperty: false })] },
      discount: {
        discountClasses: [DiscountClass.Product],
        metafield: { jsonValue: defaultConfig },
      },
    });

    expect(result.operations).toEqual([]);
  });

  it('applies PICKYOUROWN to landing lines only', () => {
    const result = cartLinesDiscountsGenerateRun({
      cart: {
        lines: [
          eligibleLine({ id: 'gid://shopify/CartLine/1', amount: '24.99' }),
          eligibleLine({ id: 'gid://shopify/CartLine/2', hasProperty: false, amount: '24.99' }),
        ],
      },
      discount: {
        discountClasses: [DiscountClass.Product],
        metafield: { jsonValue: defaultConfig },
      },
    });

    expect(result.operations).toHaveLength(1);
    expect(result.operations[0]).toMatchObject({
      productDiscountsAdd: {
        selectionStrategy: ProductDiscountSelectionStrategy.All,
        candidates: [
          {
            message: 'PICKYOUROWN',
            targets: [{ cartLine: { id: 'gid://shopify/CartLine/1' } }],
            value: { fixedAmount: { amount: '15.09' } },
          },
        ],
      },
    });
  });
});
