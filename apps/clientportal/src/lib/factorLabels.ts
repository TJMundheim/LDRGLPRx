/** Dashboard labels for audit factor ids. Sex-neutral on purpose: a woman with
 *  a high sexual-function score must never see an erectile-dysfunction prompt. */
export const FACTOR_LABELS: Record<string, string> = {
  gut: 'Gut', 'gut-microbiome': 'Gut', sleep: 'Sleep', weight: 'Weight',
  'weight-body-fat': 'Weight', nutrition: 'Nutrition',
  'erectile-dysfunction': 'Sexual function', 'hormone-balance': 'Hormones',
  environment: 'Environment', cognitive: 'Cognitive', 'already-diagnosed': 'Diagnosis',
  alcohol: 'Alcohol', stress: 'Stress',
};

export function factorLabel(id: string): string {
  return FACTOR_LABELS[id] ?? id.replace(/-/g, ' ');
}
