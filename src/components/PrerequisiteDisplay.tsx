import { PrerequisiteCondition, ScenarioTask } from "@/types/scenario";

interface PrerequisiteDisplayProps {
  prerequisite: PrerequisiteCondition | undefined;
  tasks: ScenarioTask[];
}

function resolveLabel(taskId: string, tasks: ScenarioTask[]): string {
  return tasks.find((t) => t.id === taskId)?.label ?? taskId;
}

const TaskChip = ({ label }: { label: string }) => (
  <span
    className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-secondary text-secondary-foreground border border-border/60 max-w-[180px] truncate"
    title={label}
  >
    {label}
  </span>
);

const logicColors: Record<string, string> = {
  "ALL OF": "hsl(220, 70%, 52%)",
  "ANY OF": "hsl(160, 60%, 38%)",
  "NONE OF": "hsl(0, 65%, 48%)",
};

const LogicLabel = ({ label }: { label: string }) => (
  <span
    className="text-[8px] font-bold uppercase tracking-wider shrink-0 whitespace-nowrap"
    style={{ color: logicColors[label] ?? "hsl(220, 15%, 55%)" }}
  >
    {label}
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
    return <TaskChip label={resolveLabel(prerequisite, tasks)} />;
  }

  const { all, none, any } = prerequisite;
  const groups: Array<{ key: string; label: string; ids: string[] }> = [];
  if (all?.length) groups.push({ key: "all", label: "ALL OF", ids: all });
  if (none?.length) groups.push({ key: "none", label: "NONE OF", ids: none });
  if (any?.length) groups.push({ key: "any", label: "ANY OF", ids: any });

  if (groups.length === 0) {
    return (
      <span className="text-[10px] text-muted-foreground/40 italic">
        No condition
      </span>
    );
  }

  return (
    <div className="space-y-1.5">
      {groups.map(({ key, label, ids }) => (
        <div key={key} className="flex items-start gap-1.5 flex-wrap">
          <LogicLabel label={label} />
          <div className="flex items-center gap-1 flex-wrap">
            {ids.map((id) => (
              <TaskChip key={id} label={resolveLabel(id, tasks)} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
