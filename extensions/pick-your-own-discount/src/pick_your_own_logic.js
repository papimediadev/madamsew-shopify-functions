import {
  formatDiscountAmountDecimal,
  moneyAmountToCents,
} from '../../shared/discount_rounding.js';

export const PROPERTY_VALUE = 'true';
export const DISCOUNT_MESSAGE = 'PICKYOUROWN';
export const DEFAULT_TARGET_PRICE = '9.90';
export const DEFAULT_CURRENCY_CODES = ['USD'];
export const MIN_DISTINCT_LINES = 10;

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
 * @typedef {{
 *   id: string,
 *   quantity?: number,
 *   pickyourown?: { value?: string | null } | null,
 *   cost?: {
 *     amountPerQuantity?: { amount?: string | null, currencyCode?: string | null } | null
 *   } | null,
 *   merchandise?: { __typename?: string, id?: string, sku?: string | null } | null
 * }} PickYourOwnLine
 */

/**
 * @param {PickYourOwnLine} line
 * @param {PickYourOwnConfig} config
 */
export function isEligibleLine(line, config) {
  if (line.pickyourown?.value !== PROPERTY_VALUE) return false;
  if (line.merchandise?.__typename !== 'ProductVariant') return false;
  if (!line.merchandise.id) return false;
  if (moneyAmountToCents(line.cost?.amountPerQuantity?.amount) <= 0) return false;

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
 * Only one unit per line gets the target price; extra units stay at full price.
 *
 * @param {PickYourOwnLine} line
 * @param {string} targetPrice
 */
export function getLineDiscountCents(line, targetPrice) {
  if ((line.quantity || 0) <= 0) return 0;

  const targetCents = moneyAmountToCents(targetPrice);
  const unitCents = moneyAmountToCents(line.cost?.amountPerQuantity?.amount);

  return Math.max(0, unitCents - targetCents);
}

/**
 * @param {PickYourOwnLine} line
 */
export function getLineSkuKey(line) {
  const sku = line.merchandise?.sku?.trim();
  return sku ? `sku:${sku.toUpperCase()}` : `variant:${line.merchandise?.id}`;
}

/**
 * First eligible line per SKU, in cart order. Later lines with the same SKU are dropped.
 *
 * @param {PickYourOwnLine[]} lines
 * @param {PickYourOwnConfig} config
 */
export function selectQualifyingLines(lines, config) {
  const seen = new Set();

  return lines.filter((line) => {
    if (!isEligibleLine(line, config)) return false;

    const key = getLineSkuKey(line);
    if (seen.has(key)) return false;

    seen.add(key);
    return true;
  });
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
 * @param {PickYourOwnLine[]} lines
 * @param {PickYourOwnConfig} config
 */
export function buildDiscountCandidates(lines, config) {
  const qualifyingLines = selectQualifyingLines(lines, config);
  if (qualifyingLines.length < MIN_DISTINCT_LINES) return [];

  return qualifyingLines
    .map((line) =>
      buildFixedAmountCandidate(line.id, getLineDiscountCents(line, config.targetPrice)),
    )
    .filter(Boolean);
}
