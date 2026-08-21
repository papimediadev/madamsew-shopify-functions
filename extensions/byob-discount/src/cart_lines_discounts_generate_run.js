import {
  DiscountClass,
  ProductDiscountSelectionStrategy,
} from '../generated/api';
import { buildDiscountCandidates } from './byob_logic';

/**
 * @typedef {import('../generated/api').CartInput} CartInput
 * @typedef {import('../generated/api').CartLinesDiscountsGenerateRunResult} CartLinesDiscountsGenerateRunResult
 */

/**
 * @param {CartInput} input
 * @returns {CartLinesDiscountsGenerateRunResult}
 */
export function cartLinesDiscountsGenerateRun(input) {
  if (!input.cart?.lines?.length) {
    return { operations: [] };
  }

  const hasProductDiscountClass = input.discount.discountClasses.includes(
    DiscountClass.Product,
  );

  if (!hasProductDiscountClass) {
    return { operations: [] };
  }

  const candidates = buildDiscountCandidates(input.cart.lines);

  if (!candidates.length) {
    return { operations: [] };
  }

  return {
    operations: [
      {
        productDiscountsAdd: {
          candidates,
          selectionStrategy: ProductDiscountSelectionStrategy.All,
        },
      },
    ],
  };
}
