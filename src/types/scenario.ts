import type { EvaluationCompetency } from "@/data/evaluationCompetencies";

export type NodeType = "chat" | "radio" | "document" | "video";
export type OutcomeType = "safe_path" | "partial_failure" | "critical_failure";

/**
 * How a task is achieved:
 * - request_document: learner opens / requests to see a document
 * - review_document: learner closes a document (finished reviewing)
 * - review_document_checklist_checked: learner reviews and checks a specific checklist item
 * - review_document_checklist_unchecked: learner reviews and unchecks a specific checklist item
 * - approve_document: learner approves / signs off on a document
 * - chat: AI Task Validation — the AI evaluates the response against `chatCriteria`
 */
export type TaskActionType =
  | "request_document"
  | "review_document"
  | "review_document_checklist_checked"
  | "review_document_checklist_unchecked"
  | "approve_document"
  | "chat";

export const TASK_ACTION_TYPES: { value: TaskActionType; label: string; description: string }[] = [
  { value: "request_document", label: "Request document", description: "Triggered when the learner opens or asks to see a document" },
  { value: "review_document", label: "Review document", description: "Triggered when the learner closes a document after reviewing it" },
  { value: "review_document_checklist_checked", label: "Review with checklist item checked", description: "Triggered when the learner checks a specific checklist item on a document" },
  { value: "review_document_checklist_unchecked", label: "Review with checklist item unchecked", description: "Triggered when the learner unchecks a specific checklist item on a document" },
  { value: "approve_document", label: "Approve document", description: "Triggered when the learner approves or signs off on a document" },
  { value: "chat", label: "AI Task Validation", description: "Uses AI to evaluate whether a specific learner behavior was accomplished" },
];

export interface Persona {
  id: string;
  name: string;
  role: string;
  description?: string;
  communicationStyle?: string;
}

export interface CheckboxItem {
  id: string;
  name: string;
}

export interface ScenarioResource {
  id: string;
  title: string;
  type: string;
  description?: string;
  url?: string;
  fileName?: string;
  /** Optional checkbox items for documents with checklists. */
  checkboxItems?: CheckboxItem[];
}

export type PrerequisiteCondition =
  | string
  | {
      all?: string[];
      none?: string[];
      /** Legacy single OR group — prefer `anyGroups` for new data. */
      any?: string[];
      /** Multiple OR groups: each inner array requires at least one task done. All groups are AND'd. */
      anyGroups?: string[][];
    };

export interface StepConnection {
  label: string;
  targetNodeId: string;
  type: "safe_path" | "partial_failure" | "critical_failure" | "default";
}

/**
 * A condition within a step's flow control.
 * Each condition is a set of required tasks leading to a step or outcome.
 * Conditions are evaluated in order — the first match wins.
 */
export interface ScenarioPath {
  id: string;
  label: string;
  prerequisite: PrerequisiteCondition;
  connections?: StepConnection[];
  targetStepId?: string;
  /** Retained destination name for broken-reference display after a target node is deleted. */
  targetLabel?: string;
}

export interface ScenarioTask {
  id: string;
  label: string;
  shortLabel?: string;
  actionType: TaskActionType;
  /** Document (resource) this task operates on (for document-based actions). */
  resourceId?: string;
  /** Specific checklist item ID (for checklist_checked / checklist_unchecked). @deprecated Use checklistItemIds. */
  checklistItemId?: string;
  /** Checklist item IDs (for checklist_checked / checklist_unchecked). Supports multi-select. */
  checklistItemIds?: string[];
  /** AI instructions used to evaluate chat messages (for actionType "chat"). */
  chatCriteria?: string;
  /** Points added to the learner's score when this task is achieved. */
  scoreIncrement?: number;
}

export interface ScenarioInterruption {
  id: string;
  type: string;
  description: string;
}

export type { EvaluationCompetency };

/** Lightweight step-level evaluation metadata (authoring + preview only; no scoring). */
export interface StepEvaluation {
  expectedBehavior: string;
  competency: EvaluationCompetency | "";
  notes?: string;
}

export interface ScenarioStep {
  id: string;
  title: string;
  type: NodeType;
  persona?: string;
  personaAdherence?: number;
  resource?: string;
  /** For chat / radio steps: describes the nature of the message or exchange. */
  messageDescription?: string;
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
  /** Only one global timer per scenario. Starts at scenario start; ignored if learner is already on or past the target step. */
  globalTimer?: GlobalTimer;
  personas: Persona[];
  resources: ScenarioResource[];
}

export interface ModuleData {
  id: string;
  title: string;
  description: string;
  personas: Persona[];
  resources: ScenarioResource[];
  scenarios: ScenarioData[];
}
