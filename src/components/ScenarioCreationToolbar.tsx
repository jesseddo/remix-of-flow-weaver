import { useState, useRef, useEffect } from "react";
import { OutcomeType, NodeType } from "@/types/scenario";
import {
  Plus,
  FilePlus2,
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
  onNewScenario: (title: string, description: string) => void;
  onAddStep: (type: NodeType) => void;
  onAddOutcome: (type: OutcomeType) => void;
  onAddTimer: () => void;
  onSave: () => void;
  isDirty: boolean;
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
  onNewScenario,
  onAddStep,
  onAddOutcome,
  onAddTimer,
  onSave,
  isDirty,
}: ScenarioCreationToolbarProps) => {
  const [stepDropdownOpen, setStepDropdownOpen] = useState(false);
  const stepDropdownRef = useRef<HTMLDivElement>(null);

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

  const btnBase =
    "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors";
  const btnDefault =
    "border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted";
  const btnDisabled = "border-border/50 bg-muted/30 text-muted-foreground/40 cursor-not-allowed";

  return (
    <div className="w-full px-4 py-1.5 border-b border-border bg-background flex items-center gap-2 flex-wrap">
      {/* New Scenario */}
      <button
        onClick={() => onNewScenario("Untitled Scenario", "")}
        className={`${btnBase} border-primary/40 bg-primary/5 text-primary hover:bg-primary/10`}
      >
        <FilePlus2 className="w-3.5 h-3.5" />
        New Scenario
      </button>

      <div className="w-px h-5 bg-border mx-0.5" />

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

      {/* Add Outcome — one button per type */}
      {outcomeButtons.map(({ type, label, color, hoverBg }) => (
        <button
          key={type}
          onClick={() => onAddOutcome(type)}
          disabled={!hasScenario}
          className={`${btnBase} ${hasScenario ? "border-border bg-background hover:text-foreground" : btnDisabled}`}
          style={hasScenario ? { color, borderColor: color + "40" } : undefined}
          onMouseEnter={(e) => hasScenario && (e.currentTarget.style.background = hoverBg)}
          onMouseLeave={(e) => hasScenario && (e.currentTarget.style.background = "")}
        >
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: hasScenario ? color : undefined }} />
          {label}
        </button>
      ))}

      <div className="w-px h-5 bg-border mx-0.5" />

      {/* Add Timer */}
      <button
        onClick={onAddTimer}
        disabled={!hasScenario}
        className={`${btnBase} ${hasScenario ? btnDefault : btnDisabled}`}
      >
        <Timer className="w-3.5 h-3.5" />
        Add Timer
      </button>

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
