/**
 * Extracts and classifies ingredients from OCR text.
 * Matches against sugar aliases and fat identifiers.
 */

import { SUGAR_ALIASES } from '@/src/knowledge/sugarAliases';
import { FAT_IDENTIFIERS } from '@/src/knowledge/fatIdentifiers';
import { SWEETENER_TABLE, type SweetenerMatch } from '@/src/knowledge/artificialSweetenerInfo';

export interface SugarMatch {
  alias: string;
  verbatim: string; // exact text from label that triggered the match
}

export interface ClassifiedIngredients {
  sugarAliasesFound: string[];
  sugarMatches: SugarMatch[]; // alias + verbatim ingredient from label
  fatIdentifiersFound: string[];
  rawIngredients: string[];
}

function normalizeIngredient(text: string): string {
  return text.toLowerCase().trim();
}

/** Escape special regex chars for safe RegExp use. */
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** INS numbers for artificial sweeteners - extract from "Sweetener (960)" style text. */
const INS_NUMBERS = [968, 955, 960, 950, 951, 961, 969, 957, 954, 965, 420, 967, 953, 421];

/** Extracts INS numbers from lines like "Sweetener (960)" or "Sweeteners (960, 955)". */
function extractInsNumbersFromLine(line: string): string[] {
  if (!/\bsweeteners?\b/i.test(line)) return [];
  const found: string[] = [];
  // Match (960), (960, 955), (E960), E960, 960 etc.
  const matches = line.matchAll(/\b(?:E|INS\s*)?(\d{3})\b/gi);
  for (const m of matches) {
    const num = m[1];
    if (INS_NUMBERS.includes(parseInt(num, 10)) && !found.includes(num)) {
      found.push(num);
    }
  }
  return found;
}

/**
 * Word-boundary match: "malt" matches "barley malt" but NOT "isomalt" (when isomalt is a separate term).
 */
function termMatches(ingredient: string, term: string): boolean {
  const normalized = ingredient.toLowerCase();
  const re = new RegExp('\\b' + escapeRegex(term) + '\\b', 'i');
  return re.test(normalized);
}

/**
 * Sugar alcohol and polyols are sugar SUBSTITUTES, not sugar. Phrases like
 * "Sugar alcohol (Polyols) 18 g" must NOT trigger sugar detection — the word
 * "sugar" appears but refers to sugar alcohol, which is a different compound.
 */
function isSugarAlcoholOrPolyolPhrase(text: string): boolean {
  const t = text.toLowerCase().trim();
  if (/\bsugar\s+alcohol\b/i.test(t)) return true;
  if (/\bpolyols?\b/i.test(t)) return true;
  if (/\bsugar\s+alcohol\s*\(/i.test(t)) return true;
  return false;
}

/** Triggers that negate sugar presence within a 60-character window before the term. */
const NEGATION_TRIGGERS = /\bfree\s+from\b|\bfree\s+of\b|\bfromall\b|\bwithout\s+(added\s+)?(sugar|sucrose|honey|jaggery|mishri)\b|\bno\s+(added\s+)?(sugar|sucrose|honey|jaggery|mishri)\b|\bzero\s+sugar\b/i;

/** True if the context (e.g. 60 chars before a sugar term) contains a negation trigger. */
function isNegatedByContext(contextBefore: string): boolean {
  return NEGATION_TRIGGERS.test(contextBefore.slice(-60));
}

/**
 * Continuation fragments: "mishri. These candies", "jaggery. This product" — sugar term
 * followed by period and demonstrative; part of "free from X. These candies..." claim.
 */
function isContinuationFragment(chunk: string): boolean {
  const t = chunk.toLowerCase().trim();
  return /(honey|jaggery|mishri)\.\s*(these|this|our)\s+(candies|products|snacks|ingredients|food|benefits)/i.test(t);
}

/** True if chunk contains any SUGAR_ALIASES term (word-boundary match). */
function hasSugarTerm(chunk: string): boolean {
  return SUGAR_ALIASES.some((term) => termMatches(chunk, term));
}

/**
 * Phrases that NEGATE sugar presence — e.g. "no added sucrose", "no added sugar".
 * Matching "sucrose" in "no added sucrose" would be wrong; the label says it's NOT present.
 */
function isNegatedSugarPhrase(text: string): boolean {
  const t = text.toLowerCase().trim();
  if (/^no\s+.*\bor\b.*(sugar|sucrose|glucose|fructose|dextrose|maltodextrin|malt|honey|jaggery|mishri)\b/i.test(t)) return true;
  if (/^no\s+added\s+(sugar|sucrose|glucose|fructose|dextrose)/i.test(t)) return true;
  if (/^without\s+(added\s+)?(sugar|sucrose)/i.test(t)) return true;
  if (/contains\s+no\s+(added\s+)?(sugar|sucrose)/i.test(t)) return true;
  if (/(sugar|sucrose)\s*[-–]?\s*free\b/i.test(t) && !/\b(sugar|sucrose)\s+free\s+(of|from)/i.test(t)) return true;
  if (/\bfree\s+of\s+(added\s+)?(sugar|sucrose)\b/i.test(t)) return true;
  if (/^no\s+(added\s+)?sucrose\.?$/i.test(t)) return true;
  if (/^no\s+(added\s+)?sugar\.?$/i.test(t)) return true;
  if (/\bno\s+added\s+sucrose\b/i.test(t)) return true;
  if (/\bno\s+sucrose\b/i.test(t) && /added|contain/i.test(t)) return true;
  // "Not a significant source of sugar" = product has little/no sugar (incl. OCR typo "ot" for "not")
  if (/\b(not|ot|n0t)\s+a\s+significant\s+source\s+of\s+(sugar|sucrose)\b/i.test(t)) return true;
  // OCR-truncated disclaimer fragment (e.g. "urce of sugar" from "Not a significant source of sugar") — never count as sugar
  if (/^\s*(urce|ource|source|significant\s+source)\s+of\s+(sugar|sucrose)\s*\.?\s*$/i.test(t)) return true;
  if (/\b(urce|ource|source|significant\s+source)\s+of\s+(sugar|sucrose)\s*\.?\s*$/i.test(t) && t.length < 80) return true;
  if (/\bnegligible\s+(source\s+of\s+)?(sugar|sucrose)\b/i.test(t)) return true;
  if (/\btrace\s+(amount\s+of\s+)?(sugar|sucrose)\b/i.test(t)) return true;
  if (/\binsignificant\s+source\s+of\s+(sugar|sucrose)\b/i.test(t)) return true;
  if (/\bnot\s+significant\s+source\s+of\s+(sugar|sucrose)\b/i.test(t)) return true;
  if (/\bno\s+significant\s+(source\s+of\s+)?(sugar|sucrose)\b/i.test(t)) return true;
  // "Free from X" / "free of X" — product claims to be free of sugar/honey/jaggery; don't count as sugar present
  if (/\bfree\s+(from|of)\b/i.test(t) && /\b(sugar|honey|jaggery|sucrose|mishri|glucose|fructose|dextrose)\b/i.test(t)) return true;
  if (/\bfree\s+from\s+all\s+forms\s+of\s+sugar\b/i.test(t)) return true;
  if (/\bfree\s+fromall\s+forms/i.test(t)) return true; // OCR typo: "fromall" = "from all"
  // Fragment "honey and" / "honey and mishri" — continuation of "free from ... jaggery, honey and mishri"
  if (/^(honey|jaggery|mishri)\s+and\s+(mishri|jaggery|honey|sugar)?\s*$/i.test(t)) return true;
  if (/^(honey|jaggery)\s+and\s*$/i.test(t)) return true; // "honey and" (incomplete)
  return false;
}

/**
 * Nutrition table rows (e.g. "Total Sugar 1.5g", "Amount per 100g") must NOT be
 * treated as ingredients. Matching "sugar" from these causes junk in "What we found".
 */
function isNutritionTableRow(text: string): boolean {
  const t = text.toLowerCase().trim();
  if (/^amount\s+per\s+\d|per\s*100\s*g|per\s*serving/i.test(t)) return true;
  if (/^(?:total|added)\s+sugar\s+[\d.,]|sugar\s+[\d.,].*g\b/i.test(t)) return true;
  if (/^(?:total|added|natural)\s+sugars?\s*[-–—]?\s*$/i.test(t)) return true;
  if (/^polyols?\s*[-–—]?\s*[\d.,]*/i.test(t)) return true;
  if (/^net\s*carbs?\s*[-–—]?\s*[\d.,]*/i.test(t)) return true;
  if (/^dietary\s*fib(?:er|re)\s*[-–—]?\s*[\d.,]*/i.test(t)) return true;
  if (/^(?:total\s+)?fat\s+[\d.,]|protein\s+[\d.,]|carb(?:ohydrate)?s?\s+[\d.,]/i.test(t)) return true;
  if (/calories?\s+[\d.,]|energy\s+[\d.,]|sodium\s+[\d.,]|cholesterol\s+[\d.,]/i.test(t)) return true;
  if (/^\d+[.,]?\d*\s*g\s*(?:of\s+)?(?:sugar|fat|protein)/i.test(t)) return true;
  return false;
}

function findMatches(
  ingredients: string[],
  dictionary: string[]
): string[] {
  const found: string[] = [];
  for (const ing of ingredients) {
    if (isNutritionTableRow(ing) || isNegatedSugarPhrase(ing) || isSugarAlcoholOrPolyolPhrase(ing)) continue;
    for (const term of dictionary) {
      if (termMatches(ing, term) && !found.includes(term)) {
        found.push(term);
      }
    }
  }
  return found;
}

/** Returns sugar matches with verbatim text from the label. */
function findSugarMatches(
  ingredients: string[],
  dictionary: string[]
): SugarMatch[] {
  const seen = new Set<string>();
  const result: SugarMatch[] = [];
  for (const ing of ingredients) {
    if (isNutritionTableRow(ing) || isNegatedSugarPhrase(ing) || isSugarAlcoholOrPolyolPhrase(ing)) continue;
    for (const term of dictionary) {
      if (termMatches(ing, term)) {
        const key = `${term}:${ing}`;
        if (!seen.has(key)) {
          seen.add(key);
          result.push({ alias: term, verbatim: ing.trim() });
        }
      }
    }
  }
  return result;
}

/**
 * Finds sweeteners (artificial + polyols) in raw ingredients.
 * Used for "Artificial Sweeteners Present?" section - shown for every scan.
 */
export function findSweetenerMatches(rawIngredients: string[]): SweetenerMatch[] {
  const seen = new Set<string>();
  const result: SweetenerMatch[] = [];
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/ff6a9878-d05f-4e10-be3f-b600058f7c64', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'ingredientsParser.ts:findSweetenerMatches', message: 'rawIngredients received', data: { rawIngredients, count: rawIngredients.length }, timestamp: Date.now(), hypothesisId: 'H3' }) }).catch(() => {});
  // #endregion
  for (const ing of rawIngredients) {
    if (isNutritionTableRow(ing)) continue;
    const low = ing.toLowerCase();
    for (const info of SWEETENER_TABLE) {
      if (seen.has(info.name)) continue;
      const found = info.aliases.some((alias) => {
        const re = new RegExp('\\b' + escapeRegex(alias) + '\\b', 'i');
        return re.test(low);
      });
      // #region agent log
      if (info.name === 'Stevia' && /sweet|steviol/i.test(ing)) {
        const aliasPlural = /\bsteviol glycosides\b/i.test(low);
        const aliasSingular = /\bsteviol glycoside\b/i.test(low);
        fetch('http://127.0.0.1:7244/ingest/ff6a9878-d05f-4e10-be3f-b600058f7c64', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'ingredientsParser.ts:findSweetenerMatches', message: 'Stevia match check', data: { ing, low, found, aliasPlural, aliasSingular, steviaAliases: info.aliases }, timestamp: Date.now(), hypothesisId: 'H1,H5' }) }).catch(() => {});
      }
      // #endregion
      if (found) {
        seen.add(info.name);
        result.push({ verbatim: ing.trim(), info });
      }
    }
  }
  return result;
}

/**
 * True if text inside parentheses should be preserved (contains INS or sugar/sweetener name).
 */
function shouldPreserveParentheticalContent(content: string): boolean {
  const low = content.toLowerCase().trim();
  if (/\bins\b|\bins\s*\d{3}\b/i.test(content)) return true;
  for (const alias of SUGAR_ALIASES) {
    if (low.includes(alias.toLowerCase())) return true;
  }
  for (const info of SWEETENER_TABLE) {
    for (const a of info.aliases) {
      if (low.includes(a.toLowerCase())) {
        // #region agent log
        if (/steviol|glycoside/i.test(content)) {
          fetch('http://127.0.0.1:7244/ingest/ff6a9878-d05f-4e10-be3f-b600058f7c64', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'ingredientsParser.ts:shouldPreserveParentheticalContent', message: 'parenthetical preserved', data: { content, matchedAlias: a }, timestamp: Date.now(), hypothesisId: 'H4' }) }).catch(() => {});
        }
        // #endregion
        return true;
      }
    }
  }
  // #region agent log
  if (/steviol|glycoside/i.test(content)) {
    fetch('http://127.0.0.1:7244/ingest/ff6a9878-d05f-4e10-be3f-b600058f7c64', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'ingredientsParser.ts:shouldPreserveParentheticalContent', message: 'parenthetical NOT preserved', data: { content, low }, timestamp: Date.now(), hypothesisId: 'H2,H4' }) }).catch(() => {});
  }
  // #endregion
  return false;
}

/**
 * Removes parenthetical content EXCEPT when it contains INS or sugar/sweetener names.
 */
function stripParenthesesExceptInsAndSweeteners(text: string): string {
  return text.replace(/\(([^)]*)\)/g, (match, content) => {
    if (shouldPreserveParentheticalContent(content)) return match;
    return '';
  });
}

/**
 * Extracts ingredients section from full label text when possible.
 * Falls back to full text if no "Ingredients:" header found.
 */
function extractIngredientsSection(ocrText: string): string {
  const match = ocrText.match(/ingredients?\s*:?\s*([\s\S]+)/i);
  return match ? match[1].trim() : ocrText;
}

/**
 * Splits ingredients text by line first — lines containing "free from X" are skipped
 * (they negate sugar presence). Then splits by comma within each kept line.
 * Uses context-aware negation: 60-char window before each chunk checks for negation triggers.
 */
export function parseIngredients(ocrText: string): ClassifiedIngredients {
  const ingredientsSection = extractIngredientsSection(ocrText);
  const lines = ingredientsSection.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const raw: string[] = [];
  let previousLine = '';

  for (const line of lines) {
    if (isSugarAlcoholOrPolyolPhrase(line)) {
      previousLine = line;
      continue;
    }
    if (isNegatedSugarPhrase(line)) {
      previousLine = line;
      continue;
    }

    // Extract INS numbers from "Sweetener (960)" or "Sweeteners (960, 955)" before stripping parentheses
    const insNumbers = extractInsNumbersFromLine(line);
    for (const num of insNumbers) {
      raw.push(num);
    }

    const parts = line
      .split(/[,;]/)
      .map((s) => {
        const after = stripParenthesesExceptInsAndSweeteners(s).trim();
        // #region agent log
        if (/sweetener|steviol/i.test(s)) {
          fetch('http://127.0.0.1:7244/ingest/ff6a9878-d05f-4e10-be3f-b600058f7c64', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'ingredientsParser.ts:parseIngredients', message: 'chunk before/after strip', data: { before: s, after }, timestamp: Date.now(), hypothesisId: 'H2,H3' }) }).catch(() => {});
        }
        // #endregion
        return after;
      })
      .filter((s) => s.length > 1);
    let lineSoFar = '';

    for (const chunk of parts) {
      const contextBefore = (previousLine.slice(-60) + ' ' + lineSoFar).trim();
      const shouldSkip =
        isContinuationFragment(chunk) ||
        (hasSugarTerm(chunk) && isNegatedByContext(contextBefore));
      if (!shouldSkip) raw.push(chunk);
      lineSoFar += (lineSoFar ? ', ' : '') + chunk;
    }
    previousLine = line;
  }

  const sugarAliasesFound = findMatches(raw, SUGAR_ALIASES);
  const sugarMatches = findSugarMatches(raw, SUGAR_ALIASES);
  const fatIdentifiersFound = findMatches(raw, FAT_IDENTIFIERS);

  return {
    sugarAliasesFound,
    sugarMatches,
    fatIdentifiersFound,
    rawIngredients: raw,
  };
}
