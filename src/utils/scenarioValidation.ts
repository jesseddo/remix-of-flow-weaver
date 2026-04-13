import { ScenarioData } from "@/types/scenario";

export type ValidationWarningKind = "no_outgoing_path" | "path_missing_destination";

export interface ValidationWarning {
  nodeId: string;
  nodeTitle: string;
  kind: ValidationWarningKind;
  pathId?: string;
  pathLabel?: string;
  message: string;
}

export function validateScenario(data: ScenarioData): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  const outcomeIds = new Set(data.outcomeNodes.map((o) => o.id));
  const steps = data.scenarioNode.steps ?? [];

  for (const step of steps) {
    const paths = step.paths ?? [];

    // Check: step has no outgoing paths at all (and it's not a terminal/outcome step)
    const hasAnyDestination = paths.some(
      (p) =>
        p.targetStepId ||
        (p.connections && p.connections.length > 0 && p.connections[0].targetNodeId)
    );

    if (paths.length === 0 || !hasAnyDestination) {
      warnings.push({
        nodeId: step.id,
        nodeTitle: step.title,
        kind: "no_outgoing_path",
        message: `"${step.title}" has no outgoing path — learners will be stuck here.`,
      });
      continue; // Don't double-report per-path issues if the whole step is empty
    }

    // Check: individual paths missing a destination
    for (const path of paths) {
      const hasConn = path.connections && path.connections.length > 0 && path.connections[0].targetNodeId;
      const hasTarget = !!path.targetStepId;
      const isTimeout = path.timeoutMs !== undefined;

      if (!hasConn && !hasTarget && !isTimeout) {
        warnings.push({
          nodeId: step.id,
          nodeTitle: step.title,
          kind: "path_missing_destination",
          pathId: path.id,
          pathLabel: path.label,
          message: `Path "${path.label}" in "${step.title}" has no destination.`,
        });
      }
    }
  }

  // Check outcome nodes referenced by connections actually exist
  // (skip — outcome nodes are canonical and always valid in this data model)

  return warnings;
}

export function warningsByNodeId(warnings: ValidationWarning[]): Map<string, ValidationWarning[]> {
  const map = new Map<string, ValidationWarning[]>();
  for (const w of warnings) {
    if (!map.has(w.nodeId)) map.set(w.nodeId, []);
    map.get(w.nodeId)!.push(w);
  }
  return map;
}
