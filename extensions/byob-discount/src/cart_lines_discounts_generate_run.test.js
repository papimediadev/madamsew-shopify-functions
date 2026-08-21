import { describe, expect, it } from 'vitest';

import { DiscountClass, ProductDiscountSelectionStrategy } from '../generated/api';
import { cartLinesDiscountsGenerateRun } from './cart_lines_discounts_generate_run';

const byobLine = (id, quantity = 1, subtotalAmount = '55.96') => ({
  id,
  quantity,
  cost: { subtotalAmount: { amount: subtotalAmount } },
  bundleType: { value: 'Bundle Product' },
  merchandise: {
    __typename: 'ProductVariant',
    id: `gid://shopify/ProductVariant/${id}`,
  },
});

describe('cartLinesDiscountsGenerateRun', () => {
  it('returns empty operations when product discount class is missing', () => {
    const result = cartLinesDiscountsGenerateRun({
      cart: {
        lines: [byobLine('gid://shopify/CartLine/1', 5)],
      },
      discount: {
        discountClasses: [],
      },
    });

    expect(result.operations).toEqual([]);
  });

  it('returns empty operations when fewer than five BYOB items are in cart', () => {
    const result = cartLinesDiscountsGenerateRun({
      cart: {
        lines: [byobLine('gid://shopify/CartLine/1', 4)],
      },
      discount: {
        discountClasses: [DiscountClass.Product],
      },
    });

    expect(result.operations).toEqual([]);
  });

  it('applies BYOB discount to eligible cart lines', () => {
    const result = cartLinesDiscountsGenerateRun({
      cart: {
        lines: [
          byobLine('gid://shopify/CartLine/1', 3, '83.97'),
          byobLine('gid://shopify/CartLine/2', 2, '55.98'),
        ],
      },
      discount: {
        discountClasses: [DiscountClass.Product],
      },
    });

    expect(result.operations).toHaveLength(1);
    expect(result.operations[0]).toMatchObject({
      productDiscountsAdd: {
        selectionStrategy: ProductDiscountSelectionStrategy.All,
        candidates: [
          {
            message: 'BYOB Bundle',
            targets: [{ cartLine: { id: 'gid://shopify/CartLine/1' } }],
            value: { fixedAmount: { amount: '8.40' } },
          },
          {
            message: 'BYOB Bundle',
            targets: [{ cartLine: { id: 'gid://shopify/CartLine/2' } }],
            value: { fixedAmount: { amount: '5.60' } },
          },
        ],
      },
    });
  });
});
