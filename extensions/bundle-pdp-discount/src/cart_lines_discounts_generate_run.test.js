import { describe, expect, it } from 'vitest';

import { DiscountClass, ProductDiscountSelectionStrategy } from '../generated/api';
import { cartLinesDiscountsGenerateRun } from './cart_lines_discounts_generate_run';

const bundleLine = (id, quantity = 1) => ({
  id,
  quantity,
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
    id: `gid://shopify/ProductVariant/${id}`,
    product: { id: 'gid://shopify/Product/1001' },
  },
});

describe('cartLinesDiscountsGenerateRun', () => {
  it('returns empty operations when product discount class is missing', () => {
    const result = cartLinesDiscountsGenerateRun({
      cart: {
        lines: [bundleLine('gid://shopify/CartLine/1', 2)],
      },
      discount: {
        discountClasses: [],
      },
    });

    expect(result.operations).toEqual([]);
  });

  it('returns empty operations when no bundle lines qualify', () => {
    const result = cartLinesDiscountsGenerateRun({
      cart: {
        lines: [
          {
            id: 'gid://shopify/CartLine/1',
            quantity: 2,
            merchandise: {
              __typename: 'ProductVariant',
              id: 'gid://shopify/ProductVariant/1',
              product: { id: 'gid://shopify/Product/1' },
            },
          },
        ],
      },
      discount: {
        discountClasses: [DiscountClass.Product],
      },
    });

    expect(result.operations).toEqual([]);
  });

  it('applies Bundle PDP discount to eligible cart lines', () => {
    const result = cartLinesDiscountsGenerateRun({
      cart: {
        lines: [bundleLine('gid://shopify/CartLine/1', 2)],
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
            message: 'Bundle PDP',
            targets: [{ cartLine: { id: 'gid://shopify/CartLine/1' } }],
            value: { fixedAmount: { amount: '18.00' } },
          },
        ],
      },
    });
  });
});
