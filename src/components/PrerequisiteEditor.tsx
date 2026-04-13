import { useState } from "react";
import type { PrerequisiteCondition, ScenarioTask } from "@/types/scenario";
import { taskEditorDisplay } from "@/utils/taskDisplay";
import { prerequisiteHasGate, resolveTaskLabel } from "@/utils/pathCausality";
import type { UpdateTaskPatch } from "@/hooks/useScenarioEditor";
import { cn } from "@/lib/utils";
import { Plus, X } from "lucide-react";

interface PrerequisiteEditorProps {
  prerequisite: PrerequisiteCondition | undefined;
  tasks: ScenarioTask[];
  onChange: (updated: PrerequisiteCondition | undefined) => void;
  variant?: "path" | "task";
  /** Decision-point sketch: radios + textarea row, numbered conditions. */
  layout?: "default" | "paper";
  /** Scope radio names when multiple editors are open (e.g. path id). */
  radioScope?: string;
  /** With `onAddPathCondition`, new conditions apply in one editor update (decision paths). */
  pathId?: string;
  stepId?: string;
  stepIndex?: number;
  onAddTask?: (stepId: string, task: ScenarioTask) => void;
  onAddPathCondition?: (
    stepId: string,
    pathId: string,
    task: ScenarioTask,
    prerequisite: PrerequisiteCondition,
  ) => void;
  onUpdateTask?: (stepId: string, taskId: string, patch: UpdateTaskPatch) => void;
  excludeTaskIds?: string[];
}

type GroupKey = "all" | "none" | "any";

interface NormalizedPrereq {
  all: string[];
  none: string[];
  any: string[];
}

function normalize(prereq: PrerequisiteCondition | undefined): NormalizedPrereq {
  if (!prereq || (typeof prereq === "string" && !prereq)) {
    return { all: [], none: [], any: [] };
  }
  if (typeof prereq === "string") {
    return { all: [prereq], none: [], any: [] };
  }
  return {
    all: prereq.all ?? [],
    none: prereq.none ?? [],
    any: prereq.any ?? [],
  };
}

function serialize(n: NormalizedPrereq): PrerequisiteCondition | undefined {
  const result: { all?: string[]; none?: string[]; any?: string[] } = {};
  if (n.all.length > 0) result.all = n.all;
  if (n.none.length > 0) result.none = n.none;
  if (n.any.length > 0) result.any = n.any;

  const keys = Object.keys(result) as GroupKey[];
  if (keys.length === 0) return undefined;
  if (keys.length === 1 && keys[0] === "all" && result.all!.length === 1) {
    return result.all![0];
  }
  return result as PrerequisiteCondition;
}

function taskPolarity(taskId: string, n: NormalizedPrereq): GroupKey | null {
  if (n.all.includes(taskId)) return "all";
  if (n.none.includes(taskId)) return "none";
  if (n.any.includes(taskId)) return "any";
  return null;
}

function setTaskPolarity(
  taskId: string,
  polarity: GroupKey | null,
  n: NormalizedPrereq,
): NormalizedPrereq {
  const next: NormalizedPrereq = {
    all: n.all.filter((id) => id !== taskId),
    none: n.none.filter((id) => id !== taskId),
    any: n.any.filter((id) => id !== taskId),
  };
  if (polarity) {
    next[polarity] = [...next[polarity], taskId];
  }
  return next;
}

function collectPrereqTaskIds(n: NormalizedPrereq): string[] {
  const order: string[] = [];
  const push = (id: string) => {
    if (!order.includes(id)) order.push(id);
  };
  n.all.forEach(push);
  n.none.forEach(push);
  n.any.forEach(push);
  return order;
}

const POLARITY_UI: Record<
  GroupKey,
  { short: string; hint: string; active: string; inactive: string }
> = {
  all: {
    short: "Learner must",
    hint: "Require this",
    active: "bg-emerald-600/18 text-emerald-950 dark:text-emerald-50 border-emerald-600/45",
    inactive:
      "bg-background/60 text-muted-foreground border-border/50 hover:border-emerald-600/30",
  },
  none: {
    short: "Learner must not",
    hint: "Forbid this",
    active: "bg-red-600/18 text-red-950 dark:text-red-50 border-red-600/45",
    inactive: "bg-background/60 text-muted-foreground border-border/50 hover:border-red-600/30",
  },
  any: {
    short: "At least one of",
    hint: "OR — any one counts",
    active: "bg-amber-500/20 text-amber-950 dark:text-amber-50 border-amber-500/45",
    inactive:
      "bg-background/60 text-muted-foreground border-border/50 hover:border-amber-500/30",
  },
};

/** Sketch-style vertical radios: must / must not / any of */
function PolarityRadios({
  name,
  value,
  onChange,
}: {
  name: string;
  value: GroupKey;
  onChange: (k: GroupKey) => void;
}) {
  const opts: { key: GroupKey; label: string }[] = [
    { key: "all", label: "must" },
    { key: "none", label: "must not" },
    { key: "any", label: "any of" },
  ];
  return (
    <div
      className="flex flex-col gap-2.5 shrink-0 w-[5.25rem] pt-0.5"
      role="radiogroup"
      aria-label="Condition rule"
    >
      {opts.map(({ key, label }) => (
        <label
          key={key}
          className={cn(
            "flex items-center gap-2 cursor-pointer select-none text-[11px] font-medium leading-none",
            value === key ? "text-foreground" : "text-muted-foreground",
          )}
        >
          <input
            type="radio"
            name={name}
            checked={value === key}
            onChange={() => onChange(key)}
            className="h-3.5 w-3.5 shrink-0 accent-primary"
          />
          <span>{label}</span>
        </label>
      ))}
    </div>
  );
}

function PolarityChips({
  value,
  onChange,
  compact,
}: {
  value: GroupKey;
  onChange: (k: GroupKey) => void;
  compact?: boolean;
}) {
  return (
    <div
      className={cn("flex flex-wrap gap-1", compact && "gap-0.5")}
      role="radiogroup"
      aria-label="Rule type"
    >
      {(Object.keys(POLARITY_UI) as GroupKey[]).map((key) => {
        const cfg = POLARITY_UI[key];
        const pressed = value === key;
        return (
          <button
            key={key}
            type="button"
            aria-pressed={pressed}
            title={cfg.hint}
            onClick={() => onChange(key)}
            className={cn(
              "rounded-md border font-semibold transition-colors text-left",
              compact ? "px-1.5 py-0.5 text-[8px]" : "px-2 py-1 text-[9px]",
              pressed ? cfg.active : cfg.inactive,
            )}
          >
            {cfg.short}
          </button>
        );
      })}
    </div>
  );
}

function taskSummaryLine(taskId: string, taskList: ScenarioTask[]): string {
  const t = taskList.find((x) => x.id === taskId);
  return t ? taskEditorDisplay(t).primary : resolveTaskLabel(taskId, taskList);
}

function LogicPreview({
  n,
  tasks,
}: {
  n: NormalizedPrereq;
  tasks: ScenarioTask[];
}) {
  const parts: string[] = [];
  if (n.all.length) {
    parts.push(`Must: ${n.all.map((id) => taskSummaryLine(id, tasks)).join(" · ")}`);
  }
  if (n.none.length) {
    parts.push(`Must not: ${n.none.map((id) => taskSummaryLine(id, tasks)).join(" · ")}`);
  }
  if (n.any.length) {
    parts.push(`At least one: ${n.any.map((id) => taskSummaryLine(id, tasks)).join(" · ")}`);
  }
  if (parts.length === 0) return null;
  return (
    <p className="mt-2 text-[9px] text-muted-foreground/75 leading-snug border-t border-border/35 pt-2">
      {parts.join(" · ")}
    </p>
  );
}

export const PrerequisiteEditor = ({
  prerequisite,
  tasks,
  onChange,
  variant = "path",
  layout = "default",
  radioScope = "ed",
  pathId,
  stepId,
  stepIndex,
  onAddTask,
  onAddPathCondition,
  onUpdateTask,
  excludeTaskIds,
}: PrerequisiteEditorProps) => {
  const normalized = normalize(prerequisite);
  const [draftLabel, setDraftLabel] = useState("");
  const [draftPolarity, setDraftPolarity] = useState<GroupKey>("all");

  const apply = (next: NormalizedPrereq) => onChange(serialize(next));

  const canUsePathAdd = Boolean(
    layout === "paper" &&
      onAddPathCondition &&
      pathId &&
      stepId &&
      stepIndex !== undefined,
  );
  const canUseTaskAdd = Boolean(onAddTask && stepId && stepIndex !== undefined);
  const canCreateTask = canUsePathAdd || canUseTaskAdd;
  const prereqIds = collectPrereqTaskIds(normalized);
  const excluded = new Set(excludeTaskIds ?? []);

  const attachPool = tasks.filter(
    (t) => !prereqIds.includes(t.id) && !excluded.has(t.id),
  );

  const addNewBehavior = () => {
    const text = draftLabel.trim();
    if (!text || !canCreateTask) return;
    const newId = `task-s${stepIndex! + 1}-${Date.now()}`;
    const newTask: ScenarioTask = {
      id: newId,
      label: text,
      required: false,
      hidden: true,
    };
    const nextPrereq = serialize(setTaskPolarity(newId, draftPolarity, normalized));
    const prerequisiteValue: PrerequisiteCondition =
      nextPrereq === undefined ? "" : nextPrereq;

    if (canUsePathAdd) {
      onAddPathCondition!(stepId!, pathId!, newTask, prerequisiteValue);
    } else if (onAddTask) {
      onAddTask(stepId!, newTask);
      apply(setTaskPolarity(newId, draftPolarity, normalized));
    }
    setDraftLabel("");
  };

  const removeConditionButtonClass =
    "shrink-0 -mr-1 p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1";

  if (layout === "paper") {
    const hasSavedConditions = prereqIds.length > 0;
    const showNoEditorHint = prereqIds.length === 0 && !canCreateTask;

    return (
      <div className="space-y-3">
        <ul className="space-y-3 list-none m-0 p-0">
          {prereqIds.map((taskId, index) => {
            const task = tasks.find((t) => t.id === taskId);
            const polarity = taskPolarity(taskId, normalized);

            if (!task) {
              return (
                <li
                  key={taskId}
                  className="rounded-lg border border-amber-500/50 bg-amber-500/[0.07] dark:bg-amber-950/25 p-2.5 pt-2 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-2 mb-2 min-h-[1.5rem]">
                    <span className="text-[11px] font-medium text-amber-950 dark:text-amber-100">
                      Condition {index + 1}:
                    </span>
                    <button
                      type="button"
                      onClick={() => apply(setTaskPolarity(taskId, null, normalized))}
                      className={cn(
                        removeConditionButtonClass,
                        "hover:bg-destructive/15 dark:hover:bg-destructive/20",
                      )}
                      aria-label="Remove condition"
                      title="Remove condition"
                    >
                      <X className="w-4 h-4" strokeWidth={2.25} />
                    </button>
                  </div>
                  <div className="flex gap-3 items-stretch">
                    <div
                      className="flex flex-col gap-2 shrink-0 w-[5.25rem] pt-0.5 text-[10px] font-medium text-amber-900/80 dark:text-amber-100/85"
                      aria-hidden
                    >
                      <span className="opacity-70">—</span>
                    </div>
                    <div className="flex-1 min-w-0 min-h-[4.25rem] rounded-md border border-amber-500/35 bg-background/90 px-2.5 py-2">
                      <p className="text-[10px] text-amber-950 dark:text-amber-50 leading-snug mb-1">
                        Missing task on this step — remove or restore the task.
                      </p>
                      <p className="text-[10px] font-mono text-muted-foreground break-all">{taskId}</p>
                    </div>
                  </div>
                </li>
              );
            }

            const pol = polarity ?? "all";
            const { full } = taskEditorDisplay(task);

            return (
              <li
                key={task.id}
                className={cn(
                  "rounded-lg border border-border/60 bg-background/95 p-2.5 pt-2 shadow-sm",
                  task.hidden && "opacity-85",
                )}
              >
                <div className="flex items-center justify-between gap-2 mb-2 min-h-[1.5rem]">
                  <span className="text-[11px] font-medium text-muted-foreground">
                    Condition {index + 1}:
                  </span>
                  <button
                    type="button"
                    onClick={() => apply(setTaskPolarity(task.id, null, normalized))}
                    className={removeConditionButtonClass}
                    aria-label="Remove condition"
                    title="Remove condition"
                  >
                    <X className="w-4 h-4" strokeWidth={2.25} />
                  </button>
                </div>
                <div className="flex gap-3 items-stretch">
                  <PolarityRadios
                    name={`cond-${radioScope}-${task.id}`}
                    value={pol}
                    onChange={(key) => apply(setTaskPolarity(task.id, key, normalized))}
                  />
                  <div className="flex-1 min-w-0">
                    {onUpdateTask && stepId ? (
                      <textarea
                        value={task.label}
                        onChange={(e) =>
                          onUpdateTask(stepId, task.id, { label: e.target.value })
                        }
                        rows={3}
                        title={full}
                        placeholder="Simulation / AI command for this path…"
                        className="w-full min-h-[4.25rem] resize-y text-[11px] leading-relaxed rounded-md border border-border/60 bg-background px-2.5 py-2 outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    ) : (
                      <p className="text-[11px] min-h-[4.25rem] rounded-md border border-border/40 px-2.5 py-2">
                        {taskEditorDisplay(task).primary}
                      </p>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        {showNoEditorHint && (
          <p className="text-[10px] text-muted-foreground/65 rounded-md border border-dashed border-border/55 bg-muted/20 px-2.5 py-2">
            No behavior checks on this branch. Add tracked tasks to the step to define conditions here.
          </p>
        )}

        {canCreateTask && (
          <div className="space-y-2">
            <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5 pt-2 shadow-sm">
              <div className="flex items-center justify-between gap-2 mb-2 min-h-[1.5rem]">
                <span className="text-[11px] font-medium text-muted-foreground">
                  {hasSavedConditions ? "Add another condition:" : "First condition:"}
                </span>
                <button
                  type="button"
                  disabled={!draftLabel.trim()}
                  onClick={() => setDraftLabel("")}
                  className={cn(
                    removeConditionButtonClass,
                    "disabled:pointer-events-none disabled:opacity-[0.38]",
                  )}
                  aria-label="Clear draft"
                  title={
                    draftLabel.trim()
                      ? "Clear draft"
                      : "Clear draft (type text first)"
                  }
                >
                  <X className="w-4 h-4" strokeWidth={2.25} />
                </button>
              </div>
              <div className="flex gap-3 items-stretch">
                <PolarityRadios
                  name={`cond-${radioScope}-new`}
                  value={draftPolarity}
                  onChange={setDraftPolarity}
                />
                <textarea
                  value={draftLabel}
                  onChange={(e) => setDraftLabel(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      addNewBehavior();
                    }
                  }}
                  rows={3}
                  placeholder="Type the learner behavior the sim should track…"
                  className="flex-1 min-w-0 min-h-[4.25rem] resize-y text-[11px] leading-relaxed rounded-md border border-border/60 bg-background px-2.5 py-2 outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={addNewBehavior}
              disabled={!draftLabel.trim()}
              className="inline-flex items-center gap-1.5 rounded-md border border-primary/40 bg-primary/10 px-3 py-1.5 text-[11px] font-semibold text-primary hover:bg-primary/15 disabled:opacity-40 disabled:pointer-events-none"
            >
              <Plus className="w-3.5 h-3.5 shrink-0" />
              Add condition
            </button>
            <p className="text-[9px] text-muted-foreground/55">
              ⌘/Ctrl + Enter also adds.
              {!draftLabel.trim() && (
                <span className="block mt-0.5 text-muted-foreground/45">
                  Add condition is enabled after you type in the box above.
                </span>
              )}
            </p>
          </div>
        )}

        {attachPool.length > 0 && (
          <div>
            <p className="text-[10px] text-muted-foreground/70 mb-1.5">
              From this step (uses the draft rule above):
            </p>
            <div className="flex flex-wrap gap-1.5">
              {attachPool.map((t) => {
                const { primary, full } = taskEditorDisplay(t);
                return (
                  <button
                    key={t.id}
                    type="button"
                    title={full}
                    onClick={() => apply(setTaskPolarity(t.id, draftPolarity, normalized))}
                    className="inline-flex items-center gap-1 max-w-full rounded-full border border-dashed border-border/65 bg-background px-2 py-0.5 text-left text-[10px] font-medium hover:border-primary/40 hover:bg-primary/5"
                  >
                    <Plus className="w-3 h-3 shrink-0 opacity-60" />
                    <span className="truncate">{primary}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ─── default (task unlock + compact path) layout ─── */
  return (
    <div className="space-y-3">
      <p className="text-[10px] text-muted-foreground/85 leading-snug">
        {variant === "task"
          ? "Rule type first, then the command text."
          : "Pick learner must / must not / at least one of, then type the simulation command."}
      </p>

      <div>
        <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/65 mb-2">
          On this path
        </p>

        {prereqIds.length === 0 ? (
          <p className="text-[10px] text-muted-foreground/60 rounded-md border border-dashed border-border/55 bg-muted/10 px-2 py-1.5">
            Nothing here yet — add a command below.
          </p>
        ) : (
          <ul className="space-y-2">
            {prereqIds.map((taskId) => {
              const task = tasks.find((t) => t.id === taskId);
              const polarity = taskPolarity(taskId, normalized);

              if (!task) {
                return (
                  <li
                    key={taskId}
                    className="rounded-lg border border-amber-500/40 bg-amber-500/8 px-2 py-1.5 flex items-start justify-between gap-2"
                  >
                    <p className="text-[10px] text-amber-950 dark:text-amber-100 min-w-0">
                      Missing task <span className="font-mono text-[9px]">{taskId}</span>
                    </p>
                    <button
                      type="button"
                      onClick={() => apply(setTaskPolarity(taskId, null, normalized))}
                      className="shrink-0 p-1 rounded-md hover:bg-black/10 dark:hover:bg-white/10"
                      title="Remove"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </li>
                );
              }

              const { primary, extras, full } = taskEditorDisplay(task);
              const pol = polarity ?? "all";

              return (
                <li
                  key={task.id}
                  className={cn(
                    "rounded-lg border border-border/55 bg-background/70 p-2 space-y-2",
                    task.hidden && "opacity-80",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <PolarityChips
                        value={pol}
                        onChange={(key) => apply(setTaskPolarity(task.id, key, normalized))}
                        compact
                      />
                      {onUpdateTask && stepId ? (
                        <input
                          type="text"
                          value={task.label}
                          onChange={(e) =>
                            onUpdateTask(stepId, task.id, { label: e.target.value })
                          }
                          className="w-full text-[11px] text-foreground leading-snug bg-transparent border border-border/45 rounded-md px-2 py-1.5 outline-none focus:ring-2 focus:ring-primary/20"
                          title={full}
                          placeholder="What the sim tracks for this learner action…"
                        />
                      ) : (
                        <span className="block text-[11px] font-medium text-foreground" title={full}>
                          {primary}
                        </span>
                      )}
                      {extras.length > 0 && (
                        <span className="block space-y-0.5 pt-0.5">
                          {extras.map((line, i) => (
                            <span
                              key={i}
                              className="block text-[10px] text-muted-foreground/80 leading-snug pl-2 border-l-2 border-border/45"
                            >
                              {line}
                            </span>
                          ))}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => apply(setTaskPolarity(task.id, null, normalized))}
                      className="shrink-0 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/80"
                      title="Remove from path"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {canCreateTask && (
        <div className="rounded-lg border border-border/50 bg-muted/12 p-2 space-y-2">
          <p className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground/60">
            New command
          </p>
          <PolarityChips value={draftPolarity} onChange={setDraftPolarity} compact />
          <div className="flex gap-1.5">
            <input
              type="text"
              value={draftLabel}
              onChange={(e) => setDraftLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addNewBehavior();
                }
              }}
              placeholder="Simulation / AI tracking text…"
              className="flex-1 min-w-0 text-[11px] rounded-md border border-border/55 bg-background px-2 py-1.5 outline-none focus:ring-2 focus:ring-primary/20"
            />
            <button
              type="button"
              onClick={addNewBehavior}
              disabled={!draftLabel.trim()}
              className="shrink-0 inline-flex items-center gap-1 rounded-md border border-primary/35 bg-primary/10 px-2 py-1.5 text-[10px] font-semibold text-primary hover:bg-primary/15 disabled:opacity-40 disabled:pointer-events-none"
            >
              <Plus className="w-3.5 h-3.5" />
              Add
            </button>
          </div>
        </div>
      )}

      {!canCreateTask && tasks.length === 0 && (
        <p className="text-[10px] text-muted-foreground/65">
          Add tasks in the list above first.
        </p>
      )}

      {attachPool.length > 0 && (
        <div>
          <p className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground/55 mb-1">
            From this step
          </p>
          <p className="text-[9px] text-muted-foreground/65 mb-1.5">
            Uses the rule type selected above.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {attachPool.map((t) => {
              const { primary, full } = taskEditorDisplay(t);
              return (
                <button
                  key={t.id}
                  type="button"
                  title={full}
                  onClick={() => apply(setTaskPolarity(t.id, draftPolarity, normalized))}
                  className="inline-flex items-center gap-1 max-w-full rounded-full border border-dashed border-border/65 bg-background/80 px-2 py-0.5 text-left text-[10px] font-medium text-foreground hover:border-primary/40 hover:bg-primary/5 transition-colors"
                >
                  <Plus className="w-3 h-3 shrink-0 opacity-60" />
                  <span className="truncate">{primary}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <LogicPreview n={normalized} tasks={tasks} />

      {!prerequisiteHasGate(serialize(normalized)) && (
        <p className="text-[9px] text-muted-foreground/50">
          Empty — any learner state can take this branch.
        </p>
      )}
    </div>
  );
}
