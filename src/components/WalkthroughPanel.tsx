import { useState, useCallback, useEffect } from "react";
import {
  ScenarioData,
  ScenarioStep,
  OutcomeNode,
  ScenarioPath,
  OutcomeType,
  Persona,
} from "@/types/scenario";
import {
  X,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  MessageCircle,
  Radio,
  FileText,
  Video,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { stepEvaluationHasContent } from "@/data/evaluationCompetencies";
import {
  formatLeadsToLine,
  formatRequiresSummary,
  getPathDestination,
} from "@/utils/pathCausality";

// ─── Types ─────────────────────────────────────────────────────────────────────

type NodeState =
  | { kind: "step"; step: ScenarioStep }
  | { kind: "outcome"; outcome: OutcomeNode };

interface ActionLog {
  pathLabel: string;
  toTitle: string;
  toKind: "step" | "outcome";
  outcomeType?: OutcomeType;
  /** Evaluation authored on the step where this action was chosen */
  sourceEvaluation?: {
    expectedBehavior: string;
    competency: string;
    notes?: string;
  };
}

interface WalkthroughPanelProps {
  scenario: ScenarioData;
  onExit: () => void;
  onHighlightStep: (stepId: string | null) => void;
}

// ─── Config ─────────────────────────────────────────────────────────────────────

const MODALITY_LABELS: Record<string, string> = {
  chat: "Text Chat",
  radio: "Radio Call",
  document: "Document Review",
  video: "Video",
};

const MODALITY_ICONS: Record<string, React.ElementType> = {
  chat: MessageCircle,
  radio: Radio,
  document: FileText,
  video: Video,
};

type OutcomeStyleConfig = {
  label: string;
  textClass: string;
  bgClass: string;
  borderClass: string;
  Icon: React.ElementType;
};

const OUTCOME_CONFIG: Record<OutcomeType, OutcomeStyleConfig> = {
  safe_path: {
    label: "Safe Path",
    textClass: "text-emerald-400",
    bgClass: "bg-emerald-950/60",
    borderClass: "border-emerald-700",
    Icon: CheckCircle2,
  },
  partial_failure: {
    label: "Partial Failure",
    textClass: "text-amber-400",
    bgClass: "bg-amber-950/60",
    borderClass: "border-amber-700",
    Icon: AlertTriangle,
  },
  critical_failure: {
    label: "Critical Failure",
    textClass: "text-red-400",
    bgClass: "bg-red-950/60",
    borderClass: "border-red-700",
    Icon: XCircle,
  },
};

const CONNECTION_OUTCOME_MAP: Record<string, OutcomeType | undefined> = {
  safe_path: "safe_path",
  partial_failure: "partial_failure",
  critical_failure: "critical_failure",
  default: undefined,
};

// ─── Sub-components ─────────────────────────────────────────────────────────────

function SceneCard({
  step,
  personas,
}: {
  step: ScenarioStep;
  personas: Persona[];
}) {
  const ModalityIcon = MODALITY_ICONS[step.type] ?? FileText;
  const persona = personas.find(
    (p) => p.name === step.persona || p.id === step.persona
  );

  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-900 overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-700/60 bg-zinc-800/40">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-1">
              Scene
            </div>
            <h2 className="text-base font-semibold text-zinc-100 leading-snug">
              {step.title}
            </h2>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-400 shrink-0">
            <ModalityIcon className="w-3.5 h-3.5" />
            <span className="text-xs font-medium">
              {MODALITY_LABELS[step.type] ?? step.type}
            </span>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        <p className="text-sm text-zinc-300 leading-relaxed">{step.description}</p>

        {stepEvaluationHasContent(step.evaluation) && step.evaluation && (
          <div className="rounded-lg border border-zinc-700/50 bg-zinc-950/50 px-3 py-2.5 space-y-2">
            <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
              What this step evaluates
            </div>
            {step.evaluation.competency ? (
              <div className="flex items-baseline gap-2 flex-wrap text-xs">
                <span className="text-[10px] font-semibold text-violet-400 shrink-0 uppercase tracking-wide">
                  Impacts
                </span>
                <span className="font-medium text-zinc-200">{step.evaluation.competency}</span>
              </div>
            ) : null}
            {step.evaluation.expectedBehavior?.trim() ? (
              <div className="space-y-0.5">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wide">Expected behavior</span>
                <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap">
                  {step.evaluation.expectedBehavior}
                </p>
              </div>
            ) : null}
            {step.evaluation.notes?.trim() ? (
              <p className="text-[11px] text-zinc-500 leading-relaxed italic border-t border-zinc-800/80 pt-2">
                {step.evaluation.notes}
              </p>
            ) : null}
          </div>
        )}

        {step.persona && (
          <div className="flex items-center gap-2 text-xs">
            <User className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
            <span className="text-zinc-400">Persona:</span>
            <span className="text-zinc-200 font-medium">{step.persona}</span>
            {persona?.role && (
              <span className="text-zinc-500">· {persona.role}</span>
            )}
          </div>
        )}

        {step.tasks && step.tasks.filter((t) => !t.hidden).length > 0 && (
          <div>
            <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2">
              Expected actions
            </div>
            <ul className="space-y-1.5">
              {step.tasks
                .filter((t) => !t.hidden)
                .map((task) => (
                  <li key={task.id} className="flex items-start gap-2.5">
                    <div
                      className={cn(
                        "w-1.5 h-1.5 rounded-full mt-[5px] shrink-0",
                        task.required ? "bg-zinc-300" : "bg-zinc-600"
                      )}
                    />
                    <span className="text-xs text-zinc-300 leading-relaxed">
                      {task.label}
                      {!task.required && (
                        <span className="text-zinc-600 ml-1.5">(optional)</span>
                      )}
                    </span>
                  </li>
                ))}
            </ul>
          </div>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-mono text-zinc-600 uppercase px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700">
            {step.flowType}
          </span>
          {step.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800/60 text-zinc-600 border border-zinc-800"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function OutcomeCard({ outcome }: { outcome: OutcomeNode }) {
  const config = OUTCOME_CONFIG[outcome.outcome];
  const Icon = config?.Icon ?? CheckCircle2;

  return (
    <div
      className={cn(
        "rounded-xl border overflow-hidden",
        config?.bgClass ?? "bg-zinc-900",
        config?.borderClass ?? "border-zinc-700"
      )}
    >
      <div className="px-4 py-3 border-b border-white/10 bg-black/20">
        <div className="flex items-center gap-2 mb-1">
          <Icon className={cn("w-4 h-4", config?.textClass ?? "text-zinc-400")} />
          <span
            className={cn(
              "text-[10px] font-bold uppercase tracking-widest font-mono",
              config?.textClass
            )}
          >
            {config?.label ?? "Outcome"}
          </span>
        </div>
        <h2 className="text-base font-semibold text-zinc-100 leading-snug">
          {outcome.title}
        </h2>
      </div>
      <div className="px-4 py-4">
        <p className="text-sm text-zinc-300 leading-relaxed">
          {outcome.description}
        </p>
      </div>
    </div>
  );
}

function ActionLogCard({ action }: { action: ActionLog }) {
  const oc = action.outcomeType ? OUTCOME_CONFIG[action.outcomeType] : null;
  const se = action.sourceEvaluation;

  return (
    <div className="rounded-lg border border-zinc-700/50 bg-zinc-900/50 px-4 py-3 space-y-3">
      <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
        Logic trace
      </div>
      <div className="space-y-1.5 text-sm">
        <div className="flex items-baseline gap-2">
          <span className="text-zinc-500 shrink-0 text-xs">Your action</span>
          <span className="text-zinc-100 font-medium">{action.pathLabel}</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-zinc-500 shrink-0 text-xs">Triggered path →</span>
          <span className={cn("font-medium", oc ? oc.textClass : "text-zinc-200")}>
            {action.toTitle}
          </span>
          {oc && (
            <span
              className={cn(
                "text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide border",
                oc.textClass,
                oc.bgClass,
                oc.borderClass
              )}
            >
              {oc.label}
            </span>
          )}
        </div>
      </div>

      {se && (se.expectedBehavior?.trim() || se.competency || se.notes?.trim()) && (
        <div className="rounded-md border border-zinc-800/80 bg-zinc-950/40 px-3 py-2.5 space-y-2">
          <div className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest">
            Evaluation lens (this step)
          </div>
          {se.competency ? (
            <div className="flex items-baseline gap-2 flex-wrap text-xs">
              <span className="text-zinc-500 shrink-0">Competency</span>
              <span className="text-zinc-200 font-medium">{se.competency}</span>
            </div>
          ) : null}
          {se.expectedBehavior?.trim() ? (
            <div className="space-y-0.5">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wide">Expected behavior</span>
              <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap">{se.expectedBehavior}</p>
            </div>
          ) : null}
          {se.notes?.trim() ? (
            <p className="text-[11px] text-zinc-500 leading-snug italic">{se.notes}</p>
          ) : null}
        </div>
      )}
    </div>
  );
}

function PathChoices({
  step,
  allSteps,
  outcomeNodes,
  onSelect,
}: {
  step: ScenarioStep;
  allSteps: ScenarioStep[];
  outcomeNodes: OutcomeNode[];
  onSelect: (path: ScenarioPath) => void;
}) {
  const allPaths = step.paths ?? [];
  const interactivePaths = allPaths.filter((p) => !p.timeoutMs);
  const timeoutPaths = allPaths.filter((p) => p.timeoutMs);
  const tasks = step.tasks ?? [];

  if (allPaths.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-4 py-4 text-center">
        <p className="text-sm text-zinc-500">No paths defined for this step.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
        Choose a path
      </div>

      {interactivePaths.map((path) => {
        const dest = getPathDestination(path, allSteps, outcomeNodes);
        const leadsLine = dest ? formatLeadsToLine(dest) : null;
        const requiresLine = formatRequiresSummary(path.prerequisite, tasks);

        const leadsToOutcome =
          !path.targetStepId && path.connections && path.connections.length > 0;

        const connOutcomeTypes = leadsToOutcome
          ? (path.connections ?? [])
              .map((c) => CONNECTION_OUTCOME_MAP[c.type])
              .filter((t): t is OutcomeType => t !== undefined)
          : [];

        return (
          <button
            key={path.id}
            onClick={() => onSelect(path)}
            className="w-full text-left rounded-lg border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 hover:border-emerald-600/50 active:scale-[0.99] transition-all px-4 py-3 group"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-zinc-200 group-hover:text-white font-medium leading-snug">
                {path.label}
              </span>
              <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-emerald-400/90 shrink-0 transition-colors" />
            </div>
            {leadsLine && (
              <p className="mt-2 text-[11px] text-emerald-400/95 leading-snug font-medium">
                {leadsLine}
              </p>
            )}
            {requiresLine && (
              <p className="mt-1 text-[11px] text-amber-200/80 leading-snug">
                {requiresLine}
              </p>
            )}
            {connOutcomeTypes.length > 0 && (
              <div className="mt-1.5 flex gap-1 flex-wrap">
                {connOutcomeTypes.map((type, i) => {
                  const ocConfig = OUTCOME_CONFIG[type];
                  return (
                    <span
                      key={i}
                      className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded font-semibold",
                        ocConfig.textClass,
                        ocConfig.bgClass
                      )}
                    >
                      {ocConfig.label}
                    </span>
                  );
                })}
              </div>
            )}
          </button>
        );
      })}

      {timeoutPaths.length > 0 && (
        <div className="text-[10px] font-mono text-zinc-600 px-1 pt-0.5">
          ⏱ {timeoutPaths.length} timeout path
          {timeoutPaths.length > 1 ? "s" : ""} not selectable (auto-triggered)
        </div>
      )}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────────

export function WalkthroughPanel({
  scenario,
  onExit,
  onHighlightStep,
}: WalkthroughPanelProps) {
  const steps = scenario.scenarioNode.steps ?? [];
  const outcomes = scenario.outcomeNodes;
  const personas = scenario.personas;

  const firstStep = steps[0] ?? null;

  const [stack, setStack] = useState<NodeState[]>([]);
  const [current, setCurrent] = useState<NodeState | null>(
    firstStep ? { kind: "step", step: firstStep } : null
  );
  const [lastAction, setLastAction] = useState<ActionLog | null>(null);

  useEffect(() => {
    if (firstStep) onHighlightStep(firstStep.id);
    return () => onHighlightStep(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const restart = useCallback(() => {
    if (!firstStep) return;
    setStack([]);
    setCurrent({ kind: "step", step: firstStep });
    setLastAction(null);
    onHighlightStep(firstStep.id);
  }, [firstStep, onHighlightStep]);

  const goBack = useCallback(() => {
    if (stack.length === 0) return;
    const newStack = [...stack];
    const prev = newStack.pop()!;
    setStack(newStack);
    setCurrent(prev);
    setLastAction(null);
    onHighlightStep(prev.kind === "step" ? prev.step.id : null);
  }, [stack, onHighlightStep]);

  const selectPath = useCallback(
    (path: ScenarioPath) => {
      if (!current || current.kind !== "step") return;

      let nextState: NodeState | null = null;
      let action: ActionLog | null = null;

      const srcStep = current.step;
      const ev = srcStep.evaluation;
      const sourceEvaluation =
        ev && stepEvaluationHasContent(ev)
          ? {
              expectedBehavior: ev.expectedBehavior ?? "",
              competency: ev.competency ?? "",
              ...(ev.notes?.trim() ? { notes: ev.notes.trim() } : {}),
            }
          : undefined;

      if (path.targetStepId) {
        const nextStep = steps.find((s) => s.id === path.targetStepId);
        if (nextStep) {
          nextState = { kind: "step", step: nextStep };
          action = {
            pathLabel: path.label,
            toTitle: nextStep.title,
            toKind: "step",
            ...(sourceEvaluation ? { sourceEvaluation } : {}),
          };
          onHighlightStep(nextStep.id);
        }
      } else if (path.connections && path.connections.length > 0) {
        const conn = path.connections[0];
        const outcome = outcomes.find((o) => o.id === conn.targetNodeId);
        if (outcome) {
          nextState = { kind: "outcome", outcome };
          action = {
            pathLabel: path.label,
            toTitle: outcome.title,
            toKind: "outcome",
            outcomeType: outcome.outcome,
            ...(sourceEvaluation ? { sourceEvaluation } : {}),
          };
          onHighlightStep(null);
        }
      }

      if (nextState && action) {
        setStack((s) => [...s, current]);
        setCurrent(nextState);
        setLastAction(action);
      }
    },
    [current, steps, outcomes, onHighlightStep]
  );

  if (!current) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 max-h-[40vh] border-t-4 border-emerald-500 bg-zinc-950 shadow-[0_-8px_32px_rgba(0,0,0,0.5)] flex items-center justify-center py-8">
        <div className="text-center px-8">
          <p className="text-zinc-400 mb-4">No steps found in this scenario.</p>
          <button
            onClick={onExit}
            className="px-4 py-2 text-sm text-zinc-300 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors"
          >
            Exit
          </button>
        </div>
      </div>
    );
  }

  const breadcrumb = [...stack, current];
  const activeStepTitle =
    current.kind === "step" ? current.step.title : current.outcome.title;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex flex-col max-h-[42vh] border-t-4 border-emerald-500 bg-zinc-950/98 shadow-[0_-12px_48px_rgba(0,0,0,0.55)] backdrop-blur-sm">
        {/* Header — shared accent with graph highlight */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800/90 bg-zinc-900/95 shrink-0">
          <div className="min-w-0 flex-1 pr-3">
            <div className="flex items-center gap-2 mb-0.5">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span className="text-[10px] font-mono font-bold text-emerald-500/90 uppercase tracking-widest">
                Preview — tied to graph
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 truncate" title={activeStepTitle}>
              <span className="text-zinc-500">Now: </span>
              <span className="text-zinc-200 font-medium">{activeStepTitle}</span>
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={restart}
              disabled={stack.length === 0}
              title="Restart from the beginning"
              className="flex items-center gap-1 px-2.5 py-1 text-xs text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <RotateCcw className="w-3 h-3" />
              Restart
            </button>
            <button
              onClick={onExit}
              title="Exit walkthrough"
              className="p-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Breadcrumb trail */}
        <div className="px-4 py-1.5 border-b border-zinc-800/60 bg-zinc-900/40 shrink-0">
          <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none">
            {breadcrumb.map((node, i) => {
              const title =
                node.kind === "step" ? node.step.title : node.outcome.title;
              const isLast = i === breadcrumb.length - 1;
              const ocConfig =
                node.kind === "outcome"
                  ? OUTCOME_CONFIG[node.outcome.outcome]
                  : null;

              return (
                <div key={i} className="flex items-center gap-1 shrink-0">
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded text-[11px] max-w-[130px] truncate",
                      isLast
                        ? ocConfig
                          ? cn(
                              "font-semibold border border-zinc-700 bg-zinc-800/80",
                              ocConfig.textClass
                            )
                          : "font-semibold text-zinc-100 bg-zinc-700 border border-zinc-600"
                        : "text-zinc-500 bg-zinc-800/40"
                    )}
                    title={title}
                  >
                    {title}
                  </span>
                  {!isLast && (
                    <ChevronRight className="w-3 h-3 text-zinc-700 shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="px-4 py-3 space-y-3">
            {current.kind === "step" ? (
              <SceneCard step={current.step} personas={personas} />
            ) : (
              <OutcomeCard outcome={current.outcome} />
            )}

            {lastAction && <ActionLogCard action={lastAction} />}

            {current.kind === "step" && (
              <PathChoices
                step={current.step}
                allSteps={steps}
                outcomeNodes={outcomes}
                onSelect={selectPath}
              />
            )}

            {current.kind === "outcome" && (
              <div className="rounded-lg border border-zinc-800/60 bg-zinc-900/30 px-4 py-4 text-center">
                <p className="text-sm text-zinc-500 leading-relaxed">
                  End of this path. Use{" "}
                  <button
                    onClick={goBack}
                    disabled={stack.length === 0}
                    className="text-zinc-300 underline underline-offset-2 hover:text-white disabled:opacity-30 disabled:no-underline"
                  >
                    Back
                  </button>{" "}
                  or{" "}
                  <button
                    onClick={restart}
                    className="text-zinc-300 underline underline-offset-2 hover:text-white"
                  >
                    Restart
                  </button>{" "}
                  to explore other branches.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-zinc-800 bg-zinc-900/90 flex items-center gap-2 shrink-0">
          <button
            onClick={goBack}
            disabled={stack.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>
          <div className="flex-1" />
          <span className="text-[10px] font-mono text-zinc-600 select-none">
            {stack.length + 1} / {steps.length + outcomes.length} nodes
          </span>
          <button
            onClick={onExit}
            className="px-3 py-1.5 text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            Exit preview
          </button>
        </div>
    </div>
  );
}
