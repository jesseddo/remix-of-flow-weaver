import { useRef, useState, useCallback } from "react";
import { ScenarioData, ScenarioNode, OutcomeNode } from "@/types/scenario";
import { ScenarioCard, OutcomeCard } from "./NodeCard";
import FlowConnections from "./FlowConnections";

interface NodeCanvasProps {
  scenario: ScenarioData;
}

type DraggableNode = ScenarioNode | OutcomeNode;

const NodeCanvas = ({ scenario }: NodeCanvasProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(0.75);
  const [scenarioNode, setScenarioNode] = useState<ScenarioNode>(scenario.scenarioNode);
  const [outcomeNodes, setOutcomeNodes] = useState<OutcomeNode[]>(scenario.outcomeNodes);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      setIsPanning(true);
      setStartPos({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    },
    [pan]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (draggingNodeId) {
        const newX = (e.clientX - pan.x) / zoom - dragOffset.x;
        const newY = (e.clientY - pan.y) / zoom - dragOffset.y;

        if (draggingNodeId === scenarioNode.id) {
          setScenarioNode((prev) => ({ ...prev, position: { x: newX, y: newY } }));
        } else {
          setOutcomeNodes((prev) =>
            prev.map((n) =>
              n.id === draggingNodeId ? { ...n, position: { x: newX, y: newY } } : n
            )
          );
        }
        return;
      }
      if (!isPanning) return;
      setPan({ x: e.clientX - startPos.x, y: e.clientY - startPos.y });
    },
    [isPanning, startPos, draggingNodeId, dragOffset, pan, zoom, scenarioNode.id]
  );

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
    setDraggingNodeId(null);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((z) => Math.min(2, Math.max(0.3, z - e.deltaY * 0.001)));
  }, []);

  const handleNodeMouseDown = useCallback(
    (node: DraggableNode, e: React.MouseEvent) => {
      e.stopPropagation();
      const canvasX = (e.clientX - pan.x) / zoom;
      const canvasY = (e.clientY - pan.y) / zoom;
      setDragOffset({ x: canvasX - node.position.x, y: canvasY - node.position.y });
      setDraggingNodeId(node.id);
      setSelectedNodeId(node.id);
    },
    [pan, zoom]
  );

  const handleNodeClick = useCallback((nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedNodeId((prev) => (prev === nodeId ? null : nodeId));
  }, []);

  const handleCanvasClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  const totalNodes = 1 + outcomeNodes.length;

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
      <div className="absolute top-0 left-0 right-0 z-10 px-6 py-4 bg-background/80 backdrop-blur-sm border-b border-border">
        <h1 className="text-lg font-bold text-foreground">{scenario.title}</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          {totalNodes} nodes · {scenarioNode.steps?.length || 0} steps · Scroll to zoom · Drag canvas to pan · Drag nodes to move
        </p>
      </div>

      <div
        className="relative"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: "0 0",
          width: 2400,
          height: 1000,
        }}
      >
        <FlowConnections scenarioNode={scenarioNode} outcomeNodes={outcomeNodes} />

        <ScenarioCard
          node={scenarioNode}
          isSelected={selectedNodeId === scenarioNode.id}
          onMouseDown={(e) => handleNodeMouseDown(scenarioNode, e)}
          onClick={(e) => handleNodeClick(scenarioNode.id, e)}
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
      </div>
    </div>
  );
};

export default NodeCanvas;
