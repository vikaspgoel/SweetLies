/**
 * Extracts only Nutrition Label and Ingredients sections from full OCR text.
 * Filters out marketing copy, random junk, and non-relevant content.
 */

// #region agent log
function _dbg(p: { location: string; message: string; data?: Record<string, unknown>; hypothesisId?: string }) {
  fetch('http://127.0.0.1:7244/ingest/ff6a9878-d05f-4e10-be3f-b600058f7c64', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: p.location, message: p.message, data: p.data, hypothesisId: p.hypothesisId, timestamp: Date.now() }) }).catch(() => {});
}
// #endregion

/** Nutrition section header proxies - match any of these to identify Nutrition zone. */
const NUTRITION_HEADERS = [
  /nutrition\s*facts/i,
  /nutritional\s*information/i,
  /nutrition\s*infromation/i,   // OCR typo
  /nutrtional\s*information/i,  // OCR typo
  /nutritonal\s*information/i,  // OCR typo
  /nutrition\s*label/i,
  /amount\s*per\s*\d+\s*(g|gm)/i,
  /^amount\s*per/i,
  /per\s*100\s*g\b/i,
  /nutritive\s*value/i,
];

/** Ingredients section header proxies - match any of these to identify Ingredients zone. */
const INGREDIENTS_HEADERS = [
  /^ingredients?\s*:?\s*$/im,
  /^ingredients\s*$/im,
  /^ingredients?\s*:?\s+/i,
  /^ingridients?\s*:?\s*/i,     // OCR typo
  /^ingrediants?\s*:?\s*/i,     // OCR typo
  /^ingrediens\s*:?\s*/i,       // OCR typo
  /\bingredients\s*:?\s*/i,
  /\bingridients\s*:?\s*/i,
];

/** Minimal junk filter: only drop empty lines and pure symbols. Never delete possible nutrition/ingredient text. */
function isJunkLine(line: string): boolean {
  const t = line.trim();
  if (t.length < 1) return true;
  if (/^[\s\.,;:\-\|=\[\]\\\/\*\+\^\%\!\@\#\$\&\~]+$/.test(t)) return true;
  return false;
}

/** Bypass: never filter out lines — prevents deleting Vitamin C, Phosphorus, etc. */
function isGarbageLine(_line: string): boolean {
  return false;
}

const FOOD_WORDS = /oil|milk|sugar|water|salt|wheat|flour|cream|butter|vanilla|starch|soy|egg|corn|rice|fruit|vegetable|spice|emulsifier|preservative|acid|lecithin|dextrose|syrup|honey|molasses|curd|yogurt|whey|coconut|palm|vegetable|stabilizer|flavor|colour|color/i;

/** True if line looks like ingredients by pattern (comma-separated, food words) even without "Ingredients:" header. */
function isLikelyIngredientLine(line: string): boolean {
  const t = line.trim();
  if (t.length < 8) return false;
  const hasCommas = (t.match(/,/g) ?? []).length >= 2;
  const hasFoodWord = FOOD_WORDS.test(t);
  return hasCommas && hasFoodWord;
}

/** True if line looks like it could be from nutrition table or ingredients. */
/** True if line matches any Nutrition section header. */
function isNutritionHeader(line: string): boolean {
  return NUTRITION_HEADERS.some((h) => h.test(line)) || /^amount\s*per/i.test(line) || /^per\s*100\s*g\b/i.test(line);
}

/** True if line matches any Ingredients section header (including "Ingredients: foo, bar"). */
function isIngredientsHeader(line: string): boolean {
  if (/^(total|added)\s+sugar/i.test(line)) return false;
  return INGREDIENTS_HEADERS.some((h) => h.test(line)) || /^ingredients?\s*:?\s+/i.test(line);
}

/** Exported for OCR zone filtering. Returns header type or null. */
export function getHeaderType(line: string): 'nutrition' | 'ingredients' | null {
  if (isNutritionHeader(line)) return 'nutrition';
  if (isIngredientsHeader(line)) return 'ingredients';
  return null;
}

function isRelevantLine(line: string): boolean {
  const t = line.trim();
  if (isJunkLine(t)) return false;
  if (isGarbageLine(t)) return false;
  if (NUTRITION_HEADERS.some((h) => h.test(t))) return true;
  if (INGREDIENTS_HEADERS.some((h) => h.test(t))) return true;
  if (/ingredients?\s*:?\s+/i.test(t)) return true;
  if (isLikelyIngredientLine(t)) return true;
  if (/^(amount|per\s*100|per\s*serving|energy|calories?|protein|carb|sugar|fat|sodium|cholesterol|fibre|fiber)/i.test(t)) return true;
  if (/[\d.,]+\s*(g|gm|mg|kcal)/i.test(t)) return true;
  if (/^\d+[.,]?\d*\s*%/.test(t)) return true;
  if (/^[a-z][a-z\s,]+$/i.test(t) && t.length > 5) return true;
  return false;
}

/** Bypass: never filter out lines — prevents deleting Vitamin C, Phosphorus, etc. */
function isJunkOrNonSectionLine(_line: string): boolean {
  return false;
}

/**
 * Extracts Nutrition Label and Ingredients sections from full OCR text.
 * When headers exist: drops lines before first header and between sections.
 * Returns filtered text with only relevant content.
 */
export function extractNutritionAndIngredientsOnly(fullOcrText: string): string {
  const lines = fullOcrText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return fullOcrText;

  const firstHeaderIdx = lines.findIndex((l) => isNutritionHeader(l) || isIngredientsHeader(l));
  const hasHeaders = firstHeaderIdx >= 0;

  let inNutrition = false;
  let inIngredients = false;
  let seenNutrition = false;
  let seenIngredients = false;
  const result: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (hasHeaders && i < firstHeaderIdx) continue;

    if (isNutritionHeader(line)) {
      inNutrition = true;
      inIngredients = false;
      seenNutrition = true;
      if (!isJunkLine(line)) result.push(line);
      continue;
    }

    if (isIngredientsHeader(line)) {
      inIngredients = true;
      inNutrition = false;
      seenIngredients = true;
      result.push(line);
      continue;
    }

    if (inNutrition) {
      if (isGarbageLine(line) || isJunkOrNonSectionLine(line)) continue;
      if (isRelevantLine(line) || /[\d.,]+\s*(g|gm|mg|kcal|%)/i.test(line)) {
        result.push(line);
      } else if (seenIngredients && /^(manufactured|mrp|best before|batch|fssai|license)/i.test(line)) {
        break;
      }
      continue;
    }

    if (inIngredients) {
      if (isGarbageLine(line) || isJunkOrNonSectionLine(line)) continue;
      if (line.length > 2 && !isJunkLine(line)) {
        result.push(line);
      } else if (seenNutrition && (NUTRITION_HEADERS.some((h) => h.test(line)) || /^nutrition/i.test(line))) {
        break;
      }
      continue;
    }

    if (!seenNutrition && !seenIngredients) {
      if (isGarbageLine(line) || isJunkOrNonSectionLine(line)) continue;
      if (isRelevantLine(line)) {
        result.push(line);
        if (isLikelyIngredientLine(line)) {
          inIngredients = true;
          seenIngredients = true;
        } else {
        inNutrition = true;
        }
      }
    }
  }

  const joined = result.join('\n').trim();
  const out = joined.length > 0 ? joined : fullOcrText;
  // #region agent log
  _dbg({ location: 'extractNutritionSections.ts:extractNutritionAndIngredientsOnly', message: 'Extraction done', hypothesisId: 'A', data: { lineCount: out.split(/\r?\n/).filter(Boolean).length, totalChars: out.length, sample: out.slice(0, 400) } });
  // #endregion
  return out;
}

/** Keyword catch-all: text before number must match one of these (order: longer first). */
const NUTRIENT_KEYWORDS: { pattern: RegExp; label: string }[] = [
  { pattern: /\btotal\s*carbohydrates?\b/i, label: 'Total Carbohydrates' },
  { pattern: /\btotal\s*sugars?\b/i, label: 'Total Sugars' },
  { pattern: /\badded\s*sugars?\b/i, label: 'Added Sugars' },
  { pattern: /\bdietary\s*fib[er]e\b/i, label: 'Dietary Fiber' },
  { pattern: /\btotal\s*fat\b/i, label: 'Total Fat' },
  { pattern: /\bsaturated\s*fat\b/i, label: 'Saturated Fat' },
  { pattern: /\btrans\s*fat\b/i, label: 'Trans Fat' },
  { pattern: /\bnet\s*carbohydrates?\b/i, label: 'Net Carbohydrates' },
  { pattern: /\bnet\s*carbs?\b/i, label: 'Net Carbohydrates' },
  { pattern: /\bvitamin\s*c\b/i, label: 'Vitamin C' },
  { pattern: /\benergy\b/i, label: 'Energy' },
  { pattern: /\bcalories?\b/i, label: 'Calories' },
  { pattern: /\bprotein\b/i, label: 'Protein' },
  { pattern: /\bcholesterol\b/i, label: 'Cholesterol' },
  { pattern: /\bsodium\b|sod?[iu]m\b|dium\b/i, label: 'Sodium' },
  { pattern: /\bphosphorus\b|phos\s*phorus\b/i, label: 'Phosphorus' },
  { pattern: /\bcarbohydrates?\b/i, label: 'Total Carbohydrates' },
  { pattern: /\bfat\b/i, label: 'Total Fat' },
  { pattern: /\bsugars?\b/i, label: 'Total Sugars' },
  { pattern: /\bfib[er]e\b/i, label: 'Dietary Fiber' },
  { pattern: /\bcarbs?\b/i, label: 'Total Carbohydrates' },
];

/** Non-nutrition text — rows containing these are filtered out (Batch No, MRP, Ingredients). */
const JUNK_ROW_PATTERNS = /\b(batch\s*no|batch\s*#|batch\s*number|mrp\b|mfg|manufactured\s*by|ingredients?\s*:|\bingredients\s*$)/i;


/** Match text-before-number to a known nutrient; return clean label or null. */
function matchNutrientLabel(textBefore: string): string | null {
  const t = textBefore.trim().replace(/[:–\-]\s*$/, '');
  if (JUNK_ROW_PATTERNS.test(t)) return null;
  for (const { pattern, label } of NUTRIENT_KEYWORDS) {
    if (pattern.test(t)) return label;
  }
  return null;
}

/** High-precision: for each line, find each number+unit; text BEFORE that number (since last number) = nutrient. Prioritize primary value; preserve exact unit. */
function parseAllNutritionRows(line: string): { label: string; value: string }[] {
  const t = line.trim();
  if (t.length < 2) return [];

  const results: { label: string; value: string }[] = [];
  const seenLabels = new Set<string>();
  let lastNumEnd = 0;

  while (lastNumEnd < t.length) {
    const rest = t.slice(lastNumEnd);
    const numMatch = rest.match(/(\d+[.,]?\d*)\s*(kcal|gm|mg|g|%)\b/i) ?? rest.match(/(\d+[.,]?\d*)\s*%/) ?? rest.match(/(\d+[.,]?\d*)\b/);
    if (!numMatch) break;

    const numStart = lastNumEnd + (numMatch.index ?? 0);
    const textBeforeThisNum = t.slice(lastNumEnd, numStart).trim();
    const isCaloriesOrEnergy = /\b(calories?|energy)\b/i.test(textBeforeThisNum);
    let unit = (numMatch[2] ?? '').trim();
    if (!unit && isCaloriesOrEnergy) unit = 'kcal';
    if (!unit && !isCaloriesOrEnergy) { lastNumEnd = numStart + numMatch[0].length; continue; }
    const numStr = numMatch[1].replace(/,/g, '.');
    const value = unit ? `${numStr} ${unit}` : numStr;
    const label = matchNutrientLabel(textBeforeThisNum);

    if (label && !seenLabels.has(label.toLowerCase())) {
      seenLabels.add(label.toLowerCase());
      results.push({ label, value });
    }
    lastNumEnd = numStart + numMatch[0].length;
  }
  return results;
}

/** Extract rows from full text (fallback). Same logic: first number+unit per nutrient, exact unit. */
function extractRowsFromText(text: string): { label: string; value: string }[] {
  const results: { label: string; value: string }[] = [];
  const seenLabels = new Set<string>();
  const flat = text.replace(/\r?\n/g, ' ');
  let pos = 0;

  while (pos < flat.length) {
    const rest = flat.slice(pos);
    const numMatch = rest.match(/(\d+[.,]?\d*)\s*(kcal|gm|mg|g|%)\b/i) ?? rest.match(/(\d+[.,]?\d*)\s*%/) ?? rest.match(/(\d+[.,]?\d*)\b/);
    if (!numMatch) break;

    const absIdx = pos + (numMatch.index ?? 0);
    if (/source\s+of\s+sugar|significant\s+source/i.test(flat.slice(Math.max(0, absIdx - 25), absIdx))) {
      pos = absIdx + numMatch[0].length;
      continue;
    }

    const numStr = numMatch[1].replace(/,/g, '.');
    const textBeforeThisNum = flat.slice(pos, absIdx).replace(/\s+/g, ' ').trim();
    const isCaloriesOrEnergy = /\b(calories?|energy)\b/i.test(textBeforeThisNum);
    let unit = (numMatch[2] ?? '').trim();
    if (!unit && isCaloriesOrEnergy) unit = 'kcal';
    if (!unit && !isCaloriesOrEnergy) { pos = absIdx + numMatch[0].length; continue; }
    const value = unit ? `${numStr} ${unit}` : numStr;
    const label = matchNutrientLabel(textBeforeThisNum);

    if (label && !seenLabels.has(label.toLowerCase())) {
      const num = parseFloat(numStr);
      if (!isNaN(num) && num < 10000) {
        seenLabels.add(label.toLowerCase());
        results.push({ label, value });
      }
    }
    pos = absIdx + numMatch[0].length;
  }
  return results;
}

function isLikelyIngredientOnly(line: string): boolean {
  const t = line.trim();
  if (t.length < 3 || t.length > 200) return false;
  if (isJunkOrNonSectionLine(t)) return false;
  if (/[\d.,]+\s*(g|mg|kcal)\b/.test(t) && !/,/.test(t)) return false; // looks like nutrition row
  const letterRatio = (t.match(/[a-zA-Z]/g) ?? []).length / Math.max(t.length, 1);
  if (letterRatio < 0.5) return false;
  return true;
}

export interface StructuredSummary {
  ingredients: string[];
  nutritionRows: { label: string; value: string }[];
}

/** Nutrient name without number — for merging fragmented OCR (Calories + 20, Dium + 150 mg). */
const NUTRIENT_NAME_ONLY = /^(calories?|energy|fat|protein|carb|sugar|sodium|dium|sodum|cholesterol|fibre|fiber|added\s+sugar|total\s+sugar|net\s+carb|dietary\s+fibre|dietary\s+fiber|trans\s+fat|saturated|phosphorus|vitamin\s+c|porserving)\s*$/i;

/** Line ends with nutrient name (e.g. "Vitamin C" at end, orphan label). */
const NUTRIENT_NAME_END = /(calories?|energy|fat|protein|carb|sugar|sodium|dium|sodum|cholesterol|fibre|fiber|added\s+sugar|total\s+sugar|net\s+carb|dietary\s+fibre|dietary\s+fiber|trans\s+fat|saturated|phosphorus|vitamin\s+c|porserving)\s*$/i;

/** Number + optional unit — "20", "0.0g", "50.75mg", "1.2%" */
const VALUE_LINE = /^[\d.,]+\s*(g|gm|mg|kcal|%)?$/i;

/**
 * Parses extracted text into structured Ingredients and Nutrition table.
 * Merges fragmented OCR lines (e.g. "Calories" + "20").
 */
export function parseStructuredSummary(extractedText: string): StructuredSummary {
  let lines = extractedText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const merged: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const next = lines[i + 1];
    const shouldMerge =
      (NUTRIENT_NAME_ONLY.test(line) && next && VALUE_LINE.test(next)) ||
      (NUTRIENT_NAME_END.test(line) && next && VALUE_LINE.test(next));
    if (shouldMerge) {
      merged.push(line + ' ' + next);
      i++;
    } else {
      merged.push(line);
    }
  }
  lines = merged;
  // #region agent log
  _dbg({ location: 'extractNutritionSections.ts:parseStructuredSummary', message: 'After merge', hypothesisId: 'D', data: { lineCount: lines.length, sampleLines: lines.slice(0, 15).map((l) => l.slice(0, 70)) } });
  // #endregion

  const ingredients: string[] = [];
  const nutritionRows: { label: string; value: string }[] = [];
  const seenNutritionKeys = new Set<string>();

  let inIngredients = false;
  let inNutrition = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (/^ingredients?\s*:?\s*/i.test(line) && !/^(total|added)\s+sugar/i.test(line)) {
      inIngredients = true;
      inNutrition = false;
      const afterColon = line.replace(/^ingredients?\s*:?\s*/i, '').trim();
      if (afterColon.length > 2 && isLikelyIngredientOnly(afterColon)) {
        ingredients.push(afterColon);
      }
      continue;
    }

    if (/nutrition\s*(al)?\s*(infromation|information|label|facts)/i.test(line) || /^amount\s*per/i.test(line) || /^per\s*serving\s*\(/i.test(line) || /^porserving/i.test(line)) {
      inNutrition = true;
      inIngredients = false;
      continue;
    }

    if (inIngredients) {
      if (/nutrition\s*(al)?\s*(infromation|information|label)/i.test(line)) {
        inNutrition = true;
        inIngredients = false;
      } else if (isLikelyIngredientOnly(line) && !isGarbageLine(line)) {
        ingredients.push(line);
      }
      continue;
    }

    // Try to parse as nutrition row(s) from any line (handles concatenated OCR: "Energy 490kcal Protein 7.8g Carbohydrate 65g...")
    const rows = parseAllNutritionRows(line);
    for (const row of rows) {
      const key = row.label.toLowerCase().replace(/\s+/g, ' ');
      if (!seenNutritionKeys.has(key)) {
        seenNutritionKeys.add(key);
        nutritionRows.push(row);
      }
    }
    if (rows.length === 0 && !inNutrition && !inIngredients && isLikelyIngredientOnly(line) && !isGarbageLine(line)) {
      ingredients.push(line);
    }
  }

  // Fallback: always run full-text capture to supplement line-by-line parsing
  const shouldRunFallback = extractedText.length > 30;
  if (shouldRunFallback) {
    const fallback = extractFromConcatenatedOcr(extractedText);
    // #region agent log
    _dbg({ location: 'extractNutritionSections.ts:parseStructuredSummary', message: 'Fallback used', hypothesisId: 'D', data: { fallbackRows: fallback.nutritionRows.length, fallbackLabels: fallback.nutritionRows.map((r) => r.label), hadExisting: nutritionRows.length } });
    // #endregion
    if (nutritionRows.length === 0 && (fallback.ingredients.length > 0 || fallback.nutritionRows.length > 0)) {
      return fallback;
    }
    // Supplement sparse results: merge in any extra rows from fallback
    for (const row of fallback.nutritionRows) {
      const key = row.label.toLowerCase().replace(/\s+/g, ' ');
      if (!seenNutritionKeys.has(key)) {
        seenNutritionKeys.add(key);
        nutritionRows.push(row);
      }
    }
  }
  // #region agent log
  _dbg({ location: 'extractNutritionSections.ts:parseStructuredSummary', message: 'Final result', data: { nutritionRowsCount: nutritionRows.length, labels: nutritionRows.map((r) => r.label) } });
  // #endregion
  return { ingredients, nutritionRows };
}

/** Fallback: anchor-based extraction over full text. */
function extractFromConcatenatedOcr(text: string): StructuredSummary {
  const ingredients: string[] = [];
  const nutritionRows = extractRowsFromText(text);

  const ingMatch = text.match(/ingredients?\s*:?\s*([^B]*?)(?:Batch|Mfg\.?\s*date|Best\s+before|MRP|Manufactured|Marketed|$)/is);
  if (ingMatch) {
    const list = ingMatch[1].replace(/\s+/g, ' ').split(/[,;]/).map((s) => s.replace(/\([^)]*\)/g, '').replace(/^["']|["']$/g, '').trim()).filter((s) => s.length >= 2 && s.length < 80);
    for (const s of list) {
      if (/^\d+[.,]?\d*$/.test(s)) continue;
      if (/^["\$%0-9\s]+$/.test(s)) continue;
      if (!/[a-zA-Z]{2,}/.test(s)) continue;
      if (/^(Batch|Mfg|Value|%RDA)/i.test(s)) continue;
      ingredients.push(s);
    }
  }
  return { ingredients, nutritionRows };
}
