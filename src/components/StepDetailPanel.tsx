import { useState } from "react";
import {
  ScenarioStep, ScenarioTask, ScenarioPath, OutcomeNode, PrerequisiteCondition, Persona, ScenarioResource,
} from "@/types/scenario";
import {
  UpdatePathPatch, UpdateTaskPatch, UpdatePersonaPatch, UpdateStepPatch, PathTarget, UpdateEvaluationPatch,
} from "@/hooks/useScenarioEditor";
import { PrerequisiteEditor } from "./PrerequisiteEditor";
import { PrerequisiteDisplay } from "./PrerequisiteDisplay";
import { COMPETENCY_RUBRIC } from "@/data/competencyRubric";
import {
  MessageSquare, Radio, FileText, Video, X, User,
  ChevronRight, AlertTriangle, CheckCircle2, XCircle,
  Plus, Trash2,
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
  onDeleteTask: (stepId: string, taskId: string) => void;
  onUpdatePersona: (stepId: string, patch: UpdatePersonaPatch) => void;
  onUpdateStep: (stepId: string, patch: UpdateStepPatch) => void;
  onSetPathTarget: (stepId: string, pathId: string, target: PathTarget) => void;
  onUpdateEvaluation: (stepId: string, patch: UpdateEvaluationPatch) => void;
  onClearEvaluation: (stepId: string) => void;
  onAddEvaluation: (stepId: string) => void;
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
  prereq, tasks, onChange,
}: {
  prereq: PrerequisiteCondition | undefined;
  tasks: ScenarioTask[];
  onChange: (updated: PrerequisiteCondition | undefined) => void;
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
          prerequisite={prereq}
          tasks={tasks as ScenarioTask[]}
          onChange={onChange}
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
  task, stepId, allTasks, onUpdateTask, onDeleteTask, autoFocus, onAutoFocusDone,
}: {
  task: ScenarioTask;
  stepId: string;
  allTasks: ScenarioTask[];
  onUpdateTask: (stepId: string, taskId: string, patch: UpdateTaskPatch) => void;
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
    />
  </div>
);

// ── Path row ─────────────────────────────────────────────────────
const PathRow = ({
  path, step, allSteps, outcomeNodes, onUpdatePath, onDeletePath, onSetPathTarget,
}: {
  path: ScenarioPath;
  step: ScenarioStep;
  allSteps: ScenarioStep[];
  outcomeNodes: OutcomeNode[];
  onUpdatePath: (stepId: string, pathId: string, patch: UpdatePathPatch) => void;
  onDeletePath: (stepId: string, pathId: string) => void;
  onSetPathTarget: (stepId: string, pathId: string, target: PathTarget) => void;
}) => {
  const isTimeout = path.timeoutMs !== undefined;
  const isOutcomeConn = path.connections && path.connections.length > 0;
  const currentTargetId = path.connections?.[0]?.targetNodeId ?? path.targetStepId ?? "";
  const [editingTarget, setEditingTarget] = useState(false);

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

  const targetDisplay = (() => {
    if (isOutcomeConn) {
      const conn = path.connections![0];
      const outcome = outcomeNodes.find((o) => o.id === conn.targetNodeId);
      if (outcome) return <OutcomeBadge outcome={outcome.outcome} title={outcome.title} />;
      return <span className="text-[10px] text-muted-foreground">{conn.targetNodeId}</span>;
    }
    if (path.targetStepId) {
      const targetStep = allSteps.find((s) => s.id === path.targetStepId);
      const targetIdx = allSteps.findIndex((s) => s.id === path.targetStepId);
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-primary">
          <ChevronRight className="w-3 h-3 shrink-0" />
          {targetIdx >= 0 ? `Step ${targetIdx + 1}: ` : ""}
          {targetStep?.title ?? path.targetStepId}
        </span>
      );
    }
    return <span className="text-[10px] text-muted-foreground/40 italic">No target set</span>;
  })();

  return (
    <div
      className="mx-4 mb-3 rounded-lg overflow-hidden"
      style={{ border: "1px solid hsl(var(--border))" }}
    >
      {/* Header */}
      <div
        className="px-3 py-2.5 space-y-1.5"
        style={{
          background: isTimeout ? "hsl(38, 90%, 97%)" : "hsl(var(--secondary) / 0.4)",
          borderBottom: "1px solid hsl(var(--border) / 0.6)",
        }}
      >
        <div className="flex items-start gap-2">
          {isTimeout ? (
            <span
              className="text-[8px] font-bold uppercase tracking-wider shrink-0 px-1.5 py-0.5 rounded-full mt-0.5"
              style={{ background: "hsl(38, 90%, 92%)", color: "hsl(38, 75%, 38%)", border: "1px solid hsl(38, 75%, 82%)" }}
            >
              Timeout
            </span>
          ) : (
            <User className="w-3 h-3 text-primary shrink-0 mt-1" />
          )}
          <div className="flex-1 min-w-0 hover:bg-secondary/25 rounded px-1 -mx-1 transition-colors">
            <InlineInput
              value={path.label}
              onChange={(v) => onUpdatePath(step.id, path.id, { label: v })}
              placeholder="Decision point description…"
            />
          </div>
          <DeleteButton
            onClick={() => onDeletePath(step.id, path.id)}
            title="Delete decision point"
          />
        </div>

        {/* Target row — read-only display with "Change" affordance */}
        <div className="flex items-center gap-2 pl-5">
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
              className="flex-1 text-[11px] rounded-md border border-border/60 bg-background px-2 py-1 outline-none focus:ring-2 focus:ring-primary/30 transition-all"
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
          ) : (
            <>
              {targetDisplay}
              {!isTimeout && (
                <button
                  onClick={() => setEditingTarget(true)}
                  className="ml-auto text-[9px] text-muted-foreground/40 hover:text-primary transition-colors"
                >
                  Change
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Prerequisite — collapsible */}
      <PrereqSection
        prereq={path.prerequisite}
        tasks={step.tasks ?? []}
        onChange={(updated) => onUpdatePath(step.id, path.id, { prerequisite: updated ?? "" })}
      />
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

// ── Evaluation section ───────────────────────────────────────────
const weightColors: Record<"high" | "medium" | "low", { bg: string; color: string; border: string }> = {
  high:   { bg: "hsl(0, 65%, 96%)",   color: "hsl(0, 65%, 42%)",   border: "hsl(0, 65%, 80%)" },
  medium: { bg: "hsl(40, 80%, 95%)",  color: "hsl(40, 75%, 30%)",  border: "hsl(40, 80%, 78%)" },
  low:    { bg: "hsl(220, 60%, 96%)", color: "hsl(220, 60%, 42%)", border: "hsl(220, 60%, 80%)" },
};

const DATALIST_ID = "competency-rubric-list";

const EvaluationSection = ({
  step,
  onUpdateEvaluation,
  onClearEvaluation,
  onAddEvaluation,
}: {
  step: ScenarioStep;
  onUpdateEvaluation: (stepId: string, patch: UpdateEvaluationPatch) => void;
  onClearEvaluation: (stepId: string) => void;
  onAddEvaluation: (stepId: string) => void;
}) => {
  const ev = step.evaluation;
  const wStyle = ev ? weightColors[ev.weight] : weightColors.high;
  const matchedEntry = ev
    ? COMPETENCY_RUBRIC.find((c) => c.label === ev.competency || c.id === ev.competencyId)
    : undefined;

  if (!ev) {
    return (
      <AddButton label="Add evaluation criteria" onClick={() => onAddEvaluation(step.id)} />
    );
  }

  return (
    <div className="mx-4 mb-3 rounded-lg overflow-hidden" style={{ border: "1px solid hsl(var(--border))" }}>
      {/* Competency + weight row */}
      <div className="px-3 pt-2.5 pb-2 space-y-2" style={{ background: "hsl(var(--secondary) / 0.4)" }}>
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <label className="text-[8px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                Competency
              </label>
              {ev.competencyId && (
                <span
                  className="text-[7px] font-mono px-1 py-0.5 rounded"
                  style={{ background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground) / 0.55)" }}
                >
                  {ev.competencyId}
                </span>
              )}
            </div>
            {/* Combobox: datalist provides rubric suggestions, freeform is still allowed */}
            <datalist id={DATALIST_ID}>
              {COMPETENCY_RUBRIC.map((c) => (
                <option key={c.id} value={c.label} />
              ))}
            </datalist>
            <input
              type="text"
              list={DATALIST_ID}
              value={ev.competency}
              onChange={(e) => {
                const label = e.target.value;
                const match = COMPETENCY_RUBRIC.find((c) => c.label === label);
                onUpdateEvaluation(step.id, {
                  competency: label,
                  competencyId: match?.id,
                });
              }}
              placeholder="Select or type a competency…"
              className="w-full bg-transparent border-b border-border/25 hover:border-border/60 focus:border-primary/50 outline-none placeholder:text-muted-foreground/40 transition-colors py-0.5 text-[11px] font-semibold"
            />
          </div>
          <div className="shrink-0">
            <label className="text-[8px] font-semibold uppercase tracking-wider text-muted-foreground/60 block mb-1">
              Weight
            </label>
            <select
              value={ev.weight}
              onChange={(e) =>
                onUpdateEvaluation(step.id, { weight: e.target.value as "high" | "medium" | "low" })
              }
              className="text-[9px] font-bold uppercase tracking-wider rounded-full px-2 py-1 border outline-none focus:ring-2 focus:ring-primary/30 transition-all cursor-pointer"
              style={{ background: wStyle.bg, color: wStyle.color, borderColor: wStyle.border }}
            >
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>

        {/* Rubric sub-criteria — shown when a recognised competency is selected */}
        {matchedEntry && (
          <div
            className="rounded-md px-2.5 py-2 space-y-1"
            style={{ background: "hsl(var(--muted) / 0.5)", border: "1px solid hsl(var(--border) / 0.4)" }}
          >
            <p className="text-[7px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-1.5">
              Rubric criteria · {matchedEntry.id}
            </p>
            {matchedEntry.criteria.map((c) => (
              <div key={c.id} className="flex items-start gap-1.5">
                <span className="w-1 h-1 rounded-full bg-muted-foreground/30 shrink-0 mt-1.5" />
                <p className="text-[9px] text-muted-foreground/70 leading-relaxed">{c.text}</p>
              </div>
            ))}
          </div>
        )}

        {/* Requirement */}
        <div>
          <label className="text-[8px] font-semibold uppercase tracking-wider text-muted-foreground/60 block mb-1">
            Requirement
          </label>
          <textarea
            value={ev.requirement}
            onChange={(e) => onUpdateEvaluation(step.id, { requirement: e.target.value })}
            placeholder="What must the learner do to satisfy this competency?"
            rows={3}
            className="w-full text-[11px] rounded-md border border-border/60 bg-background px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all resize-none"
          />
        </div>
      </div>

      {/* Remove footer */}
      <div className="px-3 py-1.5 flex justify-end" style={{ borderTop: "1px solid hsl(var(--border) / 0.5)" }}>
        <button
          onClick={() => onClearEvaluation(step.id)}
          className="text-[9px] text-muted-foreground/40 hover:text-destructive transition-colors"
        >
          Remove evaluation
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
  onUpdateEvaluation,
  onClearEvaluation,
  onAddEvaluation,
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

  return (
    <div
      className="fixed right-0 top-0 h-screen w-[420px] z-30 flex flex-col bg-background border-l border-border shadow-2xl transition-transform duration-300 ease-out"
      style={{ transform: isOpen ? "translateX(0)" : "translateX(100%)" }}
      onClick={(e) => e.stopPropagation()}
    >
      {step && cfg && (
        <>
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
                allTasks={step.tasks ?? []}
                onUpdateTask={onUpdateTask}
                onDeleteTask={onDeleteTask}
                autoFocus={task.id === justAddedTaskId}
                onAutoFocusDone={() => setJustAddedTaskId(null)}
              />
            ))}
            <AddButton label="Add task" onClick={handleAddTask} />

            {/* Decision Points */}
            <SectionHeader label="Decision Points" count={step.paths?.length ?? 0} />
            {(step.paths ?? []).map((path) => (
              <PathRow
                key={path.id}
                path={path}
                step={step}
                allSteps={allSteps}
                outcomeNodes={outcomeNodes}
                onUpdatePath={onUpdatePath}
                onDeletePath={onDeletePath}
                onSetPathTarget={onSetPathTarget}
              />
            ))}
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
              onAddEvaluation={onAddEvaluation}
            />

            <div className="h-8" />
          </div>
        </>
      )}
    </div>
  );
};
