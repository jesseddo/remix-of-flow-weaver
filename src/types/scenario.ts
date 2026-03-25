export type NodeType = "chat" | "radio" | "document" | "video";
export type OutcomeType = "safe_path" | "partial_failure" | "critical_failure";

export interface Persona {
  id: string;
  name: string;
  role: string;
  description?: string;
  communicationStyle?: string;
}

export interface ScenarioResource {
  id: string;
  title: string;
  type: string;
  description?: string;
  url?: string;
  fileName?: string;
}

export type PrerequisiteCondition =
  | string
  | { all?: string[]; none?: string[]; any?: string[] };

export interface StepConnection {
  label: string;
  targetNodeId: string;
  type: "safe_path" | "partial_failure" | "critical_failure" | "default";
}

export interface ScenarioPath {
  id: string;
  label: string;
  prerequisite: PrerequisiteCondition;
  connections?: StepConnection[];
  targetStepId?: string;
  timeoutMs?: number;
  interruptionType?: string;
  interruptionLabel?: string;
}

export interface ScenarioTask {
  id: string;
  label: string;
  required: boolean;
  hidden?: boolean;
  type?: "behavioral" | "tool";
  tool?: {
    action: string;
    resourceId?: string;
  };
  prerequisite?: PrerequisiteCondition;
}

export interface ScenarioInterruption {
  id: string;
  type: string;
  description: string;
}

export interface StepEvaluation {
  competency: string;
  /** API ID that matches the simulation engine payload, e.g. "C4_Safeguard_Verification" */
  competencyId?: string;
  weight: "high" | "medium" | "low";
  requirement: string;
}

export interface ScenarioStep {
  id: string;
  title: string;
  type: NodeType;
  persona?: string;
  personaAdherence?: number;
  resource?: string;
  description: string;
  tags: string[];
  flowType: "conditional" | "gated" | "linear" | "interruption";
  tasks?: ScenarioTask[];
  interruptions?: ScenarioInterruption[];
  paths?: ScenarioPath[];
  evaluation?: StepEvaluation;
}

export interface ScenarioNode {
  id: string;
  title: string;
  description?: string;
  steps?: ScenarioStep[];
  position: { x: number; y: number };
}

export interface OutcomeNode {
  id: string;
  title: string;
  type: NodeType;
  description: string;
  tags: string[];
  outcome: OutcomeType;
  position: { x: number; y: number };
}

export interface GlobalTimer {
  id: string;
  name: string;
  timeoutMs: number;
  targetStepId: string;
}

export interface ScenarioData {
  title: string;
  scenarioNode: ScenarioNode;
  outcomeNodes: OutcomeNode[];
  globalTimers: GlobalTimer[];
  personas: Persona[];
  resources: ScenarioResource[];
}
