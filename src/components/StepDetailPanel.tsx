import { useState, useEffect, useRef } from "react";
import {
  ScenarioStep, ScenarioTask, ScenarioPath, OutcomeNode, PrerequisiteCondition, Persona, ScenarioResource,
  TASK_ACTION_TYPES, TaskActionType, CheckboxItem,
} from "@/types/scenario";
import type { OutcomeType } from "@/types/scenario";
import {
  UpdatePathPatch, UpdateTaskPatch, UpdatePersonaPatch, UpdateStepPatch, PathTarget, UpdateEvaluationPatch,
} from "@/hooks/useScenarioEditor";
import { PrerequisiteEditor } from "./PrerequisiteEditor";
import { PrerequisiteDisplay } from "./PrerequisiteDisplay";
import { ConditionCard } from "./ConditionCard";
import { EVALUATION_COMPETENCIES } from "@/data/evaluationCompetencies";
import { cn } from "@/lib/utils";
import {
  MessageSquare, Radio, FileText, Video, X,
  AlertTriangle, CheckCircle2, XCircle,
  Plus, Trash2, UserPlus, ChevronDown, Check,
} from "lucide-react";

interface StepDetailPanelProps {
  step: ScenarioStep | null;
  stepIndex: number;
  allSteps: ScenarioStep[];
  outcomeNodes: OutcomeNode[];
  personas: Persona[];
  resources: ScenarioResource[];
  onClose: () => void;
  onUpdatePath: (stepId: string, pathId: string, patch: UpdatePathPatch) => void;
  onAddPath: (stepId: string, path: ScenarioPath) => void;
  onDeletePath: (stepId: string, pathId: string) => void;
  onUpdateTask: (stepId: string, taskId: string, patch: UpdateTaskPatch) => void;
  onAddTask: (stepId: string, task: ScenarioTask) => void;
  onDeleteTask: (stepId: string, taskId: string) => void;
  onUpdatePersona: (stepId: string, patch: UpdatePersonaPatch) => void;
  onUpdateStep: (stepId: string, patch: UpdateStepPatch) => void;
  onSetPathTarget: (stepId: string, pathId: string, target: PathTarget) => void;
  onClearPathTarget: (stepId: string, pathId: string) => void;
  onCreateOutcomeAndLink: (stepId: string, pathId: string, outcomeType: OutcomeType, title: string) => void;
  onCreateStepAndLink: (fromStepId: string, pathId: string) => void;
  onUpdateEvaluation: (stepId: string, patch: UpdateEvaluationPatch) => void;
  onClearEvaluation: (stepId: string) => void;
  onAddPersonaToCatalog?: (persona: Persona) => void;
}

// ── Helpers ──────────────────────────────────────────────────────
function checkHasPrereq(prereq: PrerequisiteCondition | undefined): boolean {
  if (prereq === undefined || prereq === null) return false;
  if (typeof prereq === "string") return prereq.length > 0;
  return Object.values(prereq).some((arr) => Array.isArray(arr) && arr.length > 0);
}

// ── Type config ──────────────────────────────────────────────────
const typeConfig: Record<string, { icon: typeof MessageSquare; label: string; cssVar: string }> = {
  chat:     { icon: MessageSquare, label: "Chat",     cssVar: "--node-chat" },
  radio:    { icon: Radio,         label: "Radio",    cssVar: "--node-radio" },
  document: { icon: FileText,      label: "Document", cssVar: "--node-document" },
  video:    { icon: Video,         label: "Video",    cssVar: "--node-video" },
};

const flowBadgeStyle: Record<string, string> = {
  conditional:  "bg-node-warning/15 text-node-warning",
  gated:        "bg-node-document/15 text-node-document",
  interruption: "bg-destructive/15 text-destructive",
  linear:       "bg-muted text-muted-foreground",
};

// ── Outcome badge ────────────────────────────────────────────────
const outcomeStyles: Record<OutcomeType, { color: string; bg: string; border: string; icon: typeof CheckCircle2 }> = {
  safe_path:        { color: "hsl(145, 65%, 28%)", bg: "hsl(145, 65%, 95%)", border: "hsl(145, 65%, 78%)", icon: CheckCircle2 },
  partial_failure:  { color: "hsl(40, 75%, 30%)",  bg: "hsl(40, 80%, 95%)",  border: "hsl(40, 80%, 78%)",  icon: AlertTriangle },
  critical_failure: { color: "hsl(0, 65%, 42%)",   bg: "hsl(0, 65%, 96%)",   border: "hsl(0, 65%, 80%)",   icon: XCircle },
};

const OutcomeBadge = ({ outcome, title }: { outcome: OutcomeType; title: string }) => {
  const s = outcomeStyles[outcome];
  const Icon = s.icon;
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
      style={{ color: s.color, background: s.bg, border: `1px solid ${s.border}` }}
    >
      <Icon className="w-2.5 h-2.5 shrink-0" />
      {title}
    </span>
  );
};

// ── Section header ───────────────────────────────────────────────
const SectionHeader = ({ label, count }: { label: string; count?: number }) => (
  <div className="flex items-center gap-2 px-4 pt-4 pb-2">
    <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">
      {label}
    </span>
    {count !== undefined && (
      <span className="text-[8px] font-semibold px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground">
        {count}
      </span>
    )}
    <div className="flex-1 h-px bg-border/50" />
  </div>
);

// ── Toggle pill ──────────────────────────────────────────────────
const TogglePill = ({
  active, label, activeColor, onClick, title,
}: {
  active: boolean; label: string; activeColor: string; onClick: () => void; title?: string;
}) => (
  <button
    onClick={onClick}
    title={title}
    className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full transition-all"
    style={
      active
        ? { background: activeColor + "22", color: activeColor, border: `1px solid ${activeColor}66` }
        : { background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))", border: "1px solid transparent", opacity: 0.5 }
    }
  >
    {label}
  </button>
);

// ── Delete button ────────────────────────────────────────────────
const DeleteButton = ({ onClick, title }: { onClick: () => void; title: string }) => (
  <button
    onClick={onClick}
    title={title}
    className="w-5 h-5 flex items-center justify-center rounded hover:bg-destructive/10 text-muted-foreground/40 hover:text-destructive transition-colors shrink-0"
  >
    <Trash2 className="w-3 h-3" />
  </button>
);

// ── Add button ───────────────────────────────────────────────────
const AddButton = ({ label, onClick }: { label: string; onClick: () => void }) => (
  <button
    onClick={onClick}
    className="mx-4 mb-3 flex items-center gap-1.5 w-[calc(100%-2rem)] px-3 py-2 rounded-lg border border-dashed border-border/60 text-[11px] text-muted-foreground hover:text-foreground hover:border-border transition-colors"
  >
    <Plus className="w-3.5 h-3.5 shrink-0" />
    {label}
  </button>
);

// ── Inline text input ────────────────────────────────────────────
const InlineInput = ({
  value, onChange, placeholder, autoFocus, onBlur, className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  onBlur?: () => void;
  className?: string;
}) => (
  <input
    type="text"
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    autoFocus={autoFocus}
    onBlur={onBlur}
    className={`w-full bg-transparent border-b border-border/25 hover:border-border/60 focus:border-primary/50 outline-none placeholder:text-muted-foreground/40 transition-colors py-0.5 ${className ?? "text-[11px] font-medium"}`}
  />
);

// ── Collapsible prereq row ────────────────────────────────────────
const PrereqSection = ({
  prereq,
  tasks,
  onChange,
  stepId,
  stepIndex,
  onAddTask,
  onUpdateTask,
  excludeTaskIds,
}: {
  prereq: PrerequisiteCondition | undefined;
  tasks: ScenarioTask[];
  onChange: (updated: PrerequisiteCondition | undefined) => void;
  stepId?: string;
  stepIndex?: number;
  onAddTask?: (stepId: string, task: ScenarioTask) => void;
  onUpdateTask?: (stepId: string, taskId: string, patch: UpdateTaskPatch) => void;
  excludeTaskIds?: string[];
}) => {
  const hasPrereq = checkHasPrereq(prereq);
  const [open, setOpen] = useState(hasPrereq);

  return (
    <div className="px-3 py-2 border-t border-border/40">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground/50">
          Prerequisite
        </span>
        <button
          onClick={() => setOpen((v) => !v)}
          className="text-[9px] font-medium transition-colors"
          style={{ color: open ? "hsl(var(--muted-foreground) / 0.6)" : "hsl(var(--primary))" }}
        >
          {open ? "Done" : hasPrereq ? "Edit" : "+ Add"}
        </button>
      </div>
      {open ? (
        <PrerequisiteEditor
          variant="task"
          prerequisite={prereq}
          tasks={tasks as ScenarioTask[]}
          onChange={onChange}
          stepId={stepId}
          stepIndex={stepIndex}
          onAddTask={onAddTask}
          onUpdateTask={onUpdateTask}
          excludeTaskIds={excludeTaskIds}
        />
      ) : hasPrereq ? (
        <PrerequisiteDisplay prerequisite={prereq!} tasks={tasks as ScenarioTask[]} />
      ) : (
        <span className="text-[10px] text-muted-foreground/40 italic">No prerequisite</span>
      )}
    </div>
  );
};

// ── Action type label helper ─────────────────────────────────────
const actionTypeLabel = (t: TaskActionType): string =>
  TASK_ACTION_TYPES.find((a) => a.value === t)?.label ?? t;

const isDocumentAction = (t: TaskActionType): boolean =>
  t === "request_document" ||
  t === "review_document" ||
  t === "review_document_checklist_checked" ||
  t === "review_document_checklist_unchecked" ||
  t === "approve_document";

const isChecklistAction = (t: TaskActionType): boolean =>
  t === "review_document_checklist_checked" ||
  t === "review_document_checklist_unchecked";

// ── CheckboxMultiSelect ──────────────────────────────────────────
const CheckboxMultiSelect = ({
  checkboxes,
  selectedIds,
  onToggle,
}: {
  checkboxes: CheckboxItem[];
  selectedIds: string[];
  onToggle: (id: string) => void;
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const selectedLabels = selectedIds
    .map((id) => checkboxes.find((cb) => cb.id === id))
    .filter(Boolean)
    .map((cb) => cb!.name || cb!.id);

  return (
    <div ref={containerRef} className="flex-1 relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full text-left text-[11px] rounded-md border border-border/50 bg-background px-2 py-1 outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer flex items-center gap-1 min-h-[1.75rem]"
      >
        <span className="flex-1 truncate">
          {selectedLabels.length > 0
            ? selectedLabels.join(", ")
            : <span className="text-muted-foreground/50">Select checkboxes...</span>}
        </span>
        <ChevronDown className="w-3 h-3 shrink-0 text-muted-foreground/40" />
      </button>

      {selectedIds.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1">
          {selectedIds.map((id) => {
            const cb = checkboxes.find((c) => c.id === id);
            return (
              <span
                key={id}
                className="inline-flex items-center gap-1 rounded-full bg-foreground/[0.08] border border-foreground/[0.12] pl-2 pr-1 py-0.5 text-[10px] font-medium text-foreground whitespace-nowrap"
              >
                {cb?.name || id}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggle(id);
                  }}
                  className="shrink-0 w-3.5 h-3.5 flex items-center justify-center rounded-full hover:bg-foreground/15 transition-colors"
                >
                  <X className="w-2 h-2" />
                </button>
              </span>
            );
          })}
        </div>
      )}

      {open && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1 max-h-48 overflow-y-auto rounded-lg border border-border/60 bg-popover shadow-lg">
          {checkboxes.map((cb) => {
            const isSelected = selectedIds.includes(cb.id);
            return (
              <button
                key={cb.id}
                type="button"
                onClick={() => onToggle(cb.id)}
                className={cn(
                  "w-full text-left px-3 py-1.5 text-[11px] hover:bg-accent/50 transition-colors flex items-center gap-2",
                  isSelected && "bg-accent/30",
                )}
              >
                <span className={cn(
                  "w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-colors",
                  isSelected
                    ? "bg-primary border-primary text-primary-foreground"
                    : "border-border/60 bg-background",
                )}>
                  {isSelected && <Check className="w-2.5 h-2.5" />}
                </span>
                <span className="truncate">{cb.name || cb.id}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ── Task row ─────────────────────────────────────────────────────
const TaskRow = ({
  task,
  stepId,
  resources,
  onUpdateTask,
  onDeleteTask,
  autoFocus,
  onAutoFocusDone,
}: {
  task: ScenarioTask;
  stepId: string;
  resources: ScenarioResource[];
  onUpdateTask: (stepId: string, taskId: string, patch: UpdateTaskPatch) => void;
  onDeleteTask: (stepId: string, taskId: string) => void;
  autoFocus?: boolean;
  onAutoFocusDone?: () => void;
}) => (
  <div
    className="mx-4 mb-2 rounded-lg"
    style={{ border: "1px solid hsl(var(--border))" }}
  >
    {/* Header */}
    <div
      className="px-3 py-2 flex items-start gap-2 rounded-t-lg"
      style={{ background: "hsl(var(--secondary) / 0.4)" }}
    >
      {!task.id.startsWith("task-s") && (
        <span
          className="text-[8px] font-mono font-semibold shrink-0 px-1 py-0.5 rounded mt-0.5"
          style={{ background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground) / 0.55)" }}
        >
          {task.id}
        </span>
      )}
      <div className="flex-1 min-w-0 hover:bg-secondary/25 rounded px-1 -mx-1 transition-colors">
        <InlineInput
          value={task.label}
          onChange={(v) => onUpdateTask(stepId, task.id, { label: v })}
          placeholder="Task description…"
          autoFocus={autoFocus}
          onBlur={onAutoFocusDone}
        />
      </div>
      <DeleteButton
        onClick={() => onDeleteTask(stepId, task.id)}
        title="Delete task"
      />
    </div>

    {/* Action type + contextual fields */}
    <div className="px-3 py-2 space-y-2" style={{ borderTop: "1px solid hsl(var(--border) / 0.4)" }}>
      <div>
        <div className="flex items-center gap-2">
          <label className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground/50 shrink-0 w-20">
            Action
          </label>
          <div className="flex-1 relative group/action">
            <select
              value={task.actionType}
              onChange={(e) => onUpdateTask(stepId, task.id, { actionType: e.target.value as TaskActionType })}
              className="w-full text-[11px] rounded-md border border-border/50 bg-background px-2 py-1 outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
              title={TASK_ACTION_TYPES.find((a) => a.value === task.actionType)?.description}
            >
              {TASK_ACTION_TYPES.map((a) => (
                <option key={a.value} value={a.value} title={a.description}>{a.label}</option>
              ))}
            </select>
            <div className="absolute left-0 top-full mt-1 z-50 hidden group-hover/action:block">
              <p className="text-[9px] text-muted-foreground/70 italic leading-snug bg-popover border border-border/60 rounded-md px-2 py-1 shadow-md whitespace-nowrap">
                {TASK_ACTION_TYPES.find((a) => a.value === task.actionType)?.description}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Document selector — for document-based actions */}
      {isDocumentAction(task.actionType) && (
        <div className="flex items-center gap-2">
          <label className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground/50 shrink-0 w-20">
            Document
          </label>
          <select
            value={task.resourceId ?? ""}
            onChange={(e) => onUpdateTask(stepId, task.id, { resourceId: e.target.value || undefined })}
            className="flex-1 text-[11px] rounded-md border border-border/50 bg-background px-2 py-1 outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
          >
            <option value="">— Select document —</option>
            {resources.map((r) => (
              <option key={r.id} value={r.id}>{r.title}</option>
            ))}
          </select>
        </div>
      )}

      {/* Checkbox items — multi-select for checklist actions */}
      {isChecklistAction(task.actionType) && (() => {
        const selectedResource = task.resourceId
          ? resources.find((r) => r.id === task.resourceId)
          : undefined;
        const checkboxes = selectedResource?.checkboxItems ?? [];
        const selectedIds: string[] = task.checklistItemIds
          ?? (task.checklistItemId ? [task.checklistItemId] : []);

        const toggleItem = (id: string) => {
          const next = selectedIds.includes(id)
            ? selectedIds.filter((x) => x !== id)
            : [...selectedIds, id];
          onUpdateTask(stepId, task.id, {
            checklistItemIds: next.length > 0 ? next : undefined,
            checklistItemId: next[0] ?? undefined,
          });
        };

        return (
          <div className="flex items-start gap-2">
            <label className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground/50 shrink-0 w-20 mt-1.5">
              Checkbox
            </label>
            {checkboxes.length > 0 ? (
              <CheckboxMultiSelect
                checkboxes={checkboxes}
                selectedIds={selectedIds}
                onToggle={toggleItem}
              />
            ) : (
              <span className="flex-1 text-[10px] text-muted-foreground/50 italic py-1">
                {task.resourceId
                  ? "No checkboxes defined on this document"
                  : "Select a document first"}
              </span>
            )}
          </div>
        );
      })()}

      {/* Chat criteria — for chat actions */}
      {task.actionType === "chat" && (
        <div className="flex items-start gap-2">
          <label className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground/50 shrink-0 w-20 mt-1">
            AI Instructions
          </label>
          <textarea
            value={task.chatCriteria ?? ""}
            onChange={(e) => onUpdateTask(stepId, task.id, { chatCriteria: e.target.value || undefined })}
            placeholder='Please write AI instruction, for example: "If learner asks the bleeder valve to be open, then this task is accomplished, and Tom responds with OK, opened bleeder valve, zero energy verified"'
            rows={2}
            className="flex-1 text-[11px] rounded-md border border-border/50 bg-background px-2 py-1 outline-none focus:ring-2 focus:ring-primary/20 resize-none italic placeholder:italic"
          />
        </div>
      )}

      {/* Score increment */}
      <div className="flex items-center gap-2">
        <label className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground/50 shrink-0 w-20">
          Score +
        </label>
        <input
          type="number"
          min={0}
          value={task.scoreIncrement ?? ""}
          onChange={(e) => {
            const val = e.target.value === "" ? undefined : parseInt(e.target.value, 10);
            onUpdateTask(stepId, task.id, { scoreIncrement: val });
          }}
          placeholder="0"
          className="w-20 text-[11px] rounded-md border border-border/50 bg-background px-2 py-1 outline-none focus:ring-2 focus:ring-primary/20"
        />
        <span className="text-[9px] text-muted-foreground/50 italic">points when achieved</span>
      </div>
    </div>
  </div>
);

// PathRow / AddPathForm removed — replaced by ConditionCard
// (see ConditionCard.tsx)


// ── Evaluation section (authoring only; fixed competency list) ───
const EvaluationSection = ({
  step,
  onUpdateEvaluation,
  onClearEvaluation,
}: {
  step: ScenarioStep;
  onUpdateEvaluation: (stepId: string, patch: UpdateEvaluationPatch) => void;
  onClearEvaluation: (stepId: string) => void;
}) => {
  const ev = step.evaluation;
  const expectedBehavior = ev?.expectedBehavior ?? "";
  const competency = ev?.competency ?? "";
  const notes = ev?.notes ?? "";

  return (
    <div
      className="mx-4 mb-3 rounded-lg overflow-hidden opacity-90"
      style={{ border: "1px solid hsl(var(--border) / 0.65)" }}
    >
      <div
        className="px-3 pt-2.5 pb-2 space-y-2.5"
        style={{ background: "hsl(var(--muted) / 0.25)" }}
      >
        <p className="text-[8px] text-muted-foreground/55 leading-relaxed">
          Optional context for IDs and SMEs. Not used for scoring or reporting.
        </p>

        <div>
          <label className="text-[8px] font-semibold uppercase tracking-wider text-muted-foreground/50 block mb-1">
            Expected behavior
          </label>
          <textarea
            value={expectedBehavior}
            onChange={(e) => onUpdateEvaluation(step.id, { expectedBehavior: e.target.value })}
            placeholder="What should the learner do or demonstrate at this step?"
            rows={3}
            className="w-full text-[11px] rounded-md border border-border/50 bg-background/80 px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/35 transition-all resize-none placeholder:text-muted-foreground/35"
          />
        </div>

        <div>
          <label className="text-[8px] font-semibold uppercase tracking-wider text-muted-foreground/50 block mb-1">
            Competency
          </label>
          <select
            value={competency}
            onChange={(e) =>
              onUpdateEvaluation(step.id, {
                competency: e.target.value as UpdateEvaluationPatch["competency"],
              })
            }
            className="w-full text-[11px] rounded-md border border-border/50 bg-background/80 px-2 py-1.5 outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
          >
            <option value="">— None —</option>
            {EVALUATION_COMPETENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[8px] font-semibold uppercase tracking-wider text-muted-foreground/50 block mb-1">
            Notes <span className="font-normal normal-case text-muted-foreground/40">(optional)</span>
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => onUpdateEvaluation(step.id, { notes: e.target.value })}
            placeholder="Short rationale or reminder"
            className="w-full text-[11px] rounded-md border border-border/50 bg-background/80 px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/35"
          />
        </div>
      </div>

      <div className="px-3 py-1.5 flex justify-end" style={{ borderTop: "1px solid hsl(var(--border) / 0.45)" }}>
        <button
          type="button"
          onClick={() => onClearEvaluation(step.id)}
          disabled={!ev}
          className="text-[9px] text-muted-foreground/40 hover:text-destructive transition-colors disabled:opacity-30 disabled:pointer-events-none"
        >
          Clear evaluation
        </button>
      </div>
    </div>
  );
};

// ── Main panel ───────────────────────────────────────────────────
export const StepDetailPanel = ({
  step,
  stepIndex,
  allSteps,
  outcomeNodes,
  personas,
  resources,
  onClose,
  onUpdatePath,
  onAddPath,
  onDeletePath,
  onUpdateTask,
  onAddTask,
  onDeleteTask,
  onUpdatePersona,
  onUpdateStep,
  onSetPathTarget,
  onClearPathTarget,
  onCreateOutcomeAndLink,
  onCreateStepAndLink,
  onUpdateEvaluation,
  onClearEvaluation,
  onAddPersonaToCatalog,
}: StepDetailPanelProps) => {
  const [justAddedTaskId, setJustAddedTaskId] = useState<string | null>(null);
  const [addingCharacter, setAddingCharacter] = useState(false);
  const [newCharName, setNewCharName] = useState("");
  const [newCharRole, setNewCharRole] = useState("");
  const [newCharDescription, setNewCharDescription] = useState("");
  const [newCharCommStyle, setNewCharCommStyle] = useState("");

  const isOpen = step !== null;
  const cfg = step ? typeConfig[step.type] ?? typeConfig.chat : null;
  const Icon = cfg?.icon ?? MessageSquare;

  const handleAddTask = () => {
    if (!step) return;
    const newId = `task-s${stepIndex + 1}-${Date.now()}`;
    const newTask: ScenarioTask = {
      id: newId,
      label: "",
      actionType: "chat",
    };
    setJustAddedTaskId(newId);
    onAddTask(step.id, newTask);
  };

  const handleAddBlankPath = () => {
    if (!step) return;
    const newPath: ScenarioPath = {
      id: `path-${stepIndex + 1}-new-${Date.now()}`,
      label: "Condition",
      prerequisite: "",
    };
    onAddPath(step.id, newPath);
  };

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen || !step || !cfg) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-30 flex items-start justify-center pt-14 pb-6 px-3 sm:px-4 overflow-y-auto bg-black/45 backdrop-blur-[2px]"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-7xl max-h-[min(92vh,960px)] min-h-0 flex flex-col bg-background border border-border rounded-xl shadow-2xl overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
          {/* ── Header ─────────────────────────────────────────── */}
          <div
            className="flex items-start gap-3 px-4 py-3 shrink-0"
            style={{
              background: `hsl(var(${cfg.cssVar}) / 0.07)`,
              borderBottom: `2px solid hsl(var(${cfg.cssVar}) / 0.15)`,
            }}
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5"
              style={{ background: `hsl(var(${cfg.cssVar}))`, color: "white" }}
            >
              {stepIndex + 1}
            </div>
            <div className="flex-1 min-w-0">
              {/* Editable title */}
              <div className="hover:bg-secondary/25 rounded px-1 -mx-1 transition-colors">
                <InlineInput
                  value={step.title}
                  onChange={(v) => onUpdateStep(step.id, { title: v })}
                  placeholder="Step title…"
                  className="font-bold text-sm text-foreground leading-tight"
                />
              </div>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                <span
                  className="flex items-center gap-1 text-[9px] font-semibold"
                  style={{ color: `hsl(var(${cfg.cssVar}))` }}
                >
                  <Icon className="w-2.5 h-2.5" />
                  {cfg.label}
                </span>
                <span className="text-muted-foreground/30 text-[9px]">·</span>
                <span className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${flowBadgeStyle[step.flowType]}`}>
                  {step.flowType}
                </span>
                {step.resource && step.type !== "chat" && step.type !== "radio" && (
                  <>
                    <span className="text-muted-foreground/30 text-[9px]">·</span>
                    <span className="flex items-center gap-0.5 text-[9px] text-muted-foreground">
                      <FileText className="w-2.5 h-2.5" />
                      {step.resource}
                    </span>
                  </>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-secondary transition-colors shrink-0 mt-0.5"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* ── Scrollable content ─────────────────────────────── */}
          <div className="flex-1 overflow-y-auto">

            {/* Step — description */}
            <SectionHeader label="Step" />
            <div className="px-4 pb-1">
              <label className="text-[8px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                Description
              </label>
              <textarea
                value={step.description ?? ""}
                onChange={(e) => onUpdateStep(step.id, { description: e.target.value })}
                placeholder="What does the learner experience in this step?"
                rows={2}
                className="mt-1 w-full text-[11px] rounded-md border border-border/60 bg-background px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all resize-none"
              />
            </div>

            {/* Modality */}
            <SectionHeader label="Modality" />
            <div className="px-4 pb-3">
              <label className="text-[8px] font-semibold uppercase tracking-wider text-muted-foreground/60 block mb-1.5">
                Interaction Type
              </label>
              <div className="flex gap-1.5">
                {(
                  [
                    { value: "chat",     icon: MessageSquare, label: "Chat" },
                    { value: "radio",    icon: Radio,         label: "Radio" },
                    { value: "document", icon: FileText,      label: "Document" },
                    { value: "video",    icon: Video,         label: "Video" },
                  ] as const
                ).map(({ value, icon: Icon, label }) => {
                  const isActive = step.type === value;
                  return (
                    <button
                      key={value}
                      onClick={() => onUpdateStep(step.id, { type: value })}
                      className="flex-1 flex flex-col items-center gap-1 py-2 px-1 rounded-lg border transition-all text-[9px] font-semibold"
                      style={
                        isActive
                          ? {
                              background: `hsl(var(--node-${value}) / 0.12)`,
                              borderColor: `hsl(var(--node-${value}) / 0.6)`,
                              color: `hsl(var(--node-${value}))`,
                            }
                          : {
                              background: "hsl(var(--muted) / 0.4)",
                              borderColor: "hsl(var(--border) / 0.5)",
                              color: "hsl(var(--muted-foreground) / 0.5)",
                            }
                      }
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Persona — only for chat & radio modalities */}
            {(step.type === "chat" || step.type === "radio") && (
              <>
                <SectionHeader label="Persona" />
                <div className="px-4 pb-3">
                  {/* Character select */}
                  <div className="space-y-1 mb-3">
                    <label className="text-[8px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                      Character
                    </label>
                    <select
                      value={step.persona ?? ""}
                      onChange={(e) => {
                        if (e.target.value === "__add_new__") {
                          setAddingCharacter(true);
                          return;
                        }
                        onUpdatePersona(step.id, { persona: e.target.value || undefined });
                      }}
                      className="w-full text-[11px] rounded-md border border-border/60 bg-background px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all"
                    >
                      <option value="">— No character assigned —</option>
                      {personas.map((p) => (
                        <option key={p.id} value={p.name}>
                          {p.name} · {p.role}
                        </option>
                      ))}
                      {onAddPersonaToCatalog && (
                        <option value="__add_new__">+ Add character…</option>
                      )}
                    </select>
                    {step.persona && personas.length > 0 && (() => {
                      const matched = personas.find((p) => p.name === step.persona);
                      if (!matched) return null;
                      return (
                        <p className="text-[9px] text-muted-foreground/60 leading-relaxed mt-1 italic line-clamp-1">
                          {matched.communicationStyle || matched.description || matched.role}
                        </p>
                      );
                    })()}

                    {/* Inline add-character form (matches library fields) */}
                    {addingCharacter && onAddPersonaToCatalog && (
                      <div
                        className="mt-2 rounded-lg overflow-hidden"
                        style={{ border: "1px dashed hsl(var(--border))", background: "hsl(var(--secondary) / 0.2)" }}
                      >
                        <div className="px-3 py-2.5 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground/60 flex items-center gap-1">
                              <UserPlus className="w-3 h-3" />
                              New Character
                            </span>
                            <button
                              onClick={() => { setAddingCharacter(false); setNewCharName(""); setNewCharRole(""); setNewCharDescription(""); setNewCharCommStyle(""); }}
                              className="w-4 h-4 flex items-center justify-center rounded hover:bg-secondary"
                            >
                              <X className="w-3 h-3 text-muted-foreground" />
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <span className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground/50 block mb-0.5">Name *</span>
                              <input
                                type="text"
                                value={newCharName}
                                onChange={(e) => setNewCharName(e.target.value)}
                                placeholder="Character name…"
                                autoFocus
                                className="w-full text-[11px] rounded-md border border-border/60 bg-background px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all"
                              />
                            </div>
                            <div>
                              <span className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground/50 block mb-0.5">Role *</span>
                              <input
                                type="text"
                                value={newCharRole}
                                onChange={(e) => setNewCharRole(e.target.value)}
                                placeholder="e.g. Control Room Operator"
                                className="w-full text-[11px] rounded-md border border-border/60 bg-background px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all"
                              />
                            </div>
                          </div>
                          <div>
                            <span className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground/50 block mb-0.5">Personality / Background</span>
                            <textarea
                              value={newCharDescription}
                              onChange={(e) => setNewCharDescription(e.target.value)}
                              placeholder="Who is this character? What motivates them?"
                              rows={2}
                              className="w-full text-[11px] rounded-md border border-border/60 bg-background px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all resize-none"
                            />
                          </div>
                          <div>
                            <span className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground/50 block mb-0.5">Communication Style</span>
                            <input
                              type="text"
                              value={newCharCommStyle}
                              onChange={(e) => setNewCharCommStyle(e.target.value)}
                              placeholder="e.g. Direct, concise, slightly defensive under pressure…"
                              className="w-full text-[11px] rounded-md border border-border/60 bg-background px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all"
                            />
                          </div>
                          <button
                            onClick={() => {
                              if (!newCharName.trim() || !newCharRole.trim()) return;
                              const id = newCharName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") || `persona-${Date.now()}`;
                              const uniqueId = personas.some((p) => p.id === id) ? `${id}-${Date.now()}` : id;
                              onAddPersonaToCatalog({
                                id: uniqueId,
                                name: newCharName.trim(),
                                role: newCharRole.trim(),
                                description: newCharDescription.trim() || undefined,
                                communicationStyle: newCharCommStyle.trim() || undefined,
                              });
                              onUpdatePersona(step.id, { persona: newCharName.trim() });
                              setAddingCharacter(false);
                              setNewCharName("");
                              setNewCharRole("");
                              setNewCharDescription("");
                              setNewCharCommStyle("");
                            }}
                            disabled={!newCharName.trim() || !newCharRole.trim()}
                            className="w-full py-1.5 rounded-md text-[11px] font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                            style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}
                          >
                            Add & Assign
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Adherence */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[8px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                        Persona Adherence
                      </label>
                      <span
                        className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                        style={
                          step.personaAdherence
                            ? {
                                background: `hsl(${220 - (step.personaAdherence - 1) * 22}, 70%, 52%, 0.12)`,
                                color: `hsl(${220 - (step.personaAdherence - 1) * 22}, 70%, 42%)`,
                                border: `1px solid hsl(${220 - (step.personaAdherence - 1) * 22}, 70%, 52%, 0.25)`,
                              }
                            : { background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))" }
                        }
                      >
                        {step.personaAdherence ? `${step.personaAdherence} / 5` : "—"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          onClick={() =>
                            onUpdatePersona(step.id, {
                              personaAdherence: n === step.personaAdherence ? undefined : n,
                            })
                          }
                          title={
                            n === 1 ? "1 – Minimal adherence"
                            : n === 2 ? "2 – Loose adherence"
                            : n === 3 ? "3 – Moderate adherence"
                            : n === 4 ? "4 – Strong adherence"
                            : "5 – Strict adherence"
                          }
                          className="flex-1 py-1.5 rounded text-[10px] font-bold transition-all"
                          style={
                            (step.personaAdherence ?? 0) >= n
                              ? {
                                  background: `hsl(${220 - (n - 1) * 22}, 70%, 52%)`,
                                  color: "white",
                                  border: "1px solid transparent",
                                }
                              : {
                                  background: "hsl(var(--muted))",
                                  color: "hsl(var(--muted-foreground) / 0.4)",
                                  border: "1px solid hsl(var(--border) / 0.5)",
                                }
                          }
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                    <p className="text-[9px] text-muted-foreground/50 italic">
                      {step.personaAdherence === 1 && "Minimal — character deviates significantly from their defined persona"}
                      {step.personaAdherence === 2 && "Loose — character follows their persona loosely"}
                      {step.personaAdherence === 3 && "Moderate — character mostly follows their defined persona"}
                      {step.personaAdherence === 4 && "Strong — character closely adheres to their defined persona"}
                      {step.personaAdherence === 5 && "Strict — character follows their defined persona exactly"}
                      {!step.personaAdherence && "Not set — click a level to configure behavioral adherence"}
                    </p>
                  </div>
                </div>
              </>
            )}

            {/* Document — only for document modality */}
            {step.type === "document" && (
              <>
                <SectionHeader label="Document" />
                <div className="px-4 pb-3">
                  <div className="space-y-1">
                    <label className="text-[8px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                      Assigned Document
                    </label>
                    {(() => {
                      const docResources = resources.filter(
                        (r) => r.type.toLowerCase() === "document" || r.type.toLowerCase() === "pdf" || r.type.toLowerCase() === "file"
                      );
                      const hasAnyResources = resources.length > 0;
                      return hasAnyResources ? (
                        <>
                          <select
                            value={step.resource ?? ""}
                            onChange={(e) => onUpdateStep(step.id, { resource: e.target.value || undefined })}
                            className="w-full text-[11px] rounded-md border border-border/60 bg-background px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all"
                          >
                            <option value="">— No document assigned —</option>
                            {docResources.length > 0 && (
                              <optgroup label="Documents">
                                {docResources.map((r) => (
                                  <option key={r.id} value={r.id}>
                                    {r.title}
                                  </option>
                                ))}
                              </optgroup>
                            )}
                            {resources.filter((r) => !docResources.includes(r)).length > 0 && (
                              <optgroup label="Other Resources">
                                {resources.filter((r) => !docResources.includes(r)).map((r) => (
                                  <option key={r.id} value={r.id}>
                                    {r.title} ({r.type})
                                  </option>
                                ))}
                              </optgroup>
                            )}
                          </select>
                          {step.resource && (() => {
                            const matched = resources.find((r) => r.id === step.resource);
                            if (!matched) return null;
                            return (
                              <p className="text-[9px] text-muted-foreground/60 leading-relaxed mt-1 line-clamp-2">
                                {matched.description}
                                {matched.url && (
                                  <a
                                    href={matched.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="ml-1 text-primary hover:underline"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    ↗ Open
                                  </a>
                                )}
                              </p>
                            );
                          })()}
                        </>
                      ) : (
                        <p className="text-[10px] text-muted-foreground/50 italic py-1">
                          No resources defined. Add documents in the Scenario Library.
                        </p>
                      );
                    })()}
                  </div>
                </div>
              </>
            )}

            {/* Message Description — for chat & radio modalities */}
            {(step.type === "chat" || step.type === "radio") && (
              <>
                <SectionHeader label="Description" />
                <div className="px-4 pb-3">
                  <div className="space-y-1">
                    <label className="text-[8px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                      {step.type === "chat" ? "Nature of the Chat Message" : "Nature of the Radio Message"}
                    </label>
                    <textarea
                      value={step.messageDescription ?? ""}
                      onChange={(e) => onUpdateStep(step.id, { messageDescription: e.target.value || undefined })}
                      placeholder={
                        step.type === "chat"
                          ? "Describe what this chat exchange is about…"
                          : "Describe what this radio message is about…"
                      }
                      rows={3}
                      className="w-full text-[11px] rounded-md border border-border/60 bg-background px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all resize-none"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Resource — for video modality only */}
            {step.type === "video" && (
              <>
                <SectionHeader label="Resource" />
                <div className="px-4 pb-3">
                  <div className="space-y-1">
                    <label className="text-[8px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                      Assigned Resource
                    </label>
                    {resources.length > 0 ? (
                      <select
                        value={step.resource ?? ""}
                        onChange={(e) => onUpdateStep(step.id, { resource: e.target.value || undefined })}
                        className="w-full text-[11px] rounded-md border border-border/60 bg-background px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all"
                      >
                        <option value="">— No resource —</option>
                        {resources.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.title} ({r.type})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-[10px] text-muted-foreground/50 italic py-1">
                        No resources defined. Add them in the Scenario Library.
                      </p>
                    )}
                    {step.resource && resources.length > 0 && (() => {
                      const matched = resources.find((r) => r.id === step.resource);
                      if (!matched) return null;
                      return (
                        <p className="text-[9px] text-muted-foreground/60 leading-relaxed mt-1 line-clamp-2">
                          {matched.description}
                          {matched.url && (
                            <a
                              href={matched.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ml-1 text-primary hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              ↗ Open
                            </a>
                          )}
                        </p>
                      );
                    })()}
                  </div>
                </div>
              </>
            )}

            {/* Tasks */}
            <SectionHeader label="Tasks" count={step.tasks?.length ?? 0} />
            {(step.tasks ?? []).map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                stepId={step.id}
                resources={resources}
                onUpdateTask={onUpdateTask}
                onDeleteTask={onDeleteTask}
                autoFocus={task.id === justAddedTaskId}
                onAutoFocusDone={() => setJustAddedTaskId(null)}
              />
            ))}
            <AddButton label="Add task" onClick={handleAddTask} />

            {/* Conditions — evaluated in order, first match wins */}
            <SectionHeader label="Conditions" count={step.paths?.length ?? 0} />
            <div className="px-4 space-y-3 pb-2">
              {(step.paths ?? []).map((path) => (
                <ConditionCard
                  key={path.id}
                  path={path}
                  step={step}
                  allSteps={allSteps}
                  outcomeNodes={outcomeNodes}
                  resources={resources}
                  onUpdatePath={onUpdatePath}
                  onDeletePath={onDeletePath}
                  onSetPathTarget={onSetPathTarget}
                  onClearPathTarget={onClearPathTarget}
                  onCreateOutcomeAndLink={onCreateOutcomeAndLink}
                  onCreateStepAndLink={onCreateStepAndLink}
                />
              ))}
            </div>
            <AddButton label="Add condition" onClick={handleAddBlankPath} />

            {/* Evaluation */}
            <SectionHeader label="Evaluation" />
            <EvaluationSection
              step={step}
              onUpdateEvaluation={onUpdateEvaluation}
              onClearEvaluation={onClearEvaluation}
            />

            <div className="h-8" />
          </div>
    </div>
    </div>
  );
};
