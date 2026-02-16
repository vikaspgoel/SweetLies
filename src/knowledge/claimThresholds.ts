/**
 * Claim thresholds: stricter of WHO/Codex or FSSAI per claim.
 * Sources: FSSAI Advertising and Claims Regulations 2018, Schedule I; Codex CAC/GL 2-1985.
 */

export const CLAIM_THRESHOLDS = {
  // Sugar free: both WHO/Codex and FSSAI use < 0.5g/100g
  sugarFreeMax: 0.5,

  // Fat/oil free: both align at < 0.5g/100g
  fatFreeMax: 0.5,

  // No added sugar: no sugar aliases in ingredients (both standards)
  noAddedSugarMax: 0.5,

  // High protein: stricter = 24g/100g (Codex "high" = 2× source; FSSAI source = 12g)
  highProteinMin: 24,

  // Low carb: stricter = < 5g/100g (some standards use 10g)
  lowCarbMax: 5,

  // Baked: fat above this → amber (implies healthier prep)
  bakedFatLimit: 15,

  // Less sugar: MVP heuristic - sugar above this with claim → fail
  lessSugarMax: 15,

  // Low fat: stricter (both ~3g; use 3g)
  lowFatMax: 3,

  // Cholesterol free: < 5mg per 100g
  cholesterolFreeMax: 5,

  // Low calorie: < 40 kcal per 100g
  lowCalorieMax: 40,

  // Zero calorie: < 5 kcal per 100g
  zeroCalorieMax: 5,
};
