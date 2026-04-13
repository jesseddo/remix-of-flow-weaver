import {
  ScenarioData,
  ScenarioStep,
  OutcomeNode,
  StepConnection,
  GlobalTimer,
  PrerequisiteCondition,
  Persona,
  ScenarioResource,
  StepEvaluation,
} from "@/types/scenario";
import { normalizeCompetencyLabel, stepEvaluationHasContent } from "@/data/evaluationCompetencies";

interface JsonPath {
  id: string;
  description: string;
  prerequisite: PrerequisiteCondition;
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
  shortLabel?: string;
  required: boolean;
  hidden?: boolean;
  type?: "behavioral" | "tool";
  tool?: { action: string; resourceId?: string };
  prerequisite?: PrerequisiteCondition;
}

interface JsonSceneEvaluation {
  expectedBehavior?: string;
  competency?: string;
  notes?: string;
  /** Legacy JSON field — mapped to expectedBehavior */
  requirement?: string;
  competencyId?: string;
  weight?: "high" | "medium" | "low";
}

function mapJsonEvaluation(raw: JsonSceneEvaluation | undefined): StepEvaluation | undefined {
  if (!raw) return undefined;
  const expectedBehavior = (raw.expectedBehavior ?? raw.requirement ?? "").trimEnd();
  const notesRaw = raw.notes?.trim();
  const competency = normalizeCompetencyLabel(raw.competency);
  const draft: StepEvaluation = {
    expectedBehavior,
    competency,
    ...(notesRaw ? { notes: notesRaw } : {}),
  };
  return stepEvaluationHasContent(draft) ? draft : undefined;
}

interface JsonScene {
  id: string;
  title: string;
  description: string;
  type?: string;
  persona?: string;
  personaAdherence?: number;
  resource?: string;
  paths?: JsonPath[];
  tasks?: JsonSceneTask[];
  interruptions?: JsonSceneInterruption[];
  evaluation?: JsonSceneEvaluation;
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
  sceneResources?: { id?: string; title: string; type: string; description?: string; url?: string }[];
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
  const pathCount = scene.paths?.length ?? 0;
  if (pathCount > 1) return "conditional";
  if (pathCount === 1) return "gated";
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
    json.scenes.filter((s) => !s.paths || s.paths.length === 0).map((s) => s.id)
  );

  const stepScenes = json.scenes.filter((s) => s.paths && s.paths.length > 0);
  const outcomeScenes = json.scenes.filter((s) => !s.paths || s.paths.length === 0);

  const personas: Persona[] = (json.team ?? []).map((t) => ({
    id: t.name.toLowerCase().replace(/\s+/g, "-"),
    name: t.name,
    role: t.role,
    description: t.description,
  }));

  const resources: ScenarioResource[] = (json.sceneResources ?? []).map((r, i) => ({
    id: r.id ?? `resource-${i}`,
    title: r.title,
    type: r.type,
    description: r.description,
    url: r.url,
  }));

  const defaultPersonaName =
    json.team?.find((t) => t.role.toLowerCase().includes("coach"))?.name ?? "Coach";

  const steps: ScenarioStep[] = stepScenes.map((scene) => {
    const paths = (scene.paths ?? []).map((path) => {
      const connections: StepConnection[] = [];
      let targetStepId: string | undefined;

      if (terminalSceneIds.has(path.target_id)) {
        const targetScene = json.scenes!.find((s) => s.id === path.target_id)!;
        const outcomeType = resolveOutcomeType(targetScene, json.outcomes);
        connections.push({
          label: path.description,
          targetNodeId: path.target_id,
          type: outcomeType,
        });
      } else {
        targetStepId = path.target_id;
      }

      const isTimeout = path.timeout_ms !== undefined;

      const linkedInterruption =
        isTimeout && scene.interruptions && scene.interruptions.length > 0
          ? scene.interruptions[0]
          : undefined;

      return {
        id: path.id,
        label: path.description,
        prerequisite: path.prerequisite,
        ...(connections.length > 0 ? { connections } : {}),
        ...(targetStepId ? { targetStepId } : {}),
        ...(isTimeout && path.timeout_ms ? { timeoutMs: path.timeout_ms } : {}),
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
      persona: scene.persona ?? defaultPersonaName,
      personaAdherence: scene.personaAdherence,
      resource: scene.resource,
      description: scene.description,
      tags: inferTags(scene),
      flowType: inferFlowType(scene),
      tasks: scene.tasks?.map((t) => ({
        id: t.id,
        label: t.label,
        ...(t.shortLabel !== undefined ? { shortLabel: t.shortLabel } : {}),
        required: t.required,
        hidden: t.hidden,
        type: t.type,
        tool: t.tool,
        prerequisite: t.prerequisite,
      })),
      interruptions: scene.interruptions?.map((s) => ({ id: s.id, type: s.type, description: s.description })),
      paths,
      evaluation: mapJsonEvaluation(scene.evaluation),
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
    personas,
    resources,
  };
}
