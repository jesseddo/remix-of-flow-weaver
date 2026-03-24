export type NodeType = "chat" | "radio" | "document" | "video";
export type OutcomeType = "safe_path" | "partial_failure" | "critical_failure";
export type TriggerType = "user" | "system" | "timeout";

export interface StepConnection {
  label: string;
  targetNodeId: string;
  type: "safe_path" | "partial_failure" | "critical_failure" | "default";
}

export interface DecisionPoint {
  id: string;
  label: string;
  criteria?: string;
  trigger: TriggerType;
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
}

export interface ScenarioInterruption {
  id: string;
  type: string;
  description: string;
}

export interface StepEvaluation {
  competency: string;
  weight: "high" | "medium" | "low";
  requirement: string;
}

export interface ScenarioStep {
  id: string;
  title: string;
  type: NodeType;
  persona?: string;
  resource?: string;
  description: string;
  tags: string[];
  flowType: "conditional" | "gated" | "linear" | "interruption";
  tasks?: ScenarioTask[];
  interruptions?: ScenarioInterruption[];
  decisionPoints?: DecisionPoint[];
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
}
