import { useState, useRef, useEffect } from "react";
import { OutcomeType, NodeType, ScenarioStep } from "@/types/scenario";
import {
  Plus,
  Target,
  Timer,
  Save,
  MessageSquare,
  Radio,
  FileText,
  Video,
} from "lucide-react";

interface ScenarioCreationToolbarProps {
  hasScenario: boolean;
  onAddStep: (type: NodeType) => void;
  onAddOutcome: (type: OutcomeType) => void;
  onAddTimer: (timeoutMs: number, targetStepId: string) => void;
  onSave: () => void;
  isDirty: boolean;
  hasGlobalTimer?: boolean;
  existingOutcomeTypes?: OutcomeType[];
  steps?: ScenarioStep[];
}

const modalityOptions: { type: NodeType; label: string; icon: typeof MessageSquare; color: string }[] = [
  { type: "chat",     label: "Chat",     icon: MessageSquare, color: "hsl(var(--node-chat))" },
  { type: "radio",    label: "Radio",    icon: Radio,         color: "hsl(var(--node-radio))" },
  { type: "document", label: "Document", icon: FileText,      color: "hsl(var(--node-document))" },
  { type: "video",    label: "Video",    icon: Video,         color: "hsl(var(--node-video))" },
];

const outcomeButtons: { type: OutcomeType; label: string; color: string; hoverBg: string }[] = [
  { type: "safe_path",        label: "Success",          color: "hsl(145,65%,40%)", hoverBg: "hsl(145,65%,95%)" },
  { type: "partial_failure",  label: "Partial Failure",  color: "hsl(40,80%,45%)",  hoverBg: "hsl(40,80%,95%)" },
  { type: "critical_failure", label: "Critical Failure", color: "hsl(0,65%,50%)",   hoverBg: "hsl(0,65%,96%)" },
];

export const ScenarioCreationToolbar = ({
  hasScenario,
  onAddStep,
  onAddOutcome,
  onAddTimer,
  onSave,
  isDirty,
  hasGlobalTimer,
  existingOutcomeTypes = [],
  steps = [],
}: ScenarioCreationToolbarProps) => {
  const [stepDropdownOpen, setStepDropdownOpen] = useState(false);
  const [timerDropdownOpen, setTimerDropdownOpen] = useState(false);
  const [timerMinutes, setTimerMinutes] = useState(2);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerTargetStepId, setTimerTargetStepId] = useState("");
  const stepDropdownRef = useRef<HTMLDivElement>(null);
  const timerDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!stepDropdownOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (stepDropdownRef.current && !stepDropdownRef.current.contains(e.target as Node)) {
        setStepDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [stepDropdownOpen]);

  useEffect(() => {
    if (!timerDropdownOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (timerDropdownRef.current && !timerDropdownRef.current.contains(e.target as Node)) {
        setTimerDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [timerDropdownOpen]);

  const btnBase =
    "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors";
  const btnDefault =
    "border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted";
  const btnDisabled = "border-border/50 bg-muted/30 text-muted-foreground/40 cursor-not-allowed";

  return (
    <div className="w-full px-4 py-1.5 border-b border-border bg-background flex items-center gap-2 flex-wrap">
      {/* Add Step — with modality dropdown */}
      <div className="relative" ref={stepDropdownRef}>
        <button
          onClick={() => hasScenario && setStepDropdownOpen((v) => !v)}
          disabled={!hasScenario}
          className={`${btnBase} ${hasScenario ? btnDefault : btnDisabled}`}
        >
          <Plus className="w-3.5 h-3.5" />
          Add Step
          <svg className="w-2.5 h-2.5 ml-0.5 opacity-60" viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 1l4 4 4-4" />
          </svg>
        </button>
        {stepDropdownOpen && (
          <div className="absolute top-full left-0 mt-1 z-50 min-w-[160px] rounded-lg border border-border bg-popover shadow-lg py-1 animate-in fade-in-0 zoom-in-95 duration-100">
            <div className="px-2.5 py-1.5 text-[8px] font-bold uppercase tracking-widest text-muted-foreground/50">
              Select modality
            </div>
            {modalityOptions.map(({ type, label, icon: MIcon, color }) => (
              <button
                key={type}
                onClick={() => {
                  onAddStep(type);
                  setStepDropdownOpen(false);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[11px] font-medium text-foreground/80 hover:bg-muted rounded-md mx-0 transition-colors"
              >
                <MIcon className="w-3.5 h-3.5 shrink-0" style={{ color }} />
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Add Outcome — one button per type, disabled when that type already exists */}
      {outcomeButtons.map(({ type, label, color, hoverBg }) => {
        const exists = existingOutcomeTypes.includes(type);
        const enabled = hasScenario && !exists;
        return (
          <button
            key={type}
            onClick={() => onAddOutcome(type)}
            disabled={!enabled}
            title={exists ? `${label} outcome already exists` : undefined}
            className={`${btnBase} ${enabled ? "border-border bg-background hover:text-foreground" : btnDisabled}`}
            style={enabled ? { color, borderColor: color + "40" } : undefined}
            onMouseEnter={(e) => enabled && (e.currentTarget.style.background = hoverBg)}
            onMouseLeave={(e) => enabled && (e.currentTarget.style.background = "")}
          >
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: enabled ? color : undefined }} />
            {label}
            {exists && <span className="text-[8px] opacity-50">✓</span>}
          </button>
        );
      })}

      <div className="w-px h-5 bg-border mx-0.5" />

      {/* Add Timer (only one allowed) */}
      <div className="relative" ref={timerDropdownRef}>
        <button
          onClick={() => {
            if (hasScenario && !hasGlobalTimer) {
              setTimerTargetStepId(steps[0]?.id ?? "");
              setTimerMinutes(2);
              setTimerSeconds(0);
              setTimerDropdownOpen((v) => !v);
            }
          }}
          disabled={!hasScenario || hasGlobalTimer}
          title={hasGlobalTimer ? "Only one global timer per scenario" : undefined}
          className={`${btnBase} ${hasScenario && !hasGlobalTimer ? btnDefault : btnDisabled}`}
        >
          <Timer className="w-3.5 h-3.5" />
          {hasGlobalTimer ? "Timer Set" : "Add Timer"}
        </button>

        {timerDropdownOpen && (
          <div className="absolute top-full left-0 mt-1 z-50 w-[260px] rounded-lg border border-border bg-popover shadow-lg py-2 px-3 animate-in fade-in-0 zoom-in-95 duration-100">
            <div className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-2">
              Configure Timer
            </div>

            {/* Time */}
            <div className="mb-3">
              <label className="text-[9px] font-semibold text-muted-foreground/60 block mb-1">
                Duration
              </label>
                <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={0}
                    max={999}
                    value={timerMinutes}
                    onChange={(e) => setTimerMinutes(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-14 text-[11px] rounded-md border border-border/50 bg-background px-2 py-1 outline-none focus:ring-2 focus:ring-primary/20 text-center tabular-nums"
                  />
                  <span className="text-[9px] text-muted-foreground/50">min</span>
                </div>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={0}
                    max={59}
                    value={timerSeconds}
                    onChange={(e) => setTimerSeconds(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))}
                    className="w-14 text-[11px] rounded-md border border-border/50 bg-background px-2 py-1 outline-none focus:ring-2 focus:ring-primary/20 text-center tabular-nums"
                  />
                  <span className="text-[9px] text-muted-foreground/50">sec</span>
                </div>
              </div>
            </div>

            {/* Target step */}
            <div className="mb-3">
              <label className="text-[9px] font-semibold text-muted-foreground/60 block mb-1">
                Go to step when timer expires
              </label>
              {steps.length > 0 ? (
                <select
                  value={timerTargetStepId}
                  onChange={(e) => setTimerTargetStepId(e.target.value)}
                  className="w-full text-[11px] rounded-md border border-border/50 bg-background px-2 py-1.5 outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                >
                  {steps.map((s, i) => (
                    <option key={s.id} value={s.id}>
                      Step {i + 1}: {s.title}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-[10px] text-muted-foreground/50 italic py-1">
                  Add steps first, then configure the timer target.
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-1.5">
              <button
                onClick={() => {
                  const ms = (timerMinutes * 60 + timerSeconds) * 1000;
                  if (ms > 0 && timerTargetStepId) {
                    onAddTimer(ms, timerTargetStepId);
                    setTimerDropdownOpen(false);
                  }
                }}
                disabled={
                  (timerMinutes * 60 + timerSeconds) <= 0 || !timerTargetStepId
                }
                className="flex-1 py-1.5 rounded-md text-[11px] font-semibold bg-primary text-primary-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Add Timer
              </button>
              <button
                onClick={() => setTimerDropdownOpen(false)}
                className="px-3 py-1.5 rounded-md text-[11px] text-muted-foreground/60 hover:text-foreground border border-border/40 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1" />

      {/* Save JSON */}
      <button
        onClick={onSave}
        disabled={!hasScenario}
        className={`${btnBase} ${
          isDirty
            ? "border-amber-500/40 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
            : hasScenario
            ? btnDefault
            : btnDisabled
        }`}
      >
        <Save className="w-3.5 h-3.5" />
        Save JSON
        {isDirty && (
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
        )}
      </button>
    </div>
  );
};
