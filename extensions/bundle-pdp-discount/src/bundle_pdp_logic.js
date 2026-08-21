import {
  calculateLineDiscountAmountCents,
  formatDiscountAmountDecimal,
  moneyAmountToCents,
} from '../../shared/discount_rounding.js';

export const BUNDLE_ID = 'bundle-pdp';
export const DISCOUNT_MESSAGE = 'Bundle PDP';
export const MAX_TIERS = 3;

/**
 * @param {{ value?: string | null } | null | undefined} attribute
 */
export function getAttributeValue(attribute) {
  return attribute?.value ?? null;
}

/**
 * @param {{
 *   bundleId?: { value?: string | null } | null,
 *   merchandise?: { __typename?: string, product?: { id?: string } | null } | null
 * }} line
 */
export function isBundlePdpLine(line) {
  if (getAttributeValue(line.bundleId) !== BUNDLE_ID) return false;
  if (line.merchandise?.__typename !== 'ProductVariant') return false;
  return Boolean(line.merchandise.product?.id);
}

/**
 * @param {{
 *   discount0?: { value?: string | null } | null,
 *   discount1?: { value?: string | null } | null,
 *   discount2?: { value?: string | null } | null,
 *   qty0?: { value?: string | null } | null,
 *   qty1?: { value?: string | null } | null,
 *   qty2?: { value?: string | null } | null
 * }} line
 * @returns {Array<{ qty: number, discount: number }>}
 */
export function parseTiers(line) {
  /** @type {Array<{ qty: number, discount: number }>} */
  const tiers = [];

  for (let index = 0; index < MAX_TIERS; index += 1) {
    const qty = Number(getAttributeValue(line[`qty${index}`]));
    const discount = Number(getAttributeValue(line[`discount${index}`]));

    if (!Number.isFinite(qty) || qty <= 0) continue;
    if (!Number.isFinite(discount) || discount <= 0) continue;

    tiers.push({ qty, discount });
  }

  return tiers.sort((left, right) => left.qty - right.qty);
}

/**
 * @param {number} totalQty
 * @param {Array<{ qty: number, discount: number }>} tiers
 */
export function getApplicableDiscountPercent(totalQty, tiers) {
  if (!tiers.length || totalQty <= 0) return 0;

  let applicableDiscount = 0;

  for (const tier of tiers) {
    if (totalQty >= tier.qty) {
      applicableDiscount = tier.discount;
    }
  }

  return applicableDiscount;
}

/**
 * @param {Array<{
 *   id: string,
 *   quantity?: number,
 *   bundleId?: { value?: string | null } | null,
 *   discount0?: { value?: string | null } | null,
 *   discount1?: { value?: string | null } | null,
 *   discount2?: { value?: string | null } | null,
 *   qty0?: { value?: string | null } | null,
 *   qty1?: { value?: string | null } | null,
 *   qty2?: { value?: string | null } | null,
 *   merchandise?: { __typename?: string, product?: { id?: string } | null } | null
 * }>} lines
 */
export function groupBundlePdpLines(lines) {
  /** @type {Map<string, typeof lines>} */
  const groups = new Map();

  for (const line of lines) {
    if (!isBundlePdpLine(line)) continue;

    const productId = line.merchandise?.product?.id;
    if (!productId) continue;

    const existing = groups.get(productId) ?? [];
    existing.push(line);
    groups.set(productId, existing);
  }

  return groups;
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
 * @param {Array<{
 *   id: string,
 *   quantity?: number,
 *   cost?: { subtotalAmount?: { amount?: string | null } | null } | null,
 *   bundleId?: { value?: string | null } | null,
 *   discount0?: { value?: string | null } | null,
 *   discount1?: { value?: string | null } | null,
 *   discount2?: { value?: string | null } | null,
 *   qty0?: { value?: string | null } | null,
 *   qty1?: { value?: string | null } | null,
 *   qty2?: { value?: string | null } | null,
 *   merchandise?: { __typename?: string, product?: { id?: string } | null } | null
 * }>} lines
 */
export function buildDiscountCandidates(lines) {
  const groups = groupBundlePdpLines(lines);
  /** @type {Array<{ message: string, targets: Array<{ cartLine: { id: string } }>, value: { fixedAmount: { amount: string } } }>} */
  const candidates = [];

  for (const groupLines of groups.values()) {
    const totalQty = groupLines.reduce(
      (sum, line) => sum + (line.quantity || 0),
      0,
    );
    const tiers = parseTiers(groupLines[0]);
    const discountPercent = getApplicableDiscountPercent(totalQty, tiers);

    if (discountPercent <= 0) continue;

    for (const line of groupLines) {
      const candidate = buildFixedAmountCandidate(
        line.id,
        line.cost?.subtotalAmount?.amount,
        discountPercent,
      );

      if (candidate) {
        candidates.push(candidate);
      }
    }
  }

  return candidates;
}
