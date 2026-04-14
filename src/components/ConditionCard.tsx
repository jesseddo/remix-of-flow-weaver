import { useState, useRef, useEffect } from "react";
import type {
  ScenarioPath,
  ScenarioStep,
  ScenarioTask,
  ScenarioResource,
  OutcomeNode,
  OutcomeType,
} from "@/types/scenario";
import { PathTarget, UpdatePathPatch } from "@/hooks/useScenarioEditor";
import {
  isPathTargetBroken,
  getPathTargetLabel,
  getPrerequisiteGroups,
  buildMixedPrerequisite,
} from "@/utils/pathCausality";
import { taskEditorDisplay } from "@/utils/taskDisplay";
import { cn } from "@/lib/utils";
import { X, ChevronDown, Plus, AlertTriangle, Search, CornerDownRight, Trash2 } from "lucide-react";

const ACTION_LABELS: Record<string, string> = {
  request_document: "Request",
  review_document: "Review",
  review_document_checklist_checked: "Review (checked)",
  review_document_checklist_unchecked: "Review (unchecked)",
  approve_document: "Approve",
  chat: "AI Task Validation",
};

function taskChipLabel(task: ScenarioTask, resources: ScenarioResource[]): string {
  const display = taskEditorDisplay(task);
  if (display.primary) return display.primary;
  const action = ACTION_LABELS[task.actionType] ?? task.actionType;
  if (task.resourceId) {
    const res = resources.find((r) => r.id === task.resourceId);
    if (res) return `${action} ${res.title}`;
  }
  return action;
}

/** Find a task by ID across all steps. */
function findTaskAcrossSteps(
  taskId: string,
  allSteps: ScenarioStep[],
): { task: ScenarioTask; stepIndex: number } | null {
  for (let i = 0; i < allSteps.length; i++) {
    const task = allSteps[i].tasks?.find((t) => t.id === taskId);
    if (task) return { task, stepIndex: i };
  }
  return null;
}

// ── Outcome type config ──────────────────────────────────────────

const OUTCOME_TYPE_CONFIG: Record<
  OutcomeType,
  { label: string; dot: string; bg: string; border: string; text: string }
> = {
  safe_path: {
    label: "Success",
    dot: "bg-emerald-500",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/40",
    text: "text-emerald-400",
  },
  partial_failure: {
    label: "Moderate failure",
    dot: "bg-amber-500",
    bg: "bg-amber-500/10",
    border: "border-amber-500/40",
    text: "text-amber-400",
  },
  critical_failure: {
    label: "Failure",
    dot: "bg-red-500",
    bg: "bg-red-500/10",
    border: "border-red-500/40",
    text: "text-red-400",
  },
};

// ── Grouped task data for the cross-step picker ──────────────────

interface StepTaskGroup {
  stepId: string;
  stepTitle: string;
  stepIndex: number;
  isCurrent: boolean;
  tasks: ScenarioTask[];
}

function buildTaskGroups(
  currentStep: ScenarioStep,
  allSteps: ScenarioStep[],
): StepTaskGroup[] {
  const currentIdx = allSteps.findIndex((s) => s.id === currentStep.id);
  const upToAndIncluding = currentIdx >= 0 ? currentIdx + 1 : allSteps.length;
  return allSteps.slice(0, upToAndIncluding).map((step, i) => ({
    stepId: step.id,
    stepTitle: step.title,
    stepIndex: i,
    isCurrent: step.id === currentStep.id,
    tasks: step.tasks ?? [],
  }));
}

// ── CrossStepTaskTagInput ────────────────────────────────────────

function CrossStepTaskTagInput({
  selectedIds,
  taskGroups,
  currentStepIndex,
  resources,
  onChange,
  excludeIds = [],
  placeholder = "Add task...",
}: {
  selectedIds: string[];
  taskGroups: StepTaskGroup[];
  currentStepIndex: number;
  resources: ScenarioResource[];
  onChange: (ids: string[]) => void;
  excludeIds?: string[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedSet = new Set(selectedIds);
  const excludeSet = new Set(excludeIds);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setFilter("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const addTask = (id: string) => {
    onChange([...selectedIds, id]);
    setFilter("");
    inputRef.current?.focus();
  };

  const removeTask = (id: string) => {
    onChange(selectedIds.filter((x) => x !== id));
  };

  const filteredGroups = taskGroups
    .map((group) => ({
      ...group,
      tasks: group.tasks.filter(
        (t) =>
          !selectedSet.has(t.id) &&
          !excludeSet.has(t.id) &&
          (filter === "" ||
            t.label.toLowerCase().includes(filter.toLowerCase()) ||
            t.id.toLowerCase().includes(filter.toLowerCase())),
      ),
    }))
    .filter((g) => g.tasks.length > 0);

  return (
    <div ref={containerRef} className="relative">
      <div
        className="min-h-[2.75rem] rounded-lg border border-border/40 bg-background/50 px-2.5 py-2 flex flex-wrap gap-2 items-center cursor-text"
        onClick={() => {
          setOpen(true);
          inputRef.current?.focus();
        }}
      >
        {selectedIds.map((id) => {
          const found = taskGroups
            .flatMap((g) => g.tasks.map((t) => ({ task: t, group: g })))
            .find((x) => x.task.id === id);
          const label = found ? taskChipLabel(found.task, resources) : id;
          const isCrossStep = found && !found.group.isCurrent;

          return (
            <span
              key={id}
              className="inline-flex items-center gap-1 rounded-full bg-foreground/[0.08] border border-foreground/[0.12] pl-3 pr-1.5 py-1 text-[11px] font-medium text-foreground whitespace-nowrap"
            >
              {isCrossStep && (
                <span className="text-[8px] font-bold text-primary/70 mr-0.5">
                  S{found.group.stepIndex + 1}
                </span>
              )}
              {label}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeTask(id);
                }}
                className="shrink-0 w-4 h-4 flex items-center justify-center rounded-full hover:bg-foreground/15 transition-colors ml-0.5"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          );
        })}
        <input
          ref={inputRef}
          type="text"
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value);
            if (!open) setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="flex-1 min-w-[80px] bg-transparent text-[11px] outline-none placeholder:text-muted-foreground/40 py-0.5"
        />
      </div>

      {open && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1 max-h-56 overflow-y-auto rounded-lg border border-border/60 bg-popover shadow-lg">
          {filteredGroups.length === 0 ? (
            <div className="px-3 py-2 text-[11px] text-muted-foreground/60 italic">
              {filter ? "No matching tasks" : "All tasks selected"}
            </div>
          ) : (
            filteredGroups.map((group) => (
              <div key={group.stepId}>
                <div className="px-3 pt-2 pb-1 text-[8px] font-bold uppercase tracking-widest text-muted-foreground/40 flex items-center gap-1.5">
                  <span className={cn(
                    "inline-flex items-center justify-center w-3.5 h-3.5 rounded-full text-[7px] font-bold shrink-0",
                    group.isCurrent
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground/60",
                  )}>
                    {group.stepIndex + 1}
                  </span>
                  {group.stepTitle}
                  {group.isCurrent && (
                    <span className="text-primary/50 font-normal normal-case">(current)</span>
                  )}
                </div>
                {group.tasks.map((task) => (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => addTask(task.id)}
                    className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-accent/50 transition-colors flex items-center gap-2"
                  >
                    <Plus className="w-3 h-3 shrink-0 text-muted-foreground/50" />
                    <span className="truncate font-medium">{taskChipLabel(task, resources)}</span>
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      )}

      {selectedIds.length > 0 && (
        <p className="mt-1 text-[10px] text-muted-foreground/50">
          {selectedIds.length} task{selectedIds.length !== 1 ? "s" : ""} selected
        </p>
      )}
    </div>
  );
}

// ── DestinationPicker ────────────────────────────────────────────

function DestinationPicker({
  path,
  currentStep,
  allSteps,
  outcomeNodes,
  isBroken,
  targetLabel,
  onSetTarget,
  onClearTarget,
  onCreateOutcomeAndLink,
  onCreateStepAndLink,
}: {
  path: ScenarioPath;
  currentStep: ScenarioStep;
  allSteps: ScenarioStep[];
  outcomeNodes: OutcomeNode[];
  isBroken: boolean;
  targetLabel: string | null;
  onSetTarget: (target: PathTarget) => void;
  onClearTarget: () => void;
  onCreateOutcomeAndLink: (outcomeType: OutcomeType, title: string) => void;
  onCreateStepAndLink: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [createMode, setCreateMode] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<OutcomeType | "">("");
  const containerRef = useRef<HTMLDivElement>(null);

  const currentTargetId = path.connections?.[0]?.targetNodeId ?? path.targetStepId ?? "";
  const hasTarget = !!currentTargetId;

  const allNodeNames = [
    ...allSteps.map((s) => s.title.toLowerCase()),
    ...outcomeNodes.map((o) => o.title.toLowerCase()),
  ];
  const isDuplicate = newName.trim() !== "" && allNodeNames.includes(newName.trim().toLowerCase());

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setCreateMode(false);
        setNewName("");
        setNewType("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const selectStep = (step: ScenarioStep) => {
    onSetTarget({ kind: "step", stepId: step.id });
    setOpen(false);
  };

  const selectOutcome = (outcome: OutcomeNode) => {
    onSetTarget({
      kind: "outcome",
      nodeId: outcome.id,
      label: outcome.title,
      type: outcome.outcome,
    });
    setOpen(false);
  };

  const handleCreate = () => {
    const name = newName.trim();
    if (!name || !newType || isDuplicate) return;
    onCreateOutcomeAndLink(newType, name);
    setOpen(false);
    setCreateMode(false);
    setNewName("");
    setNewType("");
  };

  const getDotColor = (): string => {
    if (isBroken) return "bg-amber-500";
    const conn = path.connections?.[0];
    if (conn) {
      const outcome = outcomeNodes.find((o) => o.id === conn.targetNodeId);
      if (outcome) return OUTCOME_TYPE_CONFIG[outcome.outcome].dot;
    }
    if (path.targetStepId) return "bg-emerald-500";
    return "bg-muted-foreground/30";
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Display */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "w-full rounded-lg px-3 py-2 text-left transition-all flex items-center gap-2 min-h-[2.5rem]",
          isBroken
            ? "border-2 border-amber-500/50 bg-amber-500/[0.06]"
            : hasTarget
              ? "border border-border/50 bg-background/50 hover:border-border"
              : "border border-dashed border-border/40 bg-transparent hover:border-border/60",
        )}
      >
        {isBroken ? (
          <>
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-500" />
            <span className="text-[11px] font-medium text-amber-400 truncate flex-1">
              {targetLabel ?? "Deleted node"}
            </span>
          </>
        ) : hasTarget && targetLabel ? (
          <>
            <span className={cn("w-2 h-2 rounded-full shrink-0", getDotColor())} />
            <span className="text-[11px] font-medium text-foreground truncate flex-1">
              {targetLabel}
            </span>
            <ChevronDown className="w-3 h-3 shrink-0 text-muted-foreground/40" />
          </>
        ) : (
          <>
            <Search className="w-3 h-3 shrink-0 text-muted-foreground/30" />
            <span className="text-[11px] text-muted-foreground/40 flex-1">Select or create...</span>
          </>
        )}
      </button>

      {isBroken && (
        <div className="mt-1 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="text-[9px] font-medium text-amber-400 hover:text-amber-300 transition-colors"
          >
            Re-link
          </button>
          <span className="text-muted-foreground/20 text-[9px]">\u00b7</span>
          <button
            type="button"
            onClick={onClearTarget}
            className="text-[9px] font-medium text-muted-foreground/50 hover:text-destructive transition-colors"
          >
            Remove
          </button>
        </div>
      )}

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1 max-h-64 overflow-y-auto rounded-lg border border-border/60 bg-popover shadow-lg">
          {/* Steps */}
          {allSteps.filter((s) => s.id !== currentStep.id).length > 0 && (
            <>
              <div className="px-3 pt-2 pb-1 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40">
                Steps
              </div>
              {allSteps
                .filter((s) => s.id !== currentStep.id)
                .map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => selectStep(s)}
                    className={cn(
                      "w-full text-left px-3 py-1.5 text-[11px] hover:bg-accent/50 transition-colors flex items-center gap-2",
                      s.id === currentTargetId && "bg-accent/30",
                    )}
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    <span className="truncate">Step {allSteps.indexOf(s) + 1}: {s.title}</span>
                  </button>
                ))}
            </>
          )}

          {/* Outcomes */}
          {outcomeNodes.length > 0 && (
            <>
              <div className="px-3 pt-2 pb-1 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40">
                Outcomes
              </div>
              {outcomeNodes.map((o) => {
                const cfg = OUTCOME_TYPE_CONFIG[o.outcome];
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => selectOutcome(o)}
                    className={cn(
                      "w-full text-left px-3 py-1.5 text-[11px] hover:bg-accent/50 transition-colors flex items-center gap-2",
                      o.id === currentTargetId && "bg-accent/30",
                    )}
                  >
                    <span className={cn("w-2 h-2 rounded-full shrink-0", cfg.dot)} />
                    <span className="truncate">{o.title}</span>
                  </button>
                );
              })}
            </>
          )}

          {/* Create next step */}
          <div className="border-t border-border/30 px-3 py-2">
            <button
              type="button"
              onClick={() => {
                onCreateStepAndLink();
                setOpen(false);
              }}
              className="w-full text-left text-[11px] font-medium text-emerald-500 hover:text-emerald-400 transition-colors flex items-center gap-1.5"
            >
              <CornerDownRight className="w-3 h-3 shrink-0" />
              Create next step
            </button>
          </div>

          {/* Inline create outcome */}
          {outcomeNodes.length < 3 && (
          <div className="border-t border-border/30 px-3 py-2">
            {!createMode ? (
              <button
                type="button"
                onClick={() => setCreateMode(true)}
                className="w-full text-left text-[11px] font-medium text-primary hover:text-primary/80 transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-3 h-3 shrink-0" />
                Create new outcome...
              </button>
            ) : (
              <div className="space-y-2">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Outcome name..."
                  autoFocus
                  className="w-full text-[11px] rounded-md border border-border/50 bg-background px-2 py-1.5 outline-none focus:ring-2 focus:ring-primary/20"
                />
                {isDuplicate && (
                  <p className="text-[10px] text-amber-400 leading-snug">
                    "{newName.trim()}" already exists \u2014 select it from the list above.
                  </p>
                )}
                <div className="flex gap-1">
                  {(
                    [
                      ["safe_path", "Success"],
                      ["partial_failure", "Moderate"],
                      ["critical_failure", "Failure"],
                    ] as const
                  ).map(([type, label]) => {
                    const cfg = OUTCOME_TYPE_CONFIG[type];
                    const selected = newType === type;
                    const taken = outcomeNodes.some((o) => o.outcome === type);
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => !taken && setNewType(type)}
                        disabled={taken}
                        title={taken ? `${label} outcome already exists` : undefined}
                        className={cn(
                          "flex-1 text-[9px] font-semibold py-1 rounded-md border transition-all flex items-center justify-center gap-1",
                          taken
                            ? "border-border/20 text-muted-foreground/25 cursor-not-allowed"
                            : selected
                              ? `${cfg.bg} ${cfg.border} ${cfg.text}`
                              : "border-border/40 text-muted-foreground/50 hover:border-border/60",
                        )}
                      >
                        <span className={cn("w-1.5 h-1.5 rounded-full", taken ? "bg-muted-foreground/20" : cfg.dot)} />
                        {label}
                      </button>
                    );
                  })}
                </div>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={handleCreate}
                    disabled={!newName.trim() || !newType || isDuplicate}
                    className="flex-1 py-1 rounded-md text-[10px] font-semibold bg-primary text-primary-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    Create
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCreateMode(false);
                      setNewName("");
                      setNewType("");
                    }}
                    className="px-2 py-1 rounded-md text-[10px] text-muted-foreground/60 hover:text-foreground border border-border/40 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── ConditionCard ────────────────────────────────────────────────

export interface ConditionCardProps {
  path: ScenarioPath;
  step: ScenarioStep;
  allSteps: ScenarioStep[];
  outcomeNodes: OutcomeNode[];
  resources: ScenarioResource[];
  onUpdatePath: (stepId: string, pathId: string, patch: UpdatePathPatch) => void;
  onDeletePath: (stepId: string, pathId: string) => void;
  onSetPathTarget: (stepId: string, pathId: string, target: PathTarget) => void;
  onClearPathTarget: (stepId: string, pathId: string) => void;
  onCreateOutcomeAndLink: (
    stepId: string,
    pathId: string,
    outcomeType: OutcomeType,
    title: string,
  ) => void;
  onCreateStepAndLink: (fromStepId: string, pathId: string) => void;
}

export function ConditionCard({
  path,
  step,
  allSteps,
  outcomeNodes,
  resources,
  onUpdatePath,
  onDeletePath,
  onSetPathTarget,
  onClearPathTarget,
  onCreateOutcomeAndLink,
  onCreateStepAndLink,
}: ConditionCardProps) {
  const taskGroups = buildTaskGroups(step, allSteps);
  const currentStepIndex = allSteps.findIndex((s) => s.id === step.id);
  const { allIds, anyGroups, noneIds } = getPrerequisiteGroups(path.prerequisite);
  const [localAnyGroups, setLocalAnyGroups] = useState<string[][]>(
    anyGroups.length > 0 ? anyGroups : [],
  );

  useEffect(() => {
    const { anyGroups: fresh } = getPrerequisiteGroups(path.prerequisite);
    setLocalAnyGroups(fresh.length > 0 ? fresh : []);
  }, [path.prerequisite]);

  const broken = isPathTargetBroken(path, allSteps, outcomeNodes);
  const targetLabel = getPathTargetLabel(path, allSteps, outcomeNodes);

  const allTasksFlat = taskGroups.flatMap((g) => g.tasks);

  const buildLabel = (nextAll: string[], nextAnyGroups: string[][], nextNone: string[]) => {
    const combined = [...nextAll, ...nextAnyGroups.flat(), ...nextNone];
    const taskNames = combined
      .map((id) => {
        const found = findTaskAcrossSteps(id, allSteps);
        return found ? taskChipLabel(found.task, resources) : id;
      })
      .join(", ");
    return taskNames || "Condition";
  };

  const commitPrereq = (nextAll: string[], nextAnyGroups: string[][], nextNone: string[] = noneIds) => {
    const prereq = buildMixedPrerequisite(nextAll, nextAnyGroups, nextNone);
    const label = buildLabel(nextAll, nextAnyGroups, nextNone);
    onUpdatePath(step.id, path.id, { prerequisite: prereq, label });
  };

  const allIdsExclude = [...localAnyGroups.flat(), ...noneIds];
  const noneIdsExclude = [...allIds, ...localAnyGroups.flat()];
  const anyGroupsExclude = (groupIdx: number) => {
    const others = localAnyGroups.flatMap((g, i) => (i === groupIdx ? [] : g));
    return [...allIds, ...others, ...noneIds];
  };

  const addOrGroup = () => {
    const next = [...localAnyGroups, []];
    setLocalAnyGroups(next);
  };

  const removeOrGroup = (idx: number) => {
    const next = localAnyGroups.filter((_, i) => i !== idx);
    setLocalAnyGroups(next);
    commitPrereq(allIds, next);
  };

  const updateOrGroup = (idx: number, ids: string[]) => {
    const next = localAnyGroups.map((g, i) => (i === idx ? ids : g));
    setLocalAnyGroups(next);
    commitPrereq(allIds, next);
  };

  const totalTasks = allIds.length + localAnyGroups.reduce((n, g) => n + g.length, 0) + noneIds.length;

  return (
    <div className="rounded-xl border border-border/40 bg-card/50">
      <div className="flex">
        {/* IF panel */}
        <div className="flex-[2] min-w-0 p-3 border-r border-border/30">
          <div className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40 mb-2">
            If
          </div>

          {/* ALL group */}
          <div className="mb-2">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-[8px] font-bold uppercase tracking-wider text-emerald-500/70">
                All of
              </span>
              <span className="text-[8px] text-muted-foreground/35 italic">
                (AND)
              </span>
            </div>
            <CrossStepTaskTagInput
              selectedIds={allIds}
              taskGroups={taskGroups}
              currentStepIndex={currentStepIndex}
              resources={resources}
              onChange={(ids) => commitPrereq(ids, localAnyGroups)}
              excludeIds={allIdsExclude}
              placeholder="Add required task..."
            />
          </div>

          {/* OR groups */}
          {localAnyGroups.map((groupIds, idx) => (
            <div key={idx} className="mb-2">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[8px] font-bold uppercase tracking-wider text-amber-500/70">
                  Any of
                </span>
                <span className="text-[8px] text-muted-foreground/35 italic">
                  (OR group {idx + 1})
                </span>
                <button
                  type="button"
                  onClick={() => removeOrGroup(idx)}
                  title="Remove this OR group"
                  className="ml-auto w-4 h-4 flex items-center justify-center rounded hover:bg-destructive/10 text-muted-foreground/30 hover:text-destructive transition-colors"
                >
                  <Trash2 className="w-2.5 h-2.5" />
                </button>
              </div>
              <CrossStepTaskTagInput
                selectedIds={groupIds}
                taskGroups={taskGroups}
                currentStepIndex={currentStepIndex}
                resources={resources}
                onChange={(ids) => updateOrGroup(idx, ids)}
                excludeIds={anyGroupsExclude(idx)}
                placeholder="Add alternative task..."
              />
            </div>
          ))}

          <button
            type="button"
            onClick={addOrGroup}
            className="mt-1 flex items-center gap-1 text-[9px] font-medium text-primary/70 hover:text-primary transition-colors"
          >
            <Plus className="w-3 h-3" />
            Add OR group
          </button>

          {/* NONE group */}
          <div className="mt-3 pt-3 border-t border-border/20">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-[8px] font-bold uppercase tracking-wider text-rose-500/70">
                None of
              </span>
              <span className="text-[8px] text-muted-foreground/35 italic">
                (MUST NOT)
              </span>
            </div>
            <CrossStepTaskTagInput
              selectedIds={noneIds}
              taskGroups={taskGroups}
              currentStepIndex={currentStepIndex}
              resources={resources}
              onChange={(ids) => commitPrereq(allIds, localAnyGroups, ids)}
              excludeIds={noneIdsExclude}
              placeholder="Add forbidden task..."
            />
          </div>

          {/* Summary hint */}
          {totalTasks > 0 && (
            <p className="mt-2 text-[9px] text-muted-foreground/40 leading-snug">
              {[
                allIds.length > 0
                  ? `${allIds.length} required`
                  : null,
                localAnyGroups.filter((g) => g.length > 0).length > 0
                  ? `${localAnyGroups.filter((g) => g.length > 0).length} OR group${localAnyGroups.filter((g) => g.length > 0).length !== 1 ? "s" : ""}`
                  : null,
                noneIds.length > 0
                  ? `${noneIds.length} forbidden`
                  : null,
              ].filter(Boolean).join(" + ")}
            </p>
          )}
        </div>

        {/* GO TO panel */}
        <div className="flex-1 min-w-0 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40">
              Go to
            </span>
            <button
              type="button"
              onClick={() => onDeletePath(step.id, path.id)}
              title="Delete condition"
              className="w-5 h-5 flex items-center justify-center rounded hover:bg-destructive/10 text-muted-foreground/30 hover:text-destructive transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
          <DestinationPicker
            path={path}
            currentStep={step}
            allSteps={allSteps}
            outcomeNodes={outcomeNodes}
            isBroken={broken}
            targetLabel={targetLabel}
            onSetTarget={(target) => onSetPathTarget(step.id, path.id, target)}
            onClearTarget={() => onClearPathTarget(step.id, path.id)}
            onCreateOutcomeAndLink={(type, title) =>
              onCreateOutcomeAndLink(step.id, path.id, type, title)
            }
            onCreateStepAndLink={() =>
              onCreateStepAndLink(step.id, path.id)
            }
          />
        </div>
      </div>
    </div>
  );
}
