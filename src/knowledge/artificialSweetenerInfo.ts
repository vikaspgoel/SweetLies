/**
 * Unified sweetener knowledge base (artificial sweeteners + polyols).
 * Used for "Artificial Sweeteners Present?" section - shown for every scan.
 *
 * Aliases are matched with word boundaries; add both singular and plural (or other
 * common label variants) when labels use either form to avoid missed detections.
 */

export interface SweetenerInfo {
  name: string;
  aliases: string[];
  gi: string;
  calPerG: string;
  safetyCategory: 'Safe Sweetener' | 'Moderate GI' | 'High GI';
  isMaltitol?: boolean;
}

export const SWEETENER_TABLE: SweetenerInfo[] = [
  { name: 'Stevia', aliases: ['stevia', 'steviol glycosides', 'steviol glycoside', '960', 'ins 960'], gi: '0', calPerG: '0', safetyCategory: 'Safe Sweetener' },
  { name: 'Monk Fruit', aliases: ['monk fruit', 'luo han guo', 'mogroside', 'mogrosides'], gi: '0', calPerG: '0', safetyCategory: 'Safe Sweetener' },
  { name: 'Erythritol', aliases: ['erythritol', '968', 'ins 968'], gi: '1', calPerG: '0.2', safetyCategory: 'Safe Sweetener' },
  { name: 'Sucralose', aliases: ['sucralose', 'splenda', '955', 'ins 955'], gi: '0', calPerG: '0', safetyCategory: 'Safe Sweetener' },
  { name: 'Aspartame', aliases: ['aspartame', 'nutrasweet', '951', 'ins 951'], gi: '0', calPerG: '0', safetyCategory: 'Safe Sweetener' },
  { name: 'Acesulfame K', aliases: ['ace-k', '950', 'ins 950'], gi: '0', calPerG: '0', safetyCategory: 'Safe Sweetener' },
  { name: 'Allulose', aliases: ['allulose', 'd-psicose'], gi: '0', calPerG: '0.4', safetyCategory: 'Safe Sweetener' },
  { name: 'Saccharin', aliases: ['saccharin', '954', 'ins 954'], gi: '0', calPerG: '0', safetyCategory: 'Safe Sweetener' },
  { name: 'Neotame', aliases: ['neotame', '961', 'ins 961'], gi: '0', calPerG: '0', safetyCategory: 'Safe Sweetener' },
  { name: 'Advantame', aliases: ['advantame', '969', 'ins 969'], gi: '0', calPerG: '0', safetyCategory: 'Safe Sweetener' },
  { name: 'Thaumatin', aliases: ['thaumatin', '957', 'ins 957'], gi: '0', calPerG: '0', safetyCategory: 'Safe Sweetener' },
  { name: 'Sorbitol', aliases: ['sorbitol', '420', 'ins 420'], gi: '9', calPerG: '2.6', safetyCategory: 'Moderate GI' },
  { name: 'Xylitol', aliases: ['xylitol', '967', 'ins 967'], gi: '12', calPerG: '2.4', safetyCategory: 'Moderate GI' },
  { name: 'Isomalt', aliases: ['isomalt', '953', 'ins 953'], gi: '9', calPerG: '2.0', safetyCategory: 'Moderate GI' },
  { name: 'Mannitol', aliases: ['mannitol', '421', 'ins 421'], gi: '2', calPerG: '1.6', safetyCategory: 'Moderate GI' },
  { name: 'Polydextrose', aliases: ['polydextrose'], gi: '1', calPerG: '1.0', safetyCategory: 'Moderate GI' },
  { name: 'Polyols', aliases: ['polyol', 'polyols', 'sugar alcohol', 'sugar alcohols', 'sugar-alcohol', 'sugar-alcohols', 'polyhydric alcohol', 'polyhydric alcohols'], gi: 'Varies', calPerG: 'Varies', safetyCategory: 'Moderate GI' },
  { name: 'Maltitol', aliases: ['maltitol', '965', 'ins 965'], gi: '35-52', calPerG: '2.1', safetyCategory: 'High GI', isMaltitol: true },
];

export interface SweetenerMatch {
  verbatim: string;
  info: SweetenerInfo;
}
