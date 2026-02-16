/**
 * Claim evaluation rules and thresholds (PRD: Claim Evaluation Rules).
 * Deterministic, auditable rules for Red / Amber / Green verdicts.
 */

export type Verdict = 'RED' | 'AMBER' | 'GREEN';

export interface ClaimRule {
  claimPattern: RegExp | string;
  check: (context: RuleContext) => { verdict: Verdict; reason: string };
}

export interface RuleContext {
  nutrients: {
    sugarPer100g?: number;
    fatPer100g?: number;
    proteinPer100g?: number;
    carbsPer100g?: number;
    caloriesPer100g?: number;
    cholesterolPer100g?: number;
    servingSizeG?: number;
  };
  sugarAliasesFound: string[];
  fatIdentifiersFound: string[];
  brandingText: string;
  ingredientsText: string;
}

// WHO/FAO daily recommendations (adult defaults)
export const DAILY_RECOMMENDATIONS = {
  sugar: 50, // g - WHO free sugars
  fat: 65,   // g
  protein: 50, // g
};

// Thresholds for claims
export const THRESHOLDS = {
  highProtein: 20,     // g per 100g for "High Protein"
  lowFat: 3,           // g per 100g for "Low Fat"
  bakedFatLimit: 15,   // g per 100g - "Baked" with fat above this → AMBER
  noAddedSugarMax: 0.5, // g per 100g - trace amount tolerance
};
