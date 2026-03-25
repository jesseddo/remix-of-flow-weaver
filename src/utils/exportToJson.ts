import { ScenarioData } from "@/types/scenario";
import { JsonScenario } from "@/data/transformScenario";

/**
 * Patches the full task and path arrays from the edited ScenarioData back into
 * a deep-cloned copy of the original JsonScenario. All other scenario-level
 * metadata (media, team, sceneResources, outcomes, globalTimers, etc.) is
 * preserved from the original unchanged.
 */
export function exportToJson(
  data: ScenarioData,
  original: JsonScenario
): JsonScenario {
  const cloned: JsonScenario = JSON.parse(JSON.stringify(original));

  for (const step of data.scenarioNode.steps ?? []) {
    const scene = cloned.scenes?.find((s) => s.id === step.id);
    if (!scene) continue;

    if (step.title !== undefined) scene.title = step.title;
    if (step.description !== undefined) scene.description = step.description;
    if (step.persona !== undefined) scene.persona = step.persona;
    if (step.personaAdherence !== undefined) scene.personaAdherence = step.personaAdherence;
    if (step.resource !== undefined) scene.resource = step.resource;
    // Sync evaluation — undefined means untouched; explicit value (or removal) is honoured
    if ("evaluation" in step) {
      scene.evaluation = step.evaluation
        ? {
            competency: step.evaluation.competency,
            ...(step.evaluation.competencyId ? { competencyId: step.evaluation.competencyId } : {}),
            weight: step.evaluation.weight,
            requirement: step.evaluation.requirement,
          }
        : undefined;
    }

    // Full task sync — handles add, delete, reorder, and field edits
    if (step.tasks !== undefined) {
      scene.tasks = step.tasks.map((task) => ({
        id: task.id,
        label: task.label,
        required: task.required,
        ...(task.hidden !== undefined ? { hidden: task.hidden } : {}),
        ...(task.type ? { type: task.type } : {}),
        ...(task.tool ? { tool: task.tool } : {}),
        ...(task.prerequisite !== undefined && task.prerequisite !== ""
          ? { prerequisite: task.prerequisite }
          : {}),
      }));
    }

    // Full path sync — handles add, delete, label/prerequisite edits.
    // Reconstructs target_id from the ScenarioPath's connections or targetStepId.
    if (step.paths !== undefined) {
      scene.paths = step.paths.map((path) => {
        const targetId =
          path.connections?.[0]?.targetNodeId ?? path.targetStepId ?? "";
        return {
          id: path.id,
          description: path.label,
          prerequisite: path.prerequisite,
          target_id: targetId,
          ...(path.timeoutMs !== undefined
            ? { timeout_ms: path.timeoutMs }
            : {}),
        };
      });
    }
  }

  // Sync persona catalog → team[]
  if (data.personas.length > 0) {
    cloned.team = data.personas.map((p) => ({
      name: p.name,
      role: p.role,
      description: p.description ?? "",
    }));
  }

  // Sync resource catalog → sceneResources[]
  if (data.resources.length > 0) {
    cloned.sceneResources = data.resources.map((r) => ({
      id: r.id,
      title: r.title,
      type: r.type,
      ...(r.description ? { description: r.description } : {}),
      ...(r.url ? { url: r.url } : {}),
    }));
  }

  return cloned;
}

export function exportToJsonFile(
  data: ScenarioData,
  original: JsonScenario
): void {
  const result = exportToJson(data, original);
  const blob = new Blob([JSON.stringify([result], null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${original.id}-edited.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
