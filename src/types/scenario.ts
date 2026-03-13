export type NodeType = "chat" | "radio" | "document" | "video";
export type OutcomeType = "success" | "failure";
export type TriggerType = "user" | "system";

export interface DecisionPointBranch {
  label: string;
  targetNodeId: string;
  type: "success" | "failure" | "default";
}

export interface DecisionPoint {
  label: string;
  trigger: TriggerType;
  branches?: DecisionPointBranch[];
}

export interface FlowBranch {
  label: string;
  targetNodeId: string;
  type: "success" | "failure" | "default";
}

export interface ScenarioNode {
  id: string;
  title: string;
  type: NodeType;
  persona?: string;
  description: string;
  tags: string[];
  flowType: "conditional" | "gated" | "linear" | "interruption";
  branches: FlowBranch[];
  decisionPoints?: DecisionPoint[];
  outcome?: OutcomeType;
  position: { x: number; y: number };
}

export interface ScenarioData {
  title: string;
  nodes: ScenarioNode[];
}
