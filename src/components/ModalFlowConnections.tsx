import { useRef, useLayoutEffect, useEffect, useState, useMemo } from "react";
import { ScenarioStep, OutcomeNode, GlobalTimer } from "@/types/scenario";

function formatTimeoutMs(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (seconds === 0) return `${minutes} min`;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

interface ModalFlowConnectionsProps {
  steps: ScenarioStep[];
  outcomeNodes: OutcomeNode[];
  spotlightEdgeKeys?: Set<string>;
  globalTimers?: GlobalTimer[];
}

type ConnectionType = "safe_path" | "partial_failure" | "critical_failure" | "step" | "timeout" | "global-timer";

const getColor = (type: ConnectionType) => {
  switch (type) {
    case "safe_path": return "hsl(160, 60%, 45%)";
    case "partial_failure": return "hsl(40, 80%, 42%)";
    case "critical_failure": return "hsl(0, 72%, 55%)";
    case "timeout": return "hsl(38, 92%, 48%)";
    case "global-timer": return "hsl(265, 65%, 55%)";
    case "step": return "hsl(220, 70%, 55%)";
  }
};

const getDashArray = (type: ConnectionType) => {
  if (type === "partial_failure" || type === "critical_failure") return "6 4";
  if (type === "timeout") return "10 5";
  if (type === "global-timer") return "8 4 2 4";
  return undefined;
};

interface Line {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  color: string;
  type: ConnectionType;
  timeoutLabel?: string;
  interruptionType?: string;
  dpKey: string;
}

const linesMatch = (a: Line[], b: Line[]): boolean => {
  if (a.length !== b.length) return false;
  return a.every(
    (l, i) =>
      l.type === b[i].type &&
      l.color === b[i].color &&
      Math.abs(l.startX - b[i].startX) < 0.5 &&
      Math.abs(l.startY - b[i].startY) < 0.5 &&
      Math.abs(l.endX - b[i].endX) < 0.5 &&
      Math.abs(l.endY - b[i].endY) < 0.5,
  );
};

const ModalFlowConnections = ({ steps, outcomeNodes, spotlightEdgeKeys, globalTimers = [] }: ModalFlowConnectionsProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [, setTick] = useState(0);

  const connectionInfo = useMemo(() => {
    const map = new Map<string, {
      targetId: string;
      type: ConnectionType;
      timeoutLabel?: string;
      interruptionType?: string;
    }>();

    for (const step of steps) {
      for (let i = 0; i < (step.paths?.length || 0); i++) {
        const dp = step.paths![i];
        const dpKey = `${step.id}-${i}`;

        if (dp.connections && dp.connections.length > 0) {
          const conn = dp.connections[0];
          map.set(dpKey, {
            targetId: conn.targetNodeId,
            type: conn.type as ConnectionType,
          });
        } else if (dp.targetStepId) {
          const isTimeout = dp.timeoutMs !== undefined;
          map.set(dpKey, {
            targetId: dp.targetStepId,
            type: isTimeout ? "timeout" : "step",
            ...(isTimeout && dp.timeoutMs ? { timeoutLabel: formatTimeoutMs(dp.timeoutMs) } : {}),
            ...(dp.interruptionType ? { interruptionType: dp.interruptionType } : {}),
          });
        }
      }
    }

    for (const timer of globalTimers) {
      map.set(`${timer.id}-0`, {
        targetId: timer.targetStepId,
        type: "global-timer",
        timeoutLabel: formatTimeoutMs(timer.timeoutMs),
      });
    }

    return map;
  }, [steps, globalTimers]);

  const measureRef = useRef(() => {});
  measureRef.current = () => {
    const svgEl = svgRef.current;
    if (!svgEl) return;

    const svgRect = svgEl.getBoundingClientRect();
    if (svgRect.width === 0 || svgRect.height === 0) return;

    const scaleX = svgEl.clientWidth / svgRect.width;
    const scaleY = svgEl.clientHeight / svgRect.height;
    if (!isFinite(scaleX) || !isFinite(scaleY)) return;

    const parent = svgEl.parentElement;
    if (!parent) return;

    const newLines: Line[] = [];
    const dots = parent.querySelectorAll("[data-modal-dp]");

    dots.forEach((dot) => {
      const dpId = dot.getAttribute("data-modal-dp");
      if (!dpId) return;

      const info = connectionInfo.get(dpId);
      if (!info) return;

      const targetEl = parent.querySelector(
        `[data-modal-node="${info.targetId}"]`,
      );
      if (!targetEl) return;

      const dotRect = dot.getBoundingClientRect();
      const targetRect = targetEl.getBoundingClientRect();

      const startX =
        (dotRect.left + dotRect.width / 2 - svgRect.left) * scaleX;
      const startY =
        (dotRect.top + dotRect.height / 2 - svgRect.top) * scaleY;
      const endX = (targetRect.left - svgRect.left) * scaleX;
      const endY =
        (targetRect.top + targetRect.height / 2 - svgRect.top) * scaleY;

      newLines.push({
            startX,
            startY,
            endX,
            endY,
            color: getColor(info.type),
            type: info.type,
            timeoutLabel: info.timeoutLabel,
            interruptionType: info.interruptionType,
            dpKey: dpId,
          });
    });

    const targetGroups = new Map<string, number[]>();
    newLines.forEach((line, idx) => {
      const key = `${Math.round(line.endX)},${Math.round(line.endY)}`;
      if (!targetGroups.has(key)) targetGroups.set(key, []);
      targetGroups.get(key)!.push(idx);
    });

    targetGroups.forEach((indices) => {
      if (indices.length <= 1) return;
      indices.sort((a, b) => newLines[a].startY - newLines[b].startY);
      const n = indices.length;
      const SPREAD = 18;
      indices.forEach((idx, j) => {
        newLines[idx].endY += (j - (n - 1) / 2) * SPREAD;
      });
    });

    setLines((prev) => (linesMatch(prev, newLines) ? prev : newLines));
  };

  useLayoutEffect(() => {
    measureRef.current();
  });

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
      style={{ zIndex: 5, overflow: "visible" }}
    >
      <defs>
        {(
          [
            "safe_path",
            "partial_failure",
            "critical_failure",
            "step",
            "timeout",
            "global-timer",
          ] as ConnectionType[]
        ).map((t) => (
          <marker
            key={t}
            id={`modal-arrow-${t}`}
            markerWidth="8"
            markerHeight="6"
            refX="8"
            refY="3"
            orient="auto"
          >
            <path d="M0,0 L8,3 L0,6 Z" fill={getColor(t)} stroke="none" />
          </marker>
        ))}
      </defs>

      {lines.map((line, i) => {
        const dx = Math.max(40, Math.abs(line.endX - line.startX) * 0.35);
        const d = `M${line.startX},${line.startY} C${line.startX + dx},${line.startY} ${line.endX - dx},${line.endY} ${line.endX},${line.endY}`;

        // Midpoint of the cubic bezier at t=0.5
        const midX = (line.startX + 3 * (line.startX + dx) + 3 * (line.endX - dx) + line.endX) / 8;
        const midY = (line.startY + 3 * line.startY + 3 * line.endY + line.endY) / 8;

        const isGlobalTimer = line.type === "global-timer";
        const isSpotlit = isGlobalTimer || !spotlightEdgeKeys || spotlightEdgeKeys.has(line.dpKey);
        const lineOpacity = isSpotlit
          ? (line.type === "timeout" || isGlobalTimer) ? 0.7 : 0.8
          : 0.05;
        const lineWidth = isSpotlit && spotlightEdgeKeys && !isGlobalTimer
          ? line.type === "timeout" ? 2 : 2.5
          : (line.type === "timeout" || isGlobalTimer) ? 2 : 2;

        return (
          <g key={i} style={{ transition: "opacity 0.2s" }}>
            <path
              d={d}
              fill="none"
              stroke={line.color}
              strokeWidth={lineWidth}
              strokeDasharray={getDashArray(line.type)}
              markerEnd={`url(#modal-arrow-${line.type})`}
              opacity={lineOpacity}
            />
            {(line.type === "timeout" || isGlobalTimer) && line.timeoutLabel && isSpotlit && (() => {
              const isRadio = line.interruptionType === "radio";
              const pillText = isGlobalTimer
                ? `⏱ ${line.timeoutLabel}`
                : isRadio
                  ? `📻 ⏱ ${line.timeoutLabel}`
                  : `⏱ ${line.timeoutLabel}`;
              const pillW = isGlobalTimer ? 52 : isRadio ? 72 : 52;
              return (
                <g transform={`translate(${midX}, ${midY})`}>
                  <rect
                    x={-pillW / 2}
                    y={-9}
                    width={pillW}
                    height={18}
                    rx={9}
                    fill={isGlobalTimer ? "hsl(265, 60%, 97%)" : "hsl(38, 92%, 97%)"}
                    stroke={line.color}
                    strokeWidth={isGlobalTimer ? 1.5 : 1.2}
                  />
                  <text
                    x={0}
                    y={4}
                    textAnchor="middle"
                    style={{
                      fontFamily: "system-ui",
                      fontSize: "9px",
                      fontWeight: 700,
                      fill: isGlobalTimer ? "hsl(265, 55%, 38%)" : "hsl(38, 80%, 32%)",
                    }}
                  >
                    {pillText}
                  </text>
                </g>
              );
            })()}
          </g>
        );
      })}
    </svg>
  );
};

export default ModalFlowConnections;
