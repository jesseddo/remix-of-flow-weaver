import { useState } from "react";
import { ScenarioData } from "@/types/scenario";
import { Info, ChevronDown, ChevronUp, Timer, Target } from "lucide-react";

interface ScenarioMetadataPopoverProps {
  data: ScenarioData;
}

export const ScenarioMetadataPopover = ({ data }: ScenarioMetadataPopoverProps) => {
  const [open, setOpen] = useState(false);

  const hasTimer = !!data.globalTimer;
  const hasOutcomes = data.outcomeNodes.length > 0;
  if (!hasTimer && !hasOutcomes) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded-md transition-colors ${
          open
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:text-foreground hover:bg-muted"
        }`}
      >
        <Info className="w-3 h-3" />
        Metadata
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {open && (
        <div
          className="absolute top-full left-0 mt-1 z-50 w-[340px] rounded-lg border border-border bg-background shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-3 max-h-[400px] overflow-y-auto">
            {hasTimer && data.globalTimer && (
              <div className="mb-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <Timer className="w-3 h-3 text-muted-foreground" />
                  <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">
                    Global Timer
                  </span>
                </div>
                <div
                  className="mb-1.5 px-3 py-2 rounded-md"
                  style={{
                    border: "1px solid hsl(var(--border))",
                    background: "hsl(var(--secondary) / 0.35)",
                  }}
                >
                  <p className="text-[11px] font-semibold text-foreground">{data.globalTimer.name}</p>
                  <p className="text-[9px] text-muted-foreground mt-0.5">
                    Triggers after {Math.round(data.globalTimer.timeoutMs / 1000)}s →{" "}
                    <span className="font-mono">{data.globalTimer.targetStepId}</span>
                  </p>
                  <p className="text-[8px] text-muted-foreground/70 mt-1 italic">
                    Ignored if learner is already on or past the target step
                  </p>
                </div>
              </div>
            )}

            {hasOutcomes && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Target className="w-3 h-3 text-muted-foreground" />
                  <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">
                    Outcomes
                  </span>
                </div>
                {data.outcomeNodes.map((o) => {
                  const colorMap = {
                    safe_path: { color: "hsl(145, 65%, 28%)", bg: "hsl(145, 65%, 95%)", border: "hsl(145, 65%, 78%)" },
                    partial_failure: { color: "hsl(40, 75%, 30%)", bg: "hsl(40, 80%, 95%)", border: "hsl(40, 80%, 78%)" },
                    critical_failure: { color: "hsl(0, 65%, 42%)", bg: "hsl(0, 65%, 96%)", border: "hsl(0, 65%, 80%)" },
                  };
                  const s = colorMap[o.outcome];
                  return (
                    <div
                      key={o.id}
                      className="mb-1.5 px-3 py-2 rounded-md"
                      style={{ border: `1px solid ${s.border}`, background: s.bg }}
                    >
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <p className="text-[11px] font-semibold" style={{ color: s.color }}>
                          {o.title}
                        </p>
                        <span
                          className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full"
                          style={{ background: s.border + "55", color: s.color }}
                        >
                          {o.outcome.replace("_", " ")}
                        </span>
                      </div>
                      {o.description && (
                        <p className="text-[10px] leading-relaxed" style={{ color: s.color + "cc" }}>
                          {o.description}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
