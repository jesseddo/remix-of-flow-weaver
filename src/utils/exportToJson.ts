import { ScenarioData, NodeType } from "@/types/scenario";
import { JsonScenario } from "@/data/transformScenario";

// Reverse of the explicitTypeMap in transformScenario — prefer the most
// common long-form used in the source JSON so re-imported files look identical.
const nodeTypeToJsonType: Record<NodeType, string> = {
  chat:     "text-chat",
  radio:    "radio-call",
  document: "document-review",
  video:    "video",
};

export type ExportStatus = "draft" | "review" | "approved" | "available";

export interface ExportMeta {
  /** Overrides the scenario status field in the exported JSON */
  status?: ExportStatus;
  /** When true, appends a ".1" minor version suffix (e.g. "V3" → "V3.1") */
  bumpVersion?: boolean;
}

/**
 * Full round-trip export: merges all edited ScenarioData back into a
 * deep-cloned copy of the original JsonScenario.
 *
 * What is synced:
 *  - Scenario title and description
 *  - Step scene fields: title, description, type, persona, resource, tasks, paths, evaluation
 *  - New steps (not in original) are appended as new scenes
 *  - Outcome nodes → cloned.outcomes + upsert/remove outcome scenes
 *  - Global timers → cloned.globalTimers
 *  - Persona catalog → team[]
 *  - Resource catalog → sceneResources[]
 *  - Optional: status override and version bump via exportMeta
 *
 * What is intentionally NOT synced:
 *  - flowType (inferred from path count on re-import; not a stored JSON field)
 *  - media, difficulty, duration, subject, unit (not editable in the UI)
 */
export function exportToJson(
  data: ScenarioData,
  original: JsonScenario,
  exportMeta?: ExportMeta
): JsonScenario {
  const cloned: JsonScenario = JSON.parse(JSON.stringify(original));

  // ── Scenario-level metadata ───────────────────────────────────────────────
  cloned.title = data.title;
  // scenarioNode.description maps back to the top-level description field
  if (data.scenarioNode.description !== undefined) {
    cloned.description = data.scenarioNode.description;
  }

  // ── Export meta: status override and version bump ─────────────────────────
  if (exportMeta?.status) {
    cloned.status = exportMeta.status;
  }
  if (exportMeta?.bumpVersion && cloned.version) {
    // Append a ".1" minor suffix if not already present; increment if it is
    const match = cloned.version.match(/^(.+?)(?:\.(\d+))?$/);
    if (match) {
      const base = match[1];
      const minor = match[2] !== undefined ? parseInt(match[2], 10) + 1 : 1;
      cloned.version = `${base}.${minor}`;
    }
  }

  // ── Step scenes ───────────────────────────────────────────────────────────
  // Collect original scene ids so we can distinguish new vs existing
  const existingSceneIds = new Set((cloned.scenes ?? []).map((s) => s.id));

  for (const step of data.scenarioNode.steps ?? []) {
    const scene = (cloned.scenes ?? []).find((s) => s.id === step.id);

    if (!scene) {
      // New step created in the UI — append a minimal scene then patch it below
      const newScene = {
        id: step.id,
        title: step.title,
        description: step.description,
        type: nodeTypeToJsonType[step.type],
        tasks: [],
        paths: [],
      };
      cloned.scenes = [...(cloned.scenes ?? []), newScene];
      // The newly appended scene is the last element; fall through to patch it
      const appended = cloned.scenes[cloned.scenes.length - 1];
      patchStepScene(appended, step);
      continue;
    }

    // Always sync type — user may have changed it in the panel
    scene.type = nodeTypeToJsonType[step.type];

    patchStepScene(scene, step);
  }

  // ── Outcome nodes → cloned.outcomes + outcome scenes ─────────────────────
  // Rebuild the outcomes metadata array from the current UI state
  cloned.outcomes = data.outcomeNodes.map((o) => ({
    id: o.id,
    title: o.title,
    outcomeType: o.outcome,
    description: o.description,
  }));

  // Determine which scene IDs represent outcomes in the original JSON
  // (terminal scenes: those that were in the original and had no paths)
  const originalOutcomeSceneIds = new Set(
    (original.scenes ?? [])
      .filter((s) => !s.paths || s.paths.length === 0)
      .map((s) => s.id)
  );

  const currentOutcomeNodeIds = new Set(data.outcomeNodes.map((o) => o.id));

  // Remove outcome scenes that were deleted in the UI
  if (cloned.scenes) {
    cloned.scenes = cloned.scenes.filter((s) => {
      if (originalOutcomeSceneIds.has(s.id) && !currentOutcomeNodeIds.has(s.id)) {
        return false; // deleted outcome — drop it
      }
      return true;
    });
  }

  // Upsert: update existing outcome scenes or append new ones
  for (const outcome of data.outcomeNodes) {
    const existing = (cloned.scenes ?? []).find((s) => s.id === outcome.id);
    if (existing) {
      existing.title = outcome.title;
      existing.description = outcome.description;
      // Ensure outcome scenes have no paths (they're terminal)
      delete existing.paths;
    } else if (!existingSceneIds.has(outcome.id)) {
      // Brand-new outcome — add a terminal scene
      cloned.scenes = [
        ...(cloned.scenes ?? []),
        {
          id: outcome.id,
          title: outcome.title,
          description: outcome.description,
        },
      ];
    }
  }

  // ── Global timers ─────────────────────────────────────────────────────────
  cloned.globalTimers = data.globalTimers.map((t) => ({
    id: t.id,
    name: t.name,
    timeout_ms: t.timeoutMs,
    target_id: t.targetStepId,
  }));
  // Remove the key entirely if empty so we don't write an empty array
  if (cloned.globalTimers.length === 0) {
    delete cloned.globalTimers;
  }

  // ── Persona catalog → team[] ──────────────────────────────────────────────
  if (data.personas.length > 0) {
    cloned.team = data.personas.map((p) => ({
      name: p.name,
      role: p.role,
      description: p.description ?? "",
    }));
  }

  // ── Resource catalog → sceneResources[] ──────────────────────────────────
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

/**
 * Mutates `scene` in-place with the content from `step`.
 * Extracted to avoid repetition for both existing and newly-appended scenes.
 */
function patchStepScene(
  scene: NonNullable<JsonScenario["scenes"]>[number],
  step: ScenarioData["scenarioNode"]["steps"][number]
): void {
  if (step.title !== undefined)       scene.title = step.title;
  if (step.description !== undefined) scene.description = step.description;
  if (step.persona !== undefined)     scene.persona = step.persona;
  if (step.personaAdherence !== undefined) scene.personaAdherence = step.personaAdherence;
  if (step.resource !== undefined)    scene.resource = step.resource;

  // Evaluation — explicitly support removal (clear) as well as update
  if ("evaluation" in step) {
    scene.evaluation = step.evaluation
      ? {
          competency:  step.evaluation.competency,
          ...(step.evaluation.competencyId ? { competencyId: step.evaluation.competencyId } : {}),
          weight:      step.evaluation.weight,
          requirement: step.evaluation.requirement,
        }
      : undefined;
  }

  // Full task sync — handles add, delete, reorder, field edits
  if (step.tasks !== undefined) {
    scene.tasks = step.tasks.map((task) => ({
      id:       task.id,
      label:    task.label,
      required: task.required,
      ...(task.hidden     !== undefined ? { hidden: task.hidden }         : {}),
      ...(task.type                     ? { type: task.type }             : {}),
      ...(task.tool                     ? { tool: task.tool }             : {}),
      ...(task.prerequisite !== undefined && task.prerequisite !== ""
        ? { prerequisite: task.prerequisite }
        : {}),
    }));
  }

  // Full path sync — reconstructs target_id from connections or targetStepId
  if (step.paths !== undefined) {
    scene.paths = step.paths.map((path) => ({
      id:          path.id,
      description: path.label,
      prerequisite: path.prerequisite,
      target_id:   path.connections?.[0]?.targetNodeId ?? path.targetStepId ?? "",
      ...(path.timeoutMs !== undefined ? { timeout_ms: path.timeoutMs } : {}),
    }));
  }
}

export function exportToJsonFile(
  data: ScenarioData,
  original: JsonScenario,
  exportMeta?: ExportMeta
): void {
  const result = exportToJson(data, original, exportMeta);
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
