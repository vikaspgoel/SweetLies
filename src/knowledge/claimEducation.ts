/**
 * Educational content for claim verification.
 * Shown before the verdict to help users understand what claims really mean.
 */

export interface ClaimEducation {
  whatMadeThemSay: string;
  whereTheLieIs: string;
  takeaway: string;
}

export const CLAIM_EDUCATION: Record<string, ClaimEducation> = {
  'No added sugar': {
    whatMadeThemSay:
      'They did not add white/table sugar during processing.',
    whereTheLieIs:
      'They may still use fruit juice concentrate, dates or date paste, malt extract, or honey—all of which raise blood glucose.',
    takeaway: 'No added sugar ≠ low sugar.',
  },
  'Sugar free': {
    whatMadeThemSay:
      'Contains less than ~0.5g sugar per serving (legal definition).',
    whereTheLieIs:
      'The product may still contain maltodextrin, refined flour, starches, or artificial sweeteners—these can spike glucose anyway.',
    takeaway: 'Sugar-free ≠ glucose-free.',
  },
  'Sugar Free/ Zero Sugar': {
    whatMadeThemSay:
      'Contains less than ~0.5g sugar per serving (legal definition).',
    whereTheLieIs:
      'The product may still contain maltodextrin, refined flour, starches, or artificial sweeteners—these can spike glucose anyway.',
    takeaway: 'Sugar-free ≠ glucose-free.',
  },
  'No refined sugar': {
    whatMadeThemSay:
      'No white processed sugar (sucrose) used.',
    whereTheLieIs:
      'They may replace it with jaggery, honey, coconut sugar, or date syrup. Your body treats these very similarly to sugar.',
    takeaway: 'Unrefined sugar is still sugar.',
  },
  'Made with real fruit': {
    whatMadeThemSay:
      'The product contains some fruit or fruit concentrate.',
    whereTheLieIs:
      'Often there is very little fruit—the rest is sugar or syrup. Fruit concentrate behaves like sugar and creates a "healthy" perception.',
    takeaway: 'Real fruit doesn\'t mean low sugar.',
  },
  'Sweetened with honey/jaggery/dates': {
    whatMadeThemSay:
      'They replaced white sugar with "natural" sweeteners.',
    whereTheLieIs:
      'Honey, jaggery, and dates raise blood sugar quickly, have similar calories to sugar, and are still sugar sources.',
    takeaway: 'Natural sweetener ≠ healthier for glucose.',
  },
};

export function getClaimEducation(claimKey: string): ClaimEducation | null {
  return CLAIM_EDUCATION[claimKey] ?? null;
}
