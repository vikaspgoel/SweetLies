/**
 * Claim categories for manual selection. Sugar-only app.
 */

export type ClaimCategory = 'sugar';

export const CLAIM_CATEGORIES: Record<ClaimCategory, string[]> = {
  sugar: ['No Added Sugar', 'Sugar-Free', 'No Refined Sugar', 'Made With Real Fruit', 'Sweetened With Honey/Jaggery/Dates'],
};

export const ALL_CLAIMS: string[] = Object.values(CLAIM_CATEGORIES).flat();

export function getClaimsForCategory(category: ClaimCategory): string[] {
  return CLAIM_CATEGORIES[category] ?? [];
}
