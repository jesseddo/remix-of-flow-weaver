import { useRef, useState, useCallback, useMemo } from "react";
import { ScenarioData, ScenarioNode, OutcomeNode, ScenarioStep, GlobalTimer } from "@/types/scenario";
import { ScenarioCard, OutcomeCard, ModalStepCard, GlobalTimerCard } from "./NodeCard";
import FlowConnections from "./FlowConnections";
import ModalFlowConnections from "./ModalFlowConnections";
import type { DisplayMode } from "@/pages/Index";

interface NodeCanvasProps {
  scenario: ScenarioData;
  displayMode: DisplayMode;
}

type DraggableNode = ScenarioNode | OutcomeNode;

// ─────────────────────────────────────────────────────────
// DAG layout helpers for Modal Steps view
// ─────────────────────────────────────────────────────────

const MODAL_STEP_W = 280;
const MODAL_STEP_H_EST = 190;
const MODAL_OUTCOME_W = 220;
const MODAL_OUTCOME_H = 280;
const MODAL_COL_GAP = 100;
const MODAL_ROW_GAP = 36;
const MODAL_LEFT = 60;
const GLOBAL_TIMER_W = 220;
const GLOBAL_TIMER_H = 80;
const GLOBAL_TIMER_GAP = 30;

function buildAdjacency(steps: ScenarioStep[], outcomeNodes: OutcomeNode[]) {
  const outcomeIds = new Set(outcomeNodes.map((o) => o.id));
  const successors = new Map<string, Set<string>>();
  const predecessorCount = new Map<string, number>();

  const allIds = [
    ...steps.map((s) => s.id),
    ...outcomeNodes.map((o) => o.id),
  ];
  for (const id of allIds) {
    successors.set(id, new Set());
    predecessorCount.set(id, 0);
  }

  for (const step of steps) {
    for (const dp of step.decisionPoints ?? []) {
      let targetId: string | undefined;
      if (dp.connections && dp.connections.length > 0) {
        targetId = dp.connections[0].targetNodeId;
      } else if (dp.targetStepId) {
        targetId = dp.targetStepId;
      }
      if (targetId && !successors.get(step.id)!.has(targetId)) {
        successors.get(step.id)!.add(targetId);
        predecessorCount.set(targetId, (predecessorCount.get(targetId) ?? 0) + 1);
      }
    }
  }

  return { successors, predecessorCount, outcomeIds };
}

function computeModalPositions(
  steps: ScenarioStep[],
  outcomeNodes: OutcomeNode[],
  globalTimers: GlobalTimer[] = [],
): Map<string, { x: number; y: number }> {
  if (steps.length === 0) return new Map();

  // If there are global timers, push the main flow down to make room above
  const MODAL_TOP = globalTimers.length > 0
    ? GLOBAL_TIMER_H + GLOBAL_TIMER_GAP + 80
    : 80;

  const { successors, predecessorCount, outcomeIds } = buildAdjacency(steps, outcomeNodes);

  const column = new Map<string, number>();
  const inDegree = new Map(predecessorCount);
  const queue: string[] = [];

  for (const [id, deg] of inDegree) {
    if (deg === 0) {
      queue.push(id);
      column.set(id, 0);
    }
  }

  while (queue.length > 0) {
    const cur = queue.shift()!;
    const curCol = column.get(cur) ?? 0;
    for (const next of successors.get(cur) ?? []) {
      const newCol = curCol + 1;
      if (newCol > (column.get(next) ?? 0)) {
        column.set(next, newCol);
      }
      inDegree.set(next, (inDegree.get(next) ?? 1) - 1);
      if (inDegree.get(next) === 0) {
        queue.push(next);
      }
    }
  }

  const maxStepCol = Math.max(0, ...steps.map((s) => column.get(s.id) ?? 0));
  const outcomeCol = maxStepCol + 1;
  for (const o of outcomeNodes) {
    column.set(o.id, outcomeCol);
  }

  const byColumn = new Map<number, string[]>();
  for (const [id, col] of column) {
    if (!byColumn.has(col)) byColumn.set(col, []);
    byColumn.get(col)!.push(id);
  }

  let maxRows = 0;
  for (const ids of byColumn.values()) {
    maxRows = Math.max(maxRows, ids.length);
  }

  const colX = new Map<number, number>();
  let curX = MODAL_LEFT;
  const maxCol = Math.max(...column.values());
  for (let c = 0; c <= maxCol; c++) {
    colX.set(c, curX);
    const ids = byColumn.get(c) ?? [];
    const isOutcomeCol = ids.length > 0 && ids.every((id) => outcomeIds.has(id));
    curX += (isOutcomeCol ? MODAL_OUTCOME_W : MODAL_STEP_W) + MODAL_COL_GAP;
  }

  const positions = new Map<string, { x: number; y: number }>();

  for (const [col, ids] of byColumn) {
    const x = colX.get(col) ?? MODAL_LEFT;
    const isOutcomeCol = ids.every((id) => outcomeIds.has(id));
    const cardH = isOutcomeCol ? MODAL_OUTCOME_H : MODAL_STEP_H_EST;
    const totalH = ids.length * cardH + (ids.length - 1) * MODAL_ROW_GAP;
    const tallestH = maxRows * cardH + (maxRows - 1) * MODAL_ROW_GAP;
    const startY = MODAL_TOP + (tallestH - totalH) / 2;

    ids.forEach((id, rowIdx) => {
      const y = startY + rowIdx * (cardH + MODAL_ROW_GAP);
      positions.set(id, { x, y });
    });
  }

  // Position global timers above the target step's column, centered horizontally on it
  const timerY = 80; // fixed top row, regardless of MODAL_TOP offset
  for (let i = 0; i < globalTimers.length; i++) {
    const timer = globalTimers[i];
    const targetPos = positions.get(timer.targetStepId);
    const timerX = targetPos
      ? targetPos.x + MODAL_STEP_W / 2 - GLOBAL_TIMER_W / 2
      : MODAL_LEFT + i * (GLOBAL_TIMER_W + 20);
    positions.set(timer.id, { x: timerX, y: timerY });
  }

  return positions;
}

// ─────────────────────────────────────────────────────────
// Spotlight: backward BFS to find all steps + edges on any
// path to the selected outcome.
// edgeKeys format: "${stepId}-${dpIndex}"
// ─────────────────────────────────────────────────────────

function computePathsToOutcome(
  outcomeId: string,
  steps: ScenarioStep[],
): { reachableStepIds: Set<string>; reachableEdgeKeys: Set<string> } {
  const reachableStepIds = new Set<string>();
  const reachableEdgeKeys = new Set<string>();

  // Pass 1: direct outcome connections
  for (const step of steps) {
    for (let i = 0; i < (step.decisionPoints?.length ?? 0); i++) {
      const dp = step.decisionPoints![i];
      if (dp.connections?.some((c) => c.targetNodeId === outcomeId)) {
        reachableStepIds.add(step.id);
        reachableEdgeKeys.add(`${step.id}-${i}`);
      }
    }
  }

  // Pass 2: BFS backwards through step-to-step edges
  let changed = true;
  while (changed) {
    changed = false;
    for (const step of steps) {
      for (let i = 0; i < (step.decisionPoints?.length ?? 0); i++) {
        const dp = step.decisionPoints![i];
        if (dp.targetStepId && reachableStepIds.has(dp.targetStepId)) {
          const key = `${step.id}-${i}`;
          if (!reachableEdgeKeys.has(key)) {
            reachableEdgeKeys.add(key);
            if (!reachableStepIds.has(step.id)) {
              reachableStepIds.add(step.id);
              changed = true;
            }
          }
        }
      }
    }
  }

  return { reachableStepIds, reachableEdgeKeys };
}

const outcomeColor: Record<string, string> = {
  safe_path: "hsl(160, 60%, 45%)",
  partial_failure: "hsl(40, 80%, 42%)",
  critical_failure: "hsl(0, 72%, 55%)",
};

// ─────────────────────────────────────────────────────────

const NodeCanvas = ({ scenario, displayMode }: NodeCanvasProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(0.75);

  // Standard mode state
  const [scenarioNode, setScenarioNode] = useState<ScenarioNode>(scenario.scenarioNode);
  const [outcomeNodes, setOutcomeNodes] = useState<OutcomeNode[]>(scenario.outcomeNodes);

  // Modal mode: position map
  const initialModalPositions = useMemo(
    () => computeModalPositions(
      scenario.scenarioNode.steps ?? [],
      scenario.outcomeNodes,
      scenario.globalTimers,
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const [modalPositions, setModalPositions] = useState<Map<string, { x: number; y: number }>>(
    initialModalPositions,
  );

  // Spotlight state (modal mode only)
  const [spotlightOutcomeId, setSpotlightOutcomeId] = useState<string | null>(null);

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const steps = scenario.scenarioNode.steps ?? [];

  const modalOutcomeIds = useMemo(
    () => new Set(scenario.outcomeNodes.map((o) => o.id)),
    [scenario.outcomeNodes],
  );

  // Compute spotlight path data
  const spotlightData = useMemo(() => {
    if (!spotlightOutcomeId) return null;
    return {
      outcomeId: spotlightOutcomeId,
      ...computePathsToOutcome(spotlightOutcomeId, steps),
    };
  }, [spotlightOutcomeId, steps]);

  // ─── Pan ───
  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      setIsPanning(true);
      setStartPos({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    },
    [pan],
  );

  // ─── Drag & pan move ───
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (draggingNodeId) {
        const newX = (e.clientX - pan.x) / zoom - dragOffset.x;
        const newY = (e.clientY - pan.y) / zoom - dragOffset.y;

        if (displayMode === "modal") {
          setModalPositions((prev) => {
            const next = new Map(prev);
            next.set(draggingNodeId, { x: newX, y: newY });
            return next;
          });
        } else if (draggingNodeId === scenarioNode.id) {
          setScenarioNode((prev) => ({ ...prev, position: { x: newX, y: newY } }));
        } else {
          setOutcomeNodes((prev) =>
            prev.map((n) =>
              n.id === draggingNodeId ? { ...n, position: { x: newX, y: newY } } : n,
            ),
          );
        }
        return;
      }
      if (!isPanning) return;
      setPan({ x: e.clientX - startPos.x, y: e.clientY - startPos.y });
    },
    [isPanning, startPos, draggingNodeId, dragOffset, pan, zoom, scenarioNode.id, displayMode],
  );

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
    setDraggingNodeId(null);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((z) => Math.min(2, Math.max(0.3, z - e.deltaY * 0.001)));
  }, []);

  // ─── Node drag start (standard mode) ───
  const handleNodeMouseDown = useCallback(
    (node: DraggableNode, e: React.MouseEvent) => {
      e.stopPropagation();
      const canvasX = (e.clientX - pan.x) / zoom;
      const canvasY = (e.clientY - pan.y) / zoom;
      setDragOffset({ x: canvasX - node.position.x, y: canvasY - node.position.y });
      setDraggingNodeId(node.id);
      setSelectedNodeId(node.id);
    },
    [pan, zoom],
  );

  // ─── Node drag start (modal mode) ───
  const handleModalNodeMouseDown = useCallback(
    (nodeId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const pos = modalPositions.get(nodeId) ?? { x: 0, y: 0 };
      const canvasX = (e.clientX - pan.x) / zoom;
      const canvasY = (e.clientY - pan.y) / zoom;
      setDragOffset({ x: canvasX - pos.x, y: canvasY - pos.y });
      setDraggingNodeId(nodeId);
      setSelectedNodeId(nodeId);
    },
    [pan, zoom, modalPositions],
  );

  const handleNodeClick = useCallback((nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedNodeId((prev) => (prev === nodeId ? null : nodeId));
    // In modal mode, clicking an outcome card toggles the spotlight
    if (displayMode === "modal" && modalOutcomeIds.has(nodeId)) {
      setSpotlightOutcomeId((prev) => (prev === nodeId ? null : nodeId));
    }
  }, [displayMode, modalOutcomeIds]);

  const handleCanvasClick = useCallback(() => {
    setSelectedNodeId(null);
    setSpotlightOutcomeId(null);
  }, []);

  // ─── Canvas size ───
  const SCENARIO_CARD_W = 500;
  const OUTCOME_CARD_H = 260;
  const STEP_HEIGHT_ESTIMATE = 220;

  const canvasSize = useMemo(() => {
    if (displayMode === "modal") {
      let maxX = 0;
      let maxY = 0;
      for (const pos of modalPositions.values()) {
        maxX = Math.max(maxX, pos.x + MODAL_STEP_W);
        maxY = Math.max(maxY, pos.y + MODAL_OUTCOME_H);
      }
      return { width: maxX + 200, height: maxY + 200 };
    }
    const scenarioCardHeight =
      120 + (scenarioNode.steps?.length ?? 0) * STEP_HEIGHT_ESTIMATE;
    const maxY = Math.max(
      scenarioNode.position.y + scenarioCardHeight,
      ...outcomeNodes.map((n) => n.position.y + OUTCOME_CARD_H),
    );
    const maxX = Math.max(
      scenarioNode.position.x + SCENARIO_CARD_W,
      ...outcomeNodes.map((n) => n.position.x + 220),
    );
    return { width: maxX + 200, height: maxY + 200 };
  }, [displayMode, modalPositions, scenarioNode, outcomeNodes]);

  const globalTimers = scenario.globalTimers ?? [];
  const totalNodes = steps.length + outcomeNodes.length + globalTimers.length;

  // ─── Modal outcome nodes with positions from modalPositions ───
  const modalOutcomeNodes = useMemo(
    () =>
      scenario.outcomeNodes.map((o) => ({
        ...o,
        position: modalPositions.get(o.id) ?? o.position,
      })),
    [scenario.outcomeNodes, modalPositions],
  );

  return (
    <div
      ref={containerRef}
      className="w-full h-screen overflow-hidden bg-background select-none"
      style={{ cursor: draggingNodeId ? "grabbing" : isPanning ? "grabbing" : "grab" }}
      onMouseDown={handleCanvasMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      onClick={handleCanvasClick}
    >
      <div className="absolute top-0 left-0 right-0 z-10 px-6 py-3 bg-background/80 backdrop-blur-sm border-b border-border">
        <h1 className="text-lg font-bold text-foreground">{scenario.title}</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          {displayMode === "modal"
            ? `${totalNodes} nodes · ${steps.length} steps · ${scenario.outcomeNodes.length} outcomes · Scroll to zoom · Drag to pan/move`
            : `${1 + outcomeNodes.length} nodes · ${scenarioNode.steps?.length || 0} steps · Scroll to zoom · Drag canvas to pan · Drag nodes to move`}
        </p>

        {/* Spotlight pill bar — modal mode only */}
        {displayMode === "modal" && scenario.outcomeNodes.length > 0 && (
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[10px] text-muted-foreground font-medium">Spotlight path to:</span>
            <div className="flex items-center gap-1.5">
              {scenario.outcomeNodes.map((o) => {
                const isActive = spotlightOutcomeId === o.id;
                const color = outcomeColor[o.outcome] ?? "hsl(220, 15%, 55%)";
                return (
                  <button
                    key={o.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSpotlightOutcomeId((prev) => (prev === o.id ? null : o.id));
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all duration-150"
                    style={{
                      background: isActive ? color : "transparent",
                      color: isActive ? "white" : color,
                      border: `1.5px solid ${color}`,
                      opacity: spotlightOutcomeId && !isActive ? 0.35 : 1,
                      boxShadow: isActive ? `0 0 8px ${color}60` : "none",
                    }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ background: isActive ? "white" : color }}
                    />
                    {o.title}
                  </button>
                );
              })}
            </div>
            {spotlightOutcomeId && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSpotlightOutcomeId(null);
                }}
                className="text-[10px] text-muted-foreground hover:text-foreground transition-colors ml-1 px-1.5 py-0.5 rounded hover:bg-secondary"
              >
                ✕ clear
              </button>
            )}
          </div>
        )}
      </div>

      <div
        className="relative"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: "0 0",
          width: canvasSize.width,
          height: canvasSize.height,
        }}
      >
        {displayMode === "modal" ? (
          <>
            <ModalFlowConnections
              steps={steps}
              outcomeNodes={modalOutcomeNodes}
              spotlightEdgeKeys={spotlightData?.reachableEdgeKeys}
              globalTimers={globalTimers}
            />

            {steps.map((step, idx) => {
              const pos = modalPositions.get(step.id) ?? { x: 0, y: 0 };

              // Compute spotlight state for this step
              const stepSpotlight = spotlightData
                ? {
                    dimmed: !spotlightData.reachableStepIds.has(step.id),
                    fadedDpIndices: new Set(
                      (step.decisionPoints ?? [])
                        .map((_, i) => i)
                        .filter(
                          (i) =>
                            !spotlightData.reachableEdgeKeys.has(`${step.id}-${i}`),
                        ),
                    ),
                  }
                : undefined;

              return (
                <ModalStepCard
                  key={step.id}
                  step={step}
                  stepIndex={idx}
                  position={pos}
                  isSelected={selectedNodeId === step.id}
                  onMouseDown={(e) => handleModalNodeMouseDown(step.id, e)}
                  onClick={(e) => handleNodeClick(step.id, e)}
                  spotlight={stepSpotlight}
                />
              );
            })}

            {modalOutcomeNodes.map((node) => {
              const spotlightState = spotlightData
                ? node.id === spotlightData.outcomeId
                  ? "target"
                  : "dimmed"
                : "none";

              return (
                <OutcomeCard
                  key={node.id}
                  node={node}
                  isSelected={selectedNodeId === node.id}
                  onMouseDown={(e) => handleModalNodeMouseDown(node.id, e)}
                  onClick={(e) => handleNodeClick(node.id, e)}
                  spotlightState={spotlightState}
                />
              );
            })}

            {globalTimers.map((timer) => {
              const pos = modalPositions.get(timer.id) ?? { x: 0, y: 0 };
              return (
                <GlobalTimerCard
                  key={timer.id}
                  timer={timer}
                  position={pos}
                  isSelected={selectedNodeId === timer.id}
                  onMouseDown={(e) => handleModalNodeMouseDown(timer.id, e)}
                  onClick={(e) => handleNodeClick(timer.id, e)}
                />
              );
            })}
          </>
        ) : (
          <>
            <FlowConnections scenarioNode={scenarioNode} outcomeNodes={outcomeNodes} />

            <ScenarioCard
              node={scenarioNode}
              isSelected={selectedNodeId === scenarioNode.id}
              onMouseDown={(e) => handleNodeMouseDown(scenarioNode, e)}
              onClick={(e) => handleNodeClick(scenarioNode.id, e)}
              displayMode={displayMode}
            />

            {outcomeNodes.map((node) => (
              <OutcomeCard
                key={node.id}
                node={node}
                isSelected={selectedNodeId === node.id}
                onMouseDown={(e) => handleNodeMouseDown(node, e)}
                onClick={(e) => handleNodeClick(node.id, e)}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
};

export default NodeCanvas;
