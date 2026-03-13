import { ScenarioNode, OutcomeNode, ScenarioStep } from "@/types/scenario";

interface FlowConnectionsProps {
  scenarioNode: ScenarioNode;
  outcomeNodes: OutcomeNode[];
}

const SCENARIO_W = 500;
const OUTCOME_W = 220;
const OUTCOME_H = 260;

const HEADER_H = 60;
const PADDING_TOP = 16;
const STEP_BASE_H = 120;

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

const calculateStepYPosition = (stepIndex: number, decisionPointIndex: number): number => {
  const stepY = HEADER_H + PADDING_TOP + (stepIndex * (STEP_BASE_H + 20));
  const dpOffsetY = 80 + (decisionPointIndex * 26);
  return stepY + dpOffsetY;
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
        const y1 = scenarioNode.position.y + calculateStepYPosition(stepIndex, dpIndex);

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
