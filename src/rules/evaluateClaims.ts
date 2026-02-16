/**
 * Rule engine: evaluates claims against nutrition facts.
 * Uses stricter of WHO/Codex or FSSAI. Returns per-claim Pass/Fail.
 */

import type { RuleContext, Verdict } from '@/src/knowledge/claimRules';
import { CLAIM_THRESHOLDS } from '@/src/knowledge/claimThresholds';
import { parseIngredients } from '@/src/parser/ingredientsParser';
import { parseNutritionTable } from '@/src/parser/nutritionParser';

export type ClaimVerdict = 'PASS' | 'FAIL';

export interface PerClaimResult {
  claim: string;
  verdict: ClaimVerdict;
  reason: string;
}

export interface SugarMatch {
  alias: string;
  verbatim: string;
}

export interface EvaluationResult {
  claimResults: PerClaimResult[];
  details: {
    sugarPer100g?: number;
    polyolsPer100g?: number;
    fatPer100g?: number;
    proteinPer100g?: number;
    carbsPer100g?: number;
    caloriesPer100g?: number;
    cholesterolPer100g?: number;
    sugarAliasesFound: string[];
    sugarMatches: SugarMatch[];
    polyolsPer100g?: number;
    fatIdentifiersFound: string[];
    rawIngredients: string[];
  };
}

const CLAIM_PATTERNS: { pattern: RegExp; name: string }[] = [
  { pattern: /no\s+added\s+sugar/gi, name: 'No added sugar' },
  { pattern: /sugar\s+free/gi, name: 'Sugar free' },
  { pattern: /high\s+protein/gi, name: 'High protein' },
  { pattern: /protein\s+rich/gi, name: 'High protein' },
  { pattern: /baked/gi, name: 'Baked' },
  { pattern: /low\s+fat/gi, name: 'Low fat' },
  { pattern: /fat\s+free|oil\s+free/gi, name: 'Fat free' },
  { pattern: /oil\s+free/gi, name: 'Oil free' },
  { pattern: /zero\s+sugar/gi, name: 'Sugar free' },
  { pattern: /less\s+sugar/gi, name: 'Less sugar' },
  { pattern: /low\s+carb/gi, name: 'Low carb' },
];

function detectClaims(brandingText: string): string[] {
  const claims: string[] = [];
  for (const { pattern, name } of CLAIM_PATTERNS) {
    if (pattern.test(brandingText)) {
      const normalized = name;
      if (!claims.includes(normalized)) claims.push(normalized);
    }
  }
  return claims;
}

function toClaimVerdict(v: Verdict): ClaimVerdict {
  return v === 'RED' ? 'FAIL' : 'PASS';
}

function evalSugarFree(ctx: RuleContext): { verdict: Verdict; reason: string } | null {
  const sugar = ctx.nutrients.sugarPer100g ?? 0;
  if (sugar < CLAIM_THRESHOLDS.sugarFreeMax)
    return { verdict: 'GREEN', reason: `Sugar ${sugar}g/100g is below ${CLAIM_THRESHOLDS.sugarFreeMax}g threshold.` };
  return { verdict: 'RED', reason: `Sugar free claim fails. Product has ${sugar}g sugar per 100g (max ${CLAIM_THRESHOLDS.sugarFreeMax}g).` };
}

function evalNoAddedSugar(ctx: RuleContext): { verdict: Verdict; reason: string } | null {
  const { sugarAliasesFound, nutrients } = ctx;
  const sugar = nutrients.sugarPer100g ?? 0;
  if (sugarAliasesFound.length > 0)
    return { verdict: 'RED', reason: `No added sugar claim fails. Found: ${sugarAliasesFound.slice(0, 3).join(', ')}.` };
  if (sugar > CLAIM_THRESHOLDS.noAddedSugarMax)
    return { verdict: 'RED', reason: `No added sugar claim fails. Product has ${sugar}g sugar per 100g.` };
  return { verdict: 'GREEN', reason: 'No added sugar claim appears consistent with ingredients.' };
}

function evalLessSugar(ctx: RuleContext): { verdict: Verdict; reason: string } | null {
  const sugar = ctx.nutrients.sugarPer100g ?? 0;
  if (sugar <= CLAIM_THRESHOLDS.lessSugarMax)
    return { verdict: 'GREEN', reason: `Less sugar claim: ${sugar}g/100g is within reasonable range.` };
  return { verdict: 'RED', reason: `Less sugar claim fails. Product has ${sugar}g sugar per 100g.` };
}

function evalHighProtein(ctx: RuleContext): { verdict: Verdict; reason: string } | null {
  const protein = ctx.nutrients.proteinPer100g;
  if (protein === undefined) return { verdict: 'AMBER', reason: 'Could not extract protein. Cannot verify.' };
  if (protein >= CLAIM_THRESHOLDS.highProteinMin)
    return { verdict: 'GREEN', reason: `High protein claim valid. ${protein}g per 100g ≥ ${CLAIM_THRESHOLDS.highProteinMin}g.` };
  return { verdict: 'RED', reason: `High protein claim fails. Only ${protein}g per 100g (threshold ${CLAIM_THRESHOLDS.highProteinMin}g).` };
}

function evalBaked(ctx: RuleContext): { verdict: Verdict; reason: string } | null {
  const fat = ctx.nutrients.fatPer100g;
  if (fat === undefined) return null;
  if (fat > CLAIM_THRESHOLDS.bakedFatLimit)
    return { verdict: 'AMBER', reason: `Baked claim: fat is ${fat}g/100g. May suggest healthier prep—enjoy occasionally.` };
  return { verdict: 'GREEN', reason: 'Baked claim acceptable; fat within range.' };
}

function evalFatFree(ctx: RuleContext): { verdict: Verdict; reason: string } | null {
  const fat = ctx.nutrients.fatPer100g ?? 0;
  if (fat <= CLAIM_THRESHOLDS.fatFreeMax)
    return { verdict: 'GREEN', reason: 'Fat free claim valid.' };
  return { verdict: 'RED', reason: `Fat/oil free claim fails. Product has ${fat}g fat per 100g.` };
}

function evalLowFat(ctx: RuleContext): { verdict: Verdict; reason: string } | null {
  const fat = ctx.nutrients.fatPer100g;
  if (fat === undefined) return null;
  if (fat <= CLAIM_THRESHOLDS.lowFatMax)
    return { verdict: 'GREEN', reason: `Low fat claim valid. ${fat}g per 100g.` };
  return { verdict: 'RED', reason: `Low fat claim fails. ${fat}g per 100g (max ${CLAIM_THRESHOLDS.lowFatMax}g).` };
}

function evalLowCarb(ctx: RuleContext): { verdict: Verdict; reason: string } | null {
  const carbs = ctx.nutrients.carbsPer100g;
  if (carbs === undefined) return { verdict: 'AMBER', reason: 'Could not extract carbs. Cannot verify.' };
  if (carbs <= CLAIM_THRESHOLDS.lowCarbMax)
    return { verdict: 'GREEN', reason: `Low carb claim valid. ${carbs}g per 100g ≤ ${CLAIM_THRESHOLDS.lowCarbMax}g.` };
  return { verdict: 'RED', reason: `Low carb claim fails. ${carbs}g per 100g (max ${CLAIM_THRESHOLDS.lowCarbMax}g).` };
}

function evalNoProcessedSugar(ctx: RuleContext): { verdict: Verdict; reason: string } | null {
  return evalNoAddedSugar(ctx);
}

const REFINED_SUGAR_ALIASES = ['sucrose', 'dextrose', 'corn syrup', 'glucose', 'maltodextrin', 'high fructose corn syrup', 'hfcs', 'sugar', 'refined sugar', 'table sugar'];

function evalNoRefinedSugar(ctx: RuleContext): { verdict: Verdict; reason: string } | null {
  const found = ctx.sugarAliasesFound.filter((a) =>
    REFINED_SUGAR_ALIASES.some((r) => a.toLowerCase().includes(r))
  );
  if (found.length > 0)
    return { verdict: 'RED', reason: `No refined sugar claim fails. Found: ${found.slice(0, 3).join(', ')}.` };
  return { verdict: 'GREEN', reason: 'No refined sugar claim appears consistent with ingredients.' };
}

const FRUIT_TERMS = ['fruit', 'apple', 'mango', 'banana', 'berry', 'berries', 'orange', 'grape', 'pineapple', 'strawberry', 'blueberry', 'raspberry', 'blackberry', 'cherry', 'peach', 'pear', 'apricot', 'plum', 'cranberry', 'pomegranate', 'passion fruit', 'papaya'];

function evalMadeWithRealFruit(ctx: RuleContext): { verdict: Verdict; reason: string } | null {
  const text = ctx.ingredientsText.toLowerCase();
  const found = FRUIT_TERMS.filter((t) => text.includes(t));
  if (found.length > 0)
    return { verdict: 'GREEN', reason: `Made with real fruit: found ${found.slice(0, 3).join(', ')} in ingredients.` };
  return { verdict: 'RED', reason: 'Made with real fruit claim: no clear fruit ingredients detected.' };
}

const HONEY_JAGGERY_DATES = ['honey', 'jaggery', 'dates', 'date paste', 'date syrup', 'khajoor', 'dry date'];

function evalSweetenedHoneyJaggeryDates(ctx: RuleContext): { verdict: Verdict; reason: string } | null {
  const found = ctx.sugarAliasesFound.filter((a) =>
    HONEY_JAGGERY_DATES.some((h) => a.toLowerCase().includes(h))
  );
  if (found.length > 0)
    return { verdict: 'GREEN', reason: `Sweetened with honey/jaggery/dates: found ${found.join(', ')}.` };
  return { verdict: 'RED', reason: 'Claim says sweetened with honey/jaggery/dates but none found in ingredients.' };
}

function evalCholesterolFree(ctx: RuleContext): { verdict: Verdict; reason: string } | null {
  const chol = ctx.nutrients.cholesterolPer100g ?? 0;
  if (chol <= CLAIM_THRESHOLDS.cholesterolFreeMax)
    return { verdict: 'GREEN', reason: 'Cholesterol free claim valid.' };
  return { verdict: 'RED', reason: `Cholesterol free claim fails. Product has ${chol}mg per 100g.` };
}

function evalLowCalorie(ctx: RuleContext): { verdict: Verdict; reason: string } | null {
  const cal = ctx.nutrients.caloriesPer100g;
  if (cal === undefined) return { verdict: 'AMBER', reason: 'Could not extract calories. Cannot verify.' };
  if (cal <= CLAIM_THRESHOLDS.lowCalorieMax)
    return { verdict: 'GREEN', reason: `Low calorie claim valid. ${cal} kcal per 100g.` };
  return { verdict: 'RED', reason: `Low calorie claim fails. ${cal} kcal per 100g (max ${CLAIM_THRESHOLDS.lowCalorieMax}).` };
}

function evalZeroCalorie(ctx: RuleContext): { verdict: Verdict; reason: string } | null {
  const cal = ctx.nutrients.caloriesPer100g ?? 999;
  if (cal <= CLAIM_THRESHOLDS.zeroCalorieMax)
    return { verdict: 'GREEN', reason: 'Zero calorie claim valid.' };
  return { verdict: 'RED', reason: `Zero calorie claim fails. Product has ${cal} kcal per 100g.` };
}

function evalProteinValue(ctx: RuleContext): { verdict: Verdict; reason: string } | null {
  const p = ctx.nutrients.proteinPer100g;
  if (p === undefined) return { verdict: 'AMBER', reason: 'Could not find protein on label. Cannot verify.' };
  return { verdict: 'GREEN', reason: `Protein value found: ${p}g per 100g.` };
}

const EVALUATORS: Record<string, (ctx: RuleContext) => { verdict: Verdict; reason: string } | null> = {
  'Sugar free': evalSugarFree,
  'No added sugar': evalNoAddedSugar,
  'Less sugar': evalLessSugar,
  'High protein': evalHighProtein,
  'Baked': evalBaked,
  'Fat free': evalFatFree,
  'Oil free': evalFatFree,
  'Low fat': evalLowFat,
  'Low carb': evalLowCarb,
  'No processed sugar': evalNoProcessedSugar,
  'Baked not fried': evalBaked,
  'Cholesterol free': evalCholesterolFree,
  'Low calorie': evalLowCalorie,
  'Zero calorie': evalZeroCalorie,
  'Mentions protein value': evalProteinValue,
  'Low sugar': evalLessSugar,
  'Diet': evalLowCalorie,
  'Light': evalLowCalorie,
  'No refined sugar': evalNoRefinedSugar,
  'Made with real fruit': evalMadeWithRealFruit,
  'Sweetened with honey/jaggery/dates': evalSweetenedHoneyJaggeryDates,
};

export function evaluateClaims(
  labelText: string[],
  brandingText: string[],
  manualClaims?: string[]
): EvaluationResult {
  const labelCombined = labelText.join('\n').toLowerCase();
  const brandingCombined = brandingText.join(' ');

  const nutrients = parseNutritionTable(labelCombined);
  const { sugarAliasesFound, sugarMatches, fatIdentifiersFound, rawIngredients } = parseIngredients(labelCombined);
  const detectedFromImage = detectClaims(brandingCombined);
  const allClaims = [...new Set([...(manualClaims ?? []), ...detectedFromImage])];

  const ctx: RuleContext = {
    nutrients: {
      sugarPer100g: nutrients.sugarPer100g,
      fatPer100g: nutrients.fatPer100g,
      proteinPer100g: nutrients.proteinPer100g,
      carbsPer100g: nutrients.carbsPer100g,
      caloriesPer100g: nutrients.caloriesPer100g,
      cholesterolPer100g: nutrients.cholesterolPer100g,
      servingSizeG: nutrients.servingSizeG,
    },
    sugarAliasesFound,
    fatIdentifiersFound,
    brandingText: brandingCombined,
    ingredientsText: labelCombined,
  };

  const claimResults: PerClaimResult[] = [];
  for (const claim of allClaims) {
    const evaluator = EVALUATORS[claim];
    if (evaluator) {
      const result = evaluator(ctx);
      if (result) {
        claimResults.push({
          claim,
          verdict: toClaimVerdict(result.verdict),
          reason: result.reason,
        });
      } else {
        claimResults.push({
          claim,
          verdict: 'PASS',
          reason: 'Could not verify; no nutrient data.',
        });
      }
    } else {
      claimResults.push({
        claim,
        verdict: 'PASS',
        reason: 'Claim not in rule set; manual review recommended.',
      });
    }
  }

  if (claimResults.length === 0) {
    claimResults.push({
      claim: 'No claims to verify',
      verdict: 'PASS',
      reason: 'Upload a claim image or select claims to verify.',
    });
  }

  return {
    claimResults,
  details: {
    sugarPer100g: nutrients.sugarPer100g,
    polyolsPer100g: nutrients.polyolsPer100g,
    fatPer100g: nutrients.fatPer100g,
      proteinPer100g: nutrients.proteinPer100g,
      carbsPer100g: nutrients.carbsPer100g,
      caloriesPer100g: nutrients.caloriesPer100g,
      cholesterolPer100g: nutrients.cholesterolPer100g,
      sugarAliasesFound,
      sugarMatches,
      fatIdentifiersFound,
      rawIngredients,
    },
  };
}
