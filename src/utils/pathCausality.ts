import type {
  OutcomeType,
  OutcomeNode,
  PrerequisiteCondition,
  ScenarioPath,
  ScenarioStep,
  ScenarioTask,
} from "@/types/scenario";
import { resolveTaskAuthoringLine } from "@/utils/taskDisplay";

export function resolveTaskLabel(taskId: string, tasks: ScenarioTask[]): string {
  return tasks.find((t) => t.id === taskId)?.label ?? taskId;
}

export function prerequisiteHasGate(prereq: PrerequisiteCondition | undefined): boolean {
  if (prereq === undefined || prereq === null) return false;
  if (typeof prereq === "string") return prereq.trim().length > 0;
  return !!(
    (prereq.all && prereq.all.length > 0) ||
    (prereq.none && prereq.none.length > 0) ||
    (prereq.any && prereq.any.length > 0)
  );
}

/**
 * Plain learner-action phrasing (no leading “If learner”).
 * Used to build IF summaries and walkthrough hints.
 */
export function formatLearnerActionSummary(
  prereq: PrerequisiteCondition | undefined,
  tasks: ScenarioTask[],
): string | null {
  if (!prerequisiteHasGate(prereq)) return null;
  if (typeof prereq === "string") {
    return `must: ${resolveTaskAuthoringLine(prereq, tasks)}`;
  }
  const bits: string[] = [];
  if (prereq.all?.length) {
    bits.push(
      `must: ${prereq.all.map((id) => resolveTaskAuthoringLine(id, tasks)).join(", ")}`,
    );
  }
  if (prereq.any?.length) {
    bits.push(
      `at least one of: ${prereq.any.map((id) => resolveTaskAuthoringLine(id, tasks)).join(", ")}`,
    );
  }
  if (prereq.none?.length) {
    bits.push(
      `must not: ${prereq.none.map((id) => resolveTaskAuthoringLine(id, tasks)).join(", ")}`,
    );
  }
  if (bits.length === 0) return null;
  return bits.join("; ");
}

/** One-line “If learner …” for tooltips, walkthrough, collapsed IF rows. */
export function formatRequiresSummary(
  prereq: PrerequisiteCondition | undefined,
  tasks: ScenarioTask[],
): string | null {
  const inner = formatLearnerActionSummary(prereq, tasks);
  return inner ? `If learner ${inner}` : null;
}

export type PathDestinationKind = "step" | "outcome";

export interface PathDestinationInfo {
  title: string;
  kind: PathDestinationKind;
  outcomeType?: OutcomeType;
}

export function getPathDestination(
  path: ScenarioPath,
  steps: ScenarioStep[],
  outcomes: OutcomeNode[],
): PathDestinationInfo | null {
  if (path.targetStepId) {
    const s = steps.find((x) => x.id === path.targetStepId);
    return {
      title: s?.title ?? path.targetStepId,
      kind: "step",
    };
  }
  const conn = path.connections?.[0];
  if (conn) {
    const o = outcomes.find((x) => x.id === conn.targetNodeId);
    return {
      title: o?.title ?? conn.targetNodeId,
      kind: "outcome",
      outcomeType: o?.outcome,
    };
  }
  return null;
}

const OUTCOME_LABEL: Record<OutcomeType, string> = {
  safe_path: "Safe path",
  partial_failure: "Partial failure",
  critical_failure: "Critical failure",
};

export function formatLeadsToLine(dest: PathDestinationInfo): string {
  if (dest.kind === "outcome" && dest.outcomeType) {
    return `Leads to: ${dest.title} (${OUTCOME_LABEL[dest.outcomeType]})`;
  }
  return `Leads to: ${dest.title}`;
}

/** Primary “what happens next” line for authoring UI — consequence-first wording. */
export function formatAuthoringConsequenceLine(dest: PathDestinationInfo | null): string {
  if (!dest) return "Set a destination to see what happens next.";
  if (dest.kind === "outcome" && dest.outcomeType) {
    return `→ ${dest.title} (${OUTCOME_LABEL[dest.outcomeType]})`;
  }
  return `→ Next: ${dest.title}`;
}

/** Visual tone for branch cards (from connection type or step continuation). */
export type BranchTone = "safe" | "risk" | "caution" | "neutral";

export function getPathBranchTone(path: ScenarioPath): BranchTone {
  if (path.timeoutMs != null) return "caution";
  const c = path.connections?.[0];
  if (c?.type === "safe_path") return "safe";
  if (c?.type === "partial_failure") return "caution";
  if (c?.type === "critical_failure") return "risk";
  if (path.targetStepId) return "neutral";
  if (c) return "neutral";
  return "neutral";
}

/** Short bullet lines for Condition section (no long “If learner…” sentences). */
export function formatConditionBullets(
  prereq: PrerequisiteCondition | undefined,
  tasks: ScenarioTask[],
): string[] {
  if (!prerequisiteHasGate(prereq)) {
    return ["No checks — any path"];
  }
  if (typeof prereq === "string") {
    return [`Must: ${resolveTaskAuthoringLine(prereq, tasks)}`];
  }
  const lines: string[] = [];
  if (prereq.all?.length) {
    for (const id of prereq.all) {
      lines.push(`Must: ${resolveTaskAuthoringLine(id, tasks)}`);
    }
  }
  if (prereq.any?.length) {
    lines.push(
      `At least one of: ${prereq.any.map((id) => resolveTaskAuthoringLine(id, tasks)).join(", ")}`,
    );
  }
  if (prereq.none?.length) {
    for (const id of prereq.none) {
      lines.push(`Must not: ${resolveTaskAuthoringLine(id, tasks)}`);
    }
  }
  return lines.length > 0 ? lines : ["Rules set"];
}

/** Title + severity line for Outcome chunk. */
export function getOutcomeChunk(dest: PathDestinationInfo | null): {
  title: string;
  severity?: string;
} {
  if (!dest) return { title: "Choose a destination" };
  if (dest.kind === "outcome" && dest.outcomeType) {
    return { title: dest.title, severity: OUTCOME_LABEL[dest.outcomeType] };
  }
  return { title: dest.title, severity: "Next step" };
}
