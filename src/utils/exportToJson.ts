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
    if (step.messageDescription !== undefined) scene.messageDescription = step.messageDescription;
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

    if (step.tasks !== undefined) {
      scene.tasks = step.tasks.map((task) => ({
        id: task.id,
        label: task.label,
        ...(task.shortLabel?.trim() ? { shortLabel: task.shortLabel.trim() } : {}),
        actionType: task.actionType,
        ...(task.resourceId ? { resourceId: task.resourceId } : {}),
        ...((task.checklistItemIds?.length ?? 0) > 0 ? { checklistItemIds: task.checklistItemIds } : {}),
        ...(task.checklistItemId ? { checklistItemId: task.checklistItemId } : {}),
        ...(task.chatCriteria?.trim() ? { chatCriteria: task.chatCriteria.trim() } : {}),
        ...(task.scoreIncrement !== undefined ? { scoreIncrement: task.scoreIncrement } : {}),
      }));
    }

    if (step.paths !== undefined) {
      scene.paths = step.paths.map((path) => {
        const targetId =
          path.connections?.[0]?.targetNodeId ?? path.targetStepId ?? "";
        return {
          id: path.id,
          description: path.label,
          prerequisite: path.prerequisite,
          target_id: targetId,
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
    ...(step.messageDescription?.trim() ? { messageDescription: step.messageDescription.trim() } : {}),
    ...(step.tasks && step.tasks.length > 0
      ? {
          tasks: step.tasks.map((t) => ({
            id: t.id,
            label: t.label,
            ...(t.shortLabel?.trim() ? { shortLabel: t.shortLabel.trim() } : {}),
            actionType: t.actionType,
            ...(t.resourceId ? { resourceId: t.resourceId } : {}),
            ...((t.checklistItemIds?.length ?? 0) > 0 ? { checklistItemIds: t.checklistItemIds } : {}),
            ...(t.checklistItemId ? { checklistItemId: t.checklistItemId } : {}),
            ...(t.chatCriteria?.trim() ? { chatCriteria: t.chatCriteria.trim() } : {}),
            ...(t.scoreIncrement !== undefined ? { scoreIncrement: t.scoreIncrement } : {}),
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
    ...(data.globalTimer
      ? {
          globalTimers: [{
            id: data.globalTimer.id,
            name: data.globalTimer.name,
            timeout_ms: data.globalTimer.timeoutMs,
            target_id: data.globalTimer.targetStepId,
          }],
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
            ...(r.checkboxItems && r.checkboxItems.length > 0 ? { checkboxItems: r.checkboxItems } : {}),
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
            ...(r.checkboxItems && r.checkboxItems.length > 0 ? { checkboxItems: r.checkboxItems } : {}),
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
