/**
 * Artificial / non-sugar sweetener knowledge base.
 * Used for "If no sugar, what is making this sweet?" when verdict is NO_SUGAR.
 */

export interface ArtificialSweetenerInfo {
  /** Search aliases (lowercase) - matched against ingredient text */
  aliases: string[];
  name: string;
  giValue: string;
  bloodSugarSpike: string;
  note: string;
}

export const ARTIFICIAL_SWEETENER_INFO: ArtificialSweetenerInfo[] = [
  {
    aliases: ['stevia', 'steviol glycosides', 'reb-a', 'rebiana', 'rebaudioside', 'steviol', '960', 'e960', 'ins 960'],
    name: 'Stevia',
    giValue: '0',
    bloodSugarSpike: 'NO',
    note: 'A natural plant extract; excellent for glucose control but can have a bitter aftertaste.',
  },
  {
    aliases: ['monk fruit', 'luo han guo', 'mogroside', 'mogrosides'],
    name: 'Monk Fruit',
    giValue: '0',
    bloodSugarSpike: 'NO',
    note: 'Also known as Luo Han Guo; a natural, high-intensity sweetener that is very stable.',
  },
  {
    aliases: ['erythritol', '968', 'e968', 'ins 968'],
    name: 'Erythritol',
    giValue: '0-1',
    bloodSugarSpike: 'NO',
    note: 'A sugar alcohol with the lowest glycemic impact; very tooth-friendly.',
  },
  {
    aliases: ['allulose', 'd-psicose', 'psicose'],
    name: 'Allulose',
    giValue: '0',
    bloodSugarSpike: 'NO',
    note: 'A "rare sugar" that tastes and bakes like real sugar but isn\'t metabolized as a carb.',
  },
  {
    aliases: ['sucralose', 'splenda', '955', 'e955', 'ins 955'],
    name: 'Sucralose',
    giValue: '0',
    bloodSugarSpike: 'NO',
    note: 'Highly concentrated (600x sugar); safe for spikes but often contains fillers that might.',
  },
  {
    aliases: ['aspartame', 'nutrasweet', 'equal', '951', 'e951', 'ins 951'],
    name: 'Aspartame',
    giValue: '0',
    bloodSugarSpike: 'NO',
    note: 'Common in diet sodas; breaks down under heat, so not for cooking.',
  },
  {
    aliases: ['acesulfame k', 'acesulfame potassium', 'ace-k', 'ace k', '950', 'e950', 'ins 950'],
    name: 'Acesulfame K',
    giValue: '0',
    bloodSugarSpike: 'NO',
    note: 'Known as Ace-K; usually blended with others to balance flavor profiles.',
  },
  {
    aliases: ['saccharin', "sweet'n low", 'sweet and low', '954', 'e954', 'ins 954'],
    name: 'Saccharin',
    giValue: '0',
    bloodSugarSpike: 'NO',
    note: 'The oldest artificial sweetener; zero calories but has a metallic finish.',
  },
  {
    aliases: ['advantame', '969', 'e969', 'ins 969'],
    name: 'Advantame',
    giValue: '0',
    bloodSugarSpike: 'NO',
    note: 'Ultra-high intensity (20,000x sugar); used in tiny, metabolically invisible amounts.',
  },
  {
    aliases: ['neotame', '961', 'e961', 'ins 961'],
    name: 'Neotame',
    giValue: '0',
    bloodSugarSpike: 'NO',
    note: 'A derivative of aspartame that is much sweeter and more heat-stable.',
  },
  {
    aliases: ['thaumatin', '957', 'e957', 'ins 957'],
    name: 'Thaumatin',
    giValue: '0',
    bloodSugarSpike: 'NO',
    note: 'A natural protein from fruit; creates a lingering sweetness.',
  },
  {
    aliases: ['xylitol', '967', 'e967', 'ins 967'],
    name: 'Xylitol',
    giValue: '7-13',
    bloodSugarSpike: 'VERY LOW',
    note: 'A sugar alcohol with low impact; check for "Sorbitol" or "Xylitol" on the label.',
  },
  {
    aliases: ['sorbitol', '420', 'e420', 'ins 420'],
    name: 'Sorbitol',
    giValue: '9',
    bloodSugarSpike: 'LOW',
    note: 'Often used in "sugar-free" candies; has a small glycemic effect.',
  },
  {
    aliases: ['isomalt', '953', 'e953', 'ins 953'],
    name: 'Isomalt',
    giValue: '2-9',
    bloodSugarSpike: 'LOW',
    note: 'Frequently used in sugar-free syrups and hard candies.',
  },
  {
    aliases: ['maltitol', '965', 'e965', 'ins 965'],
    name: 'Maltitol',
    giValue: '35-52',
    bloodSugarSpike: 'MODERATE',
    note: 'Caution: The "hidden" spiker; GI is high enough to affect diabetics.',
  },
  {
    aliases: ['mannitol', '421', 'e421', 'ins 421'],
    name: 'Mannitol',
    giValue: '0-2',
    bloodSugarSpike: 'LOW',
    note: 'A sugar alcohol with minimal glycemic impact; often used in sugar-free products.',
  },
];

export interface ArtificialSweetenerMatch {
  verbatim: string;
  info: ArtificialSweetenerInfo;
}

/** Look up sweetener info by alias. Returns null if not found. */
export function getArtificialSweetenerInfo(alias: string): ArtificialSweetenerInfo | null {
  const normalized = alias.toLowerCase().trim();
  for (const info of ARTIFICIAL_SWEETENER_INFO) {
    if (info.aliases.some((a) => normalized.includes(a) || a.includes(normalized))) {
      return info;
    }
  }
  return null;
}
