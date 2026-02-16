/**
 * Sugar verdict logic: No Sugar is found vs Sugar is there.
 * When sugar is present, enriches aliases with description, GI, blood sugar impact.
 */

import type { SugarIngredientInfo } from '@/src/knowledge/sugarIngredientInfo';
import { getSugarIngredientInfo } from '@/src/knowledge/sugarIngredientInfo';
import { MODERATE_IMPACT_POLYOLS } from '@/src/parser/ingredientsParser';

export type SugarVerdict = 'NO_SUGAR' | 'SUGAR_PRESENT';

const SUGAR_THRESHOLD = 0.5;
const POLYOLS_THRESHOLD = 5;

const HIGH_GI_TRAP = ['maltodextrin', 'dextrin', 'modified starch', 'barley malt', 'malt extract'];
const HEALTH_HALO_TRAP = ['honey', 'jaggery', 'dates', 'date paste', 'date syrup', 'coconut sugar', 'agave', 'agave nectar', 'agave syrup', 'maple syrup'];

/** Generate warnings when high-GI, health-halo, or moderate-impact polyol aliases are found. */
export function getSugarWarning(foundAliases: string[]): string[] {
  const warnings: string[] = [];
  const foundLower = foundAliases.map((a) => a.toLowerCase());

  if (foundLower.some((alias) => HIGH_GI_TRAP.includes(alias))) {
    warnings.push('WARNING: Contains High-GI additives (Maltodextrin/Malt) which spike blood sugar faster than table sugar.');
  }

  if (foundLower.some((alias) => HEALTH_HALO_TRAP.includes(alias))) {
    warnings.push("NOTE: Contains 'Natural' sugars (Honey/Jaggery/Dates). While unrefined, these still impact insulin significantly.");
  }

  const foundPolyols = MODERATE_IMPACT_POLYOLS.filter((p) => foundLower.includes(p));
  if (foundPolyols.length > 0) {
    const polyolList = foundPolyols.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(', ');
    warnings.push(`WARNING: Contains Polyols (${polyolList}) that have a significant glycemic impact and may raise blood sugar.`);
  }

  return warnings;
}

/** Determine final verdict from ingredients and nutrition. */
export function getSugarVerdict(details: {
  sugarAliasesFound: string[];
  sugarPer100g?: number;
  polyolsPer100g?: number;
}): SugarVerdict {
  const { sugarAliasesFound, sugarPer100g, polyolsPer100g } = details;
  const hasSugarInIngredients = sugarAliasesFound.length > 0;
  const hasSugarInNutrition = sugarPer100g != null && sugarPer100g >= SUGAR_THRESHOLD;
  const hasHighPolyols = polyolsPer100g != null && polyolsPer100g >= POLYOLS_THRESHOLD;

  if (hasSugarInIngredients || hasSugarInNutrition || hasHighPolyols) {
    return 'SUGAR_PRESENT';
  }
  return 'NO_SUGAR';
}

export interface SugarMatch {
  alias: string;
  verbatim: string;
}

export interface SugaryIngredientWithInfo {
  verbatim: string; // exact text from label
  alias: string;
  info: SugarIngredientInfo;
}

/** Enrich sugar matches with description, GI, and blood sugar impact. */
export function getSugaryIngredientsWithInfo(matches: SugarMatch[]): SugaryIngredientWithInfo[] {
  const seen = new Set<string>();
  const result: SugaryIngredientWithInfo[] = [];

  for (const { alias, verbatim } of matches) {
    const info = getSugarIngredientInfo(alias);
    const key = info.name.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push({ verbatim, alias, info });
    }
  }

  return result;
}
