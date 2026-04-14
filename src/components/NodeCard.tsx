import { useState } from "react";
import { ScenarioNode, OutcomeNode, ScenarioStep, GlobalTimer, StepEvaluation, ScenarioPath } from "@/types/scenario";
import type { ScenarioResource, ScenarioTask } from "@/types/scenario";
import { taskEditorDisplay } from "@/utils/taskDisplay";
import { stepEvaluationHasContent } from "@/data/evaluationCompetencies";
import { MessageSquare, Radio, FileText, Video, User, CircleCheck as CheckCircle2, Circle as XCircle, AlertTriangle, ChevronDown, Timer, Clock, X } from "lucide-react";

// ── Inline confirmation popover ──────────────────────────────────
const DeleteConfirmPopover = ({
  onConfirm,
  onCancel,
  label,
}: {
  onConfirm: () => void;
  onCancel: () => void;
  label: string;
}) => (
  <div
    className="absolute top-8 right-0 z-50 w-48 rounded-lg border border-border bg-popover shadow-lg p-2.5 animate-in fade-in-0 zoom-in-95 duration-100"
    onClick={(e) => e.stopPropagation()}
    onMouseDown={(e) => e.stopPropagation()}
  >
    <p className="text-[11px] text-foreground font-medium mb-2">
      Delete this {label}?
    </p>
    <div className="flex gap-1.5">
      <button
        onClick={onConfirm}
        className="flex-1 py-1 rounded-md text-[10px] font-semibold bg-destructive text-destructive-foreground transition-all hover:bg-destructive/90"
      >
        Yes, delete
      </button>
      <button
        onClick={onCancel}
        className="flex-1 py-1 rounded-md text-[10px] font-medium text-muted-foreground border border-border/50 hover:bg-muted transition-colors"
      >
        Cancel
      </button>
    </div>
  </div>
);
import type { OutcomeType } from "@/types/scenario";
import type { DisplayMode } from "@/pages/Index";

const outcomeStyles: Record<OutcomeType, {
  bg: string;
  border: string;
  iconBg: string;
  titleColor: string;
  badgeBg: string;
  badgeColor: string;
  labelColor: string;
  label: string;
}> = {
  safe_path: {
    bg: "linear-gradient(135deg, hsl(145, 65%, 96%), hsl(145, 65%, 92%))",
    border: "hsl(145, 65%, 42%)",
    iconBg: "hsl(145, 65%, 42%)",
    titleColor: "hsl(145, 65%, 25%)",
    badgeBg: "hsl(145, 65%, 42%, 0.15)",
    badgeColor: "hsl(145, 65%, 30%)",
    labelColor: "hsl(145, 65%, 35%)",
    label: "Safe Path",
  },
  partial_failure: {
    bg: "linear-gradient(135deg, hsl(40, 80%, 96%), hsl(40, 80%, 90%))",
    border: "hsl(40, 80%, 42%)",
    iconBg: "hsl(40, 80%, 42%)",
    titleColor: "hsl(40, 80%, 22%)",
    badgeBg: "hsl(40, 80%, 42%, 0.15)",
    badgeColor: "hsl(40, 80%, 30%)",
    labelColor: "hsl(40, 80%, 35%)",
    label: "Partial Failure",
  },
  critical_failure: {
    bg: "linear-gradient(135deg, hsl(0, 72%, 97%), hsl(0, 72%, 93%))",
    border: "hsl(0, 72%, 55%)",
    iconBg: "hsl(0, 72%, 55%)",
    titleColor: "hsl(0, 72%, 35%)",
    badgeBg: "hsl(0, 72%, 55%, 0.15)",
    badgeColor: "hsl(0, 72%, 40%)",
    labelColor: "hsl(0, 72%, 45%)",
    label: "Critical Failure",
  },
};

const OutcomeIcon = ({ outcome }: { outcome: OutcomeType }) => {
  const className = "w-6 h-6";
  const style = { color: "white" };
  switch (outcome) {
    case "safe_path": return <CheckCircle2 className={className} style={style} />;
    case "partial_failure": return <AlertTriangle className={className} style={style} />;
    case "critical_failure": return <XCircle className={className} style={style} />;
  }
};

const connectionDotColor = (type: string): { bg: string; shadow: string } => {
  switch (type) {
    case "critical_failure": return { bg: "hsl(0, 72%, 55%)", shadow: "hsla(0, 72%, 55%, 0.3)" };
    case "partial_failure": return { bg: "hsl(40, 80%, 42%)", shadow: "hsla(40, 80%, 42%, 0.3)" };
    case "safe_path": return { bg: "hsl(160, 60%, 45%)", shadow: "hsla(160, 60%, 45%, 0.3)" };
    default: return { bg: "hsl(220, 15%, 75%)", shadow: "hsla(220, 15%, 75%, 0.3)" };
  }
};

const typeConfig: Record<
  string,
  { icon: typeof MessageSquare; colorClass: string; label: string }
> = {
  chat: { icon: MessageSquare, colorClass: "bg-node-chat", label: "Chat" },
  radio: { icon: Radio, colorClass: "bg-node-radio", label: "Radio" },
  document: { icon: FileText, colorClass: "bg-node-document", label: "Document" },
  video: { icon: Video, colorClass: "bg-node-video", label: "Video" },
};

const flowBadge: Record<string, string> = {
  conditional: "bg-node-warning/20 text-node-warning",
  gated: "bg-node-document/20 text-node-document",
  interruption: "bg-destructive/20 text-destructive",
  linear: "bg-muted text-muted-foreground",
};

const TASK_SHORT_LABELS: Record<string, string> = {
  request_document: "Request",
  review_document: "Review",
  review_document_checklist_checked: "Review (checked)",
  review_document_checklist_unchecked: "Review (unchecked)",
  approve_document: "Approve",
  chat: "Chat",
};

function taskDescriptionParts(
  task: ScenarioTask,
  resources: ScenarioResource[],
  shortLabel: string,
): { action: string; context?: string; detail?: string } {
  const resource = task.resourceId
    ? resources.find((r) => r.id === task.resourceId)
    : undefined;

  if (resource) {
    const checklistNames =
      resource.checkboxItems && task.checklistItemIds
        ? task.checklistItemIds
            .map((cid) => resource.checkboxItems!.find((ci) => ci.id === cid)?.name)
            .filter(Boolean)
        : [];
    return {
      action: shortLabel,
      context: resource.title,
      detail: checklistNames.length > 0 ? checklistNames.join(", ") : undefined,
    };
  }

  const display = taskEditorDisplay(task);
  const primary = display.primary;
  const isRedundant =
    primary.toLowerCase() === shortLabel.toLowerCase() ||
    primary.toLowerCase() === task.actionType.replace(/_/g, " ");

  return {
    action: shortLabel,
    context: isRedundant ? undefined : primary,
  };
}

interface ScenarioCardProps {
  node: ScenarioNode;
  isSelected: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onClick: (e: React.MouseEvent) => void;
  displayMode: DisplayMode;
  selectedStepId?: string | null;
  onSelectStep?: (stepId: string | null) => void;
  warningNodeIds?: Set<string>;
}

interface OutcomeCardProps {
  node: OutcomeNode;
  isSelected: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onClick: (e: React.MouseEvent) => void;
  spotlightState?: "target" | "dimmed" | "none";
  onDelete?: (outcomeId: string) => void;
}

const StepRow = ({
  step,
  index,
  isSelected,
  onSelectStep,
  hasWarning,
}: {
  step: ScenarioStep;
  index: number;
  isSelected?: boolean;
  onSelectStep?: (stepId: string | null) => void;
  hasWarning?: boolean;
}) => {
  const cfg = typeConfig[step.type];
  const Icon = cfg.icon;

  return (
    <div className="relative">
      <div
        className={`bg-card rounded-lg p-3 space-y-2 hover:bg-secondary/30 transition-colors ${
          onSelectStep ? "cursor-pointer" : ""
        } ${isSelected ? "ring-2 ring-primary" : ""}`}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          if (onSelectStep) {
            onSelectStep(isSelected ? null : step.id);
          }
        }}
      >
          <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-1">
            <div className="relative shrink-0">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                style={{ background: `hsl(var(--node-${step.type}))`, color: "white" }}
              >
                {index + 1}
              </div>
              {hasWarning && (
                <div
                  className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center"
                  style={{ background: "hsl(38, 92%, 50%)", boxShadow: "0 0 0 1.5px white" }}
                  title="Validation warning: this step has a configuration issue"
                >
                  <AlertTriangle className="w-2 h-2 text-white" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-xs text-card-foreground leading-tight">
                {step.title}
              </h4>
              {step.persona && (
                <p className="text-[10px] text-muted-foreground mt-0.5">{step.persona}</p>
              )}
            </div>
          </div>
          <span className="flex items-center gap-1 text-[10px] font-medium shrink-0" style={{ color: `hsl(var(--node-${step.type}))` }}>
            <Icon className="w-3 h-3" />
            {cfg.label}
          </span>
        </div>

        <p className="text-[11px] text-muted-foreground leading-relaxed pl-8">
          {step.description}
        </p>

        {step.paths && step.paths.length > 0 && (
          <div className="space-y-1 pl-8">
            {step.paths.map((dp, i) => (
              <div
                key={i}
                className="flex items-center gap-2 text-[10px] text-card-foreground bg-secondary/60 rounded-md px-2 py-1 relative"
              >
                <User className="w-2.5 h-2.5 text-primary shrink-0" />
                <span className="leading-tight text-[10px]">{dp.label}</span>
                <span className="ml-auto text-[8px] font-medium uppercase shrink-0 px-1 py-0.5 rounded bg-primary/10 text-primary">
                  condition
                </span>
                {dp.connections && dp.connections.length > 0 && (() => {
                  const dotType = dp.connections[0].type;
                  const dot = connectionDotColor(dotType);
                  return (
                    <div
                      data-dp-id={`${index}-${i}`}
                      className="absolute -right-[10px] top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 border-background"
                      style={{
                        background: dot.bg,
                        boxShadow: `0 0 0 2px ${dot.shadow}`,
                      }}
                    />
                  );
                })()}
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 flex-wrap pl-8">
          <span className={`text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded-full ${flowBadge[step.flowType]}`}>
            {step.flowType}
          </span>
          {step.tags.map((tag) => (
            <span
              key={tag}
              className="text-[9px] px-1.5 py-0.5 rounded-md bg-secondary/50 text-secondary-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {index < (step.paths?.length || 0) - 1 && (
        <div className="flex justify-center py-1">
          <ChevronDown className="w-4 h-4 text-muted-foreground/50" />
        </div>
      )}
    </div>
  );
};

const GroupedTriggersView = ({ node }: { node: ScenarioNode }) => {
  const [hoveredStepIndex, setHoveredStepIndex] = useState<number | null>(null);

  return (
    <div className="p-4">
      {node.steps?.map((step, stepIndex) => {
        const triggers = step.paths;
        if (!triggers || triggers.length === 0) return null;

        const isStepHovered = hoveredStepIndex === stepIndex;

        return (
          <div
            key={step.id}
            className="transition-all duration-150"
            style={{
              background: isStepHovered ? "hsl(var(--primary) / 0.05)" : "transparent",
              boxShadow: isStepHovered ? "inset 0 0 0 1px hsl(var(--primary) / 0.12)" : "none",
              borderRadius: "0.5rem",
              padding: "2px",
              margin: "-2px",
              marginBottom: "2px",
            }}
          >
            {triggers.map((dp: ScenarioPath, dpIndex: number) => (
              <div
                key={dpIndex}
                className="flex items-center gap-2 text-[10px] text-card-foreground bg-secondary/60 rounded-md px-2 py-1.5 relative mb-1 last:mb-0"
                onMouseEnter={() => setHoveredStepIndex(stepIndex)}
                onMouseLeave={() => setHoveredStepIndex(null)}
              >
                <User className="w-2.5 h-2.5 text-primary shrink-0" />
                <span className="leading-tight text-[10px]">{dp.label}</span>
                <span className="ml-auto text-[8px] font-medium uppercase shrink-0 px-1 py-0.5 rounded bg-primary/10 text-primary">
                  condition
                </span>
                {dp.connections && dp.connections.length > 0 && (() => {
                  const dotType = dp.connections[0].type;
                  const dot = connectionDotColor(dotType);
                  return (
                    <div
                      data-dp-id={`${stepIndex}-${dpIndex}`}
                      className="absolute -right-[10px] top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 border-background"
                      style={{
                        background: dot.bg,
                        boxShadow: `0 0 0 2px ${dot.shadow}`,
                      }}
                    />
                  );
                })()}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
};

function formatTimeoutMs(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (seconds === 0) return `${minutes} min`;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

const EvaluationSection = ({ evaluation }: { evaluation: StepEvaluation }) => {
  return (
    <div
      className="px-3 pb-2 pt-1.5 space-y-1 text-muted-foreground/80"
      style={{ borderTop: "1px solid hsl(var(--border) / 0.7)" }}
    >
      <span className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground/50">
        Evaluation
      </span>
      {evaluation.competency ? (
        <div className="text-[8px] font-medium text-card-foreground/85">{evaluation.competency}</div>
      ) : null}
      {evaluation.expectedBehavior?.trim() ? (
        <p className="text-[9px] leading-snug line-clamp-3">{evaluation.expectedBehavior}</p>
      ) : null}
      {evaluation.notes?.trim() ? (
        <p className="text-[8px] leading-snug italic text-muted-foreground/70 line-clamp-2">{evaluation.notes}</p>
      ) : null}
    </div>
  );
};

interface StepSpotlight {
  dimmed: boolean;
  fadedDpIndices: Set<number>;
}

interface ModalStepCardProps {
  step: ScenarioStep;
  stepIndex: number;
  position: { x: number; y: number };
  isSelected: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  spotlight?: StepSpotlight;
  hasWarning?: boolean;
  walkthroughActive?: boolean;
  onDelete?: (stepId: string) => void;
  resources?: ScenarioResource[];
}

export const ModalStepCard = ({
  step,
  stepIndex,
  position,
  isSelected,
  onMouseDown,
  spotlight,
  hasWarning,
  walkthroughActive,
  onDelete,
  resources = [],
}: ModalStepCardProps) => {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const cfg = typeConfig[step.type];
  const Icon = cfg.icon;
  const isDimmed = spotlight?.dimmed ?? false;
  const borderColor =
    isSelected && walkthroughActive
      ? "ring-2 ring-emerald-500 shadow-[0_0_22px_rgba(16,185,129,0.22)]"
      : isSelected
        ? "ring-2 ring-primary"
        : "hover:ring-1 hover:ring-primary/40";

  return (
    <div
      data-modal-node={step.id}
      className={`w-[280px] rounded-lg bg-background shadow-lg overflow-visible transition-all duration-200 ${borderColor} cursor-grab active:cursor-grabbing`}
      style={{
        position: "absolute",
        left: position.x,
        top: position.y,
        zIndex: isSelected ? 10 : 1,
        borderLeft: `3px solid hsl(var(--node-${step.type}))`,
        borderTop: "1px solid hsl(var(--border))",
        borderRight: "1px solid hsl(var(--border))",
        borderBottom: "1px solid hsl(var(--border))",
        opacity: isDimmed ? 0.1 : 1,
        pointerEvents: isDimmed ? "none" : undefined,
      }}
      onMouseDown={onMouseDown}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Delete button */}
      {onDelete && !isDimmed && (
        <div className="absolute -top-2 -right-2 z-20">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setConfirmingDelete(true);
            }}
            className="w-5 h-5 rounded-full bg-muted border border-border shadow-sm flex items-center justify-center text-muted-foreground/50 hover:bg-destructive hover:text-white hover:border-destructive transition-colors"
            title="Delete step"
          >
            <X className="w-3 h-3" />
          </button>
          {confirmingDelete && (
            <DeleteConfirmPopover
              label="step"
              onConfirm={() => {
                setConfirmingDelete(false);
                onDelete(step.id);
              }}
              onCancel={() => setConfirmingDelete(false)}
            />
          )}
        </div>
      )}

      <div
        className="px-3 py-2 flex items-center gap-2"
        style={{
          background: `hsl(var(--node-${step.type}) / 0.08)`,
          borderBottom: `1px solid hsl(var(--node-${step.type}) / 0.15)`,
        }}
      >
        <div className="relative shrink-0">
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold"
            style={{ background: `hsl(var(--node-${step.type}))`, color: "white" }}
          >
            {stepIndex + 1}
          </div>
          {hasWarning && (
            <div
              className="absolute -top-1 -right-1 w-3 h-3 rounded-full flex items-center justify-center"
              style={{ background: "hsl(38, 92%, 50%)", boxShadow: "0 0 0 1.5px white" }}
              title="Validation warning: this step has a configuration issue"
            >
              <AlertTriangle className="w-1.5 h-1.5 text-white" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-[11px] text-card-foreground leading-tight">
            {step.title}
          </h4>
          {step.persona && (
            <p className="text-[9px] text-muted-foreground">{step.persona}</p>
          )}
          {step.resource && (
            <p className="text-[8px] text-muted-foreground/70 flex items-center gap-0.5 mt-0.5">
              <FileText className="w-2.5 h-2.5 shrink-0" />
              {step.resource}
            </p>
          )}
        </div>
        <span
          className="flex items-center gap-1 text-[9px] font-medium shrink-0"
          style={{ color: `hsl(var(--node-${step.type}))` }}
        >
          <Icon className="w-3 h-3" />
          {cfg.label}
        </span>
      </div>

      <p className="text-[10px] text-muted-foreground leading-relaxed px-3 py-1.5">
        {step.description}
      </p>

      {/* Tasks */}
      {step.tasks && step.tasks.length > 0 && (
        <div className="px-3 pb-2 space-y-1">
          <div className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-1">
            Tasks
          </div>
          {step.tasks.map((task, taskIdx) => {
            const shortLabel = TASK_SHORT_LABELS[task.actionType] ?? task.actionType;
            const desc = taskDescriptionParts(task, resources, shortLabel);

            return (
              <div
                key={task.id}
                className="flex items-start gap-2 text-[9px] rounded px-2 py-1"
                style={{ background: "hsl(var(--secondary) / 0.5)" }}
              >
                <span className="text-[8px] font-medium tabular-nums text-muted-foreground/60 shrink-0 mt-px" style={{ minWidth: "10px", textAlign: "right" }}>
                  {taskIdx + 1}
                </span>
                <div className="flex-1 min-w-0 leading-tight">
                  <span className="font-medium text-card-foreground">
                    {desc.action}
                  </span>
                  {desc.context && (
                    <span className="text-muted-foreground">
                      {" "}&middot; {desc.context}
                    </span>
                  )}
                  {desc.detail && (
                    <span className="text-muted-foreground/70 italic text-[8px]">
                      {" "}&#x203A; {desc.detail}
                    </span>
                  )}
                </div>
                {task.scoreIncrement != null && task.scoreIncrement > 0 && (
                  <span
                    className="text-[8px] font-bold shrink-0 px-1 py-0.5 rounded"
                    style={{
                      background: "hsl(145, 65%, 42%, 0.15)",
                      color: "hsl(145, 65%, 30%)",
                    }}
                  >
                    +{task.scoreIncrement}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {step.paths && step.paths.length > 0 && (
        <div className="px-3 pb-2 space-y-1">
          <div
            className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-1 pt-1"
            style={{ borderTop: "1px solid hsl(var(--border))" }}
          >
            Conditions
          </div>
          {step.paths.map((dp, i) => {
            const isOutcomeConn = dp.connections && dp.connections.length > 0;
            const dotType = isOutcomeConn ? dp.connections![0].type : "default";
            const dot = isOutcomeConn
              ? connectionDotColor(dotType)
              : { bg: "hsl(220, 70%, 55%)", shadow: "hsla(220, 70%, 55%, 0.3)" };

            const isDpFaded = spotlight && !spotlight.dimmed && spotlight.fadedDpIndices.has(i);

            return (
              <div
                key={i}
                className="flex items-center gap-1.5 text-[9px] text-card-foreground rounded px-2 py-1 bg-secondary/60 relative transition-opacity duration-200"
                style={{ opacity: isDpFaded ? 0.18 : 1 }}
              >
                <User className="w-2.5 h-2.5 text-primary shrink-0" />
                <span className="leading-tight text-[9px] flex-1 break-words">
                  {dp.label}
                </span>

                {(dp.targetStepId || isOutcomeConn) && (
                  <div
                    data-modal-dp={`${step.id}-${i}`}
                    className="absolute -right-[8px] top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-background"
                    style={{
                      background: dot.bg,
                      boxShadow: `0 0 0 2px ${dot.shadow}`,
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {stepEvaluationHasContent(step.evaluation) && step.evaluation && (
        <EvaluationSection evaluation={step.evaluation} />
      )}
    </div>
  );
};

interface GlobalTimerCardProps {
  timer: GlobalTimer;
  position: { x: number; y: number };
  isSelected: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onClick: (e: React.MouseEvent) => void;
  onDelete?: () => void;
}

export const GlobalTimerCard = ({
  timer,
  position,
  isSelected,
  onMouseDown,
  onClick,
  onDelete,
}: GlobalTimerCardProps) => {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const minutes = Math.floor(timer.timeoutMs / 60000);
  const seconds = (timer.timeoutMs % 60000) / 1000;
  const timeLabel = seconds === 0 ? `${minutes} min` : `${minutes}:${String(seconds).padStart(2, "0")}`;

  return (
    <div
      data-modal-node={timer.id}
      className={`w-[220px] rounded-xl cursor-grab active:cursor-grabbing transition-all duration-200 ${
        isSelected ? "ring-2 ring-violet-400" : "hover:ring-1 hover:ring-violet-400/50"
      }`}
      style={{
        position: "absolute",
        left: position.x,
        top: position.y,
        zIndex: isSelected ? 10 : 3,
        background: "linear-gradient(135deg, hsl(265, 60%, 98%), hsl(265, 55%, 93%))",
        border: "2px dashed hsl(265, 65%, 55%)",
        boxShadow: "0 4px 20px hsla(265, 65%, 55%, 0.2), 0 1px 4px rgba(0,0,0,0.08)",
      }}
      onMouseDown={onMouseDown}
      onClick={onClick}
    >
      {/* Delete button */}
      {onDelete && (
        <div className="absolute -top-2 -right-2 z-20">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setConfirmingDelete(true);
            }}
            className="w-5 h-5 rounded-full bg-muted border border-border shadow-sm flex items-center justify-center text-muted-foreground/50 hover:bg-destructive hover:text-white hover:border-destructive transition-colors"
            title="Delete timer"
          >
            <X className="w-3 h-3" />
          </button>
          {confirmingDelete && (
            <DeleteConfirmPopover
              label="timer"
              onConfirm={() => {
                setConfirmingDelete(false);
                onDelete();
              }}
              onCancel={() => setConfirmingDelete(false)}
            />
          )}
        </div>
      )}

      {/* Header */}
      <div
        className="px-3 py-2 flex items-center gap-2"
        style={{ borderBottom: "1.5px dashed hsl(265, 55%, 72%)" }}
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
          style={{ background: "hsl(265, 65%, 55%)" }}
        >
          <Timer className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div
            className="text-[8px] font-bold uppercase tracking-widest"
            style={{ color: "hsl(265, 50%, 42%)" }}
          >
            Global Timer
          </div>
          <div
            className="text-[11px] font-semibold leading-tight"
            style={{ color: "hsl(265, 45%, 22%)" }}
          >
            {timer.name}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 shrink-0" style={{ color: "hsl(265, 65%, 48%)" }} />
          <span
            className="text-[13px] font-bold font-mono tabular-nums"
            style={{ color: "hsl(265, 55%, 32%)" }}
          >
            {timeLabel}
          </span>
        </div>
        <span
          className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded-full"
          style={{
            background: "hsl(265, 65%, 55%, 0.14)",
            color: "hsl(265, 50%, 36%)",
            border: "1px solid hsl(265, 65%, 55%, 0.35)",
          }}
        >
          interrupt
        </span>
      </div>

      {/* Connector dot */}
      <div
        data-modal-dp={`${timer.id}-0`}
        className="absolute -right-[8px] top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-background"
        style={{
          background: "hsl(265, 65%, 55%)",
          boxShadow: "0 0 0 2px hsla(265, 65%, 55%, 0.35)",
        }}
      />
    </div>
  );
};

export const ScenarioCard = ({ node, isSelected, onMouseDown, onClick, displayMode, selectedStepId, onSelectStep, warningNodeIds }: ScenarioCardProps) => {
  const borderColor = isSelected
    ? "ring-2 ring-primary"
    : "hover:ring-1 hover:ring-primary/40";

  return (
    <div
      className={`w-[500px] rounded-lg bg-background shadow-lg overflow-hidden transition-shadow ${borderColor} cursor-grab active:cursor-grabbing border-2 border-primary/20`}
      style={{
        position: "absolute",
        left: node.position.x,
        top: node.position.y,
        zIndex: isSelected ? 10 : 1,
      }}
      onMouseDown={onMouseDown}
      onClick={onClick}
    >
      <div className="bg-primary/5 border-b border-primary/20 px-4 py-3">
        <h3 className="font-bold text-sm text-card-foreground">{node.title}</h3>
        {node.description && (
          <p className="text-[11px] text-muted-foreground mt-1">{node.description}</p>
        )}
      </div>

      {displayMode === "grouped" ? (
        <GroupedTriggersView node={node} />
      ) : (
        <div className="p-4 space-y-2">
          {node.steps?.map((step, index) => (
            <div key={step.id}>
              <StepRow
                step={step}
                index={index}
                isSelected={selectedStepId === step.id}
                onSelectStep={onSelectStep}
                hasWarning={warningNodeIds?.has(step.id)}
              />
              {index < (node.steps?.length || 0) - 1 && (
                <div className="flex justify-center py-2">
                  <div className="w-0.5 h-4 bg-gradient-to-b from-primary/30 to-primary/10" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const OutcomeCard = ({ node, isSelected, onMouseDown, onClick, spotlightState = "none", onDelete }: OutcomeCardProps) => {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const style = outcomeStyles[node.outcome];
  const isTarget = spotlightState === "target";
  const isDimmed = spotlightState === "dimmed";

  return (
    <div
      data-modal-node={node.id}
      className={`w-[220px] rounded-2xl shadow-lg overflow-visible cursor-grab active:cursor-grabbing transition-all duration-200 ${
        isSelected ? "ring-2 ring-primary scale-105" : isTarget ? "" : "hover:scale-[1.02]"
      }`}
      style={{
        position: "absolute",
        left: node.position.x,
        top: node.position.y,
        zIndex: isSelected ? 10 : isTarget ? 8 : 1,
        background: style.bg,
        border: `2px solid ${style.border}`,
        opacity: isDimmed ? 0.1 : 1,
        pointerEvents: isDimmed ? "none" : undefined,
        boxShadow: isTarget
          ? `0 0 0 3px ${style.border}, 0 0 24px ${style.border}55, 0 8px 32px rgba(0,0,0,0.15)`
          : undefined,
        transform: isTarget ? "scale(1.04)" : undefined,
      }}
      onMouseDown={onMouseDown}
      onClick={onClick}
    >
      {/* Delete button */}
      {onDelete && !isDimmed && (
        <div className="absolute -top-2 -right-2 z-20">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setConfirmingDelete(true);
            }}
            className="w-5 h-5 rounded-full bg-muted border border-border shadow-sm flex items-center justify-center text-muted-foreground/50 hover:bg-destructive hover:text-white hover:border-destructive transition-colors"
            title="Delete outcome"
          >
            <X className="w-3 h-3" />
          </button>
          {confirmingDelete && (
            <DeleteConfirmPopover
              label="outcome"
              onConfirm={() => {
                setConfirmingDelete(false);
                onDelete(node.id);
              }}
              onCancel={() => setConfirmingDelete(false)}
            />
          )}
        </div>
      )}

      <div className="p-5 flex flex-col items-center text-center gap-3">
        {isTarget && (
          <div
            className="absolute top-2 right-2 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full tracking-wider"
            style={{ background: style.border, color: "white" }}
          >
            Spotlit
          </div>
        )}

        <div
          className="w-12 h-12 rounded-full flex items-center justify-center"
          style={{ background: style.iconBg }}
        >
          <OutcomeIcon outcome={node.outcome} />
        </div>

        <h3
          className="font-bold text-sm leading-tight"
          style={{ color: style.titleColor }}
        >
          {node.title}
        </h3>

        <span
          className="flex items-center gap-1 text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full"
          style={{ background: style.badgeBg, color: style.badgeColor }}
        >
          <Video className="w-3 h-3" />
          Video
        </span>

        <p className="text-[11px] leading-relaxed text-muted-foreground line-clamp-3">
          {node.description}
        </p>

        <span
          className="text-xs font-bold uppercase tracking-wider"
          style={{ color: style.labelColor }}
        >
          {style.label}
        </span>
      </div>
    </div>
  );
};
