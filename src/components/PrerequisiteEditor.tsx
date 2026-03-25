import { useState } from "react";
import { PrerequisiteCondition, ScenarioTask } from "@/types/scenario";
import { X, Plus } from "lucide-react";

interface PrerequisiteEditorProps {
  prerequisite: PrerequisiteCondition | undefined;
  tasks: ScenarioTask[];
  onChange: (updated: PrerequisiteCondition | undefined) => void;
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
  // Collapse { all: ["X"] } → "X" for compatibility with string-form prerequisites
  if (keys.length === 1 && keys[0] === "all" && result.all!.length === 1) {
    return result.all![0];
  }
  return result as PrerequisiteCondition;
}

const groupConfig: Record<
  GroupKey,
  { label: string; color: string; bg: string; border: string; chipBorder: string }
> = {
  all: {
    label: "ALL OF",
    color: "hsl(220, 70%, 52%)",
    bg: "hsl(220, 70%, 97%)",
    border: "hsl(220, 70%, 85%)",
    chipBorder: "hsl(220, 70%, 78%)",
  },
  none: {
    label: "NONE OF",
    color: "hsl(0, 65%, 48%)",
    bg: "hsl(0, 65%, 97%)",
    border: "hsl(0, 65%, 85%)",
    chipBorder: "hsl(0, 65%, 78%)",
  },
  any: {
    label: "ANY OF",
    color: "hsl(160, 55%, 36%)",
    bg: "hsl(160, 55%, 96%)",
    border: "hsl(160, 55%, 80%)",
    chipBorder: "hsl(160, 55%, 72%)",
  },
};

const ALL_KEYS: GroupKey[] = ["all", "none", "any"];

export const PrerequisiteEditor = ({
  prerequisite,
  tasks,
  onChange,
}: PrerequisiteEditorProps) => {
  const normalized = normalize(prerequisite);
  const [pendingGroupKey, setPendingGroupKey] = useState<GroupKey | null>(null);

  const activeGroups = ALL_KEYS.filter((k) => normalized[k].length > 0);
  const availableGroupKeys = ALL_KEYS.filter((k) => !activeGroups.includes(k));

  const update = (key: GroupKey, newIds: string[]) => {
    const updated = { ...normalized, [key]: newIds };
    onChange(serialize(updated));
  };

  const addTask = (key: GroupKey, taskId: string) => {
    if (!taskId || normalized[key].includes(taskId)) return;
    update(key, [...normalized[key], taskId]);
    setPendingGroupKey(null);
  };

  const removeTask = (key: GroupKey, taskId: string) => {
    update(key, normalized[key].filter((id) => id !== taskId));
  };

  const removeGroup = (key: GroupKey) => {
    update(key, []);
    if (pendingGroupKey === key) setPendingGroupKey(null);
  };

  return (
    <div className="space-y-1.5">
      {/* Active groups */}
      {activeGroups.map((key) => {
        const cfg = groupConfig[key];
        const availableTasks = tasks.filter((t) => !normalized[key].includes(t.id));

        return (
          <div
            key={key}
            className="rounded-md p-2 space-y-1.5"
            style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
          >
            <div className="flex items-center justify-between">
              <span
                className="text-[8px] font-bold uppercase tracking-widest"
                style={{ color: cfg.color }}
              >
                {cfg.label}
              </span>
              <button
                onClick={() => removeGroup(key)}
                className="w-4 h-4 flex items-center justify-center rounded hover:bg-black/10 transition-colors"
                title={`Remove ${cfg.label} group`}
              >
                <X className="w-2.5 h-2.5" style={{ color: cfg.color }} />
              </button>
            </div>

            <div className="flex items-center gap-1 flex-wrap">
              {normalized[key].map((taskId) => {
                const taskLabel = tasks.find((t) => t.id === taskId)?.label ?? taskId;
                return (
                  <span
                    key={taskId}
                    className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full text-[10px] font-medium"
                    style={{
                      background: "white",
                      border: `1px solid ${cfg.chipBorder}`,
                      color: cfg.color,
                    }}
                  >
                    <span className="max-w-[130px] truncate" title={taskLabel}>
                      {taskLabel}
                    </span>
                    <button
                      onClick={() => removeTask(key, taskId)}
                      className="w-3 h-3 flex items-center justify-center rounded-full hover:bg-black/10 shrink-0"
                    >
                      <X className="w-2 h-2" />
                    </button>
                  </span>
                );
              })}

              {availableTasks.length > 0 && (
                <select
                  className="text-[9px] rounded border border-dashed px-1.5 py-0.5 bg-transparent cursor-pointer outline-none transition-colors"
                  style={{ borderColor: cfg.border, color: cfg.color }}
                  value=""
                  onChange={(e) => {
                    if (e.target.value) addTask(key, e.target.value);
                  }}
                >
                  <option value="" disabled>
                    + add task
                  </option>
                  {availableTasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        );
      })}

      {/* Add new group */}
      {availableGroupKeys.length > 0 && (
        <>
          {pendingGroupKey === null ? (
            <button
              onClick={() => setPendingGroupKey(availableGroupKeys[0])}
              className="flex items-center gap-1 text-[9px] text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded border border-dashed border-border/50 hover:border-border w-full"
            >
              <Plus className="w-2.5 h-2.5" />
              Add condition group
            </button>
          ) : (
            <div
              className="flex items-center gap-1.5 flex-wrap p-1.5 rounded-md border border-dashed border-border"
              style={{ background: "hsl(var(--secondary) / 0.3)" }}
            >
              <select
                className="text-[9px] rounded border border-border/60 px-1.5 py-1 bg-background outline-none focus:ring-1 focus:ring-primary/40"
                value={pendingGroupKey}
                onChange={(e) => setPendingGroupKey(e.target.value as GroupKey)}
              >
                {availableGroupKeys.map((k) => (
                  <option key={k} value={k}>
                    {groupConfig[k].label}
                  </option>
                ))}
              </select>
              <select
                className="text-[9px] rounded border border-border/60 px-1.5 py-1 bg-background outline-none focus:ring-1 focus:ring-primary/40 flex-1 min-w-0"
                value=""
                onChange={(e) => {
                  if (e.target.value) addTask(pendingGroupKey, e.target.value);
                }}
              >
                <option value="" disabled>
                  Select a task…
                </option>
                {tasks
                  .filter((t) => !normalized[pendingGroupKey].includes(t.id))
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
              </select>
              <button
                onClick={() => setPendingGroupKey(null)}
                className="w-5 h-5 flex items-center justify-center rounded hover:bg-secondary shrink-0"
              >
                <X className="w-3 h-3 text-muted-foreground" />
              </button>
            </div>
          )}
        </>
      )}

      {/* Empty state */}
      {activeGroups.length === 0 && pendingGroupKey === null && (
        <p className="text-[9px] text-muted-foreground/40 italic px-0.5">
          No prerequisite — always available
        </p>
      )}
    </div>
  );
};
