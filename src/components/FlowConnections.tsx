import { ScenarioNode } from "@/types/scenario";

interface FlowConnectionsProps {
  nodes: ScenarioNode[];
}

const CARD_W = 300;
const OUTCOME_W = 220;

// Approximate Y offset for each decision point within a step card
// Layout: stripe(6) + padding(16) + title(20) + gap(12) + persona(16) + gap(12) + description(48) + gap(12) + label(16) + gap(6)
const DP_BASE_Y = 6 + 16 + 20 + 12 + 16 + 12 + 48 + 12 + 16 + 6;
const DP_ROW_H = 32;

const getColor = (type: "success" | "failure" | "default") => {
  if (type === "success") return "hsl(160, 60%, 45%)";
  if (type === "failure") return "hsl(0, 72%, 55%)";
  return "hsl(220, 15%, 75%)";
};

const getMarkerId = (type: "success" | "failure" | "default") => {
  return `arrow-${type}`;
};

interface Line {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  label: string;
  type: "success" | "failure" | "default";
}

const FlowConnections = ({ nodes }: FlowConnectionsProps) => {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const lines: Line[] = [];

  nodes.forEach((node) => {
    const isOutcome = !!node.outcome;
    const cardW = isOutcome ? OUTCOME_W : CARD_W;

    // Lines from decision points
    if (node.decisionPoints) {
      node.decisionPoints.forEach((dp, dpIndex) => {
        if (!dp.branches) return;
        dp.branches.forEach((branch) => {
          const target = nodeMap.get(branch.targetNodeId);
          if (!target) return;

          const x1 = node.position.x + cardW;
          const y1 = node.position.y + DP_BASE_Y + dpIndex * DP_ROW_H + DP_ROW_H / 2;

          const targetIsOutcome = !!target.outcome;
          const targetW = targetIsOutcome ? OUTCOME_W : CARD_W;
          const targetH = targetIsOutcome ? 260 : 300;
          const x2 = target.position.x;
          const y2 = target.position.y + targetH / 2;

          lines.push({ x1, y1, x2, y2, color: getColor(branch.type), label: branch.label, type: branch.type });
        });
      });
    }

    // Lines from node-level branches (for nodes without decision points, like "Skipped Verification")
    node.branches.forEach((branch) => {
      const target = nodeMap.get(branch.targetNodeId);
      if (!target) return;

      const x1 = node.position.x + cardW;
      const cardH = isOutcome ? 260 : 300;
      const y1 = node.position.y + cardH / 2;

      const targetIsOutcome = !!target.outcome;
      const targetH = targetIsOutcome ? 260 : 300;
      const x2 = target.position.x;
      const y2 = target.position.y + targetH / 2;

      lines.push({ x1, y1, x2, y2, color: getColor(branch.type), label: branch.label, type: branch.type });
    });
  });

  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 20 }}>
      <defs>
        <marker id="arrow-success" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
          <path d="M0,0 L8,3 L0,6" fill="hsl(160,60%,45%)" />
        </marker>
        <marker id="arrow-failure" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
          <path d="M0,0 L8,3 L0,6" fill="hsl(0,72%,55%)" />
        </marker>
        <marker id="arrow-default" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
          <path d="M0,0 L8,3 L0,6" fill="hsl(220,15%,75%)" />
        </marker>
      </defs>
      {lines.map((line, i) => {
        const midX = (line.x1 + line.x2) / 2;
        const markerId = getMarkerId(line.type);
        // Offset label Y slightly for overlapping lines
        const labelY = (line.y1 + line.y2) / 2 - 8;
        return (
          <g key={i}>
            <path
              d={`M${line.x1},${line.y1} C${midX},${line.y1} ${midX},${line.y2} ${line.x2},${line.y2}`}
              fill="none"
              stroke={line.color}
              strokeWidth={2}
              strokeDasharray={line.type === "failure" ? "6 4" : undefined}
              markerEnd={`url(#${markerId})`}
            />
            <rect
              x={midX - 60}
              y={labelY - 8}
              width={120}
              height={16}
              rx={4}
              fill="hsl(220, 20%, 97%)"
              fillOpacity={0.9}
            />
            <text
              x={midX}
              y={labelY + 2}
              textAnchor="middle"
              className="text-[8px] fill-muted-foreground"
              style={{ fontFamily: "system-ui" }}
            >
              {line.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

export default FlowConnections;
