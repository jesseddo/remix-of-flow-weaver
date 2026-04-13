import type { ScenarioTask } from "@/types/scenario";

/**
 * Split long task labels into shorter lines for scannable UI.
 * Prefer optional `shortLabel` on the task for author-controlled brevity.
 */
export function compactLabelParts(label: string): string[] {
  const t = label.trim();
  if (!t) return [];

  const bySemi = t.split(/\s*;\s*/).map((s) => s.trim()).filter(Boolean);
  if (bySemi.length > 1) return bySemi;

  const byDash = t.split(/\s*[—–]\s*/).map((s) => s.trim()).filter(Boolean);
  if (byDash.length > 1) return byDash;

  const byAnd = t.split(/\s+and\s+/i).map((s) => s.trim()).filter(Boolean);
  if (byAnd.length > 1) return byAnd;

  const without = t.match(/^(.+?)\s+without\s+(.+)$/i);
  if (without) {
    const a = without[1].trim();
    const b = without[2].trim();
    return [a, b].filter(Boolean);
  }

  return [t];
}

/** Primary line for summaries, branch cards, and walkthrough (uses shortLabel when set). */
export function resolveTaskAuthoringLine(taskId: string, tasks: ScenarioTask[]): string {
  const t = tasks.find((x) => x.id === taskId);
  if (!t) return taskId;
  return taskEditorDisplay(t).primary;
}

export function taskEditorDisplay(task: ScenarioTask): {
  primary: string;
  extras: string[];
  full: string;
} {
  const full = task.label;
  const sl = task.shortLabel?.trim();
  if (sl) {
    const extras = compactLabelParts(full).filter((p) => p !== sl);
    return { primary: sl, extras: extras.slice(0, 5), full };
  }
  const parts = compactLabelParts(full);
  return { primary: parts[0] ?? full, extras: parts.slice(1), full };
}
