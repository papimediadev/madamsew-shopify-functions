import { describe, expect, it } from 'vitest';

import { DiscountClass, ProductDiscountSelectionStrategy } from '../generated/api';
import { cartLinesDiscountsGenerateRun } from './cart_lines_discounts_generate_run';
import {
  buildDiscountCandidates,
  getLineDiscountCents,
  isEligibleLine,
  MIN_DISTINCT_LINES,
  parseConfig,
  selectQualifyingLines,
} from './pick_your_own_logic';

const VARIANT_A = 'gid://shopify/ProductVariant/1001';
const VARIANT_B = 'gid://shopify/ProductVariant/1002';

const BOX_ONE = [
  { sku: 'A1A-PMAT-XL', amount: '69.99' },
  { sku: 'A1A-ZBB', amount: '59.99' },
  { sku: 'A1A-SGR', amount: '13.99' },
  { sku: 'A1A-PBAG', amount: '16.99' },
  { sku: 'A1A-BTM-XL', amount: '12.99' },
  { sku: 'A1A-HEFMP', amount: '15.84' },
  { sku: 'A1A-CLIPS', amount: '9.99' },
  { sku: 'A1A-CLIPS-XL', amount: '9.99' },
  { sku: 'A1A-R6X12', amount: '9.99' },
  { sku: 'A1A-NAR', amount: '9.99' },
];

const BOX_TWO = [
  { sku: 'A1A-PMAT-MINI', amount: '39.99' },
  { sku: 'A1A-SMLS', amount: '19.99' },
  { sku: 'A1A-CLA', amount: '15.99' },
  { sku: 'A1A-R6X6', amount: '12.99' },
  { sku: 'A1A-FSPF', amount: '14.99' },
  { sku: 'A1A-RG', amount: '9.99' },
  { sku: 'A1A-LFP', amount: '9.99' },
  { sku: 'A1A-UTC-red', amount: '9.99' },
  { sku: 'A1A-200GHP', amount: '9.99' },
  { sku: 'A1A-MCQH-AN', amount: '11.99' },
];

const toCents = (amount) => Math.round(Number(amount) * 100);
const fixed = (cents) => `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`;
const expectedDiscount = (amount) => fixed(Math.max(0, toCents(amount) - 990));

let lineSeq = 0;
let variantSeq = 5000;

const eligibleLine = ({
  id,
  variantId,
  sku,
  quantity = 1,
  hasProperty = true,
  amount = '24.99',
  currencyCode = 'USD',
} = {}) => {
  lineSeq += 1;
  variantSeq += 1;
  return {
    id: id ?? `gid://shopify/CartLine/${lineSeq}`,
    quantity,
    pickyourown: { value: hasProperty ? 'true' : null },
    cost: {
      amountPerQuantity: { amount, currencyCode },
    },
    merchandise: {
      __typename: 'ProductVariant',
      id: variantId ?? `gid://shopify/ProductVariant/${variantSeq}`,
      sku: sku === undefined ? `SKU-${variantSeq}` : sku,
    },
  };
};

const boxLines = (box, overrides = {}) =>
  box.map((item) => eligibleLine({ sku: item.sku, amount: item.amount, ...overrides }));

const giftLine = (sku) =>
  eligibleLine({ sku, amount: '0.00', hasProperty: false });

const defaultConfig = parseConfig({
  targetPrice: '9.90',
  currencyCodes: ['USD'],
  allowedVariantIds: [],
});

const run = (lines) =>
  cartLinesDiscountsGenerateRun({
    cart: { lines },
    discount: {
      discountClasses: [DiscountClass.Product],
      metafield: { jsonValue: defaultConfig },
    },
  });

const candidatesOf = (result) => result.operations[0]?.productDiscountsAdd.candidates ?? [];

const discountByLineId = (result) =>
  Object.fromEntries(
    candidatesOf(result).map((candidate) => [
      candidate.targets[0].cartLine.id,
      candidate.value.fixedAmount.amount,
    ]),
  );

/** Amount the customer pays for the given lines after the function result. */
const paidCents = (lines, result) => {
  const discounts = discountByLineId(result);
  return lines.reduce((total, line) => {
    const gross = toCents(line.cost.amountPerQuantity.amount) * line.quantity;
    const discount = discounts[line.id] ? toCents(discounts[line.id]) : 0;
    return total + gross - discount;
  }, 0);
};

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

  it('skips zero-priced lines even when tagged', () => {
    expect(isEligibleLine(eligibleLine({ amount: '0.00' }), defaultConfig)).toBe(false);
  });

  it('discounts exactly one unit down to $9.90', () => {
    expect(getLineDiscountCents(eligibleLine({ amount: '24.99', quantity: 1 }), '9.90')).toBe(1509);
    expect(getLineDiscountCents(eligibleLine({ amount: '24.99', quantity: 2 }), '9.90')).toBe(1509);
    expect(getLineDiscountCents(eligibleLine({ amount: '69.99', quantity: 4 }), '9.90')).toBe(6009);
    expect(getLineDiscountCents(eligibleLine({ amount: '9.90', quantity: 1 }), '9.90')).toBe(0);
    expect(getLineDiscountCents(eligibleLine({ amount: '8.00', quantity: 1 }), '9.90')).toBe(0);
  });

  it('keeps only the first line per SKU, case-insensitive', () => {
    const first = eligibleLine({ sku: 'A1A-PBAG' });
    const repeat = eligibleLine({ sku: 'a1a-pbag ' });
    const other = eligibleLine({ sku: 'A1A-SGR' });

    expect(selectQualifyingLines([first, repeat, other], defaultConfig)).toEqual([first, other]);
  });

  it('falls back to the variant id when a line has no SKU', () => {
    const a = eligibleLine({ sku: '', variantId: VARIANT_A });
    const aAgain = eligibleLine({ sku: null, variantId: VARIANT_A });
    const b = eligibleLine({ sku: '', variantId: VARIANT_B });

    expect(selectQualifyingLines([a, aAgain, b], defaultConfig)).toEqual([a, b]);
  });

  it('returns no candidates below the distinct line floor', () => {
    expect(MIN_DISTINCT_LINES).toBe(10);
    expect(buildDiscountCandidates(boxLines(BOX_ONE.slice(0, 9)), defaultConfig)).toEqual([]);
  });

  it('builds one candidate per distinct line at the floor', () => {
    const lines = boxLines(BOX_ONE);
    const candidates = buildDiscountCandidates(lines, defaultConfig);

    // A1A-CLIPS etc. at $9.99 still get 9 cents off.
    expect(candidates).toHaveLength(10);
    expect(candidates[0]).toMatchObject({
      message: 'PICKYOUROWN',
      targets: [{ cartLine: { id: lines[0].id } }],
      value: { fixedAmount: { amount: '60.09' } },
    });
  });
});

describe('cartLinesDiscountsGenerateRun', () => {
  it('returns empty operations when product discount class is missing', () => {
    const result = cartLinesDiscountsGenerateRun({
      cart: { lines: boxLines(BOX_ONE) },
      discount: {
        discountClasses: [],
        metafield: { jsonValue: defaultConfig },
      },
    });

    expect(result.operations).toEqual([]);
  });

  it('returns empty operations when lines were not added from the landing', () => {
    expect(run(boxLines(BOX_ONE, { hasProperty: false })).operations).toEqual([]);
  });

  it('applies PICKYOUROWN to landing lines only', () => {
    const box = boxLines(BOX_ONE);
    const untagged = eligibleLine({ sku: 'A1A-CCMB', amount: '89.99', hasProperty: false });
    const result = run([...box, untagged]);

    expect(result.operations).toHaveLength(1);
    expect(result.operations[0].productDiscountsAdd.selectionStrategy).toBe(
      ProductDiscountSelectionStrategy.All,
    );
    expect(discountByLineId(result)[untagged.id]).toBeUndefined();
    expect(candidatesOf(result)).toHaveLength(10);
  });
});

describe('stress: carts with 10+ distinct SKUs', () => {
  it('a standard 2/3/5 box pays $99.00', () => {
    const lines = boxLines(BOX_ONE);
    expect(paidCents(lines, run(lines))).toBe(9900);
  });

  it.each([10, 11, 13, 15, 20])('%i distinct lines each pay $9.90 (no upper cap)', (count) => {
    const pool = [...BOX_ONE, ...BOX_TWO];
    const lines = boxLines(pool.slice(0, count));
    const result = run(lines);

    expect(candidatesOf(result)).toHaveLength(count);
    expect(paidCents(lines, result)).toBe(990 * count);
  });

  it('every line gets exactly its own price minus $9.90', () => {
    const lines = boxLines(BOX_ONE);
    const discounts = discountByLineId(run(lines));

    lines.forEach((line, index) => {
      expect(discounts[line.id]).toBe(expectedDiscount(BOX_ONE[index].amount));
    });
  });

  it('100 distinct lines all qualify', () => {
    const lines = Array.from({ length: 100 }, (_, i) =>
      eligibleLine({ sku: `BULK-${i}`, amount: '19.99' }),
    );
    const result = run(lines);

    expect(candidatesOf(result)).toHaveLength(100);
    expect(paidCents(lines, result)).toBe(99000);
  });
});

describe('stress: duplicated SKUs', () => {
  it('a duplicated SKU on a separate line is not discounted', () => {
    const box = boxLines(BOX_ONE);
    const duplicate = eligibleLine({ sku: 'A1A-PMAT-XL', amount: '69.99' });
    const lines = [...box, duplicate];
    const discounts = discountByLineId(run(lines));

    expect(discounts[box[0].id]).toBe('60.09');
    expect(discounts[duplicate.id]).toBeUndefined();
    expect(Object.keys(discounts)).toHaveLength(10);
    expect(paidCents(lines, run(lines))).toBe(9900 + 6999);
  });

  it('duplicates do not count toward the 10-line floor', () => {
    const nine = boxLines(BOX_ONE.slice(0, 9));
    const duplicate = eligibleLine({ sku: BOX_ONE[0].sku, amount: BOX_ONE[0].amount });

    expect(run([...nine, duplicate]).operations).toEqual([]);
  });

  it('two identical boxes on separate lines discount only one of them', () => {
    const first = boxLines(BOX_ONE);
    const second = boxLines(BOX_ONE);
    const lines = [...first, ...second];
    const result = run(lines);
    const discounts = discountByLineId(result);

    expect(Object.keys(discounts)).toEqual(first.map((line) => line.id));
    second.forEach((line) => expect(discounts[line.id]).toBeUndefined());

    const secondBoxList = BOX_ONE.reduce((sum, item) => sum + toCents(item.amount), 0);
    expect(paidCents(lines, result)).toBe(9900 + secondBoxList);
  });

  it('two identical boxes merged by Shopify into qty 2 discount one unit per line', () => {
    const lines = boxLines(BOX_ONE, { quantity: 2 });
    const result = run(lines);

    const secondBoxList = BOX_ONE.reduce((sum, item) => sum + toCents(item.amount), 0);
    expect(candidatesOf(result)).toHaveLength(10);
    expect(paidCents(lines, result)).toBe(9900 + secondBoxList);
  });

  it('the earlier line keeps the discount when the duplicate comes first in a different variant', () => {
    const repeat = eligibleLine({ sku: 'A1A-ZBB', amount: '59.99', variantId: VARIANT_A });
    const box = boxLines(BOX_ONE);
    const discounts = discountByLineId(run([repeat, ...box]));

    expect(discounts[repeat.id]).toBe('50.09');
    expect(discounts[box[1].id]).toBeUndefined();
  });
});

describe('stress: second Best of Madam Sew box', () => {
  it('a second box of different SKUs keeps every piece at $9.90', () => {
    const lines = [...boxLines(BOX_ONE), ...boxLines(BOX_TWO)];
    const result = run(lines);

    expect(candidatesOf(result)).toHaveLength(20);
    expect(paidCents(lines, result)).toBe(19800);
  });

  it('three distinct boxes pay $297.00', () => {
    const third = Array.from({ length: 10 }, (_, i) => ({ sku: `BOX3-${i}`, amount: '24.99' }));
    const lines = [...boxLines(BOX_ONE), ...boxLines(BOX_TWO), ...boxLines(third)];

    expect(paidCents(lines, run(lines))).toBe(29700);
  });

  it('a second box that overlaps the first keeps its new SKUs at $9.90', () => {
    const overlap = [...BOX_TWO.slice(0, 7), ...BOX_ONE.slice(0, 3)];
    const first = boxLines(BOX_ONE);
    const second = boxLines(overlap);
    const discounts = discountByLineId(run([...first, ...second]));

    second.slice(0, 7).forEach((line) => expect(discounts[line.id]).toBeDefined());
    second.slice(7).forEach((line) => expect(discounts[line.id]).toBeUndefined());
    expect(Object.keys(discounts)).toHaveLength(17);
  });

  it('the second box survives removing one item from the first box', () => {
    const lines = [...boxLines(BOX_ONE.slice(1)), ...boxLines(BOX_TWO)];
    const result = run(lines);

    expect(candidatesOf(result)).toHaveLength(19);
    expect(paidCents(lines, result)).toBe(990 * 19);
  });
});

describe('stress: carts under 10 lines', () => {
  it.each([1, 5, 9])('%i distinct lines get no discount', (count) => {
    expect(run(boxLines(BOX_ONE.slice(0, count))).operations).toEqual([]);
  });

  it('MSEW-977402 shape (9 lines, 2/2/5) pays full price', () => {
    const lines = boxLines(BOX_ONE.filter((item) => item.sku !== 'A1A-BTM-XL'));
    const result = run(lines);

    expect(result.operations).toEqual([]);
    expect(paidCents(lines, result)).toBe(
      lines.reduce((sum, line) => sum + toCents(line.cost.amountPerQuantity.amount), 0),
    );
  });

  it('9 lines inflated to 10+ units by quantity get no discount', () => {
    const lines = boxLines(BOX_ONE.slice(0, 9));
    lines[0].quantity = 2;
    lines[3].quantity = 4;

    expect(run(lines).operations).toEqual([]);
  });

  it('MSEW-977383 shape (6 lines, 10 units) gets no discount', () => {
    const lines = boxLines(BOX_ONE.slice(0, 6));
    lines[0].quantity = 2;
    lines[2].quantity = 3;

    expect(run(lines).operations).toEqual([]);
  });

  it('an empty cart returns no operations', () => {
    expect(run([]).operations).toEqual([]);
  });
});

describe('stress: free gift SKUs', () => {
  const gifts = () => [giftLine('A1A-GIFT-ZSSS'), giftLine('A1A-GIFT-C4XLC2')];

  it('gifts do not change a qualifying box', () => {
    const box = boxLines(BOX_ONE);
    const withGifts = [...gifts(), ...box, ...gifts()];
    const result = run(withGifts);

    expect(candidatesOf(result)).toHaveLength(10);
    expect(paidCents(withGifts, result)).toBe(9900);
  });

  it('gifts do not lift 9 picks over the floor', () => {
    expect(run([...boxLines(BOX_ONE.slice(0, 9)), ...gifts()]).operations).toEqual([]);
  });

  it('gifts never receive a candidate', () => {
    const giftsInCart = gifts();
    const discounts = discountByLineId(run([...boxLines(BOX_ONE), ...giftsInCart]));

    giftsInCart.forEach((line) => expect(discounts[line.id]).toBeUndefined());
  });

  it('a gift wrongly tagged with _pickyourown does not count toward the floor', () => {
    const taggedGifts = [
      eligibleLine({ sku: 'A1A-GIFT-ZSSS', amount: '0.00' }),
      eligibleLine({ sku: 'A1A-GIFT-C4XLC2', amount: '0.00' }),
    ];

    expect(run([...boxLines(BOX_ONE.slice(0, 8)), ...taggedGifts]).operations).toEqual([]);
  });
});

describe('stress: mixed carts with quantities above 1', () => {
  it('raising one line to qty 2 charges the second unit at full price', () => {
    const lines = boxLines(BOX_ONE);
    lines[0].quantity = 2;

    expect(paidCents(lines, run(lines))).toBe(9900 + 6999);
  });

  it('MSEW-977285 shape (10 lines, three at qty 2) pays $99 plus three full-price units', () => {
    const lines = boxLines(BOX_ONE);
    const bumped = [1, 2, 3];
    bumped.forEach((index) => {
      lines[index].quantity = 2;
    });
    const extra = bumped.reduce((sum, index) => sum + toCents(BOX_ONE[index].amount), 0);

    expect(paidCents(lines, run(lines))).toBe(9900 + extra);
  });

  it('every line at qty 4 still discounts one unit each', () => {
    const lines = boxLines(BOX_ONE, { quantity: 4 });
    const result = run(lines);
    const list = BOX_ONE.reduce((sum, item) => sum + toCents(item.amount), 0);

    expect(candidatesOf(result)).toHaveLength(10);
    expect(paidCents(lines, result)).toBe(9900 + list * 3);
  });

  it('qty above 1 mixed with untagged items, gifts and a duplicate', () => {
    const box = boxLines(BOX_ONE);
    box[0].quantity = 3;
    const duplicate = eligibleLine({ sku: 'A1A-PBAG', amount: '16.99', quantity: 2 });
    const untagged = eligibleLine({ sku: 'A1A-CCMB', amount: '89.99', hasProperty: false, quantity: 2 });
    const lines = [...box, duplicate, untagged, giftLine('A1A-GIFT-ZSSS'), giftLine('A1A-GIFT-C4XLC2')];

    expect(paidCents(lines, run(lines))).toBe(9900 + 6999 * 2 + 1699 * 2 + 8999 * 2);
  });

  it('a single line at qty 10 gets no discount', () => {
    expect(run([eligibleLine({ sku: 'A1A-PMAT-XL', amount: '69.99', quantity: 10 })]).operations).toEqual([]);
  });

  it('never discounts more than one unit per line across randomized carts', () => {
    let seed = 42;
    const random = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };
    const pool = [...BOX_ONE, ...BOX_TWO];

    for (let i = 0; i < 300; i += 1) {
      const lines = pool
        .filter(() => random() < 0.7)
        .map((item) =>
          eligibleLine({
            sku: item.sku,
            amount: item.amount,
            quantity: 1 + Math.floor(random() * 4),
            hasProperty: random() < 0.9,
          }),
        );
      const discounts = discountByLineId(run(lines));
      const tagged = lines.filter((line) => line.pickyourown.value === 'true');

      if (tagged.length < 10) {
        expect(Object.keys(discounts)).toHaveLength(0);
        continue;
      }

      expect(Object.keys(discounts)).toHaveLength(tagged.length);
      tagged.forEach((line) => {
        const unit = toCents(line.cost.amountPerQuantity.amount);
        expect(toCents(discounts[line.id])).toBe(Math.max(0, unit - 990));
      });
    }
  });
});
