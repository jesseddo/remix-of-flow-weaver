import type {
  OutcomeType,
  OutcomeNode,
  PrerequisiteCondition,
  ScenarioPath,
  ScenarioStep,
  ScenarioTask,
} from "@/types/scenario";
import { resolveTaskAuthoringLine, resolveTaskAuthoringLineAcrossSteps } from "@/utils/taskDisplay";

export function resolveTaskLabel(taskId: string, tasks: ScenarioTask[]): string {
  return tasks.find((t) => t.id === taskId)?.label ?? taskId;
}

/** Resolve a task label by searching across all steps in the scenario. */
export function resolveTaskLabelAcrossSteps(taskId: string, allSteps: ScenarioStep[]): string {
  for (const step of allSteps) {
    const task = step.tasks?.find((t) => t.id === taskId);
    if (task) return task.label || taskId;
  }
  return taskId;
}

export function prerequisiteHasGate(prereq: PrerequisiteCondition | undefined): boolean {
  if (prereq === undefined || prereq === null) return false;
  if (typeof prereq === "string") return prereq.trim().length > 0;
  return !!(
    (prereq.all && prereq.all.length > 0) ||
    (prereq.none && prereq.none.length > 0) ||
    (prereq.any && prereq.any.length > 0) ||
    (prereq.anyGroups && prereq.anyGroups.some((g) => g.length > 0))
  );
}

/**
 * Normalizes legacy `any` + new `anyGroups` into a flat array of OR groups.
 * Each inner array is a set of task IDs where at least one must be completed.
 */
export function normalizeAnyGroups(
  prereq: Exclude<PrerequisiteCondition, string>,
): string[][] {
  const groups: string[][] = [];
  if (prereq.any?.length) groups.push(prereq.any);
  if (prereq.anyGroups?.length) groups.push(...prereq.anyGroups);
  return groups;
}

/**
 * Plain learner-action phrasing (no leading "If learner").
 * When `allSteps` is provided, resolves task labels across all steps (cross-step references).
 */
export function formatLearnerActionSummary(
  prereq: PrerequisiteCondition | undefined,
  tasks: ScenarioTask[],
  allSteps?: ScenarioStep[],
): string | null {
  if (!prerequisiteHasGate(prereq)) return null;
  const resolve = (id: string) =>
    allSteps
      ? resolveTaskAuthoringLineAcrossSteps(id, allSteps)
      : resolveTaskAuthoringLine(id, tasks);

  if (typeof prereq === "string") {
    return `must: ${resolve(prereq)}`;
  }
  const bits: string[] = [];
  if (prereq.all?.length) {
    bits.push(`must: ${prereq.all.map(resolve).join(", ")}`);
  }
  const groups = normalizeAnyGroups(prereq);
  for (const group of groups) {
    bits.push(`at least one of: ${group.map(resolve).join(", ")}`);
  }
  if (prereq.none?.length) {
    bits.push(`must not: ${prereq.none.map(resolve).join(", ")}`);
  }
  if (bits.length === 0) return null;
  return bits.join("; ");
}

/** One-line \u201cIf learner \u2026\u201d for tooltips, walkthrough, collapsed IF rows. */
export function formatRequiresSummary(
  prereq: PrerequisiteCondition | undefined,
  tasks: ScenarioTask[],
  allSteps?: ScenarioStep[],
): string | null {
  const inner = formatLearnerActionSummary(prereq, tasks, allSteps);
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

/** Primary "what happens next" line for authoring UI. */
export function formatAuthoringConsequenceLine(dest: PathDestinationInfo | null): string {
  if (!dest) return "Set a destination to see what happens next.";
  if (dest.kind === "outcome" && dest.outcomeType) {
    return `\u2192 ${dest.title} (${OUTCOME_LABEL[dest.outcomeType]})`;
  }
  return `\u2192 Next: ${dest.title}`;
}

/** Visual tone for branch cards (from connection type or step continuation). */
export type BranchTone = "safe" | "risk" | "caution" | "neutral";

export function getPathBranchTone(path: ScenarioPath): BranchTone {
  const c = path.connections?.[0];
  if (c?.type === "safe_path") return "safe";
  if (c?.type === "partial_failure") return "caution";
  if (c?.type === "critical_failure") return "risk";
  if (path.targetStepId) return "neutral";
  if (c) return "neutral";
  return "neutral";
}

/** Short bullet lines for Condition section. */
export function formatConditionBullets(
  prereq: PrerequisiteCondition | undefined,
  tasks: ScenarioTask[],
  allSteps?: ScenarioStep[],
): string[] {
  if (!prerequisiteHasGate(prereq)) {
    return ["No checks \u2014 any path"];
  }
  const resolve = (id: string) =>
    allSteps
      ? resolveTaskAuthoringLineAcrossSteps(id, allSteps)
      : resolveTaskAuthoringLine(id, tasks);

  if (typeof prereq === "string") {
    return [`Must: ${resolve(prereq)}`];
  }
  const lines: string[] = [];
  if (prereq.all?.length) {
    for (const id of prereq.all) {
      lines.push(`Must: ${resolve(id)}`);
    }
  }
  const groups = normalizeAnyGroups(prereq);
  for (const group of groups) {
    lines.push(`At least one of: ${group.map(resolve).join(", ")}`);
  }
  if (prereq.none?.length) {
    for (const id of prereq.none) {
      lines.push(`Must not: ${resolve(id)}`);
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

/** Returns true when a path's destination ID no longer matches any existing node. */
export function isPathTargetBroken(
  path: ScenarioPath,
  steps: ScenarioStep[],
  outcomes: OutcomeNode[],
): boolean {
  if (path.targetStepId) {
    return !steps.some((s) => s.id === path.targetStepId);
  }
  const conn = path.connections?.[0];
  if (conn) {
    return !outcomes.some((o) => o.id === conn.targetNodeId);
  }
  return false;
}

/** Human-readable destination name, using targetLabel as fallback for broken refs. */
export function getPathTargetLabel(
  path: ScenarioPath,
  steps: ScenarioStep[],
  outcomes: OutcomeNode[],
): string | null {
  if (path.targetStepId) {
    const s = steps.find((x) => x.id === path.targetStepId);
    return s?.title ?? path.targetLabel ?? path.targetStepId;
  }
  const conn = path.connections?.[0];
  if (conn) {
    const o = outcomes.find((x) => x.id === conn.targetNodeId);
    return o?.title ?? conn.label ?? path.targetLabel ?? conn.targetNodeId;
  }
  return null;
}

/** Extract the selected task IDs from a prerequisite (all groups flattened). */
export function getPrerequisiteTaskIds(prereq: PrerequisiteCondition | undefined): string[] {
  if (!prereq) return [];
  if (typeof prereq === "string") return prereq ? [prereq] : [];
  const ids = [...(prereq.all ?? []), ...(prereq.any ?? []), ...(prereq.none ?? [])];
  if (prereq.anyGroups) {
    for (const g of prereq.anyGroups) ids.push(...g);
  }
  return ids;
}

/** Split a prerequisite into its AND bucket, OR groups, and NONE bucket. */
export function getPrerequisiteGroups(prereq: PrerequisiteCondition | undefined): {
  allIds: string[];
  anyGroups: string[][];
  noneIds: string[];
} {
  if (!prereq) return { allIds: [], anyGroups: [], noneIds: [] };
  if (typeof prereq === "string") return prereq ? { allIds: [prereq], anyGroups: [], noneIds: [] } : { allIds: [], anyGroups: [], noneIds: [] };
  const groups = normalizeAnyGroups(prereq);
  return {
    allIds: prereq.all ?? [],
    anyGroups: groups,
    noneIds: prereq.none ?? [],
  };
}

/** Build a prerequisite from a simple AND list of task IDs. */
export function buildAllPrerequisite(taskIds: string[]): PrerequisiteCondition {
  if (taskIds.length === 0) return "";
  if (taskIds.length === 1) return taskIds[0];
  return { all: taskIds };
}

/** Build a prerequisite from AND tasks, multiple OR groups, and NONE tasks. */
export function buildMixedPrerequisite(allIds: string[], anyGroups: string[][], noneIds: string[] = []): PrerequisiteCondition {
  const nonEmptyGroups = anyGroups.filter((g) => g.length > 0);
  if (allIds.length === 0 && nonEmptyGroups.length === 0 && noneIds.length === 0) return "";
  if (nonEmptyGroups.length === 0 && noneIds.length === 0 && allIds.length === 1) return allIds[0];
  const obj: { all?: string[]; anyGroups?: string[][]; none?: string[] } = {};
  if (allIds.length > 0) obj.all = allIds;
  if (nonEmptyGroups.length > 0) obj.anyGroups = nonEmptyGroups;
  if (noneIds.length > 0) obj.none = noneIds;
  return obj;
}
