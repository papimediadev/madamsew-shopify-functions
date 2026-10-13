import { describe, expect, it } from 'vitest';

import { DiscountClass, ProductDiscountSelectionStrategy } from '../generated/api';
import { cartLinesDiscountsGenerateRun } from './cart_lines_discounts_generate_run';
import {
  buildDiscountCandidates,
  countEligibleItems,
  getDiscountPercent,
  isEligibleLine,
} from './plp_gamification_logic';

const line = (id, quantity = 1, hasProperty = true) => ({
  id,
  quantity,
  plpgamification: { value: hasProperty ? 'true' : null },
});

describe('plp_gamification_logic', () => {
  it('calculates tiered discount percent with 25% cap', () => {
    expect(getDiscountPercent(0)).toBe(0);
    expect(getDiscountPercent(1)).toBe(5);
    expect(getDiscountPercent(3)).toBe(15);
    expect(getDiscountPercent(5)).toBe(25);
    expect(getDiscountPercent(8)).toBe(25);
  });

  it('counts every line that carries the PLP property', () => {
    const lines = [
      line('gid://shopify/CartLine/1', 2),
      line('gid://shopify/CartLine/2', 1),
      line('gid://shopify/CartLine/3', 4, false),
    ];

    expect(countEligibleItems(lines)).toBe(3);
    expect(isEligibleLine(lines[2])).toBe(false);
  });

  it('builds one candidate per stamped line, for any product', () => {
    const lines = [
      line('gid://shopify/CartLine/1', 1),
      line('gid://shopify/CartLine/2', 1),
    ];

    const candidates = buildDiscountCandidates(lines);

    expect(candidates).toHaveLength(2);
    expect(candidates[0]).toMatchObject({
      message: 'PLPGAMIFICATION',
      targets: [{ cartLine: { id: 'gid://shopify/CartLine/1' } }],
      value: { percentage: { value: 10 } },
    });
  });
});

describe('cartLinesDiscountsGenerateRun', () => {
  it('returns empty operations when product discount class is missing', () => {
    const result = cartLinesDiscountsGenerateRun({
      cart: { lines: [line('gid://shopify/CartLine/1')] },
      discount: { discountClasses: [] },
    });

    expect(result.operations).toEqual([]);
  });

  it('returns empty operations when no line has the PLP property', () => {
    const result = cartLinesDiscountsGenerateRun({
      cart: { lines: [line('gid://shopify/CartLine/1', 1, false)] },
      discount: { discountClasses: [DiscountClass.Product] },
    });

    expect(result.operations).toEqual([]);
  });

  it('applies PLPGAMIFICATION to every stamped line', () => {
    const result = cartLinesDiscountsGenerateRun({
      cart: {
        lines: [
          line('gid://shopify/CartLine/1', 1),
          line('gid://shopify/CartLine/2', 1),
        ],
      },
      discount: { discountClasses: [DiscountClass.Product] },
    });

    expect(result.operations).toHaveLength(1);
    expect(result.operations[0]).toMatchObject({
      productDiscountsAdd: {
        selectionStrategy: ProductDiscountSelectionStrategy.All,
        candidates: [
          {
            message: 'PLPGAMIFICATION',
            targets: [{ cartLine: { id: 'gid://shopify/CartLine/1' } }],
            value: { percentage: { value: 10 } },
          },
          {
            message: 'PLPGAMIFICATION',
            targets: [{ cartLine: { id: 'gid://shopify/CartLine/2' } }],
            value: { percentage: { value: 10 } },
          },
        ],
      },
    });
  });
});
