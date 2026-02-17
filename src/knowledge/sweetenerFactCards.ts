/**
 * Fact card content for each artificial sweetener.
 * Key must match SweetenerInfo.name in artificialSweetenerInfo.ts.
 * Render "Spike Warning" and its sentence in red in the UI.
 */

export const SWEETENER_FACT_CARDS: Record<string, string> = {
  'Stevia': `The Natural Choice: Extracted from plant leaves, this is 200x sweeter than sugar with zero calories. Watch for fillers like Maltodextrin in packets which can cause unexpected spikes.

• Safety: ADI (Acceptable Daily Intake) is 4mg per kg of body weight.

• Gut: Generally gut-friendly; additives in blends may cause mild bloating.`,

  'Monk Fruit': `The Ancient Melon: A natural fruit extract containing mogrosides that are 250x sweeter than sugar with zero glycemic impact. It is very stable and clean-tasting.

• Safety: ADI not formally set; generally recognized as safe globally.

• Gut: Considered very safe and gentle on the digestive system.`,

  'Erythritol': `The Gold Standard: A fruit-derived sugar alcohol that passes through you without spiking glucose. It is the most tooth-safe and metabolically clean substitute available.

• Safety: ADI is 0.7g per kg of body weight.

• Gut: Most gut-safe polyol; absorbed early and rarely causes a laxative effect.`,

  'Sucralose': `The Heat-Hero: 600x sweeter than sugar and perfect for baking because it stays stable at high temperatures. It is calorie-free but extremely concentrated.

• Safety: ADI is 5mg per kg of body weight.

• Gut: High, frequent doses may negatively influence beneficial gut bacteria.`,

  'Aspartame': `The Soda Classic: Found in most diet drinks but breaks down when heated. It is zero-calorie and remains a staple for glucose management in beverages.

• Safety: ADI is 40-50mg per kg of body weight.

• Gut: Broken down into amino acids; lacks the bloating typical of polyols.`,

  'Acesulfame K': `The Team Player: A heat-stable synthetic often used in blends to balance flavor profiles. It has zero impact on insulin or glucose.

• Safety: ADI is 15mg per kg of body weight.

• Gut: May influence the gut environment if consumed in very high quantities.`,

  'Allulose': `The Rare Sugar: Tastes and bakes like real sugar but isn't metabolized as a carb. It may actually help lower blood sugar in some clinical settings.

• Safety: ADI is 0.6g per kg of body weight.

• Gut: Mostly absorbed in the small intestine; much easier on the gut than polyols.`,

  'Saccharin': `The Original: The oldest substitute; zero calories and reliable for blood sugar management. It often leaves a distinct metallic aftertaste.

• Safety: ADI is 5mg per kg of body weight.

• Gut: Mostly unchanged by digestion; high intake may impact gut microbiome.`,

  'Neotame': `The Modern High-Intensity: A derivative of aspartame that is 8,000x sweeter than sugar. It is heat-stable and used in very tiny, metabolically invisible amounts.

• Safety: ADI is 2mg per kg of body weight.

• Gut: Rapidly eliminated and doesn't ferment in the digestive tract.`,

  'Advantame': `The Ultra-Sweetener: One of the most potent sweeteners available (20,000x sweeter than sugar). It is clean-tasting and zero-GI.

• Safety: ADI is 5mg per kg of body weight.

• Gut: Safe for consumption; used in such small amounts it has no digestive impact.`,

  'Thaumatin': `The Natural Protein: Derived from West African fruit, it is a protein-based sweetener with a lingering, licorice-like finish.

• Safety: Generally recognized as safe (GRAS); no specific ADI limit.

• Gut: Digested as a protein; completely gut-safe with no laxative effect.`,

  'Sorbitol': `The Gentle Nudge: Spike Warning: A common polyol that has a small, measurable effect on blood sugar. It provides a smooth texture to candies and syrups.

• Safety: Avoid exceeding 20g daily to prevent digestive issues.

• Gut: Strong osmotic laxative; can cause significant bloating and diarrhea.`,

  'Xylitol': `The Smile-Saver: A sugar alcohol that prevents tooth decay while providing sweetness with a very low glucose nudge. Highly toxic to pets, especially dogs.

• Safety: 30g+ daily may trigger digestive upset.

• Gut: Slowly fermented; acts as a prebiotic but can cause a laxative effect.`,

  'Isomalt': `The Candy Builder: A low-calorie polyol that keeps hard candies crunchy without rotting teeth. It has a very low impact on glucose.

• Safety: ADI is 0.5g per kg of body weight.

• Gut: Fermented in the large intestine; can cause gas in large servings.`,

  'Mannitol': `The Dusting Agent: Often used on the outside of gums to prevent sticking; it has a very low glycemic impact.

• Safety: ADI is 50mg per kg of body weight.

• Gut: Poorly absorbed; can lead to gas and bloating if consumed in large amounts.`,

  'Polydextrose': `The Fiber-Filler: Technically a synthetic fiber, it adds bulk to "sugar-free" foods with almost no glycemic effect.

• Safety: Generally safe; no ADI but large amounts can be laxative.

• Gut: Acts as a soluble fiber; supports gut health but may cause gas.`,

  'Maltitol': `The Sweet Lie: Spike Warning: It has about half the glycemic impact of real sugar and will cause a moderate rise in blood glucose. It provides bulk and texture similar to sugar.

• Safety: Limit to 30g daily to avoid gastric distress.

• Gut: Strong laxative effect; notorious for causing gas and bloating.`,
};

export function getSweetenerFactCard(sweetenerName: string): string | null {
  return SWEETENER_FACT_CARDS[sweetenerName] ?? null;
}
