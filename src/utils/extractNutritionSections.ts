/**
 * Fuzzy Scoped Search: Extracts only Nutrition and Ingredients blocks from full OCR text.
 * Uses fuzzy anchors to find section starts and strict stop markers so marketing text,
 * disclaimers, and other label copy are never included in parsing.
 */

// #region agent log
function _dbg(p: { location: string; message: string; data?: Record<string, unknown>; hypothesisId?: string }) {
  fetch('http://127.0.0.1:7244/ingest/ff6a9878-d05f-4e10-be3f-b600058f7c64', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: p.location, message: p.message, data: p.data, hypothesisId: p.hypothesisId, timestamp: Date.now() }) }).catch(() => {});
}
// #endregion

/** Fuzzy Ingredients Anchor: start of ingredients block (case-insensitive, optional spaces). */
const INGREDIENTS_ANCHOR = /\b(?:ingredients?|ingridients?|ingrediants?|ingrediens)\s*:?\s*(?:\s|$)/i;

/** Fuzzy Nutrition Anchor: Nutrition Information, Nutritional Information, Nutrition Facts, typos, suffixes (# * (APPROX.)). */
const NUTRITION_ANCHOR = /\b(?:nutrition(?:\s+information|\s*facts|\s*label)?|nutritional(?:\s+information|\s*facts|\.?\s*infromation)?|nutrtional\s*information|nutritonal\s*information)\s*(?:#|\*|\s*\(approx\.?\)|\s*\(approximate\))?\s*$/im;

/** Major headers that end the Ingredients block (do not include this line). */
const INGREDIENTS_STOP_HEADERS = /\b(?:allergen\s+advice|allergy\s+information|storage\s*(?:instructions?)?|how\s+to\s+store|mrp\b|best\s+before|manufactured\s+by|manufactured\s+for|marketed\s+by|batch\s*(?:no\.?|#|number)?|fssai|license|pack\s*size|net\s*weight|address|contact)\b/i;

/** Footer / end of Nutrition table (batch, mrp, manufactured, etc.). */
const NUTRITION_TABLE_END = /\b(?:batch\s*(?:no\.?|#|number)?|mrp\b|mfg\.?\s*date|manufactured|marketed|best\s+before|ingredients?\s*:|\bfssai\b)/i;

/** Minimal junk filter: drop empty lines and pure symbol lines. */
function isJunkLine(line: string): boolean {
  const t = line.trim();
  if (t.length < 1) return true;
  if (/^[\s\.,;:\-\|=\[\]\\\/\*\+\^\%\!\@\#\$\&\~]+$/.test(t)) return true;
  return false;
}

export interface ExtractedBlocks {
  nutritionBlock: string;
  ingredientsBlock: string;
}

/**
 * Returns combined extracted text (nutrition then ingredients) for display or fallback.
 */
export function getCombinedExtractedText(extracted: ExtractedBlocks): string {
  const parts = [extracted.nutritionBlock, extracted.ingredientsBlock].filter((s) => s.trim().length > 0);
  return parts.join('\n\n').trim();
}

/**
 * Fuzzy-scoped extraction:
 * - Finds Ingredients block: from fuzzy Ingredients anchor until next major header (Allergen Advice, Storage, MRP, etc.).
 * - Finds Nutrition block: from fuzzy Nutrition anchor until end of table (Batch, MRP, Manufactured, or next section).
 * Only these two blocks are returned; all other label text (marketing, disclaimers) is discarded.
 */
export function extractNutritionAndIngredientsOnly(fullOcrText: string): ExtractedBlocks {
  const lines = fullOcrText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) {
    return { nutritionBlock: '', ingredientsBlock: '' };
  }

  let ingredientsStartIdx = -1;
  let nutritionStartIdx = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (INGREDIENTS_ANCHOR.test(line) && ingredientsStartIdx < 0) {
      ingredientsStartIdx = i;
    }
    if (NUTRITION_ANCHOR.test(line) || /^(?:amount\s+per|per\s*100\s*g\b|nutritive\s+value)\b/i.test(line)) {
      if (nutritionStartIdx < 0) nutritionStartIdx = i;
    }
  }

  const nutritionLines: string[] = [];
  const ingredientsLines: string[] = [];

  if (nutritionStartIdx >= 0) {
    for (let i = nutritionStartIdx; i < lines.length; i++) {
      const line = lines[i];
      if (isJunkLine(line)) continue;
      if (i > nutritionStartIdx && NUTRITION_TABLE_END.test(line)) break;
      if (i > nutritionStartIdx && INGREDIENTS_ANCHOR.test(line)) break;
      nutritionLines.push(line);
    }
  }

  if (ingredientsStartIdx >= 0) {
    for (let i = ingredientsStartIdx; i < lines.length; i++) {
      const line = lines[i];
      if (isJunkLine(line)) continue;
      if (i > ingredientsStartIdx && INGREDIENTS_STOP_HEADERS.test(line)) break;
      if (i > ingredientsStartIdx && NUTRITION_ANCHOR.test(line)) break;
      ingredientsLines.push(line);
    }
  }

  const nutritionBlock = nutritionLines.join('\n').trim();
  const ingredientsBlock = ingredientsLines.join('\n').trim();

  _dbg({
    location: 'extractNutritionSections.ts:extractNutritionAndIngredientsOnly',
    message: 'Fuzzy scoped extraction done',
    hypothesisId: 'A',
    data: {
      nutritionLineCount: nutritionLines.length,
      ingredientsLineCount: ingredientsLines.length,
      nutritionChars: nutritionBlock.length,
      ingredientsChars: ingredientsBlock.length,
    },
  });

  return { nutritionBlock, ingredientsBlock };
}

/** Exported for OCR zone filtering. Returns header type or null. */
export function getHeaderType(line: string): 'nutrition' | 'ingredients' | null {
  if (NUTRITION_ANCHOR.test(line) || /^(?:amount\s+per|per\s*100\s*g\b|nutritive\s+value)\b/i.test(line)) return 'nutrition';
  if (INGREDIENTS_ANCHOR.test(line)) return 'ingredients';
  return null;
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

const JUNK_ROW_PATTERNS = /\b(batch\s*no|batch\s*#|batch\s*number|mrp\b|mfg|manufactured\s*by|ingredients?\s*:|\bingredients\s*$)/i;

function matchNutrientLabel(textBefore: string): string | null {
  const t = textBefore.trim().replace(/[:–\-]\s*$/, '');
  if (JUNK_ROW_PATTERNS.test(t)) return null;
  for (const { pattern, label } of NUTRIENT_KEYWORDS) {
    if (pattern.test(t)) return label;
  }
  return null;
}

/** Extract rows from full text (fallback). */
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
    if (!unit && !isCaloriesOrEnergy) {
      pos = absIdx + numMatch[0].length;
      continue;
    }
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

export interface StructuredSummary {
  ingredients: string[];
  nutritionRows: { label: string; value: string }[];
}

export function parseStructuredSummary(extractedText: string): StructuredSummary {
  let cleanText = extractedText
    .toLowerCase()
    .replace(/[^a-z0-9.,%]/g, ' ')
    .replace(/([a-z])(\d)/g, '$1 $2')
    .replace(/(\d)([a-z])/g, '$1 $2')
    .replace(/\s+/g, ' ');

  const nutritionRows: { label: string; value: string }[] = [];
  const boundaries =
    'energy|calories|kcal|protein|carbohydrate|carbs|sugar|fat|sodium|salt|cholesterol';

  const patterns = [
    { label: 'Energy', match: 'energy|calories|kcal' },
    { label: 'Protein', match: 'protein|proteen' },
    { label: 'Total Carbohydrates', match: 'carbohydrate|carbohydrates|carbs' },
    { label: 'Added Sugars', match: 'added sugar|added sugars' },
    { label: 'Total Sugars', match: 'total sugar|total sugars|sugars|sugar' },
    { label: 'Trans Fat', match: 'trans fat|trans fats' },
    { label: 'Saturated Fat', match: 'saturated fat|saturated fats' },
    { label: 'Total Fat', match: 'total fat|fat|fats' },
    { label: 'Sodium', match: 'sodium|salt' },
  ];

  patterns.forEach(({ label, match }) => {
    if (nutritionRows.some((row) => row.label === label)) return;
    const regex = new RegExp(
      `(?:${match})(?:(?!(?:${boundaries})).){0,35}?(\\d+[.,]?\\d*)(?!\\s*(?:%|percent))`,
      'g'
    );
    let matchResult: RegExpExecArray | null;
    while ((matchResult = regex.exec(cleanText)) !== null) {
      const val = parseFloat(matchResult[1].replace(',', '.'));
      if (val !== 100 && val < 10000) {
        nutritionRows.push({ label, value: matchResult[1].replace(',', '.') });
        cleanText = cleanText.replace(matchResult[0], ' consumed ');
        break;
      }
    }
  });

  let ingredients: string[] = [];
  const ingredientsMatch = extractedText
    .toLowerCase()
    .match(/ingredients?[\s:;]+(.*?)(?:nutrition|batch|mfg|mrp|best before|$)/);
  if (ingredientsMatch && ingredientsMatch[1]) {
    ingredients = ingredientsMatch[1]
      .split(/[,;.]/)
      .map((i) => i.trim())
      .filter((i) => i.length > 2);
  }

  return { ingredients, nutritionRows };
}

/** Fallback: anchor-based extraction over full text. */
function extractFromConcatenatedOcr(text: string): StructuredSummary {
  const ingredients: string[] = [];
  const nutritionRows = extractRowsFromText(text);
  const ingMatch = text.match(/ingredients?\s*:?\s*([^B]*?)(?:Batch|Mfg\.?\s*date|Best\s+before|MRP|Manufactured|Marketed|$)/is);
  if (ingMatch) {
    const list = ingMatch[1]
      .replace(/\s+/g, ' ')
      .split(/[,;]/)
      .map((s) => s.replace(/\([^)]*\)/g, '').replace(/^["']|["']$/g, '').trim())
      .filter((s) => s.length >= 2 && s.length < 80);
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
