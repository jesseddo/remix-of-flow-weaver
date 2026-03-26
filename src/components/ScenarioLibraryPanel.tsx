import { useState, useMemo, useEffect } from "react";
import { Persona, ScenarioResource, ScenarioData, ScenarioStep, OutcomeNode, GlobalTimer, OutcomeType } from "@/types/scenario";
import { PersonaEditor } from "./PersonaEditor";
import { ResourceEditor } from "./ResourceEditor";
import { X, Users, FileStack, Info, Plus, Trash2, CheckCircle2, AlertTriangle, XCircle, Clock, ShieldAlert, Layers, MessageSquare, Radio, FileText, Video, ChevronRight } from "lucide-react";

type AuthoringMode = "canvas" | "library";
type LibraryTab = "metadata" | "personas" | "resources" | "steps";

interface ScenarioLibraryPanelProps {
  isOpen: boolean;
  data: ScenarioData | null;
  onClose: () => void;
  authoringMode: AuthoringMode;
  steps: ScenarioStep[];
  selectedStepId: string | null;
  onSelectStep: (id: string) => void;
  onAddStep: () => void;
  onUpdateScenarioMeta: (patch: { title?: string; description?: string }) => void;
  onAddPersona: (persona: Persona) => void;
  onUpdatePersona: (id: string, patch: Partial<Persona>) => void;
  onDeletePersona: (id: string) => void;
  onAddResource: (resource: ScenarioResource) => void;
  onUpdateResource: (id: string, patch: Partial<ScenarioResource>) => void;
  onDeleteResource: (id: string) => void;
  onAddOutcome: (outcome: OutcomeNode) => void;
  onUpdateOutcome: (id: string, patch: Partial<OutcomeNode>) => void;
  onDeleteOutcome: (id: string) => void;
  onAddTimer: (timer: GlobalTimer) => void;
  onUpdateTimer: (id: string, patch: Partial<GlobalTimer>) => void;
  onDeleteTimer: (id: string) => void;
}

const TAB_CONFIG: { id: LibraryTab; label: string; icon: typeof Users }[] = [
  { id: "metadata", label: "Scenario", icon: Info },
  { id: "personas", label: "Characters", icon: Users },
  { id: "resources", label: "Resources", icon: FileStack },
];

const SectionHeader = ({ label }: { label: string }) => (
  <div className="flex items-center gap-2 px-4 pt-4 pb-2">
    <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">
      {label}
    </span>
    <div className="flex-1 h-px bg-border/50" />
  </div>
);

const AddButton = ({ label, onClick }: { label: string; onClick: () => void }) => (
  <button
    onClick={onClick}
    className="mx-4 mb-3 flex items-center gap-1.5 w-[calc(100%-2rem)] px-3 py-2 rounded-lg border border-dashed border-border/60 text-[11px] text-muted-foreground hover:text-foreground hover:border-border transition-colors"
  >
    <Plus className="w-3.5 h-3.5 shrink-0" />
    {label}
  </button>
);

// ── Steps tab ─────────────────────────────────────────────────────
const stepTypeConfig: Record<string, { icon: typeof MessageSquare; color: string; label: string }> = {
  chat:     { icon: MessageSquare, color: "hsl(220, 70%, 55%)", label: "Chat" },
  radio:    { icon: Radio,         color: "hsl(280, 60%, 55%)", label: "Radio" },
  document: { icon: FileText,      color: "hsl(38,  80%, 48%)", label: "Document" },
  video:    { icon: Video,         color: "hsl(150, 55%, 42%)", label: "Video" },
};

type CompletenessGap = { key: string; label: string; dot: string };
function getStepGaps(step: ScenarioStep): CompletenessGap[] {
  const gaps: CompletenessGap[] = [];
  if (!step.tasks || step.tasks.length === 0)
    gaps.push({ key: "tasks", label: "No tasks", dot: "hsl(38, 90%, 52%)" });
  if (!step.paths || step.paths.length === 0)
    gaps.push({ key: "paths", label: "Dead end", dot: "hsl(0, 65%, 55%)" });
  if (!step.evaluation)
    gaps.push({ key: "eval", label: "No eval", dot: "hsl(220, 60%, 55%)" });
  return gaps;
}

const StepsTab = ({
  steps,
  selectedStepId,
  onSelectStep,
  onAddStep,
}: {
  steps: ScenarioStep[];
  selectedStepId: string | null;
  onSelectStep: (id: string) => void;
  onAddStep: () => void;
}) => (
  <div className="pt-3">
    <div className="px-4 pb-2">
      <p className="text-[10px] text-muted-foreground/70 leading-relaxed">
        Build the scenario step by step. Click a step to open the inspector, then add tasks, paths, and evaluation.
      </p>
    </div>

    <AddButton label="Add Step" onClick={onAddStep} />

    {steps.length === 0 ? (
      <div className="mx-4 flex flex-col items-center justify-center gap-2 py-8 rounded-lg border border-dashed border-border/40 text-center">
        <Layers className="w-6 h-6 text-muted-foreground/30" />
        <p className="text-[10px] text-muted-foreground/50">No steps yet. Add the first one above.</p>
      </div>
    ) : (
      <div className="flex flex-col gap-1 px-4">
        {steps.map((step, index) => {
          const cfg = stepTypeConfig[step.type] ?? stepTypeConfig.chat;
          const Icon = cfg.icon;
          const gaps = getStepGaps(step);
          const isSelected = step.id === selectedStepId;

          return (
            <button
              key={step.id}
              onClick={() => onSelectStep(step.id)}
              className={`w-full text-left flex items-center gap-2.5 px-3 py-2.5 rounded-lg border transition-all ${
                isSelected
                  ? "bg-primary/8 border-primary/30 ring-1 ring-primary/20"
                  : "bg-card border-border/50 hover:bg-secondary/30 hover:border-border"
              }`}
            >
              {/* Step number */}
              <span
                className="text-[9px] font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-white"
                style={{ background: cfg.color }}
              >
                {index + 1}
              </span>

              {/* Icon + title */}
              <Icon className="w-3 h-3 shrink-0 text-muted-foreground" />
              <span className="flex-1 text-[11px] font-medium truncate">
                {step.title || "Untitled Step"}
              </span>

              {/* Completeness dots */}
              {gaps.length > 0 && (
                <span className="flex items-center gap-0.5 shrink-0">
                  {gaps.map((g) => (
                    <span
                      key={g.key}
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: g.dot }}
                      title={g.label}
                    />
                  ))}
                </span>
              )}

              <ChevronRight className="w-3 h-3 text-muted-foreground/40 shrink-0" />
            </button>
          );
        })}
      </div>
    )}

    {/* Legend */}
    {steps.length > 0 && (
      <div className="mx-4 mt-3 flex items-center gap-3 px-3 py-2 rounded-md bg-secondary/30">
        <span className="text-[9px] text-muted-foreground/60 font-semibold uppercase tracking-wider">Gaps</span>
        {[
          { dot: "hsl(38, 90%, 52%)", label: "Tasks" },
          { dot: "hsl(0, 65%, 55%)",  label: "Paths" },
          { dot: "hsl(220, 60%, 55%)", label: "Eval" },
        ].map((g) => (
          <span key={g.label} className="flex items-center gap-1 text-[9px] text-muted-foreground/60">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: g.dot }} />
            {g.label}
          </span>
        ))}
      </div>
    )}

    <div className="h-8" />
  </div>
);

// ── Validation row ────────────────────────────────────────────────
const severityConfig = {
  error:   { bg: "hsl(0, 65%, 96%)",   border: "hsl(0, 65%, 80%)",   color: "hsl(0, 65%, 42%)",   icon: XCircle },
  warning: { bg: "hsl(38, 90%, 96%)",  border: "hsl(38, 90%, 78%)",  color: "hsl(38, 75%, 35%)",  icon: AlertTriangle },
  info:    { bg: "hsl(220, 60%, 96%)", border: "hsl(220, 60%, 80%)", color: "hsl(220, 60%, 42%)", icon: ShieldAlert },
};

const ValidationRow = ({
  severity, message, detail,
}: {
  severity: "error" | "warning" | "info";
  message: string;
  detail: string;
}) => {
  const s = severityConfig[severity];
  const Icon = s.icon;
  return (
    <div
      className="px-3 py-2 rounded-lg flex items-start gap-2"
      style={{ background: s.bg, border: `1px solid ${s.border}` }}
    >
      <Icon className="w-3 h-3 shrink-0 mt-0.5" style={{ color: s.color }} />
      <div>
        <p className="text-[10px] font-semibold leading-tight" style={{ color: s.color }}>
          {message}
        </p>
        <p className="text-[9px] mt-0.5 leading-relaxed" style={{ color: s.color + "bb" }}>
          {detail}
        </p>
      </div>
    </div>
  );
};

// ── Outcome type config ───────────────────────────────────────────
const outcomeTypeConfig: Record<OutcomeType, { color: string; bg: string; border: string; icon: typeof CheckCircle2; label: string }> = {
  safe_path:        { color: "hsl(145, 65%, 28%)", bg: "hsl(145, 65%, 95%)", border: "hsl(145, 65%, 78%)", icon: CheckCircle2,  label: "Safe Path" },
  partial_failure:  { color: "hsl(40, 75%, 30%)",  bg: "hsl(40, 80%, 95%)",  border: "hsl(40, 80%, 78%)",  icon: AlertTriangle, label: "Partial Failure" },
  critical_failure: { color: "hsl(0, 65%, 42%)",   bg: "hsl(0, 65%, 96%)",   border: "hsl(0, 65%, 80%)",   icon: XCircle,       label: "Critical Failure" },
};

// ── Outcome row ───────────────────────────────────────────────────
const OutcomeRow = ({
  outcome,
  onUpdate,
  onDelete,
  connectedStepCount,
}: {
  outcome: OutcomeNode;
  onUpdate: (patch: Partial<OutcomeNode>) => void;
  onDelete: () => void;
  connectedStepCount: number;
}) => {
  const [expanded, setExpanded] = useState(false);
  const s = outcomeTypeConfig[outcome.outcome];
  const Icon = s.icon;

  return (
    <div
      className="mx-3 mb-2 rounded-lg overflow-hidden"
      style={{ border: `1px solid ${s.border}`, background: s.bg }}
    >
      {/* Header row */}
      <div className="px-3 py-2 flex items-start gap-2">
        <Icon className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: s.color }} />
        <div className="flex-1 min-w-0">
          <input
            type="text"
            value={outcome.title}
            onChange={(e) => onUpdate({ title: e.target.value })}
            placeholder="Outcome title…"
            className="w-full bg-transparent border-b border-transparent hover:border-current/20 focus:border-current/40 outline-none text-[11px] font-semibold transition-colors py-0.5"
            style={{ color: s.color }}
          />
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-[9px] font-medium transition-colors px-1"
            style={{ color: s.color + "99" }}
          >
            {expanded ? "Done" : "Edit"}
          </button>
          <button
            onClick={() => {
              if (connectedStepCount > 0) {
                if (!confirm(`This outcome is referenced by ${connectedStepCount} decision path(s). Delete anyway?`)) return;
              }
              onDelete();
            }}
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-black/5 transition-colors shrink-0"
            title="Delete outcome"
          >
            <Trash2 className="w-3 h-3" style={{ color: s.color + "88" }} />
          </button>
        </div>
      </div>

      {/* Expanded edit area */}
      {expanded && (
        <div
          className="px-3 pb-3 pt-1 space-y-2 border-t"
          style={{ borderColor: s.border }}
        >
          {/* Type picker */}
          <div>
            <label className="text-[8px] font-semibold uppercase tracking-wider block mb-1" style={{ color: s.color + "99" }}>
              Type
            </label>
            <div className="flex gap-1">
              {(Object.entries(outcomeTypeConfig) as [OutcomeType, typeof outcomeTypeConfig[OutcomeType]][]).map(([key, cfg]) => {
                const CfgIcon = cfg.icon;
                return (
                  <button
                    key={key}
                    onClick={() => onUpdate({ outcome: key })}
                    className="flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-semibold transition-all"
                    style={
                      outcome.outcome === key
                        ? { background: cfg.border, color: cfg.color, border: `1px solid ${cfg.border}` }
                        : { background: "transparent", color: cfg.color + "99", border: `1px solid ${cfg.border}88` }
                    }
                  >
                    <CfgIcon className="w-2.5 h-2.5" />
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-[8px] font-semibold uppercase tracking-wider block mb-1" style={{ color: s.color + "99" }}>
              Description
            </label>
            <textarea
              value={outcome.description}
              onChange={(e) => onUpdate({ description: e.target.value })}
              placeholder="What does this outcome mean for the learner?"
              rows={2}
              className="w-full text-[11px] rounded-md border px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-primary/30 transition-all resize-none bg-white/60"
              style={{ borderColor: s.border }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

// ── Add outcome form ──────────────────────────────────────────────
const AddOutcomeForm = ({
  onAdd,
  onCancel,
}: {
  onAdd: (outcome: OutcomeNode) => void;
  onCancel: () => void;
}) => {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<OutcomeType>("safe_path");
  const [description, setDescription] = useState("");

  const handleAdd = () => {
    if (!title.trim()) return;
    onAdd({
      id: `outcome-${type}-${Date.now()}`,
      title: title.trim(),
      type: "chat",
      description: description.trim(),
      tags: [],
      outcome: type,
      position: { x: 900, y: 100 + Math.floor(Math.random() * 200) },
    });
  };

  return (
    <div
      className="mx-3 mb-3 rounded-lg overflow-hidden"
      style={{ border: "1px dashed hsl(var(--border))", background: "hsl(var(--secondary) / 0.2)" }}
    >
      <div className="px-3 py-2.5 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground/60">
            New Outcome
          </span>
          <button onClick={onCancel} className="w-4 h-4 flex items-center justify-center rounded hover:bg-secondary">
            <X className="w-3 h-3 text-muted-foreground" />
          </button>
        </div>

        {/* Type */}
        <div className="flex gap-1 flex-wrap">
          {(Object.entries(outcomeTypeConfig) as [OutcomeType, typeof outcomeTypeConfig[OutcomeType]][]).map(([key, cfg]) => {
            const CfgIcon = cfg.icon;
            return (
              <button
                key={key}
                onClick={() => setType(key)}
                className="flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-semibold transition-all"
                style={
                  type === key
                    ? { background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }
                    : { background: "transparent", color: "hsl(var(--muted-foreground) / 0.6)", border: "1px solid hsl(var(--border) / 0.5)" }
                }
              >
                <CfgIcon className="w-2.5 h-2.5" />
                {cfg.label}
              </button>
            );
          })}
        </div>

        {/* Title */}
        <div>
          <label className="text-[8px] font-semibold uppercase tracking-wider text-muted-foreground/50 block mb-1">
            Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Patient safely discharged"
            autoFocus
            className="w-full text-[11px] rounded-md border border-border/60 bg-background px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all"
          />
        </div>

        {/* Description */}
        <div>
          <label className="text-[8px] font-semibold uppercase tracking-wider text-muted-foreground/50 block mb-1">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What does this outcome mean for the learner?"
            rows={2}
            className="w-full text-[11px] rounded-md border border-border/60 bg-background px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-primary/30 transition-all resize-none"
          />
        </div>

        <button
          onClick={handleAdd}
          disabled={!title.trim()}
          className="w-full py-1.5 rounded-md text-[11px] font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}
        >
          Add Outcome
        </button>
      </div>
    </div>
  );
};

// ── Timer row ─────────────────────────────────────────────────────
const TimerRow = ({
  timer,
  allSteps,
  onUpdate,
  onDelete,
}: {
  timer: GlobalTimer;
  allSteps: { id: string; title: string }[];
  onUpdate: (patch: Partial<GlobalTimer>) => void;
  onDelete: () => void;
}) => {
  const seconds = Math.round(timer.timeoutMs / 1000);
  const targetStep = allSteps.find((s) => s.id === timer.targetStepId);

  return (
    <div
      className="mx-3 mb-2 rounded-lg overflow-hidden"
      style={{ border: "1px solid hsl(262, 60%, 80%)", background: "hsl(262, 60%, 97%)" }}
    >
      <div className="px-3 py-2 space-y-1.5">
        {/* Name row */}
        <div className="flex items-center gap-2">
          <Clock className="w-3 h-3 shrink-0" style={{ color: "hsl(262, 60%, 45%)" }} />
          <input
            type="text"
            value={timer.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            placeholder="Timer name…"
            className="flex-1 bg-transparent border-b border-transparent hover:border-purple-300 focus:border-purple-400 outline-none text-[11px] font-semibold transition-colors py-0.5"
            style={{ color: "hsl(262, 60%, 35%)" }}
          />
          <button
            onClick={onDelete}
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-purple-100 transition-colors shrink-0"
            title="Delete timer"
          >
            <Trash2 className="w-3 h-3" style={{ color: "hsl(262, 60%, 55%)" }} />
          </button>
        </div>

        {/* Timeout + target */}
        <div className="flex items-center gap-2 pl-5">
          <div className="flex items-center gap-1">
            <span className="text-[9px] text-muted-foreground/60">After</span>
            <input
              type="number"
              value={seconds}
              min={1}
              onChange={(e) => onUpdate({ timeoutMs: Number(e.target.value) * 1000 })}
              className="w-14 text-[10px] font-mono rounded border border-purple-200 bg-white/80 px-1.5 py-0.5 outline-none focus:ring-1 focus:ring-purple-300 text-center"
              style={{ color: "hsl(262, 60%, 35%)" }}
            />
            <span className="text-[9px] text-muted-foreground/60">s →</span>
          </div>
          <select
            value={timer.targetStepId}
            onChange={(e) => onUpdate({ targetStepId: e.target.value })}
            className="flex-1 text-[10px] rounded border border-purple-200 bg-white/80 px-1.5 py-0.5 outline-none focus:ring-1 focus:ring-purple-300"
            style={{ color: "hsl(262, 60%, 35%)" }}
          >
            <option value="">Select target step…</option>
            {allSteps.map((s, i) => (
              <option key={s.id} value={s.id}>
                Step {i + 1}: {s.title}
              </option>
            ))}
          </select>
        </div>
        {timer.targetStepId && !targetStep && (
          <p className="pl-5 text-[9px] text-destructive/70">Target step not found</p>
        )}
      </div>
    </div>
  );
};

// ── Add timer form ────────────────────────────────────────────────
const AddTimerForm = ({
  allSteps,
  onAdd,
  onCancel,
}: {
  allSteps: { id: string; title: string }[];
  onAdd: (timer: GlobalTimer) => void;
  onCancel: () => void;
}) => {
  const [name, setName] = useState("Global Timer");
  const [seconds, setSeconds] = useState(60);
  const [targetStepId, setTargetStepId] = useState("");

  const handleAdd = () => {
    if (!name.trim() || !targetStepId) return;
    onAdd({
      id: `timer-${Date.now()}`,
      name: name.trim(),
      timeoutMs: seconds * 1000,
      targetStepId,
    });
  };

  return (
    <div
      className="mx-3 mb-3 rounded-lg overflow-hidden"
      style={{ border: "1px dashed hsl(var(--border))", background: "hsl(var(--secondary) / 0.2)" }}
    >
      <div className="px-3 py-2.5 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground/60">
            New Timer
          </span>
          <button onClick={onCancel} className="w-4 h-4 flex items-center justify-center rounded hover:bg-secondary">
            <X className="w-3 h-3 text-muted-foreground" />
          </button>
        </div>

        <div>
          <label className="text-[8px] font-semibold uppercase tracking-wider text-muted-foreground/50 block mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            className="w-full text-[11px] rounded-md border border-border/60 bg-background px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-primary/30 transition-all"
          />
        </div>

        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-[8px] font-semibold uppercase tracking-wider text-muted-foreground/50 block mb-1">Timeout (seconds)</label>
            <input
              type="number"
              value={seconds}
              min={1}
              onChange={(e) => setSeconds(Number(e.target.value))}
              className="w-full text-[11px] rounded-md border border-border/60 bg-background px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-primary/30 transition-all"
            />
          </div>
          <div className="flex-1">
            <label className="text-[8px] font-semibold uppercase tracking-wider text-muted-foreground/50 block mb-1">Target Step</label>
            <select
              value={targetStepId}
              onChange={(e) => setTargetStepId(e.target.value)}
              className="w-full text-[11px] rounded-md border border-border/60 bg-background px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-primary/30 transition-all"
            >
              <option value="">Select…</option>
              {allSteps.map((s, i) => (
                <option key={s.id} value={s.id}>
                  Step {i + 1}: {s.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={handleAdd}
          disabled={!name.trim() || !targetStepId}
          className="w-full py-1.5 rounded-md text-[11px] font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}
        >
          Add Timer
        </button>
      </div>
    </div>
  );
};

// ── Metadata tab ──────────────────────────────────────────────────
const MetadataTab = ({
  data,
  onUpdateMeta,
  onAddOutcome,
  onUpdateOutcome,
  onDeleteOutcome,
  onAddTimer,
  onUpdateTimer,
  onDeleteTimer,
}: {
  data: ScenarioData;
  onUpdateMeta: (patch: { title?: string; description?: string }) => void;
  onAddOutcome: (outcome: OutcomeNode) => void;
  onUpdateOutcome: (id: string, patch: Partial<OutcomeNode>) => void;
  onDeleteOutcome: (id: string) => void;
  onAddTimer: (timer: GlobalTimer) => void;
  onUpdateTimer: (id: string, patch: Partial<GlobalTimer>) => void;
  onDeleteTimer: (id: string) => void;
}) => {
  const [showAddOutcome, setShowAddOutcome] = useState(false);
  const [showAddTimer, setShowAddTimer] = useState(false);

  const allSteps = (data.scenarioNode.steps ?? []).map((s) => ({ id: s.id, title: s.title }));
  const steps = data.scenarioNode.steps ?? [];

  // Count how many paths reference each outcome
  const outcomeRefCounts: Record<string, number> = {};
  for (const step of steps) {
    for (const path of step.paths ?? []) {
      for (const conn of path.connections ?? []) {
        outcomeRefCounts[conn.targetNodeId] = (outcomeRefCounts[conn.targetNodeId] ?? 0) + 1;
      }
    }
  }

  // Reachability analysis
  const validation = useMemo(() => {
    const reachableOutcomeIds = new Set<string>();
    const reachableStepIds = new Set<string>();

    for (const step of steps) {
      for (const path of step.paths ?? []) {
        for (const conn of path.connections ?? []) reachableOutcomeIds.add(conn.targetNodeId);
        if (path.targetStepId) reachableStepIds.add(path.targetStepId);
      }
    }
    // global timer targets are also reachable
    for (const t of data.globalTimers) reachableStepIds.add(t.targetStepId);

    const unreachableOutcomes = data.outcomeNodes.filter((o) => !reachableOutcomeIds.has(o.id));
    // Dead-end: steps with no outbound paths (excluding the first step which has no inbound requirement)
    const deadEndSteps = steps.filter((s) => !s.paths || s.paths.length === 0);
    // Steps missing evaluation
    const noEvalSteps = steps.filter((s) => !s.evaluation);
    // Steps missing tasks
    const noTaskSteps = steps.filter((s) => !s.tasks || s.tasks.length === 0);

    return { unreachableOutcomes, deadEndSteps, noEvalSteps, noTaskSteps };
  }, [steps, data.outcomeNodes, data.globalTimers]);

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Scenario title + description */}
      <SectionHeader label="Scenario" />
      <div className="px-4 pb-1 space-y-2">
        <div>
          <label className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-0.5 block">
            Title
          </label>
          <input
            type="text"
            value={data.title}
            onChange={(e) => onUpdateMeta({ title: e.target.value })}
            placeholder="Scenario title…"
            className="w-full bg-transparent border-b border-border/25 hover:border-border/60 focus:border-primary/50 outline-none placeholder:text-muted-foreground/40 transition-colors py-0.5 text-[12px] font-semibold"
          />
        </div>
        <div>
          <label className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-0.5 block">
            Description
          </label>
          <textarea
            value={data.scenarioNode.description ?? ""}
            onChange={(e) => onUpdateMeta({ description: e.target.value })}
            placeholder="What is this scenario about?"
            rows={3}
            className="w-full text-[11px] rounded-md border border-border/60 bg-background px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all resize-none mt-0.5"
          />
        </div>
      </div>

      {/* Outcomes */}
      <SectionHeader label="Outcomes" />
      {data.outcomeNodes.length === 0 && !showAddOutcome && (
        <p className="px-4 pb-2 text-[10px] text-muted-foreground/50 italic">
          Define where the scenario can end — the good outcome and the failure modes.
        </p>
      )}
      {data.outcomeNodes.map((o) => (
        <OutcomeRow
          key={o.id}
          outcome={o}
          onUpdate={(patch) => onUpdateOutcome(o.id, patch)}
          onDelete={() => onDeleteOutcome(o.id)}
          connectedStepCount={outcomeRefCounts[o.id] ?? 0}
        />
      ))}
      {showAddOutcome ? (
        <AddOutcomeForm
          onAdd={(o) => { onAddOutcome(o); setShowAddOutcome(false); }}
          onCancel={() => setShowAddOutcome(false)}
        />
      ) : (
        <AddButton label="Add outcome" onClick={() => setShowAddOutcome(true)} />
      )}

      {/* Global timers */}
      <SectionHeader label="Global Timers" />
      {data.globalTimers.length === 0 && !showAddTimer && (
        <p className="px-4 pb-2 text-[10px] text-muted-foreground/50 italic">
          Timers that fire globally and redirect the learner to a specific step when they expire.
        </p>
      )}
      {data.globalTimers.map((t) => (
        <TimerRow
          key={t.id}
          timer={t}
          allSteps={allSteps}
          onUpdate={(patch) => onUpdateTimer(t.id, patch)}
          onDelete={() => onDeleteTimer(t.id)}
        />
      ))}
      {showAddTimer ? (
        <AddTimerForm
          allSteps={allSteps}
          onAdd={(t) => { onAddTimer(t); setShowAddTimer(false); }}
          onCancel={() => setShowAddTimer(false)}
        />
      ) : (
        <AddButton label="Add global timer" onClick={() => setShowAddTimer(true)} />
      )}

      {/* Validation */}
      <SectionHeader label="Validation" />
      {validation.unreachableOutcomes.length === 0 &&
       validation.deadEndSteps.length === 0 &&
       validation.noEvalSteps.length === 0 &&
       validation.noTaskSteps.length === 0 ? (
        <div className="mx-3 mb-3 px-3 py-2 rounded-lg flex items-center gap-2"
          style={{ background: "hsl(145, 65%, 95%)", border: "1px solid hsl(145, 65%, 78%)" }}>
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" style={{ color: "hsl(145, 65%, 35%)" }} />
          <p className="text-[10px] font-medium" style={{ color: "hsl(145, 65%, 28%)" }}>
            No issues found
          </p>
        </div>
      ) : (
        <div className="mx-3 mb-3 space-y-1.5">
          {validation.unreachableOutcomes.map((o) => (
            <ValidationRow
              key={o.id}
              severity="error"
              message={`Outcome unreachable: "${o.title}"`}
              detail="No decision path leads to this outcome"
            />
          ))}
          {validation.deadEndSteps.map((s) => (
            <ValidationRow
              key={s.id}
              severity="error"
              message={`Dead end: "${s.title}"`}
              detail="This step has no outbound paths — the learner will be stuck"
            />
          ))}
          {validation.noTaskSteps.map((s) => (
            <ValidationRow
              key={s.id}
              severity="warning"
              message={`"${s.title}" has no tasks`}
              detail="Steps without tasks have no trackable learner actions"
            />
          ))}
          {validation.noEvalSteps.map((s) => (
            <ValidationRow
              key={s.id}
              severity="info"
              message={`"${s.title}" has no evaluation`}
              detail="This step won't contribute to the learner's competency score"
            />
          ))}
        </div>
      )}

      <div className="h-8" />
    </div>
  );
};

export const ScenarioLibraryPanel = ({
  isOpen,
  data,
  onClose,
  authoringMode,
  steps,
  selectedStepId,
  onSelectStep,
  onAddStep,
  onUpdateScenarioMeta,
  onAddPersona,
  onUpdatePersona,
  onDeletePersona,
  onAddResource,
  onUpdateResource,
  onDeleteResource,
  onAddOutcome,
  onUpdateOutcome,
  onDeleteOutcome,
  onAddTimer,
  onUpdateTimer,
  onDeleteTimer,
}: ScenarioLibraryPanelProps) => {
  const [activeTab, setActiveTab] = useState<LibraryTab>("metadata");

  // When switching away from library mode, leave the steps tab
  useEffect(() => {
    if (authoringMode === "canvas" && activeTab === "steps") {
      setActiveTab("metadata");
    }
  }, [authoringMode, activeTab]);

  return (
    <div
      className="fixed left-0 top-0 h-screen w-[360px] z-30 flex flex-col bg-background border-r border-border shadow-2xl transition-transform duration-300 ease-out"
      style={{ transform: isOpen ? "translateX(0)" : "translateX(-100%)" }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* ── Header ──────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{
          borderBottom: "1px solid hsl(var(--border))",
          background: "hsl(var(--secondary) / 0.4)",
        }}
      >
        <div>
          <p className="text-[11px] font-bold text-foreground">Scenario Library</p>
          {data && (
            <p className="text-[9px] text-muted-foreground truncate max-w-[260px] mt-0.5">
              {data.title}
            </p>
          )}
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-secondary transition-colors"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* ── Tabs ────────────────────────────────────────────────── */}
      <div
        className="flex shrink-0"
        style={{ borderBottom: "1px solid hsl(var(--border))" }}
      >
        {TAB_CONFIG.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-semibold transition-colors ${
              activeTab === id
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground border-b-2 border-transparent"
            }`}
          >
            <Icon className="w-3 h-3" />
            {label}
            {id === "personas" && data && data.personas.length > 0 && (
              <span className="text-[8px] px-1 py-0.5 rounded-full bg-secondary text-muted-foreground">
                {data.personas.length}
              </span>
            )}
            {id === "resources" && data && data.resources.length > 0 && (
              <span className="text-[8px] px-1 py-0.5 rounded-full bg-secondary text-muted-foreground">
                {data.resources.length}
              </span>
            )}
          </button>
        ))}
        {/* Steps tab — only shown in library authoring mode */}
        {authoringMode === "library" && (
          <button
            onClick={() => setActiveTab("steps")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-semibold transition-colors ${
              activeTab === "steps"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground border-b-2 border-transparent"
            }`}
          >
            <Layers className="w-3 h-3" />
            Steps
            {steps.length > 0 && (
              <span className="text-[8px] px-1 py-0.5 rounded-full bg-secondary text-muted-foreground">
                {steps.length}
              </span>
            )}
          </button>
        )}
      </div>

      {/* ── Tab content ─────────────────────────────────────────── */}
      {!data ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-[11px]">
          No scenario loaded.
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {activeTab === "metadata" && (
            <MetadataTab
              data={data}
              onUpdateMeta={onUpdateScenarioMeta}
              onAddOutcome={onAddOutcome}
              onUpdateOutcome={onUpdateOutcome}
              onDeleteOutcome={onDeleteOutcome}
              onAddTimer={onAddTimer}
              onUpdateTimer={onUpdateTimer}
              onDeleteTimer={onDeleteTimer}
            />
          )}

          {activeTab === "personas" && (
            <div className="pt-3">
              <div className="px-4 pb-2">
                <p className="text-[10px] text-muted-foreground/70 leading-relaxed">
                  Characters are the AI personas that drive each step. Define their identity here; set their behavioral adherence per step in the Step Inspector.
                </p>
              </div>
              <PersonaEditor
                personas={data.personas}
                onAdd={onAddPersona}
                onUpdate={onUpdatePersona}
                onDelete={onDeletePersona}
              />
            </div>
          )}

          {activeTab === "resources" && (
            <div className="pt-3">
              <div className="px-4 pb-2">
                <p className="text-[10px] text-muted-foreground/70 leading-relaxed">
                  Resources are documents, forms, and media referenced by steps. Manage the library here; assign them per step in the Step Inspector.
                </p>
              </div>
              <ResourceEditor
                resources={data.resources}
                onAdd={onAddResource}
                onUpdate={onUpdateResource}
                onDelete={onDeleteResource}
              />
            </div>
          )}

          {activeTab === "steps" && authoringMode === "library" && (
            <StepsTab
              steps={steps}
              selectedStepId={selectedStepId}
              onSelectStep={onSelectStep}
              onAddStep={onAddStep}
            />
          )}

          {activeTab !== "steps" && <div className="h-8" />}
        </div>
      )}
    </div>
  );
};
