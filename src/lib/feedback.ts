// Feedback loop: store admin corrections, inject as constraints in next analysis.
// No model retraining; prompt-level adaptation only.

export interface Correction {
  target_type: string;
  target_id: string;
  correction: string;
}

export function buildConstraintPrompt(corrections: Correction[]): string {
  if (corrections.length === 0) return '';
  const lines = corrections.map((c) => `- ${c.target_type} ${c.target_id}: ${c.correction}`);
  return `\nPREVIOUS ADMIN CORRECTIONS (do not repeat these mistakes):\n${lines.join('\n')}\n`;
}
