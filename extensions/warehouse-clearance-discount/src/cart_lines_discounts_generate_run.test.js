import { describe, expect, it } from 'vitest';

import { DiscountClass, ProductDiscountSelectionStrategy } from '../generated/api';
import { cartLinesDiscountsGenerateRun } from './cart_lines_discounts_generate_run';
import {
  buildDiscountCandidates,
  countEligibleItems,
  getDiscountPercent,
  isEligibleLine,
  parseConfig,
} from './warehouse_clearance_logic';

const VARIANT_A = 'gid://shopify/ProductVariant/1001';
const VARIANT_B = 'gid://shopify/ProductVariant/1002';
const VARIANT_OTHER = 'gid://shopify/ProductVariant/9999';

const eligibleLine = (id, variantId, quantity = 1, hasProperty = true) => ({
  id,
  quantity,
  warehouseclearance: { value: hasProperty ? 'true' : null },
  merchandise: {
    __typename: 'ProductVariant',
    id: variantId,
  },
});

describe('warehouse_clearance_logic', () => {
  it('parses allowed variant ids from discount config metafield', () => {
    expect(parseConfig({ allowedVariantIds: [VARIANT_A, VARIANT_B] })).toEqual({
      allowedVariantIds: [VARIANT_A, VARIANT_B],
    });
    expect(parseConfig(null)).toEqual({ allowedVariantIds: [] });
  });

  it('calculates tiered discount percent with 25% cap', () => {
    expect(getDiscountPercent(0)).toBe(0);
    expect(getDiscountPercent(1)).toBe(5);
    expect(getDiscountPercent(3)).toBe(15);
    expect(getDiscountPercent(5)).toBe(25);
    expect(getDiscountPercent(8)).toBe(25);
  });

  it('counts only eligible lines with property and allowed variants', () => {
    const lines = [
      eligibleLine('gid://shopify/CartLine/1', VARIANT_A, 2),
      eligibleLine('gid://shopify/CartLine/2', VARIANT_B, 1),
      eligibleLine('gid://shopify/CartLine/3', VARIANT_OTHER, 1),
      eligibleLine('gid://shopify/CartLine/4', VARIANT_A, 1, false),
    ];

    expect(countEligibleItems(lines, [VARIANT_A, VARIANT_B])).toBe(3);
    expect(isEligibleLine(lines[2], [VARIANT_A, VARIANT_B])).toBe(false);
  });

  it('builds one candidate per eligible cart line', () => {
    const lines = [
      eligibleLine('gid://shopify/CartLine/1', VARIANT_A, 1),
      eligibleLine('gid://shopify/CartLine/2', VARIANT_B, 1),
    ];

    const candidates = buildDiscountCandidates(lines, [VARIANT_A, VARIANT_B]);

    expect(candidates).toHaveLength(2);
    expect(candidates[0]).toMatchObject({
      message: 'WAREHOUSECLEARANCE',
      targets: [{ cartLine: { id: 'gid://shopify/CartLine/1' } }],
      value: { percentage: { value: 10 } },
    });
  });
});

describe('cartLinesDiscountsGenerateRun', () => {
  it('returns empty operations when product discount class is missing', () => {
    const result = cartLinesDiscountsGenerateRun({
      cart: {
        lines: [eligibleLine('gid://shopify/CartLine/1', VARIANT_A)],
      },
      discount: {
        discountClasses: [],
        metafield: {
          jsonValue: { allowedVariantIds: [VARIANT_A] },
        },
      },
    });

    expect(result.operations).toEqual([]);
  });

  it('returns empty operations when no eligible lines qualify', () => {
    const result = cartLinesDiscountsGenerateRun({
      cart: {
        lines: [eligibleLine('gid://shopify/CartLine/1', VARIANT_A, 1, false)],
      },
      discount: {
        discountClasses: [DiscountClass.Product],
        metafield: {
          jsonValue: { allowedVariantIds: [VARIANT_A] },
        },
      },
    });

    expect(result.operations).toEqual([]);
  });

  it('applies WAREHOUSECLEARANCE discount to eligible cart lines', () => {
    const result = cartLinesDiscountsGenerateRun({
      cart: {
        lines: [
          eligibleLine('gid://shopify/CartLine/1', VARIANT_A, 1),
          eligibleLine('gid://shopify/CartLine/2', VARIANT_B, 1),
        ],
      },
      discount: {
        discountClasses: [DiscountClass.Product],
        metafield: {
          jsonValue: { allowedVariantIds: [VARIANT_A, VARIANT_B] },
        },
      },
    });

    expect(result.operations).toHaveLength(1);
    expect(result.operations[0]).toMatchObject({
      productDiscountsAdd: {
        selectionStrategy: ProductDiscountSelectionStrategy.All,
        candidates: [
          {
            message: 'WAREHOUSECLEARANCE',
            targets: [{ cartLine: { id: 'gid://shopify/CartLine/1' } }],
            value: { percentage: { value: 10 } },
          },
          {
            message: 'WAREHOUSECLEARANCE',
            targets: [{ cartLine: { id: 'gid://shopify/CartLine/2' } }],
            value: { percentage: { value: 10 } },
          },
        ],
      },
    });
  });
});
