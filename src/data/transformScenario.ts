import { ScenarioData, ScenarioStep, OutcomeNode, StepConnection, GlobalTimer } from "@/types/scenario";

interface JsonTrigger {
  id: string;
  type: string;
  description: string;
  criteria: string;
  target_id: string;
  timeout_ms?: number;
}

interface JsonSceneInterruption {
  id: string;
  type: string;
  description: string;
}

interface JsonSceneTask {
  id: string;
  label: string;
  required: boolean;
}

interface JsonScene {
  id: string;
  title: string;
  description: string;
  type?: string;
  triggers: JsonTrigger[];
  tasks?: JsonSceneTask[];
  interruptions?: JsonSceneInterruption[];
}

interface JsonOutcome {
  id?: string;
  title: string;
  outcomeType?: "safe_path" | "partial_failure" | "critical_failure";
  description: string;
  url?: string;
}

interface JsonTeamMember {
  name: string;
  role: string;
  description: string;
}

interface JsonGlobalTimer {
  id: string;
  name: string;
  timeout_ms: number;
  target_id: string;
}

export interface JsonScenario {
  id: string;
  title: string;
  description: string;
  status: string;
  version: string;
  difficulty?: string;
  duration?: string;
  subject?: string;
  unit?: string;
  media?: { type: string; url: string }[];
  team?: JsonTeamMember[];
  sceneResources?: { title: string; type: string; description: string; url?: string }[];
  outcomes?: JsonOutcome[];
  scenes?: JsonScene[];
  globalTimers?: JsonGlobalTimer[];
}

function inferOutcomeType(scene: JsonScene): "safe_path" | "partial_failure" | "critical_failure" {
  const text = `${scene.id} ${scene.title} ${scene.description}`.toLowerCase();
  if (text.includes("success") || text.includes("positive") || text.includes("safe") || text.includes("proper") || text.includes("mitigation")) {
    return "safe_path";
  }
  if (text.includes("explosive") || text.includes("critical") || text.includes("catastrophic")) {
    return "critical_failure";
  }
  return "partial_failure";
}

function findMatchingOutcome(scene: JsonScene, outcomes?: JsonOutcome[]): JsonOutcome | undefined {
  if (!outcomes) return undefined;
  return outcomes.find((o) => o.id === scene.id)
    ?? outcomes.find((o) => o.title.toLowerCase() === scene.title.toLowerCase());
}

function resolveOutcomeType(scene: JsonScene, outcomes?: JsonOutcome[]): "safe_path" | "partial_failure" | "critical_failure" {
  const match = findMatchingOutcome(scene, outcomes);
  return match?.outcomeType ?? inferOutcomeType(scene);
}

const outcomeTagLabels: Record<string, string> = {
  safe_path: "Safe Outcome",
  partial_failure: "Partial Failure",
  critical_failure: "Critical Failure",
};

const explicitTypeMap: Record<string, "chat" | "radio" | "document" | "video"> = {
  "text-chat": "chat",
  "document-review": "document",
  "radio-call": "radio",
  "video": "video",
  "chat": "chat",
  "radio": "radio",
  "document": "document",
};

function inferStepType(scene: JsonScene): "chat" | "radio" | "document" | "video" {
  if (scene.type && explicitTypeMap[scene.type]) return explicitTypeMap[scene.type];
  const text = `${scene.title} ${scene.description}`.toLowerCase();
  if (text.includes("document") || text.includes("review") || text.includes("lrp")) return "document";
  if (text.includes("radio")) return "radio";
  if (text.includes("video")) return "video";
  return "chat";
}

function inferFlowType(scene: JsonScene): "conditional" | "gated" | "linear" | "interruption" {
  if (scene.triggers.length > 1) return "conditional";
  if (scene.triggers.length === 1) return "gated";
  return "linear";
}

function inferTags(scene: JsonScene): string[] {
  const tags: string[] = [];
  const text = `${scene.title} ${scene.description}`.toLowerCase();

  if (text.includes("safety") || text.includes("isolation") || text.includes("safeguard")) tags.push("Safety Compliance");
  if (text.includes("document") || text.includes("review") || text.includes("checklist")) tags.push("Documentation");
  if (text.includes("decision") || text.includes("operation") || text.includes("proceed")) tags.push("Decision Making");
  if (text.includes("team") || text.includes("greet") || text.includes("brief")) tags.push("Communication");
  if (text.includes("background") || text.includes("intro") || text.includes("context")) tags.push("Situational Awareness");
  if (text.includes("leak") || text.includes("detect")) tags.push("Risk Assessment");
  if (text.includes("mitigat")) tags.push("Mitigation");

  return tags.length > 0 ? tags : ["Scenario Step"];
}

export function transformScenario(json: JsonScenario): ScenarioData | null {
  if (!json.scenes || json.scenes.length === 0) return null;

  const terminalSceneIds = new Set(
    json.scenes.filter((s) => s.triggers.length === 0).map((s) => s.id)
  );

  const stepScenes = json.scenes.filter((s) => s.triggers.length > 0);
  const outcomeScenes = json.scenes.filter((s) => s.triggers.length === 0);

  const persona = json.team?.find((t) => t.role.toLowerCase().includes("coach"))?.name ?? "Coach";

  const steps: ScenarioStep[] = stepScenes.map((scene) => {
    const decisionPoints = scene.triggers.map((trigger) => {
      const connections: StepConnection[] = [];
      let targetStepId: string | undefined;

      if (terminalSceneIds.has(trigger.target_id)) {
        const targetScene = json.scenes!.find((s) => s.id === trigger.target_id)!;
        const outcomeType = resolveOutcomeType(targetScene, json.outcomes);
        connections.push({
          label: trigger.description,
          targetNodeId: trigger.target_id,
          type: outcomeType,
        });
      } else {
        targetStepId = trigger.target_id;
      }

      const isTimeout = trigger.type === "timeout";
      const triggerKind = isTimeout ? ("timeout" as const) : ("user" as const);

      // If this is a timeout trigger, check whether the scene has a matching
      // interruption (e.g. a radio call scheduled to fire during this scene).
      // The interruption IS the timed event — the timeout is just how long until it fires.
      const linkedInterruption =
        isTimeout && scene.interruptions && scene.interruptions.length > 0
          ? scene.interruptions[0]
          : undefined;

      return {
        id: trigger.id,
        label: trigger.description,
        criteria: trigger.criteria,
        trigger: triggerKind,
        ...(connections.length > 0 ? { connections } : {}),
        ...(targetStepId ? { targetStepId } : {}),
        ...(isTimeout && trigger.timeout_ms ? { timeoutMs: trigger.timeout_ms } : {}),
        ...(linkedInterruption
          ? {
              interruptionType: linkedInterruption.type,
              interruptionLabel: linkedInterruption.description,
            }
          : {}),
      };
    });

    return {
      id: scene.id,
      title: scene.title,
      type: inferStepType(scene),
      persona,
      description: scene.description,
      tags: inferTags(scene),
      flowType: inferFlowType(scene),
      tasks: scene.tasks?.map((t) => ({ id: t.id, label: t.label, required: t.required })),
      interruptions: scene.interruptions?.map((s) => ({ id: s.id, type: s.type, description: s.description })),
      decisionPoints,
    };
  });

  const OUTCOME_START_X = 800;
  const OUTCOME_SPACING_Y = 300;

  const outcomeNodes: OutcomeNode[] = outcomeScenes.map((scene, i) => {
    const outcomeType = resolveOutcomeType(scene, json.outcomes);
    const matchingOutcome = findMatchingOutcome(scene, json.outcomes);

    return {
      id: scene.id,
      title: scene.title,
      type: "video" as const,
      description: matchingOutcome?.description ?? scene.description,
      tags: [outcomeTagLabels[outcomeType]],
      outcome: outcomeType,
      position: { x: OUTCOME_START_X, y: 80 + i * OUTCOME_SPACING_Y },
    };
  });

  const globalTimers: GlobalTimer[] = (json.globalTimers ?? []).map((t) => ({
    id: t.id,
    name: t.name,
    timeoutMs: t.timeout_ms,
    targetStepId: t.target_id,
  }));

  return {
    title: json.title,
    scenarioNode: {
      id: json.id,
      title: json.title,
      description: json.description,
      position: { x: 60, y: 80 },
      steps,
    },
    outcomeNodes,
    globalTimers,
  };
}
