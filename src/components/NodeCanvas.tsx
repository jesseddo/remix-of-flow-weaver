import { useRef, useState, useCallback, useMemo, useEffect } from "react";
import { ScenarioData, OutcomeNode, ScenarioStep, GlobalTimer } from "@/types/scenario";
import { OutcomeCard, ModalStepCard, GlobalTimerCard } from "./NodeCard";
import ModalFlowConnections from "./ModalFlowConnections";
import type { ValidationWarning } from "@/utils/scenarioValidation";
import { stepEvaluationHasContent } from "@/data/evaluationCompetencies";

interface NodeCanvasProps {
  scenario: ScenarioData;
  selectedStepId?: string | null;
  onSelectStep?: (stepId: string | null) => void;
  validationWarnings?: ValidationWarning[];
  walkthroughMode?: boolean;
  walkthroughBottomInset?: number;
  onDeleteStep?: (stepId: string) => void;
  onDeleteOutcome?: (outcomeId: string) => void;
  onDeleteTimer?: () => void;
}

// ─────────────────────────────────────────────────────────
// DAG layout helpers for Modal Steps view
// ─────────────────────────────────────────────────────────

const MODAL_STEP_W = 280;
const MODAL_OUTCOME_W = 220;
const MODAL_OUTCOME_H = 280;
const MODAL_COL_GAP = 100;
const MODAL_ROW_GAP = 48;
const MODAL_LEFT = 60;
const GLOBAL_TIMER_W = 220;
const GLOBAL_TIMER_H = 80;
const GLOBAL_TIMER_GAP = 30;
/** Step inspector is an overlay — no horizontal gutter. */
const INSPECTOR_GUTTER_PX = 0;

/** Dynamic card-height estimate based on actual content counts. */
function estimateStepCardHeight(step: ScenarioStep): number {
  const taskCount = step.tasks?.length ?? 0;
  const pathCount = step.paths?.length ?? 0;
  return (
    44 +                                    // header
    52 +                                    // description (~3 lines)
    (taskCount > 0 ? 24 + taskCount * 38 : 0) +  // tasks section
    (pathCount > 0 ? 24 + pathCount * 32 : 0) +  // paths section
    (stepEvaluationHasContent(step.evaluation) ? 80 : 0) +
    16                                      // bottom padding
  );
}

function buildAdjacency(
  steps: ScenarioStep[],
  outcomeNodes: OutcomeNode[],
  globalTimer?: GlobalTimer,
) {
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
    for (const dp of step.paths ?? []) {
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

  // Timer-triggered steps have no predecessor in the normal path graph, so
  // they land in column 0 alongside the start step and visually overlap.
  // Give each such step an artificial edge from the first step so the
  // DAG layout pushes it into its own column.
  const firstStepId = steps[0]?.id;
  if (firstStepId && globalTimer) {
    const targetId = globalTimer.targetStepId;
    if (targetId !== firstStepId && (predecessorCount.get(targetId) ?? 0) === 0) {
      successors.get(firstStepId)?.add(targetId);
      predecessorCount.set(targetId, 1);
    }
  }

  return { successors, predecessorCount, outcomeIds };
}

function computeModalPositions(
  steps: ScenarioStep[],
  outcomeNodes: OutcomeNode[],
  globalTimer?: GlobalTimer,
): Map<string, { x: number; y: number }> {
  if (steps.length === 0) return new Map();

  const MODAL_TOP = globalTimer
    ? GLOBAL_TIMER_H + GLOBAL_TIMER_GAP + 80
    : 80;

  const { successors, predecessorCount, outcomeIds } = buildAdjacency(steps, outcomeNodes, globalTimer);

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

  // Spread steps into unique columns while preserving DAG-derived order.
  // Steps the DAG placed in the same "generation" get consecutive x-slots so
  // that no two step cards ever share a horizontal position.
  const stepsInDagOrder = [...steps].sort(
    (a, b) => (column.get(a.id) ?? 0) - (column.get(b.id) ?? 0),
  );
  let nextStepCol = 0;
  let prevDagCol = -1;
  for (const step of stepsInDagOrder) {
    const dagCol = column.get(step.id) ?? 0;
    if (dagCol > prevDagCol) {
      // Advancing to a new DAG generation: jump to at least that column index
      nextStepCol = Math.max(nextStepCol, dagCol);
      prevDagCol = dagCol;
    }
    column.set(step.id, nextStepCol);
    nextStepCol++;
  }
  // All outcomes share the column right after the last step column
  const maxStepCol = Math.max(0, ...steps.map((s) => column.get(s.id) ?? 0));
  for (const o of outcomeNodes) {
    column.set(o.id, maxStepCol + 1);
  }

  const byColumn = new Map<number, string[]>();
  for (const [id, col] of column) {
    if (!byColumn.has(col)) byColumn.set(col, []);
    byColumn.get(col)!.push(id);
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

  // Compute per-node card heights (dynamic, based on content counts)
  const nodeHeights = new Map<string, number>();
  const stepById = new Map(steps.map((s) => [s.id, s]));
  for (const [id] of column) {
    const step = stepById.get(id);
    nodeHeights.set(id, step ? estimateStepCardHeight(step) : MODAL_OUTCOME_H);
  }

  // Compute total height per column so columns can be vertically centred
  const colTotalHeights = new Map<number, number>();
  for (const [col, ids] of byColumn) {
    let h = 0;
    for (const id of ids) h += nodeHeights.get(id) ?? MODAL_OUTCOME_H;
    h += Math.max(0, ids.length - 1) * MODAL_ROW_GAP;
    colTotalHeights.set(col, h);
  }
  const tallestColH = Math.max(0, ...colTotalHeights.values());

  const positions = new Map<string, { x: number; y: number }>();

  for (const [col, ids] of byColumn) {
    const x = colX.get(col) ?? MODAL_LEFT;
    const totalH = colTotalHeights.get(col) ?? 0;
    const startY = MODAL_TOP + (tallestColH - totalH) / 2;
    let cardY = startY;
    for (const id of ids) {
      positions.set(id, { x, y: cardY });
      cardY += (nodeHeights.get(id) ?? MODAL_OUTCOME_H) + MODAL_ROW_GAP;
    }
  }

  if (globalTimer) {
    const timerY = 80;
    const targetPos = positions.get(globalTimer.targetStepId);
    const timerX = targetPos
      ? targetPos.x + MODAL_STEP_W / 2 - GLOBAL_TIMER_W / 2
      : MODAL_LEFT;
    positions.set(globalTimer.id, { x: timerX, y: timerY });
  }

  return positions;
}

// ─────────────────────────────────────────────────────────
// Forward BFS: from a selected step, find all edges + steps
// on every forward path to any outcome.
// ─────────────────────────────────────────────────────────

function computeForwardPaths(
  stepId: string,
  steps: ScenarioStep[],
): { reachableStepIds: Set<string>; reachableEdgeKeys: Set<string> } {
  const stepMap = new Map(steps.map((s) => [s.id, s]));
  const reachableStepIds = new Set<string>();
  const reachableEdgeKeys = new Set<string>();

  // BFS queue contains { id, pathIndex } pairs representing edges to visit
  const queue: Array<{ stepId: string; pathIndex: number; edgeKey: string }> = [];

  // Seed with all outgoing edges from the selected step
  const startStep = stepMap.get(stepId);
  if (!startStep) return { reachableStepIds, reachableEdgeKeys };

  reachableStepIds.add(stepId);
  for (let i = 0; i < (startStep.paths?.length ?? 0); i++) {
    queue.push({ stepId, pathIndex: i, edgeKey: `${stepId}-${i}` });
  }

  const visitedEdges = new Set<string>();

  while (queue.length > 0) {
    const item = queue.shift()!;
    if (visitedEdges.has(item.edgeKey)) continue;
    visitedEdges.add(item.edgeKey);

    const step = stepMap.get(item.stepId);
    if (!step) continue;

    const path = step.paths?.[item.pathIndex];
    if (!path) continue;

    reachableEdgeKeys.add(item.edgeKey);

    // If path leads to an outcome node — stop traversal for this branch
    if (path.connections && path.connections.length > 0) continue;

    // If path leads to another step — continue BFS from that step
    if (path.targetStepId) {
      const nextStep = stepMap.get(path.targetStepId);
      if (nextStep && !reachableStepIds.has(path.targetStepId)) {
        reachableStepIds.add(path.targetStepId);
        for (let i = 0; i < (nextStep.paths?.length ?? 0); i++) {
          const nextEdgeKey = `${path.targetStepId}-${i}`;
          if (!visitedEdges.has(nextEdgeKey)) {
            queue.push({ stepId: path.targetStepId, pathIndex: i, edgeKey: nextEdgeKey });
          }
        }
      }
    }
  }

  return { reachableStepIds, reachableEdgeKeys };
}

// ─────────────────────────────────────────────────────────
// Spotlight: backward BFS to find all steps + edges on any
// path to the selected outcome.
// ─────────────────────────────────────────────────────────

function computePathsToOutcome(
  outcomeId: string,
  steps: ScenarioStep[],
): { reachableStepIds: Set<string>; reachableEdgeKeys: Set<string> } {
  const reachableStepIds = new Set<string>();
  const reachableEdgeKeys = new Set<string>();

  for (const step of steps) {
    for (let i = 0; i < (step.paths?.length ?? 0); i++) {
      const dp = step.paths![i];
      if (dp.connections?.some((c) => c.targetNodeId === outcomeId)) {
        reachableStepIds.add(step.id);
        reachableEdgeKeys.add(`${step.id}-${i}`);
      }
    }
  }

  let changed = true;
  while (changed) {
    changed = false;
    for (const step of steps) {
      for (let i = 0; i < (step.paths?.length ?? 0); i++) {
        const dp = step.paths![i];
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

function directOutgoingEdgeKeys(stepId: string, steps: ScenarioStep[]): Set<string> {
  const keys = new Set<string>();
  const step = steps.find((s) => s.id === stepId);
  if (!step) return keys;
  for (let i = 0; i < (step.paths?.length ?? 0); i++) {
    keys.add(`${stepId}-${i}`);
  }
  return keys;
}

const NodeCanvas = ({
  scenario,
  selectedStepId,
  onSelectStep,
  validationWarnings,
  walkthroughMode = false,
  walkthroughBottomInset = 0,
  onDeleteStep,
  onDeleteOutcome,
  onDeleteTimer,
}: NodeCanvasProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(0.75);

  // Position map for modal layout
  const computedModalPositions = useMemo(
    () => computeModalPositions(
      scenario.scenarioNode.steps ?? [],
      scenario.outcomeNodes,
      scenario.globalTimer,
    ),
    // Recompute when the set of steps/outcomes changes (node added/removed)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      scenario.scenarioNode.steps?.length,
      scenario.outcomeNodes.length,
      scenario.scenarioNode.id,
      scenario.globalTimer?.id,
    ],
  );
  const [modalPositions, setModalPositions] = useState<Map<string, { x: number; y: number }>>(
    computedModalPositions,
  );
  // Keep positions in sync whenever the computed layout changes (e.g. steps added/removed)
  useEffect(() => {
    setModalPositions(computedModalPositions);
  }, [computedModalPositions]);

  // Spotlight state (modal mode only)
  const [spotlightOutcomeId, setSpotlightOutcomeId] = useState<string | null>(null);

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Drag guard: track where each drag started in client coords
  const dragStartClientRef = useRef({ x: 0, y: 0 });
  const isDragRef = useRef(false);

  // Refs for current pan/zoom — used in effects without adding as deps
  const panRef = useRef(pan);
  const zoomRef = useRef(zoom);
  useEffect(() => { panRef.current = pan; });
  useEffect(() => { zoomRef.current = zoom; });

  const steps = scenario.scenarioNode.steps ?? [];

  const modalOutcomeIds = useMemo(
    () => new Set(scenario.outcomeNodes.map((o) => o.id)),
    [scenario.outcomeNodes],
  );

  const spotlightData = useMemo(() => {
    if (!spotlightOutcomeId) return null;
    return {
      outcomeId: spotlightOutcomeId,
      ...computePathsToOutcome(spotlightOutcomeId, steps),
    };
  }, [spotlightOutcomeId, steps]);

  // Forward-path highlight: edges/steps reachable FROM the selected step (edit mode)
  const forwardPathData = useMemo(() => {
    if (!selectedStepId || walkthroughMode) return null;
    return computeForwardPaths(selectedStepId, steps);
  }, [selectedStepId, steps, walkthroughMode]);

  /** Walkthrough: only edges leaving the current step (causal clarity). */
  const walkthroughEdgeKeys = useMemo(() => {
    if (!walkthroughMode || !selectedStepId) return null;
    return directOutgoingEdgeKeys(selectedStepId, steps);
  }, [walkthroughMode, selectedStepId, steps]);

  const modalSpotlightEdgeKeys =
    spotlightData?.reachableEdgeKeys ?? walkthroughEdgeKeys ?? forwardPathData?.reachableEdgeKeys;

  // Warning node IDs for badge display on step cards
  const warningNodeIds = useMemo(() => {
    if (!validationWarnings) return undefined;
    return new Set(validationWarnings.map((w) => w.nodeId));
  }, [validationWarnings]);

  // ─── Clear local ring when panel is closed externally ───
  useEffect(() => {
    if (selectedStepId === null) {
      setSelectedNodeId(null);
    }
  }, [selectedStepId]);

  // ─── Auto-pan: walkthrough centers node above dock; edit mode keeps node in view ───
  useEffect(() => {
    if (!selectedStepId) return;
    const pos = modalPositions.get(selectedStepId);
    if (!pos || !containerRef.current) return;

    const step = steps.find((s) => s.id === selectedStepId);
    const cardH = step ? estimateStepCardHeight(step) : MODAL_OUTCOME_H;
    const rect = containerRef.current.getBoundingClientRect();
    const z = zoomRef.current;
    const currentPan = panRef.current;

    if (walkthroughMode && walkthroughBottomInset > 0) {
      const visibleW = rect.width;
      const visibleH = Math.max(160, rect.height - walkthroughBottomInset);
      const cx = pos.x + MODAL_STEP_W / 2;
      const cy = pos.y + cardH / 2;
      setPan({ x: visibleW / 2 - cx * z, y: visibleH / 2 - cy * z });
      return;
    }

    const nodeScreenRight = pos.x * z + currentPan.x + MODAL_STEP_W * z;
    const availableWidth = rect.width - INSPECTOR_GUTTER_PX - 20;
    if (nodeScreenRight > availableWidth) {
      const shift = nodeScreenRight - availableWidth;
      setPan({ ...currentPan, x: currentPan.x - shift });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStepId, walkthroughMode, walkthroughBottomInset, modalPositions, steps]);

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
        const dx = e.clientX - dragStartClientRef.current.x;
        const dy = e.clientY - dragStartClientRef.current.y;
        if (Math.hypot(dx, dy) > 5) isDragRef.current = true;

        const newX = (e.clientX - pan.x) / zoom - dragOffset.x;
        const newY = (e.clientY - pan.y) / zoom - dragOffset.y;

        setModalPositions((prev) => {
          const next = new Map(prev);
          next.set(draggingNodeId, { x: newX, y: newY });
          return next;
        });
        return;
      }
      if (!isPanning) return;
      setPan({ x: e.clientX - startPos.x, y: e.clientY - startPos.y });
    },
    [isPanning, startPos, draggingNodeId, dragOffset, pan, zoom],
  );

  // ─── Mouse up: drag guard → select step if it was a click ───
  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      setIsPanning(false);
      if (draggingNodeId) {
        if (!isDragRef.current) {
          // Was a click, not a drag
          setSelectedNodeId((prev) => (prev === draggingNodeId ? null : draggingNodeId));

          const isStep = steps.some((s) => s.id === draggingNodeId);
          if (isStep && onSelectStep) {
            onSelectStep(draggingNodeId === selectedStepId ? null : draggingNodeId);
          }

          if (modalOutcomeIds.has(draggingNodeId)) {
            setSpotlightOutcomeId((prev) =>
              prev === draggingNodeId ? null : draggingNodeId
            );
          }
        }
      }
      setDraggingNodeId(null);
      isDragRef.current = false;
    },
    [draggingNodeId, steps, selectedStepId, onSelectStep, modalOutcomeIds],
  );

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((z) => Math.min(2, Math.max(0.3, z - e.deltaY * 0.001)));
  }, []);

  // ─── Node drag start ───
  const handleModalNodeMouseDown = useCallback(
    (nodeId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      dragStartClientRef.current = { x: e.clientX, y: e.clientY };
      isDragRef.current = false;
      const pos = modalPositions.get(nodeId) ?? { x: 0, y: 0 };
      const canvasX = (e.clientX - pan.x) / zoom;
      const canvasY = (e.clientY - pan.y) / zoom;
      setDragOffset({ x: canvasX - pos.x, y: canvasY - pos.y });
      setDraggingNodeId(nodeId);
    },
    [pan, zoom, modalPositions],
  );

  const handleCanvasClick = useCallback(() => {
    setSelectedNodeId(null);
    setSpotlightOutcomeId(null);
    onSelectStep?.(null);
  }, [onSelectStep]);

  // ─── Canvas size ───
  const canvasSize = useMemo(() => {
    const stepById = new Map(steps.map((s) => [s.id, s]));
    let maxX = 0;
    let maxY = 0;
    for (const [id, pos] of modalPositions) {
      const step = stepById.get(id);
      const cardH = step ? estimateStepCardHeight(step) : MODAL_OUTCOME_H;
      maxX = Math.max(maxX, pos.x + MODAL_STEP_W);
      maxY = Math.max(maxY, pos.y + cardH);
    }
    return { width: maxX + 200, height: maxY + 200 };
  }, [modalPositions, steps]);

  const globalTimer = scenario.globalTimer;

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
      className="w-full h-full overflow-hidden bg-background select-none"
      style={{ cursor: draggingNodeId ? "grabbing" : isPanning ? "grabbing" : "grab" }}
      onMouseDown={handleCanvasMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => {
        setIsPanning(false);
        setDraggingNodeId(null);
        isDragRef.current = false;
      }}
      onWheel={handleWheel}
      onClick={handleCanvasClick}
    >
      {/* Spotlight pill bar */}
      {scenario.outcomeNodes.length > 0 && (
        <div className="absolute top-3 left-4 right-4 z-10 flex items-center gap-2 pointer-events-none">
          <span className="text-[10px] text-muted-foreground font-medium pointer-events-auto">Spotlight path to:</span>
          <div className="flex items-center gap-1.5 pointer-events-auto">
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
                    background: isActive ? color : "hsl(var(--background) / 0.8)",
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
              className="text-[10px] text-muted-foreground hover:text-foreground transition-colors ml-1 px-1.5 py-0.5 rounded hover:bg-secondary pointer-events-auto"
            >
              ✕ clear
            </button>
          )}
        </div>
      )}

      <div
        className="relative"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: "0 0",
          width: canvasSize.width,
          height: canvasSize.height,
        }}
      >
        <ModalFlowConnections
          steps={steps}
          outcomeNodes={modalOutcomeNodes}
          spotlightEdgeKeys={modalSpotlightEdgeKeys}
          globalTimer={globalTimer}
        />

        {steps.map((step, idx) => {
          const pos = modalPositions.get(step.id) ?? { x: 0, y: 0 };
          const isStepSelected = selectedStepId === step.id || selectedNodeId === step.id;

          const stepSpotlight = spotlightData
            ? {
                dimmed: !spotlightData.reachableStepIds.has(step.id),
                fadedDpIndices: new Set(
                  (step.paths ?? [])
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
              isSelected={isStepSelected}
              onMouseDown={(e) => handleModalNodeMouseDown(step.id, e)}
              spotlight={stepSpotlight}
              hasWarning={warningNodeIds?.has(step.id)}
              walkthroughActive={walkthroughMode && selectedStepId === step.id}
              onDelete={onDeleteStep}
              resources={scenario.resources}
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
              onClick={(e) => e.stopPropagation()}
              spotlightState={spotlightState}
              onDelete={onDeleteOutcome}
            />
          );
        })}

        {globalTimer && (() => {
          const pos = modalPositions.get(globalTimer.id) ?? { x: 0, y: 0 };
          return (
            <GlobalTimerCard
              key={globalTimer.id}
              timer={globalTimer}
              position={pos}
              isSelected={selectedNodeId === globalTimer.id}
              onMouseDown={(e) => handleModalNodeMouseDown(globalTimer.id, e)}
              onClick={(e) => e.stopPropagation()}
              onDelete={onDeleteTimer}
            />
          );
        })()}
      </div>
    </div>
  );
};

export default NodeCanvas;
