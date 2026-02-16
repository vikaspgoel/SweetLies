/**
 * Sugar-only claim options.
 * Flow: What's the product claiming? → Upload → Result
 */

export type WorryType = 'sugar' | 'fat' | 'protein' | 'calories' | 'diet';

/** Sugar-only: claim options shown on home screen */
export const PRODUCT_CLAIM_OPTIONS: { id: string; label: string; evaluatorKey: string | null }[] = [
  { id: 'no_added_sugar', label: 'No Added Sugar', evaluatorKey: 'No added sugar' },
  { id: 'sugar_free', label: 'Sugar-Free', evaluatorKey: 'Sugar free' },
  { id: 'no_refined_sugar', label: 'No Refined Sugar', evaluatorKey: 'No refined sugar' },
  { id: 'made_with_real_fruit', label: 'Made With Real Fruit', evaluatorKey: 'Made with real fruit' },
  { id: 'sweetened_honey_jaggery_dates', label: 'Sweetened With Honey/Jaggery/Dates', evaluatorKey: 'Sweetened with honey/jaggery/dates' },
  { id: 'other', label: 'Other', evaluatorKey: null },
];

export function getClaimLabel(claimId: string | null): string {
  if (!claimId) return 'Claim';
  const opt = PRODUCT_CLAIM_OPTIONS.find((c) => c.id === claimId);
  return opt?.label ?? 'Claim';
}

export function getEvaluatorKey(claimId: string | null): string | null {
  if (!claimId) return null;
  const opt = PRODUCT_CLAIM_OPTIONS.find((c) => c.id === claimId);
  return opt?.evaluatorKey ?? null;
}

// Legacy: kept for upload/result compatibility
export const WORRY_OPTIONS: { id: WorryType; label: string }[] = [
  { id: 'sugar', label: 'Sugar' },
];

export const CLAIMS_BY_WORRY: Record<WorryType, { id: string; label: string }[]> = {
  sugar: PRODUCT_CLAIM_OPTIONS.map((c) => ({ id: c.id, label: c.label })),
  fat: [],
  protein: [],
  calories: [],
  diet: [],
};

export function getClaimsForWorry(worry: WorryType) {
  return CLAIMS_BY_WORRY[worry] ?? [];
}
