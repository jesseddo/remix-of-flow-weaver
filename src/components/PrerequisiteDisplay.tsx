import { PrerequisiteCondition, ScenarioTask } from "@/types/scenario";
import { resolveTaskAuthoringLine } from "@/utils/taskDisplay";

interface PrerequisiteDisplayProps {
  prerequisite: PrerequisiteCondition | undefined;
  tasks: ScenarioTask[];
}

function chipLabel(taskId: string, taskList: ScenarioTask[]): string {
  return resolveTaskAuthoringLine(taskId, taskList);
}

function fullTaskLabel(taskId: string, taskList: ScenarioTask[]): string {
  return taskList.find((t) => t.id === taskId)?.label ?? taskId;
}

const TaskChip = ({ label, title }: { label: string; title?: string }) => (
  <span
    className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-secondary text-secondary-foreground border border-border/60 max-w-[180px] truncate"
    title={title ?? label}
  >
    {label}
  </span>
);

const groupLabels: Record<"all" | "none" | "any", string> = {
  all: "Must:",
  none: "Must not:",
  any: "At least one of:",
};

const logicColors: Record<"all" | "none" | "any", string> = {
  all: "hsl(220, 70%, 52%)",
  any: "hsl(160, 60%, 38%)",
  none: "hsl(0, 65%, 48%)",
};

const LogicLabel = ({ groupKey }: { groupKey: keyof typeof groupLabels }) => (
  <span
    className="text-[8px] font-semibold shrink-0 whitespace-nowrap max-w-[118px] leading-tight"
    style={{ color: logicColors[groupKey] }}
  >
    {groupLabels[groupKey]}
  </span>
);

export const PrerequisiteDisplay = ({
  prerequisite,
  tasks,
}: PrerequisiteDisplayProps) => {
  if (!prerequisite || (typeof prerequisite === "string" && !prerequisite)) {
    return (
      <span className="text-[10px] text-muted-foreground/40 italic">
        No condition
      </span>
    );
  }

  if (typeof prerequisite === "string") {
    return (
      <TaskChip
        label={chipLabel(prerequisite, tasks)}
        title={fullTaskLabel(prerequisite, tasks)}
      />
    );
  }

  const { all, none, any } = prerequisite;
  const groups: Array<{ key: "all" | "none" | "any"; ids: string[] }> = [];
  if (all?.length) groups.push({ key: "all", ids: all });
  if (none?.length) groups.push({ key: "none", ids: none });
  if (any?.length) groups.push({ key: "any", ids: any });

  if (groups.length === 0) {
    return (
      <span className="text-[10px] text-muted-foreground/40 italic">
        No condition
      </span>
    );
  }

  return (
    <div className="space-y-1.5">
      {groups.map(({ key, ids }) => (
        <div key={key} className="flex items-start gap-1.5 flex-wrap">
          <LogicLabel groupKey={key} />
          <div className="flex items-center gap-1 flex-wrap">
            {ids.map((id) => (
              <TaskChip
                key={id}
                label={chipLabel(id, tasks)}
                title={fullTaskLabel(id, tasks)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
