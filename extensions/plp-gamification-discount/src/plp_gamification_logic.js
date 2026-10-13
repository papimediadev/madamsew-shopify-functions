export const PROPERTY_VALUE = 'true';
export const DISCOUNT_MESSAGE = 'PLPGAMIFICATION';
export const MAX_DISCOUNT_PERCENT = 25;
export const PER_ITEM_PERCENT = 5;

/**
 * @param {{ plpgamification?: { value?: string | null } | null }} line
 */
export function isEligibleLine(line) {
  return line.plpgamification?.value === PROPERTY_VALUE;
}

/**
 * @param {Array<{ quantity?: number, plpgamification?: { value?: string | null } | null }>} lines
 */
export function countEligibleItems(lines) {
  return lines.reduce((total, line) => {
    if (!isEligibleLine(line)) return total;
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
 * @param {Array<{ id: string, quantity?: number, plpgamification?: { value?: string | null } | null }>} lines
 */
export function buildDiscountCandidates(lines) {
  const eligibleCount = countEligibleItems(lines);
  const discountPercent = getDiscountPercent(eligibleCount);

  if (discountPercent <= 0) return [];

  return lines
    .filter((line) => isEligibleLine(line))
    .map((line) => ({
      message: DISCOUNT_MESSAGE,
      targets: [{ cartLine: { id: line.id } }],
      value: { percentage: { value: discountPercent } },
    }));
}
