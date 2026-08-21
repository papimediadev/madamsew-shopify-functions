/**
 * Line-level discount math aligned with bundle-pdp.liquid preview:
 * floor(subtotalCents * (100 - discountPercent) / 100)
 *
 * Shopify percentage discounts allocate per unit (floor on each unit's discount),
 * which can differ by a few cents from the PDP preview.
 */

/**
 * @param {string | number | undefined | null} amount
 */
export function moneyAmountToCents(amount) {
  const normalized = String(amount ?? '').trim();
  if (!normalized) return 0;

  const [wholePart, fractionPart = ''] = normalized.split('.');
  const centsPart = `${fractionPart}00`.slice(0, 2);

  return Number(wholePart) * 100 + Number(centsPart);
}

/**
 * @param {number} subtotalCents
 * @param {number} discountPercent
 */
export function calculateDiscountedSubtotalCents(subtotalCents, discountPercent) {
  if (discountPercent <= 0) return subtotalCents;
  return Math.floor((subtotalCents * (100 - discountPercent)) / 100);
}

/**
 * @param {number} subtotalCents
 * @param {number} discountPercent
 */
export function calculateLineDiscountAmountCents(subtotalCents, discountPercent) {
  return subtotalCents - calculateDiscountedSubtotalCents(subtotalCents, discountPercent);
}

/**
 * @param {number} discountCents
 */
export function formatDiscountAmountDecimal(discountCents) {
  const dollars = Math.floor(discountCents / 100);
  const cents = discountCents % 100;
  return `${dollars}.${String(cents).padStart(2, '0')}`;
}
