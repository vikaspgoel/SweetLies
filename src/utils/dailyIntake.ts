import { DAILY_RECOMMENDATIONS } from '@/src/knowledge/claimRules';

/**
 * Calculates % of daily recommended intake for a single serving.
 * Uses WHO defaults (adult).
 */
export function getDailyIntakePercent(
  valuePer100g: number,
  servingSizeG: number = 100
): number {
  const totalG = (valuePer100g / 100) * servingSizeG;
  return Math.round((totalG / 50) * 100); // sugar default 50g
}

export function getSugarDailyPercent(sugarPer100g: number, servingSizeG: number = 100): number {
  const totalG = (sugarPer100g / 100) * servingSizeG;
  return Math.round((totalG / DAILY_RECOMMENDATIONS.sugar) * 100);
}

export function getFatDailyPercent(fatPer100g: number, servingSizeG: number = 100): number {
  const totalG = (fatPer100g / 100) * servingSizeG;
  return Math.round((totalG / DAILY_RECOMMENDATIONS.fat) * 100);
}

export function getProteinDailyPercent(proteinPer100g: number, servingSizeG: number = 100): number {
  const totalG = (proteinPer100g / 100) * servingSizeG;
  return Math.round((totalG / DAILY_RECOMMENDATIONS.protein) * 100);
}
