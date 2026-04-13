import { ScenarioData, ScenarioStep, ModuleData } from "@/types/scenario";
import { JsonScenario, JsonModule } from "@/data/transformScenario";
import { stepEvaluationHasContent } from "@/data/evaluationCompetencies";

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
    if ("evaluation" in step) {
      const ev = step.evaluation;
      scene.evaluation =
        ev && stepEvaluationHasContent(ev)
          ? {
              ...(ev.expectedBehavior.trim() ? { expectedBehavior: ev.expectedBehavior } : {}),
              ...(ev.competency ? { competency: ev.competency } : {}),
              ...(ev.notes?.trim() ? { notes: ev.notes.trim() } : {}),
            }
          : undefined;
      if (scene.evaluation && Object.keys(scene.evaluation).length === 0) {
        scene.evaluation = undefined;
      }
    }

    // Full task sync — handles add, delete, reorder, and field edits
    if (step.tasks !== undefined) {
      scene.tasks = step.tasks.map((task) => ({
        id: task.id,
        label: task.label,
        ...(task.shortLabel?.trim() ? { shortLabel: task.shortLabel.trim() } : {}),
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
  downloadJson([result], `${original.id}-edited.json`);
}

const typeToJsonType: Record<string, string> = {
  chat: "text-chat",
  radio: "radio-call",
  document: "document-review",
  video: "video",
};

function stepToJsonScene(step: ScenarioStep) {
  const ev = step.evaluation;
  return {
    id: step.id,
    title: step.title,
    type: typeToJsonType[step.type] ?? step.type,
    description: step.description,
    ...(step.persona ? { persona: step.persona } : {}),
    ...(step.personaAdherence ? { personaAdherence: step.personaAdherence } : {}),
    ...(step.resource ? { resource: step.resource } : {}),
    ...(step.tasks && step.tasks.length > 0
      ? {
          tasks: step.tasks.map((t) => ({
            id: t.id,
            label: t.label,
            ...(t.shortLabel?.trim() ? { shortLabel: t.shortLabel.trim() } : {}),
            required: t.required,
            ...(t.hidden !== undefined ? { hidden: t.hidden } : {}),
            ...(t.type ? { type: t.type } : {}),
            ...(t.tool ? { tool: t.tool } : {}),
            ...(t.prerequisite !== undefined && t.prerequisite !== ""
              ? { prerequisite: t.prerequisite }
              : {}),
          })),
        }
      : {}),
    ...(step.paths && step.paths.length > 0
      ? {
          paths: step.paths.map((p) => ({
            id: p.id,
            description: p.label,
            prerequisite: p.prerequisite,
            target_id:
              p.connections?.[0]?.targetNodeId ?? p.targetStepId ?? "",
            ...(p.timeoutMs !== undefined ? { timeout_ms: p.timeoutMs } : {}),
          })),
        }
      : {}),
    ...(ev && stepEvaluationHasContent(ev)
      ? {
          evaluation: {
            ...(ev.expectedBehavior.trim()
              ? { expectedBehavior: ev.expectedBehavior }
              : {}),
            ...(ev.competency ? { competency: ev.competency } : {}),
            ...(ev.notes?.trim() ? { notes: ev.notes.trim() } : {}),
          },
        }
      : {}),
  };
}

export function scenarioDataToJson(data: ScenarioData): JsonScenario {
  const stepScenes = (data.scenarioNode.steps ?? []).map(stepToJsonScene);

  const outcomeScenes = data.outcomeNodes.map((o) => ({
    id: o.id,
    title: o.title,
    type: "outcome",
    description: o.description,
  }));

  return {
    id: data.scenarioNode.id,
    title: data.title,
    description: data.scenarioNode.description ?? "",
    status: "prototype",
    version: "V3",
    ...(data.globalTimers.length > 0
      ? {
          globalTimers: data.globalTimers.map((t) => ({
            id: t.id,
            name: t.name,
            timeout_ms: t.timeoutMs,
            target_id: t.targetStepId,
          })),
        }
      : {}),
    ...(data.personas.length > 0
      ? {
          team: data.personas.map((p) => ({
            name: p.name,
            role: p.role,
            description: p.description ?? "",
          })),
        }
      : {}),
    ...(data.resources.length > 0
      ? {
          sceneResources: data.resources.map((r) => ({
            id: r.id,
            title: r.title,
            type: r.type,
            ...(r.description ? { description: r.description } : {}),
            ...(r.url ? { url: r.url } : {}),
          })),
        }
      : {}),
    outcomes: data.outcomeNodes.map((o) => ({
      title: o.title,
      outcomeType: o.outcome,
      description: o.description,
    })),
    scenes: [...stepScenes, ...outcomeScenes],
  };
}

export function exportNewToJsonFile(data: ScenarioData): void {
  const result = scenarioDataToJson(data);
  downloadJson([result], `${data.scenarioNode.id}.json`);
}

export function moduleDataToJson(mod: ModuleData): JsonModule {
  return {
    id: mod.id,
    title: mod.title,
    description: mod.description,
    ...(mod.personas.length > 0
      ? {
          team: mod.personas.map((p) => ({
            name: p.name,
            role: p.role,
            description: p.description ?? "",
          })),
        }
      : {}),
    ...(mod.resources.length > 0
      ? {
          sceneResources: mod.resources.map((r) => ({
            id: r.id,
            title: r.title,
            type: r.type,
            ...(r.description ? { description: r.description } : {}),
            ...(r.url ? { url: r.url } : {}),
          })),
        }
      : {}),
    scenarios: mod.scenarios.map((s) => {
      const json = scenarioDataToJson(s);
      delete (json as Record<string, unknown>).team;
      delete (json as Record<string, unknown>).sceneResources;
      return json;
    }),
  };
}

export function exportModuleToJsonFile(mod: ModuleData): void {
  const result = moduleDataToJson(mod);
  downloadJson(result, `${mod.id}.json`);
}

function downloadJson(content: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(content, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
