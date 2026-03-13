export type NodeType = "chat" | "radio" | "document" | "video";
export type OutcomeType = "success" | "failure";
export type TriggerType = "user" | "system";

export interface StepConnection {
  label: string;
  targetNodeId: string;
  type: "success" | "failure" | "default";
}

export interface DecisionPoint {
  label: string;
  trigger: TriggerType;
  connections?: StepConnection[];
}

export interface ScenarioStep {
  id: string;
  title: string;
  type: NodeType;
  persona?: string;
  description: string;
  tags: string[];
  flowType: "conditional" | "gated" | "linear" | "interruption";
  decisionPoints?: DecisionPoint[];
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

export interface ScenarioData {
  title: string;
  scenarioNode: ScenarioNode;
  outcomeNodes: OutcomeNode[];
}
