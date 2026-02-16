/**
 * Sugar ingredient knowledge base: description, GI, blood sugar impact.
 * Source: University of Sydney GI database, glycemicindex.com
 */

export interface SugarIngredientInfo {
  aliases: string[];
  name: string;
  description: string;
  gi: number | null;
  bloodSugarImpact: string;
}

const DEFAULT_INFO: SugarIngredientInfo = {
  aliases: [],
  name: 'Added sweetener',
  description: 'Added sweetener; type may vary.',
  gi: null,
  bloodSugarImpact: 'GI varies; may raise blood sugar.',
};

export const SUGAR_INGREDIENT_INFO: SugarIngredientInfo[] = [
  {
    aliases: ['sucrose', 'sugar', 'suger', 'sugr', 'sugat', '5ugar', 'table sugar', 'refined sugar', 'beet sugar', 'cane sugar', 'brown sugar', 'raw sugar', 'icing sugar', 'confectioner\'s sugar', 'frosting sugar', 'icing mix', 'sugar crystals', 'cane crystals', 'sugar solids', 'simple syrup', 'liquid sugar', 'evaporated cane juice', 'dehydrated cane juice', 'organic cane juice', 'cane juice crystals', 'panela', 'rapadura', 'muscovado', 'turbinado sugar', 'demerara sugar', 'kokuto sugar'],
    name: 'Sucrose / Table sugar',
    description: 'Table sugar; disaccharide of glucose and fructose.',
    gi: 65,
    bloodSugarImpact: 'Moderate spike; raises blood glucose.',
  },
  {
    aliases: ['maltodextrin', 'dextrin'],
    name: 'Maltodextrin',
    description: 'Starch derivative; rapidly digested.',
    gi: 105,
    bloodSugarImpact: 'Very high; fast glucose spike.',
  },
  {
    aliases: ['glucose', 'dextrose', 'glucose solids', 'glucose syrup', 'crystalline fructose'],
    name: 'Glucose / Dextrose',
    description: 'Pure glucose; reference standard for GI.',
    gi: 100,
    bloodSugarImpact: 'Very high; immediate spike.',
  },
  {
    aliases: ['fructose', 'fructose syrup', 'fructose solids'],
    name: 'Fructose',
    description: 'Fruit sugar; lower GI than glucose.',
    gi: 15,
    bloodSugarImpact: 'Lower impact; slower absorption.',
  },
  {
    aliases: ['high fructose corn syrup', 'hfcs', 'isoglucose'],
    name: 'High fructose corn syrup',
    description: 'Industrial sweetener from corn starch.',
    gi: 68,
    bloodSugarImpact: 'High; rapid glucose rise.',
  },
  {
    aliases: ['corn syrup', 'corn solids', 'corn sweetener', 'maize syrup', 'maize glucose', 'maize solids', 'hydrolyzed corn syrup', 'hydrolysed corn syrup'],
    name: 'Corn syrup',
    description: 'Glucose syrup from corn starch.',
    gi: 75,
    bloodSugarImpact: 'High; fast glucose spike.',
  },
  {
    aliases: ['honey'],
    name: 'Honey',
    description: 'Natural sweetener from bees.',
    gi: 58,
    bloodSugarImpact: 'Moderate; similar to table sugar.',
  },
  {
    aliases: ['jaggery'],
    name: 'Jaggery',
    description: 'Unrefined cane or palm sugar.',
    gi: 84,
    bloodSugarImpact: 'High; rapid spike.',
  },
  {
    aliases: ['molasses', 'treacle', 'golden syrup'],
    name: 'Molasses / Treacle',
    description: 'Cane or beet sugar byproduct.',
    gi: 55,
    bloodSugarImpact: 'Moderate.',
  },
  {
    aliases: ['maple syrup'],
    name: 'Maple syrup',
    description: 'Tree sap concentrate.',
    gi: 54,
    bloodSugarImpact: 'Moderate.',
  },
  {
    aliases: ['agave', 'agave nectar'],
    name: 'Agave',
    description: 'Plant nectar; high fructose.',
    gi: 15,
    bloodSugarImpact: 'Lower than table sugar.',
  },
  {
    aliases: ['rice syrup', 'rice malt syrup', 'rice malt', 'brown rice syrup solids'],
    name: 'Rice syrup',
    description: 'Starch-based syrup from rice.',
    gi: 98,
    bloodSugarImpact: 'Very high; fast glucose.',
  },
  {
    aliases: ['date paste', 'dates', 'date syrup', 'date puree', 'dry date powder', 'khajoor paste'],
    name: 'Dates / Date paste',
    description: 'Dried fruit sugar; concentrated.',
    gi: 103,
    bloodSugarImpact: 'Very high when concentrated.',
  },
  {
    aliases: ['lactose'],
    name: 'Lactose',
    description: 'Milk sugar.',
    gi: 46,
    bloodSugarImpact: 'Moderate.',
  },
  {
    aliases: ['maltose', 'maltose syrup'],
    name: 'Maltose',
    description: 'Malt sugar; two glucose units.',
    gi: 105,
    bloodSugarImpact: 'Very high; rapid spike.',
  },
  {
    aliases: ['barley malt', 'barley malt extract', 'barley extract', 'malted barley', 'diastatic malt', 'malt extract', 'malt solids', 'malt syrup', 'malt'],
    name: 'Barley malt / Malt',
    description: 'Grain-derived sweetener; high maltose.',
    gi: 95,
    bloodSugarImpact: 'High; fast glucose spike.',
  },
  {
    aliases: ['invert sugar', 'invert cane syrup', 'glucose-fructose syrup'],
    name: 'Invert sugar',
    description: 'Hydrolyzed sucrose; glucose + fructose.',
    gi: 60,
    bloodSugarImpact: 'Moderate to high.',
  },
  {
    aliases: ['fruit juice concentrate', 'fruit juice concentrates', 'apple juice concentrate', 'grape juice concentrate', 'pear juice concentrate', 'pineapple concentrate', 'raisin concentrate', 'fruit concentrate', 'fruit solids', 'fruit extract', 'fruit puree', 'fruit pulp', 'dried fruit powder', 'dried fruit extract'],
    name: 'Fruit concentrate',
    description: 'Concentrated fruit sugars.',
    gi: 65,
    bloodSugarImpact: 'Moderate to high; varies by fruit.',
  },
  {
    aliases: ['caramel', 'caramel syrup', 'caramelized sugar', 'burnt sugar'],
    name: 'Caramel',
    description: 'Heated sugar; used for color and flavor.',
    gi: 60,
    bloodSugarImpact: 'Moderate; raises blood glucose.',
  },
  {
    aliases: ['coconut sugar', 'coconut nectar', 'palm sugar', 'palm nectar', 'blossom nectar'],
    name: 'Coconut / Palm sugar',
    description: 'Plant-derived sweeteners.',
    gi: 54,
    bloodSugarImpact: 'Moderate; similar to table sugar.',
  },
  {
    aliases: ['sorghum syrup', 'sweet sorghum', 'yacon syrup'],
    name: 'Sorghum / Yacon syrup',
    description: 'Plant-based syrups.',
    gi: 50,
    bloodSugarImpact: 'Moderate.',
  },
  {
    aliases: ['sweetened condensed milk', 'condensed milk solids'],
    name: 'Condensed milk',
    description: 'Milk with added sugar.',
    gi: 61,
    bloodSugarImpact: 'Moderate; high sugar content.',
  },
  {
    aliases: ['oligosaccharide syrup', 'hydrolyzed starch', 'hydrolysed starch', 'modified starch'],
    name: 'Starch-derived sweeteners',
    description: 'Hydrolyzed starches.',
    gi: 85,
    bloodSugarImpact: 'High; rapid digestion.',
  },
  {
    aliases: ['butterscotch syrup', 'toffee syrup', 'fondant'],
    name: 'Confectionery sugars',
    description: 'Processed sweeteners for baked goods.',
    gi: 65,
    bloodSugarImpact: 'Moderate; raises blood glucose.',
  },
  {
    aliases: ['syrup', 'nectar', 'concentrate', 'juice concentrate'],
    name: 'General syrup / concentrate',
    description: 'Added sweetener; type varies.',
    gi: null,
    bloodSugarImpact: 'May raise blood sugar; GI varies by type.',
  },
];

/** Look up ingredient info by alias. Returns default for unknown aliases. */
export function getSugarIngredientInfo(alias: string): SugarIngredientInfo {
  const normalized = alias.toLowerCase().trim();
  for (const info of SUGAR_INGREDIENT_INFO) {
    if (info.aliases.some((a) => a.toLowerCase() === normalized)) {
      return info;
    }
  }
  return { ...DEFAULT_INFO, name: alias };
}
