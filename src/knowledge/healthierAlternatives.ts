/**
 * Static healthier alternative suggestions by category (PRD: Show healthier alternatives).
 * Neutral, practical, non-judgmental tone.
 */

export type FoodCategory = 'chips' | 'biscuits' | 'cold_drink' | 'cereal' | 'general';

export interface Alternative {
  tip: string;
  examples?: string;
}

export const HEALTHIER_ALTERNATIVES: Record<FoodCategory, Alternative[]> = {
  chips: [
    { tip: 'Try baked or air-fried options instead of fried.', examples: 'Baked crisps, popcorn (plain)' },
    { tip: 'Look for brands with simple ingredient lists (potato, oil, salt).' },
    { tip: 'Portion out a small bowl instead of eating from the packet.' },
  ],
  biscuits: [
    { tip: 'Choose whole grain or oat-based biscuits.', examples: 'Oat cookies, digestive biscuits' },
    { tip: 'Compare sugar per 100g—often 20–30g is common; lower is better.' },
    { tip: 'Nut or seed-based options often have more protein and less refined sugar.' },
  ],
  cold_drink: [
    { tip: 'Switch to sparkling water with a squeeze of lemon or lime.' },
    { tip: 'Dilute fruit juices 50/50 with water to cut sugar.' },
    { tip: 'Herbal or fruit infusions are sugar-free alternatives.' },
  ],
  cereal: [
    { tip: 'Choose cereals with <10g sugar per 100g.', examples: 'Plain oats, bran flakes' },
    { tip: 'Add fresh fruit for sweetness instead of honey or sugar.' },
    { tip: 'Check fibre content—higher fibre helps balance blood sugar.' },
  ],
  general: [
    { tip: 'Compare labels—similar products can vary a lot in sugar and fat.' },
    { tip: 'Ingredients are listed by weight; first few matter most.' },
    { tip: 'Per 100g comparisons help when serving sizes differ.' },
  ],
};

export function getAlternatives(category?: string): Alternative[] {
  const key = (category ?? 'general').toLowerCase().replace(/\s+/g, '_') as FoodCategory;
  return HEALTHIER_ALTERNATIVES[key] ?? HEALTHIER_ALTERNATIVES.general;
}
