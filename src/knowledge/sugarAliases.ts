/**
 * Sugar-related ingredient terms (PRD: Sugar Alias Dictionary).
 * Used to detect hidden sugars in "No Added Sugar" claims.
 * Organized by metabolic logic: high-GI additives, regional terms, stealth sugars.
 * Longer / more specific terms listed first to improve match quality.
 *
 * Aliases are matched with word boundaries; add both singular and plural (or other
 * common label variants) when labels use either form to avoid missed detections.
 */
export const SUGAR_ALIASES: string[] = [
  // --- High GI Additives (Metabolic Sugars) ---
  'maltodextrin',
  'dextrin',
  'modified starch',
  'corn solids',
  'glucose solids',

  // --- Regional & Indian Terms ---
  'jaggery',
  'gur',
  'gud',
  'misri',
  'mishri',
  'khandsari',
  'khand',
  'rab',
  'bura',
  'shakar',

  // --- Syrups & Nectars ---
  'high fructose corn syrup',
  'hfcs',
  'agave nectar',
  'agave syrup',
  'fructose syrup',
  'glucose syrup',
  'tapioca syrup',
  'rice syrup',
  'brown rice syrup',
  'malt syrup',
  'inverted sugar',
  'invert syrup',
  'golden syrup',

  // --- Fruit Based (Stealth Sugars) ---
  'fruit juice concentrate',
  'fruit juice concentrates',
  'apple juice concentrate',
  'apple juice concentrates',
  'grape juice concentrate',
  'grape juice concentrates',
  'date paste',
  'date syrup',
  'dates',
  'khajoor',
  'raisin paste',
  'fruit powder',
  'mango powder',

  // --- Core Sugars & Chemical Names ---
  'sugar',
  'sucrose',
  'glucose',
  'fructose',
  'dextrose',
  'maltose',
  'lactose',
  'galactose',
  'crystalline fructose',
  'liquid fructose',
  'cane sugar',
  'beet sugar',
  'coconut sugar',
  'palm sugar',
  'date sugar',
  'raw sugar',
  'brown sugar',
  'demerara',
  'turbinado',
  'muscovado',
  'panela',
  'succanat',
  'honey',
  'molasses',
  'blackstrap molasses',
  'table sugar',
  'refined sugar',

  // --- Common OCR Typos & Leetspeak ---
  'suger',
  'sugr',
  'sugat',
  '5ugar',
  '5ugr',
  'glucoze',
  'maitodextrin',
  'maltodextrn',
  'jaggry',
  'jgery',
  'honeyy',
  'molases',
  'syrupp',

  // --- Restored: Syrups & Nectars ---
  'maple syrup',
  'sorghum syrup',
  'yacon syrup',
  'pancake syrup',
  'treacle',

  // --- Restored: Core / Refined ---
  'icing sugar',
  'confectioners sugar',
  'castor sugar',
  'fondant',
  'caramel',
  'evaporated cane juice',
  'fruit juice crystals',

  // --- Restored: Malts (critical for diabetics) ---
  'barley malt',
  'malt extract',
  'ethyl maltol',

  // --- Essential catch-alls (safety nets) ---
  'nectar',
];
