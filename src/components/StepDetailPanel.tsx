import { useState, useEffect, type MouseEvent } from "react";
import {
  ScenarioStep, ScenarioTask, ScenarioPath, OutcomeNode, PrerequisiteCondition, Persona, ScenarioResource,
} from "@/types/scenario";
import {
  UpdatePathPatch, UpdateTaskPatch, UpdatePersonaPatch, UpdateStepPatch, PathTarget, UpdateEvaluationPatch,
} from "@/hooks/useScenarioEditor";
import { PrerequisiteEditor } from "./PrerequisiteEditor";
import { PrerequisiteDisplay } from "./PrerequisiteDisplay";
import { EVALUATION_COMPETENCIES } from "@/data/evaluationCompetencies";
import {
  formatAuthoringConsequenceLine,
  formatConditionBullets,
  getOutcomeChunk,
  getPathBranchTone,
  getPathDestination,
  type BranchTone,
} from "@/utils/pathCausality";
import { cn } from "@/lib/utils";
import {
  MessageSquare, Radio, FileText, Video, X,
  ChevronRight, AlertTriangle, CheckCircle2, XCircle,
  Plus, Trash2, Pencil,
} from "lucide-react";
import type { OutcomeType } from "@/types/scenario";

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
  onAddPathCondition: (
    stepId: string,
    pathId: string,
    task: ScenarioTask,
    prerequisite: PrerequisiteCondition,
  ) => void;
  onDeleteTask: (stepId: string, taskId: string) => void;
  onUpdatePersona: (stepId: string, patch: UpdatePersonaPatch) => void;
  onUpdateStep: (stepId: string, patch: UpdateStepPatch) => void;
  onSetPathTarget: (stepId: string, pathId: string, target: PathTarget) => void;
  onUpdateEvaluation: (stepId: string, patch: UpdateEvaluationPatch) => void;
  onClearEvaluation: (stepId: string) => void;
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

// ── Task row ─────────────────────────────────────────────────────
const TaskRow = ({
  task,
  stepId,
  stepIndex,
  allTasks,
  onUpdateTask,
  onAddTask,
  onDeleteTask,
  autoFocus,
  onAutoFocusDone,
}: {
  task: ScenarioTask;
  stepId: string;
  stepIndex: number;
  allTasks: ScenarioTask[];
  onUpdateTask: (stepId: string, taskId: string, patch: UpdateTaskPatch) => void;
  onAddTask: (stepId: string, task: ScenarioTask) => void;
  onDeleteTask: (stepId: string, taskId: string) => void;
  autoFocus?: boolean;
  onAutoFocusDone?: () => void;
}) => (
  <div
    className="mx-4 mb-2 rounded-lg overflow-hidden"
    style={{ border: "1px solid hsl(var(--border))" }}
  >
    {/* Header */}
    <div
      className="px-3 py-2 flex items-start gap-2"
      style={{ background: "hsl(var(--secondary) / 0.4)" }}
    >
      {/* ID badge — hidden for auto-generated IDs */}
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
      <div className="flex items-center gap-1 shrink-0 mt-0.5">
        <TogglePill
          active={task.required}
          label="Required"
          activeColor="hsl(220, 70%, 52%)"
          onClick={() => onUpdateTask(stepId, task.id, { required: !task.required })}
        />
        <TogglePill
          active={task.hidden ?? false}
          label="Hidden"
          activeColor="hsl(260, 60%, 52%)"
          title="Hidden tasks are tracked by the system but not shown to the learner"
          onClick={() => onUpdateTask(stepId, task.id, { hidden: !(task.hidden ?? false) })}
        />
        <DeleteButton
          onClick={() => onDeleteTask(stepId, task.id)}
          title="Delete task"
        />
      </div>
    </div>

    {/* Prerequisite — collapsible */}
    <PrereqSection
      prereq={task.prerequisite}
      tasks={allTasks.filter((t) => t.id !== task.id)}
      onChange={(updated) => onUpdateTask(stepId, task.id, { prerequisite: updated })}
      stepId={stepId}
      stepIndex={stepIndex}
      onAddTask={onAddTask}
      onUpdateTask={onUpdateTask}
      excludeTaskIds={[task.id]}
    />
  </div>
);

const BRANCH_TONE_UI: Record<
  BranchTone,
  {
    border: string;
    bar: string;
    bg: string;
    head: string;
    badge: string;
    Icon: typeof CheckCircle2;
    /** Sketch-style header label (lowercase). */
    badgeText: string;
  }
> = {
  safe: {
    border: "border-emerald-600/55",
    bar: "border-l-emerald-600",
    bg: "bg-emerald-50/95 dark:bg-emerald-950/40",
    head: "bg-emerald-600/18 dark:bg-emerald-600/28",
    badge: "text-emerald-900 dark:text-emerald-100",
    Icon: CheckCircle2,
    badgeText: "continue",
  },
  risk: {
    border: "border-red-600/55",
    bar: "border-l-red-600",
    bg: "bg-red-50/95 dark:bg-red-950/40",
    head: "bg-red-600/18 dark:bg-red-600/26",
    badge: "text-red-900 dark:text-red-100",
    Icon: XCircle,
    badgeText: "unsafe",
  },
  caution: {
    border: "border-amber-500/55",
    bar: "border-l-amber-500",
    bg: "bg-amber-50/90 dark:bg-amber-950/35",
    head: "bg-amber-500/18 dark:bg-amber-600/24",
    badge: "text-amber-950 dark:text-amber-100",
    Icon: AlertTriangle,
    badgeText: "caution",
  },
  neutral: {
    border: "border-slate-400/50 dark:border-slate-500/50",
    bar: "border-l-slate-500 dark:border-l-slate-400",
    bg: "bg-slate-50/90 dark:bg-slate-900/55",
    head: "bg-slate-500/12 dark:bg-slate-600/22",
    badge: "text-slate-800 dark:text-slate-100",
    Icon: ChevronRight,
    badgeText: "continue",
  },
};

// ── Path row (selectable branch card: scan vs edit) ───────────────
const PathRow = ({
  path,
  step,
  stepIndex,
  allSteps,
  outcomeNodes,
  onUpdatePath,
  onDeletePath,
  onSetPathTarget,
  onAddTask,
  onAddPathCondition,
  onUpdateTask,
}: {
  path: ScenarioPath;
  step: ScenarioStep;
  stepIndex: number;
  allSteps: ScenarioStep[];
  outcomeNodes: OutcomeNode[];
  onUpdatePath: (stepId: string, pathId: string, patch: UpdatePathPatch) => void;
  onDeletePath: (stepId: string, pathId: string) => void;
  onSetPathTarget: (stepId: string, pathId: string, target: PathTarget) => void;
  onAddTask: (stepId: string, task: ScenarioTask) => void;
  onAddPathCondition: (
    stepId: string,
    pathId: string,
    task: ScenarioTask,
    prerequisite: PrerequisiteCondition,
  ) => void;
  onUpdateTask: (stepId: string, taskId: string, patch: UpdateTaskPatch) => void;
}) => {
  const isTimeout = path.timeoutMs !== undefined;
  const currentTargetId = path.connections?.[0]?.targetNodeId ?? path.targetStepId ?? "";
  const [editingTarget, setEditingTarget] = useState(false);
  const [cardMode, setCardMode] = useState<"scan" | "edit">(() =>
    !path.label?.trim() || !currentTargetId ? "edit" : "scan",
  );

  const availableTargets: Array<{ id: string; label: string; group: string }> = [
    ...allSteps
      .filter((s) => s.id !== step.id)
      .map((s) => ({
        id: s.id,
        label: `Step ${allSteps.indexOf(s) + 1}: ${s.title}`,
        group: "Steps",
      })),
    ...outcomeNodes.map((o) => ({
      id: o.id,
      label: o.title,
      group: "Outcomes",
    })),
  ];

  const dest = getPathDestination(path, allSteps, outcomeNodes);
  const outcomeChunk = getOutcomeChunk(dest);
  const consequenceColor =
    dest?.kind === "outcome" && dest.outcomeType
      ? outcomeStyles[dest.outcomeType].color
      : undefined;

  const toneKey: BranchTone = isTimeout ? "caution" : getPathBranchTone(path);
  const tone = BRANCH_TONE_UI[toneKey];
  const ToneIcon = tone.Icon;
  const conditionBullets = formatConditionBullets(path.prerequisite, step.tasks ?? []);

  const stop = (e: MouseEvent) => e.stopPropagation();

  const scanActivate = () => setCardMode("edit");

  return (
    <div
      className={cn(
        "min-w-0 rounded-xl border-2 border-l-[6px] shadow-sm overflow-hidden transition-[box-shadow,ring] flex flex-col",
        tone.border,
        tone.bar,
        tone.bg,
        cardMode === "edit" && "ring-2 ring-primary/35 ring-offset-2 ring-offset-background",
      )}
    >
      {/* Header — sketch: icon + path type */}
      <div
        className={cn(
          "flex items-center justify-between gap-2 px-3 py-2 border-b border-black/5 dark:border-white/10",
          tone.head,
        )}
      >
        <div className="flex items-center gap-2 min-w-0">
          <ToneIcon className={cn("w-4 h-4 shrink-0", tone.badge)} strokeWidth={2.25} />
          <span className={cn("text-[12px] font-semibold tracking-tight lowercase", tone.badge)}>
            {isTimeout ? "timeout" : tone.badgeText}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0" onClick={stop}>
          {cardMode === "edit" && (
            <button
              type="button"
              onClick={() => setCardMode("scan")}
              className="text-[9px] font-semibold px-2 py-1 rounded-md bg-background/80 border border-border/60 hover:bg-background"
            >
              Done
            </button>
          )}
          <DeleteButton onClick={() => onDeletePath(step.id, path.id)} title="Delete branch" />
        </div>
      </div>

      {cardMode === "scan" ? (
        <button
          type="button"
          onClick={scanActivate}
          className="w-full text-left p-3 space-y-3 hover:bg-black/[0.03] dark:hover:bg-white/[0.04] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40"
        >
          <div className="rounded-lg border border-border/60 bg-background/80 px-3 py-2 shadow-sm">
            <div className="text-[11px] font-medium text-muted-foreground mb-1">learner choice:</div>
            <p className="text-[12px] font-semibold text-foreground leading-snug">
              {path.label?.trim() || (
                <span className="text-muted-foreground/50 italic font-normal">Empty — tap to edit</span>
              )}
            </p>
          </div>

          <div className="rounded-lg border border-border/60 bg-background/80 px-3 py-2 shadow-sm">
            <div className="text-[11px] font-medium text-muted-foreground mb-1">condition:</div>
            <ul className="space-y-1">
              {conditionBullets.map((line, i) => (
                <li
                  key={i}
                  className="text-[11px] text-foreground/90 leading-snug flex gap-1.5"
                >
                  <span className="text-muted-foreground shrink-0">→</span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-lg border border-border/60 bg-background/80 px-3 py-2 shadow-sm">
            <div className="text-[11px] font-medium text-muted-foreground mb-1">outcome:</div>
            <div className="space-y-0.5">
              <p
                className="text-[12px] font-semibold leading-snug flex gap-1.5"
                style={consequenceColor ? { color: consequenceColor } : undefined}
              >
                <span className="text-muted-foreground shrink-0">→</span>
                <span>{outcomeChunk.title}</span>
              </p>
              {outcomeChunk.severity && (
                <p className="text-[10px] font-medium pl-5 text-muted-foreground/80">
                  {outcomeChunk.severity}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 pt-1 text-[9px] text-muted-foreground/55">
            <Pencil className="w-3 h-3 shrink-0" />
            <span>Click anywhere on this card to edit</span>
          </div>
        </button>
      ) : (
        <div className="p-3 space-y-3 bg-muted/15" onClick={stop}>
          <section className="rounded-lg border border-border/70 bg-card text-card-foreground shadow-sm px-3 py-2.5 space-y-2">
            <div className="text-[11px] font-medium text-muted-foreground">learner choice:</div>
            <InlineInput
              value={path.label}
              onChange={(v) => onUpdatePath(step.id, path.id, { label: v })}
              placeholder="What the learner does or decides…"
              className="text-[12px]"
            />
          </section>

          <section className="rounded-lg border border-border/70 bg-card text-card-foreground shadow-sm px-3 py-2.5 space-y-2">
            <div className="text-[11px] font-medium text-muted-foreground">condition:</div>
            <PrerequisiteEditor
              layout="paper"
              radioScope={path.id}
              pathId={path.id}
              prerequisite={path.prerequisite}
              tasks={step.tasks ?? []}
              onChange={(updated) => onUpdatePath(step.id, path.id, { prerequisite: updated ?? "" })}
              stepId={step.id}
              stepIndex={stepIndex}
              onAddTask={onAddTask}
              onAddPathCondition={onAddPathCondition}
              onUpdateTask={onUpdateTask}
            />
          </section>

          <section className="rounded-lg border border-border/70 bg-card text-card-foreground shadow-sm px-3 py-2.5 space-y-2">
            <div className="text-[11px] font-medium text-muted-foreground">outcome:</div>
            {editingTarget ? (
              <select
                autoFocus
                value={currentTargetId}
                onChange={(e) => {
                  const id = e.target.value;
                  if (!id) return;
                  const outcome = outcomeNodes.find((o) => o.id === id);
                  if (outcome) {
                    onSetPathTarget(step.id, path.id, {
                      kind: "outcome",
                      nodeId: id,
                      label: outcome.title,
                      type: outcome.outcome,
                    });
                  } else {
                    onSetPathTarget(step.id, path.id, { kind: "step", stepId: id });
                  }
                  setEditingTarget(false);
                }}
                onBlur={() => setEditingTarget(false)}
                className="w-full text-[11px] rounded-md border border-border/60 bg-background px-2 py-1.5 outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="">Select target…</option>
                <optgroup label="Steps">
                  {availableTargets
                    .filter((t) => t.group === "Steps")
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                </optgroup>
                <optgroup label="Outcomes">
                  {availableTargets
                    .filter((t) => t.group === "Outcomes")
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                </optgroup>
              </select>
            ) : (
              <div className="space-y-1">
                <p
                  className="text-[12px] font-semibold leading-snug"
                  style={consequenceColor ? { color: consequenceColor } : undefined}
                >
                  {formatAuthoringConsequenceLine(dest)}
                </p>
                {!isTimeout && (
                  <button
                    type="button"
                    onClick={() => setEditingTarget(true)}
                    className="text-[9px] text-muted-foreground/50 hover:text-primary"
                  >
                    Change destination
                  </button>
                )}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
};

// ── Add Decision Point form ──────────────────────────────────────
const AddPathForm = ({
  step, stepIndex, allSteps, outcomeNodes, onAdd, onCancel,
}: {
  step: ScenarioStep;
  stepIndex: number;
  allSteps: ScenarioStep[];
  outcomeNodes: OutcomeNode[];
  onAdd: (path: ScenarioPath) => void;
  onCancel: () => void;
}) => {
  const [label, setLabel] = useState("");
  const [targetId, setTargetId] = useState("");

  const availableTargets: Array<{ id: string; label: string; group: string }> = [
    ...allSteps
      .filter((s) => s.id !== step.id)
      .map((s) => ({
        id: s.id,
        label: `Step ${allSteps.indexOf(s) + 1}: ${s.title}`,
        group: "Steps",
      })),
    ...outcomeNodes.map((o) => ({
      id: o.id,
      label: o.title,
      group: "Outcomes",
    })),
  ];

  const handleAdd = () => {
    if (!label.trim() || !targetId) return;
    const outcome = outcomeNodes.find((o) => o.id === targetId);
    const newPath: ScenarioPath = {
      id: `path-${stepIndex + 1}-new-${Date.now()}`,
      label: label.trim(),
      prerequisite: "",
      ...(outcome
        ? { connections: [{ label: label.trim(), targetNodeId: targetId, type: outcome.outcome }] }
        : { targetStepId: targetId }),
    };
    onAdd(newPath);
  };

  return (
    <div
      className="mx-4 mb-3 rounded-lg overflow-hidden"
      style={{ border: "1px dashed hsl(var(--border))", background: "hsl(var(--secondary) / 0.2)" }}
    >
      <div className="px-3 py-2.5 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground/60">
            New Decision Point
          </span>
          <button onClick={onCancel} className="w-4 h-4 flex items-center justify-center rounded hover:bg-secondary">
            <X className="w-3 h-3 text-muted-foreground" />
          </button>
        </div>

        <div className="space-y-1">
          <label className="text-[8px] font-semibold uppercase tracking-wider text-muted-foreground/50">
            Description
          </label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="What does the learner do here?"
            autoFocus
            className="w-full text-[11px] rounded-md border border-border/60 bg-background px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[8px] font-semibold uppercase tracking-wider text-muted-foreground/50">
            Leads to
          </label>
          <select
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            className="w-full text-[11px] rounded-md border border-border/60 bg-background px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-primary/30 transition-all"
          >
            <option value="">Select target…</option>
            <optgroup label="Steps">
              {availableTargets
                .filter((t) => t.group === "Steps")
                .map((t) => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
            </optgroup>
            <optgroup label="Outcomes">
              {availableTargets
                .filter((t) => t.group === "Outcomes")
                .map((t) => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
            </optgroup>
          </select>
        </div>

        <button
          onClick={handleAdd}
          disabled={!label.trim() || !targetId}
          className="w-full py-1.5 rounded-md text-[11px] font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: "hsl(var(--primary))",
            color: "hsl(var(--primary-foreground))",
          }}
        >
          Add Decision Point
        </button>
      </div>
    </div>
  );
};

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
  onAddPathCondition,
  onDeleteTask,
  onUpdatePersona,
  onUpdateStep,
  onSetPathTarget,
  onUpdateEvaluation,
  onClearEvaluation,
}: StepDetailPanelProps) => {
  const [showAddPath, setShowAddPath] = useState(false);
  const [justAddedTaskId, setJustAddedTaskId] = useState<string | null>(null);

  const isOpen = step !== null;
  const cfg = step ? typeConfig[step.type] ?? typeConfig.chat : null;
  const Icon = cfg?.icon ?? MessageSquare;

  const handleAddTask = () => {
    if (!step) return;
    const newId = `task-s${stepIndex + 1}-${Date.now()}`;
    const newTask: ScenarioTask = {
      id: newId,
      label: "",
      required: true,
      hidden: false,
    };
    setJustAddedTaskId(newId);
    onAddTask(step.id, newTask);
  };

  const handleAddPath = (path: ScenarioPath) => {
    if (!step) return;
    onAddPath(step.id, path);
    setShowAddPath(false);
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
                {step.resource && (
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

            {/* Persona */}
            <SectionHeader label="Persona" />
            <div className="px-4 pb-3">
              {/* Character select */}
              <div className="space-y-1 mb-3">
                <label className="text-[8px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                  Character
                </label>
                {personas.length > 0 ? (
                  <select
                    value={step.persona ?? ""}
                    onChange={(e) => onUpdatePersona(step.id, { persona: e.target.value || undefined })}
                    className="w-full text-[11px] rounded-md border border-border/60 bg-background px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all"
                  >
                    <option value="">— No character assigned —</option>
                    {personas.map((p) => (
                      <option key={p.id} value={p.name}>
                        {p.name} · {p.role}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={step.persona ?? ""}
                    onChange={(e) => onUpdatePersona(step.id, { persona: e.target.value })}
                    className="w-full text-[11px] rounded-md border border-border/60 bg-background px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all"
                    placeholder="Character name… (add characters in Library)"
                  />
                )}
                {/* Show matched character detail as a subtle hint */}
                {step.persona && personas.length > 0 && (() => {
                  const matched = personas.find((p) => p.name === step.persona);
                  if (!matched) return null;
                  return (
                    <p className="text-[9px] text-muted-foreground/60 leading-relaxed mt-1 italic line-clamp-1">
                      {matched.communicationStyle || matched.description || matched.role}
                    </p>
                  );
                })()}
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

            {/* Resource */}
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

            {/* Tasks */}
            <SectionHeader label="Tasks" count={step.tasks?.length ?? 0} />
            {(step.tasks ?? []).map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                stepId={step.id}
                stepIndex={stepIndex}
                allTasks={step.tasks ?? []}
                onUpdateTask={onUpdateTask}
                onAddTask={onAddTask}
                onDeleteTask={onDeleteTask}
                autoFocus={task.id === justAddedTaskId}
                onAutoFocusDone={() => setJustAddedTaskId(null)}
              />
            ))}
            <AddButton label="Add task" onClick={handleAddTask} />

            {/* Decision Points */}
            <SectionHeader label="Decision Points" count={step.paths?.length ?? 0} />
            <div className="px-4 grid grid-cols-1 lg:grid-cols-2 gap-3">
              {(step.paths ?? []).map((path) => (
                <PathRow
                  key={path.id}
                  path={path}
                  step={step}
                  stepIndex={stepIndex}
                  allSteps={allSteps}
                  outcomeNodes={outcomeNodes}
                  onUpdatePath={onUpdatePath}
                  onDeletePath={onDeletePath}
                  onSetPathTarget={onSetPathTarget}
                  onAddTask={onAddTask}
                  onAddPathCondition={onAddPathCondition}
                  onUpdateTask={onUpdateTask}
                />
              ))}
            </div>
            {showAddPath ? (
              <AddPathForm
                step={step}
                stepIndex={stepIndex}
                allSteps={allSteps}
                outcomeNodes={outcomeNodes}
                onAdd={handleAddPath}
                onCancel={() => setShowAddPath(false)}
              />
            ) : (
              <AddButton label="Add decision point" onClick={() => setShowAddPath(true)} />
            )}

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
