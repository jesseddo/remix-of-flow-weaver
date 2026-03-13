import { useRef, useLayoutEffect, useEffect, useState } from "react";
import { ScenarioNode, OutcomeNode } from "@/types/scenario";

interface FlowConnectionsProps {
  scenarioNode: ScenarioNode;
  outcomeNodes: OutcomeNode[];
}

const SCENARIO_W = 500;
const OUTCOME_H = 260;

type ConnectionType = "safe_path" | "partial_failure" | "critical_failure" | "default";

const getColor = (type: ConnectionType) => {
  if (type === "safe_path") return "hsl(160, 60%, 45%)";
  if (type === "partial_failure") return "hsl(40, 80%, 42%)";
  if (type === "critical_failure") return "hsl(0, 72%, 55%)";
  return "hsl(220, 15%, 75%)";
};

const getMarkerId = (type: ConnectionType) => `arrow-${type}`;

const isDashed = (type: ConnectionType) =>
  type === "partial_failure" || type === "critical_failure";

interface Line {
  dotX: number;
  dotY: number;
  exitX: number;
  x2: number;
  y2: number;
  color: string;
  label: string;
  type: ConnectionType;
}

const linesMatch = (a: Line[], b: Line[]): boolean => {
  if (a.length !== b.length) return false;
  return a.every(
    (l, i) =>
      Math.abs(l.dotX - b[i].dotX) < 0.5 &&
      Math.abs(l.dotY - b[i].dotY) < 0.5 &&
      Math.abs(l.x2 - b[i].x2) < 0.5 &&
      Math.abs(l.y2 - b[i].y2) < 0.5
  );
};

const FlowConnections = ({
  scenarioNode,
  outcomeNodes,
}: FlowConnectionsProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [, setTick] = useState(0);

  const measureRef = useRef(() => {});
  measureRef.current = () => {
    const svgEl = svgRef.current;
    if (!svgEl) return;

    const svgRect = svgEl.getBoundingClientRect();
    if (svgRect.width === 0 || svgRect.height === 0) return;

    const scaleX = svgEl.clientWidth / svgRect.width;
    const scaleY = svgEl.clientHeight / svgRect.height;
    if (!isFinite(scaleX) || !isFinite(scaleY)) return;

    const outcomeMap = new Map(outcomeNodes.map((n) => [n.id, n]));
    const newLines: Line[] = [];
    const exitX = scenarioNode.position.x + SCENARIO_W;

    scenarioNode.steps?.forEach((step, stepIndex) => {
      step.decisionPoints?.forEach((dp, dpIndex) => {
        if (!dp.connections) return;

        const dotEl = document.querySelector(
          `[data-dp-id="${stepIndex}-${dpIndex}"]`
        );
        if (!dotEl) return;

        const dotRect = dotEl.getBoundingClientRect();
        const dotX =
          (dotRect.left + dotRect.width / 2 - svgRect.left) * scaleX;
        const dotY =
          (dotRect.top + dotRect.height / 2 - svgRect.top) * scaleY;

        dp.connections.forEach((connection) => {
          const target = outcomeMap.get(connection.targetNodeId);
          if (!target) return;

          newLines.push({
            dotX,
            dotY,
            exitX,
            x2: target.position.x,
            y2: target.position.y + OUTCOME_H / 2,
            color: getColor(connection.type),
            label: connection.label,
            type: connection.type,
          });
        });
      });
    });

    setLines((prev) => (linesMatch(prev, newLines) ? prev : newLines));
  };

  // Re-measure on every render to catch layout shifts.
  // linesMatch prevents infinite re-render loops.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    measureRef.current();
  });

  // Re-measure after fonts finish loading, on window resize,
  // and periodically during mount to catch late layout shifts.
  useEffect(() => {
    const bump = () => setTick((n) => n + 1);

    document.fonts.ready.then(bump);
    window.addEventListener("resize", bump);

    const t1 = setTimeout(bump, 100);
    const t2 = setTimeout(bump, 500);

    return () => {
      window.removeEventListener("resize", bump);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  return (
    <svg
      ref={svgRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 20, overflow: "visible" }}
    >
      <defs>
        {(["safe_path", "partial_failure", "critical_failure", "default"] as const).map((t) => (
          <marker
            key={t}
            id={`arrow-${t}`}
            markerWidth="8"
            markerHeight="6"
            refX="8"
            refY="3"
            orient="auto"
          >
            <path d="M0,0 L8,3 L0,6" fill={getColor(t)} />
          </marker>
        ))}
      </defs>

      {lines.map((line, i) => {
        const midX = (line.exitX + line.x2) / 2;
        const markerId = getMarkerId(line.type);
        const labelY = (line.dotY + line.y2) / 2;
        const labelWidth = Math.max(180, line.label.length * 5);

        return (
          <g key={i}>
            <circle
              cx={line.dotX}
              cy={line.dotY}
              r={8}
              fill="none"
              stroke={line.color}
              strokeWidth={1.5}
              opacity={0.4}
            />

            <line
              x1={line.dotX}
              y1={line.dotY}
              x2={line.exitX}
              y2={line.dotY}
              stroke={line.color}
              strokeWidth={2}
              strokeDasharray={isDashed(line.type) ? "6 4" : undefined}
            />

            <path
              d={`M${line.exitX},${line.dotY} C${midX},${line.dotY} ${midX},${line.y2} ${line.x2},${line.y2}`}
              fill="none"
              stroke={line.color}
              strokeWidth={2.5}
              strokeDasharray={isDashed(line.type) ? "6 4" : undefined}
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
