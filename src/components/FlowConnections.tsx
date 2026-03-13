import { ScenarioNode, OutcomeNode, ScenarioStep } from "@/types/scenario";

interface FlowConnectionsProps {
  scenarioNode: ScenarioNode;
  outcomeNodes: OutcomeNode[];
}

const SCENARIO_W = 500;
const OUTCOME_H = 260;

const HEADER_H = 60;
const CONTENT_PADDING = 16;

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

const calculateDecisionPointY = (stepIndex: number, decisionPointIndex: number, step: ScenarioStep): number => {
  let cumulativeY = HEADER_H + CONTENT_PADDING;

  for (let i = 0; i < stepIndex; i++) {
    cumulativeY += 140;
  }

  const stepCardPadding = 12;
  const titleRowHeight = 28;
  const descriptionHeight = 40;
  const decisionPointsLabelHeight = 0;
  const decisionPointHeight = 26;

  cumulativeY += stepCardPadding + titleRowHeight + descriptionHeight + decisionPointsLabelHeight;
  cumulativeY += (decisionPointIndex * decisionPointHeight) + (decisionPointHeight / 2);

  return cumulativeY;
};

const FlowConnections = ({ scenarioNode, outcomeNodes }: FlowConnectionsProps) => {
  const outcomeMap = new Map(outcomeNodes.map((n) => [n.id, n]));
  const lines: Line[] = [];

  scenarioNode.steps?.forEach((step: ScenarioStep, stepIndex: number) => {
    step.decisionPoints?.forEach((dp, dpIndex) => {
      if (!dp.connections) return;

      dp.connections.forEach((connection) => {
        const target = outcomeMap.get(connection.targetNodeId);
        if (!target) return;

        const x1 = scenarioNode.position.x + SCENARIO_W;
        const y1 = scenarioNode.position.y + calculateDecisionPointY(stepIndex, dpIndex, step);

        const x2 = target.position.x;
        const y2 = target.position.y + OUTCOME_H / 2;

        lines.push({
          x1,
          y1,
          x2,
          y2,
          color: getColor(connection.type),
          label: connection.label,
          type: connection.type
        });
      });
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
        const labelY = (line.y1 + line.y2) / 2;
        const labelWidth = Math.max(180, line.label.length * 5);

        return (
          <g key={i}>
            <path
              d={`M${line.x1},${line.y1} C${midX},${line.y1} ${midX},${line.y2} ${line.x2},${line.y2}`}
              fill="none"
              stroke={line.color}
              strokeWidth={2.5}
              strokeDasharray={line.type === "failure" ? "6 4" : undefined}
              markerEnd={`url(#${markerId})`}
            />
            <rect
              x={midX - labelWidth / 2}
              y={labelY - 10}
              width={labelWidth}
              height={20}
              rx={6}
              fill="hsl(0, 0%, 100%)"
              stroke={line.color}
              strokeWidth={1.5}
            />
            <text
              x={midX}
              y={labelY + 4}
              textAnchor="middle"
              className="text-[10px] font-semibold"
              fill={line.color}
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
