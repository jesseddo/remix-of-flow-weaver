import { ScenarioNode } from "@/types/scenario";
import { MessageSquare, Radio, FileText, Video, User, Zap, CheckCircle2, XCircle } from "lucide-react";

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

interface NodeCardProps {
  node: ScenarioNode;
  isSelected: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onClick: (e: React.MouseEvent) => void;
}

const OutcomeCard = ({ node, isSelected, onMouseDown, onClick }: NodeCardProps) => {
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
        {/* Large icon */}
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

        {/* Title */}
        <h3
          className="font-bold text-sm leading-tight"
          style={{ color: isSuccess ? "hsl(145, 65%, 25%)" : "hsl(0, 72%, 35%)" }}
        >
          {node.title}
        </h3>

        {/* Type badge */}
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

        {/* Description */}
        <p className="text-[11px] leading-relaxed text-muted-foreground line-clamp-3">
          {node.description}
        </p>

        {/* Outcome label */}
        <span
          className="text-xs font-bold uppercase tracking-wider"
          style={{ color: isSuccess ? "hsl(145, 65%, 35%)" : "hsl(0, 72%, 45%)" }}
        >
          ● {isSuccess ? "Success" : "Failure"}
        </span>
      </div>
    </div>
  );
};

const StepCard = ({ node, isSelected, onMouseDown, onClick }: NodeCardProps) => {
  const cfg = typeConfig[node.type];
  const Icon = cfg.icon;
  const borderColor = isSelected
    ? "ring-2 ring-primary"
    : "hover:ring-1 hover:ring-primary/40";

  return (
    <div
      className={`w-[300px] rounded-lg bg-card shadow-md overflow-hidden transition-shadow ${borderColor} cursor-grab active:cursor-grabbing`}
      style={{
        position: "absolute",
        left: node.position.x,
        top: node.position.y,
        zIndex: isSelected ? 10 : 1,
      }}
      onMouseDown={onMouseDown}
      onClick={onClick}
    >
      {/* Header stripe */}
      <div className={`${cfg.colorClass} h-1.5`} />

      <div className="p-4 space-y-3">
        {/* Title row */}
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold text-sm text-card-foreground leading-tight truncate">
            {node.title}
          </h3>
          <span className="flex items-center gap-1 text-xs font-medium shrink-0" style={{ color: `hsl(var(--node-${node.type}))` }}>
            <Icon className="w-3.5 h-3.5" />
            {cfg.label}
          </span>
        </div>

        {/* Persona */}
        {node.persona && (
          <p className="text-xs text-muted-foreground">{node.persona}</p>
        )}

        {/* Description */}
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
          {node.description}
        </p>

        {/* Decision Points */}
        {node.decisionPoints && node.decisionPoints.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Decision Points
            </p>
            {node.decisionPoints.map((dp, i) => (
              <div
                key={i}
                className="flex items-center gap-2 text-[11px] text-card-foreground bg-secondary/60 rounded-md px-2.5 py-1.5 relative"
              >
                {dp.trigger === "user" ? (
                  <User className="w-3 h-3 text-primary shrink-0" />
                ) : (
                  <Zap className="w-3 h-3 text-node-warning shrink-0" />
                )}
                <span className="leading-tight">{dp.label}</span>
                <span
                  className={`ml-auto text-[9px] font-medium uppercase shrink-0 px-1.5 py-0.5 rounded ${
                    dp.trigger === "user"
                      ? "bg-primary/10 text-primary"
                      : "bg-node-warning/15 text-node-warning"
                  }`}
                >
                  {dp.trigger}
                </span>
                {/* Connection dot for decision points with branches */}
                {dp.branches && dp.branches.length > 0 && (
                  <div
                    className="absolute -right-[7px] top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-card"
                    style={{
                      background: dp.branches.some(b => b.type === "failure")
                        ? "hsl(0, 72%, 55%)"
                        : dp.branches.some(b => b.type === "success")
                        ? "hsl(160, 60%, 45%)"
                        : "hsl(220, 15%, 75%)",
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Flow type + branches */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${flowBadge[node.flowType]}`}>
            {node.flowType}
          </span>
          {node.branches.length > 0 && (
            <span className="text-[10px] text-muted-foreground">
              {node.branches.length} branch{node.branches.length > 1 ? "es" : ""}
            </span>
          )}
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5">
          {node.tags.map((tag) => (
            <span
              key={tag}
              className="text-[10px] px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

const NodeCard = (props: NodeCardProps) => {
  if (props.node.outcome) {
    return <OutcomeCard {...props} />;
  }
  return <StepCard {...props} />;
};

export default NodeCard;
