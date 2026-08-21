import {
  calculateLineDiscountAmountCents,
  formatDiscountAmountDecimal,
  moneyAmountToCents,
} from '../../shared/discount_rounding.js';

export const DISCOUNT_MESSAGE = 'BYOB Bundle';
export const TIER_5_QTY = 5;
export const TIER_5_PERCENT = 10;
export const TIER_7_QTY = 7;
export const TIER_7_PERCENT = 15;

/**
 * @param {{
 *   bundleType?: { value?: string | null } | null,
 *   bundleTypeAlt?: { value?: string | null } | null
 * }} line
 */
export function getBundleTypeValue(line) {
  const typeValue = line.bundleType?.value ?? line.bundleTypeAlt?.value ?? '';
  return String(typeValue).toLowerCase();
}

/**
 * @param {{
 *   bundleType?: { value?: string | null } | null,
 *   bundleTypeAlt?: { value?: string | null } | null
 * }} line
 */
export function isByobLine(line) {
  return getBundleTypeValue(line).includes('bundle product');
}

/**
 * @param {Array<{ quantity?: number, bundleType?: { value?: string | null } | null, bundleTypeAlt?: { value?: string | null } | null }>} lines
 */
export function countByobItems(lines) {
  return lines.reduce((total, line) => {
    if (!isByobLine(line)) return total;
    return total + (line.quantity || 0);
  }, 0);
}

/**
 * @param {number} itemCount
 */
export function getByobDiscountPercent(itemCount) {
  if (itemCount >= TIER_7_QTY) return TIER_7_PERCENT;
  if (itemCount >= TIER_5_QTY) return TIER_5_PERCENT;
  return 0;
}

/**
 * @param {string} lineId
 * @param {string | number | undefined | null} subtotalAmount
 * @param {number} discountPercent
 */
export function buildFixedAmountCandidate(lineId, subtotalAmount, discountPercent) {
  const subtotalCents = moneyAmountToCents(subtotalAmount);
  const discountCents = calculateLineDiscountAmountCents(subtotalCents, discountPercent);

  if (discountCents <= 0) return null;

  return {
    message: DISCOUNT_MESSAGE,
    targets: [{ cartLine: { id: lineId } }],
    value: {
      fixedAmount: {
        amount: formatDiscountAmountDecimal(discountCents),
      },
    },
  };
}

/**
 * @param {Array<{ id: string, quantity?: number, cost?: { subtotalAmount?: { amount?: string | null } | null } | null, bundleType?: { value?: string | null } | null, bundleTypeAlt?: { value?: string | null } | null }>} lines
 */
export function buildDiscountCandidates(lines) {
  const itemCount = countByobItems(lines);
  const discountPercent = getByobDiscountPercent(itemCount);

  if (discountPercent <= 0) return [];

  return lines
    .filter(isByobLine)
    .map((line) =>
      buildFixedAmountCandidate(
        line.id,
        line.cost?.subtotalAmount?.amount,
        discountPercent,
      ),
    )
    .filter(Boolean);
}
