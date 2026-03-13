import { ScenarioNode, OutcomeNode, ScenarioStep } from "@/types/scenario";
import { MessageSquare, Radio, FileText, Video, User, Zap, CircleCheck as CheckCircle2, Circle as XCircle, ChevronDown } from "lucide-react";

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

interface ScenarioCardProps {
  node: ScenarioNode;
  isSelected: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onClick: (e: React.MouseEvent) => void;
}

interface OutcomeCardProps {
  node: OutcomeNode;
  isSelected: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onClick: (e: React.MouseEvent) => void;
}

const StepRow = ({ step, index }: { step: ScenarioStep; index: number }) => {
  const cfg = typeConfig[step.type];
  const Icon = cfg.icon;

  return (
    <div className="relative">
      <div className="bg-card rounded-lg p-3 space-y-2 hover:bg-secondary/30 transition-colors">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-1">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
              style={{ background: `hsl(var(--node-${step.type}))`, color: "white" }}
            >
              {index + 1}
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

        {step.decisionPoints && step.decisionPoints.length > 0 && (
          <div className="space-y-1 pl-8">
            {step.decisionPoints.map((dp, i) => (
              <div
                key={i}
                className="flex items-center gap-2 text-[10px] text-card-foreground bg-secondary/60 rounded-md px-2 py-1 relative"
              >
                {dp.trigger === "user" ? (
                  <User className="w-2.5 h-2.5 text-primary shrink-0" />
                ) : (
                  <Zap className="w-2.5 h-2.5 text-node-warning shrink-0" />
                )}
                <span className="leading-tight text-[10px]">{dp.label}</span>
                <span
                  className={`ml-auto text-[8px] font-medium uppercase shrink-0 px-1 py-0.5 rounded ${
                    dp.trigger === "user"
                      ? "bg-primary/10 text-primary"
                      : "bg-node-warning/15 text-node-warning"
                  }`}
                >
                  {dp.trigger}
                </span>
                {dp.connections && dp.connections.length > 0 && (
                  <div
                    className="absolute -right-[7px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-2 border-background"
                    style={{
                      background: dp.connections.some(c => c.type === "failure")
                        ? "hsl(0, 72%, 55%)"
                        : dp.connections.some(c => c.type === "success")
                        ? "hsl(160, 60%, 45%)"
                        : "hsl(220, 15%, 75%)",
                    }}
                  />
                )}
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

      {index < (step.decisionPoints?.length || 0) - 1 && (
        <div className="flex justify-center py-1">
          <ChevronDown className="w-4 h-4 text-muted-foreground/50" />
        </div>
      )}
    </div>
  );
};

export const ScenarioCard = ({ node, isSelected, onMouseDown, onClick }: ScenarioCardProps) => {
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

      <div className="p-4 space-y-2">
        {node.steps?.map((step, index) => (
          <div key={step.id}>
            <StepRow step={step} index={index} />
            {index < (node.steps?.length || 0) - 1 && (
              <div className="flex justify-center py-2">
                <div className="w-0.5 h-4 bg-gradient-to-b from-primary/30 to-primary/10" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export const OutcomeCard = ({ node, isSelected, onMouseDown, onClick }: OutcomeCardProps) => {
  const isSuccess = node.outcome === "success";

  return (
    <div
      className={`w-[220px] rounded-2xl shadow-lg overflow-hidden cursor-grab active:cursor-grabbing transition-all ${
        isSelected ? "ring-2 ring-primary scale-105" : "hover:scale-[1.02]"
      }`}
      style={{
        position: "absolute",
        left: node.position.x,
        top: node.position.y,
        zIndex: isSelected ? 10 : 1,
        background: isSuccess
          ? "linear-gradient(135deg, hsl(145, 65%, 96%), hsl(145, 65%, 92%))"
          : "linear-gradient(135deg, hsl(0, 72%, 97%), hsl(0, 72%, 93%))",
        border: `2px solid ${isSuccess ? "hsl(145, 65%, 42%)" : "hsl(0, 72%, 55%)"}`,
      }}
      onMouseDown={onMouseDown}
      onClick={onClick}
    >
      <div className="p-5 flex flex-col items-center text-center gap-3">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center"
          style={{
            background: isSuccess ? "hsl(145, 65%, 42%)" : "hsl(0, 72%, 55%)",
          }}
        >
          {isSuccess ? (
            <CheckCircle2 className="w-6 h-6" style={{ color: "white" }} />
          ) : (
            <XCircle className="w-6 h-6" style={{ color: "white" }} />
          )}
        </div>

        <h3
          className="font-bold text-sm leading-tight"
          style={{ color: isSuccess ? "hsl(145, 65%, 25%)" : "hsl(0, 72%, 35%)" }}
        >
          {node.title}
        </h3>

        <span
          className="flex items-center gap-1 text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full"
          style={{
            background: isSuccess ? "hsl(145, 65%, 42%, 0.15)" : "hsl(0, 72%, 55%, 0.15)",
            color: isSuccess ? "hsl(145, 65%, 30%)" : "hsl(0, 72%, 40%)",
          }}
        >
          <Video className="w-3 h-3" />
          Video
        </span>

        <p className="text-[11px] leading-relaxed text-muted-foreground line-clamp-3">
          {node.description}
        </p>

        <span
          className="text-xs font-bold uppercase tracking-wider"
          style={{ color: isSuccess ? "hsl(145, 65%, 35%)" : "hsl(0, 72%, 45%)" }}
        >
          {isSuccess ? "Success" : "Failure"}
        </span>
      </div>
    </div>
  );
};
