export const PROPERTY_VALUE = 'true';
export const DISCOUNT_MESSAGE = 'WAREHOUSECLEARANCE';
export const MAX_DISCOUNT_PERCENT = 25;
export const PER_ITEM_PERCENT = 5;

/**
 * @typedef {{ allowedVariantIds?: string[] }} WarehouseClearanceConfig
 */

/**
 * @param {unknown} configValue
 * @returns {WarehouseClearanceConfig}
 */
export function parseConfig(configValue) {
  if (!configValue || typeof configValue !== 'object') {
    return { allowedVariantIds: [] };
  }

  const config = /** @type {WarehouseClearanceConfig} */ (configValue);
  const allowedVariantIds = Array.isArray(config.allowedVariantIds)
    ? config.allowedVariantIds.map(String)
    : [];

  return { allowedVariantIds };
}

/**
 * @param {{ warehouseclearance?: { value?: string | null } | null, merchandise?: { __typename?: string, id?: string } | null }} line
 * @param {string[]} allowedVariantIds
 */
export function isEligibleLine(line, allowedVariantIds) {
  if (line.warehouseclearance?.value !== PROPERTY_VALUE) return false;
  if (line.merchandise?.__typename !== 'ProductVariant') return false;
  if (!line.merchandise.id) return false;

  return allowedVariantIds.includes(line.merchandise.id);
}

/**
 * @param {Array<{ quantity?: number, warehouseclearance?: { value?: string | null } | null, merchandise?: { __typename?: string, id?: string } | null }>} lines
 * @param {string[]} allowedVariantIds
 */
export function countEligibleItems(lines, allowedVariantIds) {
  return lines.reduce((total, line) => {
    if (!isEligibleLine(line, allowedVariantIds)) return total;
    return total + (line.quantity || 0);
  }, 0);
}

/**
 * @param {number} eligibleCount
 */
export function getDiscountPercent(eligibleCount) {
  if (eligibleCount <= 0) return 0;
  return Math.min(eligibleCount * PER_ITEM_PERCENT, MAX_DISCOUNT_PERCENT);
}

/**
 * @param {Array<{ id: string, quantity?: number, warehouseclearance?: { value?: string | null } | null, merchandise?: { __typename?: string, id?: string } | null }>} lines
 * @param {string[]} allowedVariantIds
 */
export function buildDiscountCandidates(lines, allowedVariantIds) {
  const eligibleCount = countEligibleItems(lines, allowedVariantIds);
  const discountPercent = getDiscountPercent(eligibleCount);

  if (discountPercent <= 0) return [];

  return lines
    .filter((line) => isEligibleLine(line, allowedVariantIds))
    .map((line) => ({
      message: DISCOUNT_MESSAGE,
      targets: [{ cartLine: { id: line.id } }],
      value: { percentage: { value: discountPercent } },
    }));
}
