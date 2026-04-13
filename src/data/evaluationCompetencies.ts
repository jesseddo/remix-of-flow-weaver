/** Fixed catalog — IDs/SMEs cannot add competencies in-app. */
export const EVALUATION_COMPETENCIES = [
  "Job Planning",
  "Communication",
  "Procedure Adherence",
  "Safeguard Verification",
] as const;

export type EvaluationCompetency = (typeof EVALUATION_COMPETENCIES)[number];

export function normalizeCompetencyLabel(raw: string | undefined): EvaluationCompetency | "" {
  if (!raw?.trim()) return "";
  const t = raw.trim();
  const exact = EVALUATION_COMPETENCIES.find((c) => c === t);
  if (exact) return exact;
  const ci = EVALUATION_COMPETENCIES.find((c) => c.toLowerCase() === t.toLowerCase());
  return ci ?? "";
}

export function stepEvaluationHasContent(
  ev: { expectedBehavior?: string; competency?: string; notes?: string } | undefined
): boolean {
  if (!ev) return false;
  return !!(
    ev.expectedBehavior?.trim() ||
    ev.competency ||
    ev.notes?.trim()
  );
}
