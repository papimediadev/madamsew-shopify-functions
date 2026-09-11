import {
  formatDiscountAmountDecimal,
  moneyAmountToCents,
} from '../../shared/discount_rounding.js';

export const PROPERTY_VALUE = 'true';
export const DISCOUNT_MESSAGE = 'PICKYOUROWN';
export const DEFAULT_TARGET_PRICE = '9.90';
export const DEFAULT_CURRENCY_CODES = ['USD'];

/**
 * @typedef {{
 *   targetPrice: string,
 *   currencyCodes: string[],
 *   allowedVariantIds: string[]
 * }} PickYourOwnConfig
 */

/**
 * @param {unknown} configValue
 * @returns {PickYourOwnConfig}
 */
export function parseConfig(configValue) {
  if (!configValue || typeof configValue !== 'object') {
    return {
      targetPrice: DEFAULT_TARGET_PRICE,
      currencyCodes: [...DEFAULT_CURRENCY_CODES],
      allowedVariantIds: [],
    };
  }

  const config = /** @type {Record<string, unknown>} */ (configValue);
  const targetPrice =
    typeof config.targetPrice === 'string' && config.targetPrice.trim()
      ? config.targetPrice.trim()
      : DEFAULT_TARGET_PRICE;
  const currencyCodes = Array.isArray(config.currencyCodes)
    ? config.currencyCodes.map(String)
    : [...DEFAULT_CURRENCY_CODES];
  const allowedVariantIds = Array.isArray(config.allowedVariantIds)
    ? config.allowedVariantIds.map(String)
    : [];

  return { targetPrice, currencyCodes, allowedVariantIds };
}

/**
 * @param {{
 *   pickyourown?: { value?: string | null } | null,
 *   cost?: {
 *     amountPerQuantity?: { amount?: string | null, currencyCode?: string | null } | null
 *   } | null,
 *   merchandise?: { __typename?: string, id?: string } | null
 * }} line
 * @param {PickYourOwnConfig} config
 */
export function isEligibleLine(line, config) {
  if (line.pickyourown?.value !== PROPERTY_VALUE) return false;
  if (line.merchandise?.__typename !== 'ProductVariant') return false;
  if (!line.merchandise.id) return false;

  if (
    config.allowedVariantIds.length &&
    !config.allowedVariantIds.includes(line.merchandise.id)
  ) {
    return false;
  }

  const currencyCode = line.cost?.amountPerQuantity?.currencyCode;
  if (
    config.currencyCodes.length &&
    currencyCode &&
    !config.currencyCodes.includes(currencyCode)
  ) {
    return false;
  }

  return true;
}

/**
 * @param {{
 *   quantity?: number,
 *   cost?: {
 *     amountPerQuantity?: { amount?: string | null } | null,
 *     subtotalAmount?: { amount?: string | null } | null
 *   } | null
 * }} line
 * @param {string} targetPrice
 */
export function getLineDiscountCents(line, targetPrice) {
  const quantity = line.quantity || 0;
  if (quantity <= 0) return 0;

  const targetCents = moneyAmountToCents(targetPrice);
  const unitCents = moneyAmountToCents(line.cost?.amountPerQuantity?.amount);

  if (unitCents > 0) {
    return Math.max(0, (unitCents - targetCents) * quantity);
  }

  const subtotalCents = moneyAmountToCents(line.cost?.subtotalAmount?.amount);
  return Math.max(0, subtotalCents - targetCents * quantity);
}

/**
 * @param {string} lineId
 * @param {number} discountCents
 */
export function buildFixedAmountCandidate(lineId, discountCents) {
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
 *   pickyourown?: { value?: string | null } | null,
 *   cost?: {
 *     amountPerQuantity?: { amount?: string | null, currencyCode?: string | null } | null,
 *     subtotalAmount?: { amount?: string | null } | null
 *   } | null,
 *   merchandise?: { __typename?: string, id?: string } | null
 * }>} lines
 * @param {PickYourOwnConfig} config
 */
export function buildDiscountCandidates(lines, config) {
  return lines
    .filter((line) => isEligibleLine(line, config))
    .map((line) =>
      buildFixedAmountCandidate(line.id, getLineDiscountCents(line, config.targetPrice)),
    )
    .filter(Boolean);
}
