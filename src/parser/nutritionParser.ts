/**
 * Extracts nutrition values from OCR text of a nutrition facts table.
 * Handles common formats: per 100g, per serving, per pack.
 */

export interface ParsedNutrients {
  sugarPer100g?: number;
  polyolsPer100g?: number;
  fatPer100g?: number;
  proteinPer100g?: number;
  servingSizeG?: number;
  caloriesPer100g?: number;
  carbsPer100g?: number;
  sodiumPer100g?: number;
  cholesterolPer100g?: number;
  phosphorusPer100g?: number;
  vitaminCPer100g?: number;
  perUnit: '100g' | 'serving' | 'pack';
}

const NUTRIENT_PATTERNS: { key: keyof ParsedNutrients; patterns: RegExp[] }[] = [
  {
    key: 'sugarPer100g',
    patterns: [
      /\-?\s*total\s*sugars?\s*\(g\)\s*(\d+[.,]?\d*)/gi,
      /total\s*sugar\s*:?\s*(\d+[.,]?\d*)\s*g/gi,
      /(?:total\s*)?sugar[s]?\s*(?:per\s*100\s*g)?\s*:?\s*(\d+[.,]?\d*)\s*g/gi,
      /sugar[s]?\s+(\d+[.,]?\d*)\s*g/gi,
      /5ugar[s]?\s+(\d+[.,]?\d*)\s*g/gi,
      /sugr[s]?\s+(\d+[.,]?\d*)\s*g/gi,
      /suger[s]?\s+(\d+[.,]?\d*)\s*g/gi,
      /(\d+[.,]?\d*)\s*g\s*(?:of\s*)?sugar/gi,
      /sugars?\s+(\d+[.,]?\d*)/gi,
      /sugar[s]?\s*[:\-]\s*(\d+[.,]?\d*)/gi,
      /(?:added\s+)?sugars?\s*\(?\s*g\s*\)?\s*(\d+[.,]?\d*)/gi,
    ],
  },
  {
    key: 'polyolsPer100g',
    patterns: [
      /sugar\s*alcohol\s*\(?\s*polyols?\)?\s*(\d+[.,]?\d*)\s*g/gi,
      /polyols?\s*\(?\s*g\s*\)?\s*(\d+[.,]?\d*)/gi,
      /sugar\s*alcohol\s+(\d+[.,]?\d*)\s*g/gi,
      /polyols?\s+(\d+[.,]?\d*)\s*g/gi,
    ],
  },
  {
    key: 'fatPer100g',
    patterns: [
      /(?:total\s*)?fat[s]?\s*(?:per\s*100\s*g)?\s*:?\s*(\d+[.,]?\d*)\s*g/gi,
      /(?:total\s*)?fat[s]?\s+(\d+[.,]?\d*)\s*g/gi,
      /\bfat\s+(\d+[.,]?\d*)/gi,
      /(\d+[.,]?\d*)\s*g\s*(?:of\s*)?fat/gi,
      /fat[s]?\s*[:\-]\s*(\d+[.,]?\d*)/gi,
    ],
  },
  {
    key: 'proteinPer100g',
    patterns: [
      /protein\s*(?:per\s*100\s*g)?\s*:?\s*(\d+[.,]?\d*)\s*g/gi,
      /protein\s+(\d+[.,]?\d*)\s*g/gi,
      /protien\s+(\d+[.,]?\d*)/gi,
      /(\d+[.,]?\d*)\s*g\s*(?:of\s*)?protein/gi,
      /protein\s*[:\-]\s*(\d+[.,]?\d*)/gi,
    ],
  },
  {
    key: 'servingSizeG',
    patterns: [
      /per\s*serving\s*\((\d+)\s*g\)/gi,
      /serving\s*\((\d+)\s*g\)/gi,
      /serving\s*size\s*:?\s*(\d+\.?\d*)\s*g/gi,
      /(\d+\.?\d*)\s*g\s*per\s*serving/gi,
      /per\s*serving\s*\(?(\d+\.?\d*)\s*g/gi,
    ],
  },
  {
    key: 'carbsPer100g',
    patterns: [
      /(?:net\s+)?carb(?:ohydrate)?s?\s+(\d+[.,]?\d*)/gi,
      /(?:total\s*)?carb(?:ohydrate)?s?\s*(?:per\s*100\s*g)?\s*:?\s*(\d+[.,]?\d*)\s*g/gi,
      /carb(?:ohydrate)?s?\s+(\d+[.,]?\d*)/gi,
    ],
  },
  {
    key: 'caloriesPer100g',
    patterns: [
      /energy\s+(\d+[.,]?\d*)\s*kcal/gi,
      /(?:energy|calorie)s?\s*(?:per\s*100\s*g)?\s*:?\s*(\d+[.,]?\d*)\s*kcal/gi,
      /calories?\s+(\d+[.,]?\d*)/gi,
      /(\d+[.,]?\d*)\s*kcal\s*(?:per\s*100|per\s*serving)/gi,
      /energy\s+(\d+[.,]?\d*)/gi,
    ],
  },
  {
    key: 'cholesterolPer100g',
    patterns: [
      /cholesterol\s*(?:per\s*100\s*g)?\s*:?\s*(\d+\.?\d*)\s*(?:mg|g)/gi,
      /cholesterol\s+(\d+\.?\d*)/gi,
    ],
  },
  {
    key: 'sodiumPer100g',
    patterns: [
      /sodium\s*(?:per\s*100\s*g)?\s*:?\s*(\d+\.?\d*)\s*mg/gi,
      /sodium\s+(\d+\.?\d*)\s*mg/gi,
      /sodium\s+(\d+\.?\d*)/gi,
    ],
  },
  {
    key: 'phosphorusPer100g',
    patterns: [
      /phosphorus\s*(?:per\s*100\s*g)?\s*:?\s*(\d+\.?\d*)\s*mg/gi,
      /phosphorus\s+(\d+\.?\d*)\s*mg/gi,
    ],
  },
  {
    key: 'vitaminCPer100g',
    patterns: [
      /vitamin\s+c\s*(?:per\s*100\s*g)?\s*:?\s*(\d+\.?\d*)\s*mg/gi,
      /vitamin\s+c\s+(\d+\.?\d*)\s*mg/gi,
    ],
  },
];

function normalizeDecimal(s: string): string {
  return s.replace(',', '.');
}

/** Fix common OCR number mistakes: O.5 -> 0.5, 2l -> 21, O -> 0 in decimals. */
function normalizeOcrNumber(s: string): string {
  let t = s.replace(/,/g, '.');
  t = t.replace(/O(?=\.\d|$)/gi, '0');
  t = t.replace(/(\d)l(?=\d|$)/gi, '$11');
  t = t.replace(/l(?=\d)/gi, '1');
  return t;
}

function extractNumber(text: string, patterns: RegExp[]): number | undefined {
  const combined = text.replace(/\s+/g, ' ');
  for (const pattern of patterns) {
    const match = combined.match(pattern);
    if (match) {
      const group = match[1] ?? match[2];
      if (group != null) {
        const normalized = normalizeOcrNumber(group.trim());
        const num = parseFloat(normalized);
        if (!isNaN(num)) return num;
      }
    }
  }
  return undefined;
}

export function parseNutritionTable(ocrText: string): ParsedNutrients {
  const result: ParsedNutrients = {
    perUnit: '100g',
  };

  const normalized = ocrText.toLowerCase().replace(/\n/g, ' ').replace(/\s+/g, ' ');

  for (const { key, patterns } of NUTRIENT_PATTERNS) {
    const value = extractNumber(ocrText, patterns);
    if (value !== undefined) {
      (result as Record<string, number | string>)[key] = value;
    }
  }

  if (
    normalized.includes('amount per 100') ||
    normalized.includes('per 100g') ||
    normalized.includes('per 100 gm')
  ) {
    result.perUnit = '100g';
  } else if (normalized.includes('per serving') || normalized.includes('serving size')) {
    result.perUnit = 'serving';
  } else if (normalized.includes('per pack') || normalized.includes('per packet')) {
    result.perUnit = 'pack';
  }

  return result;
}
