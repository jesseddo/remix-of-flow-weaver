import { useState, useMemo, useCallback } from "react";
import NodeCanvas from "@/components/NodeCanvas";
import { StepDetailPanel } from "@/components/StepDetailPanel";
import { ScenarioLibraryPanel } from "@/components/ScenarioLibraryPanel";
import { useScenarioEditor } from "@/hooks/useScenarioEditor";
import originalJson from "@/data/scenarios.json";
import scriptJson from "@/data/scenarios-script.json";
import { JsonScenario } from "@/data/transformScenario";
import { Download, Library } from "lucide-react";

export type DisplayMode = "steps" | "grouped" | "modal";

const sources = [
  { key: "original", label: "Original", data: originalJson as JsonScenario[] },
  { key: "script",   label: "Script (V3)", data: scriptJson as JsonScenario[] },
];

const Index = () => {
  const [sourceKey, setSourceKey] = useState(sources[0].key);
  const [displayMode, setDisplayMode] = useState<DisplayMode>("steps");

  const availableScenarios = useMemo(() => {
    const src = sources.find((s) => s.key === sourceKey)!;
    return src.data.filter((s) => s.scenes && s.scenes.length > 0);
  }, [sourceKey]);

  const [selectedId, setSelectedId] = useState(availableScenarios[0]?.id ?? "");

  const activeId = availableScenarios.find((s) => s.id === selectedId)
    ? selectedId
    : availableScenarios[0]?.id ?? "";

  const handleSourceChange = useCallback((key: string) => {
    setSourceKey(key);
    const next = sources.find((s) => s.key === key)!;
    const nextAvailable = next.data.filter((s) => s.scenes && s.scenes.length > 0);
    setSelectedId(nextAvailable[0]?.id ?? "");
  }, []);

  const activeJsonScenario = useMemo(
    () => availableScenarios.find((s) => s.id === activeId) ?? null,
    [availableScenarios, activeId]
  );

  const [libraryOpen, setLibraryOpen] = useState(false);

  const editor = useScenarioEditor(activeJsonScenario);

  const selectedStep = useMemo(() => {
    if (!editor.selectedStepId || !editor.data) return null;
    return (
      editor.data.scenarioNode.steps?.find(
        (s) => s.id === editor.selectedStepId
      ) ?? null
    );
  }, [editor.selectedStepId, editor.data]);

  const selectedStepIndex = useMemo(() => {
    if (!editor.selectedStepId || !editor.data) return 0;
    return (
      editor.data.scenarioNode.steps?.findIndex(
        (s) => s.id === editor.selectedStepId
      ) ?? 0
    );
  }, [editor.selectedStepId, editor.data]);

  const allSteps = editor.data?.scenarioNode.steps ?? [];

  if (availableScenarios.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen text-muted-foreground">
        No scenarios with scenes found.
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen">
      {/* Top bar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3">
        {/* Source toggle */}
        <div className="flex rounded-lg border border-border bg-background shadow-sm overflow-hidden">
          {sources.map((src) => (
            <button
              key={src.key}
              onClick={() => handleSourceChange(src.key)}
              className={`px-4 py-1.5 text-sm font-medium transition-colors ${
                sourceKey === src.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {src.label}
            </button>
          ))}
        </div>

        {/* Display mode toggle */}
        <div className="flex rounded-lg border border-border bg-background shadow-sm overflow-hidden">
          {(
            [
              ["steps", "Steps"],
              ["grouped", "Grouped Steps"],
              ["modal", "Modal Steps"],
            ] as const
          ).map(([mode, label]) => (
            <button
              key={mode}
              onClick={() => setDisplayMode(mode)}
              className={`px-4 py-1.5 text-sm font-medium transition-colors ${
                displayMode === mode
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Scenario dropdown */}
        {availableScenarios.length > 1 && (
          <select
            value={activeId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="bg-background border border-border rounded-md px-3 py-1.5 text-sm font-medium text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            {availableScenarios.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title} ({s.version})
              </option>
            ))}
          </select>
        )}

        {/* Library toggle */}
        <button
          onClick={() => setLibraryOpen((v) => !v)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border shadow-sm transition-colors ${
            libraryOpen
              ? "bg-primary text-primary-foreground border-primary"
              : "border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
          title="Open Scenario Library"
        >
          <Library className="w-3.5 h-3.5" />
          Library
        </button>

        {/* Export JSON */}
        <button
          onClick={editor.exportToJson}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-border bg-background shadow-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title={editor.isDirty ? "You have unsaved changes — click to download" : "Download edited scenario as JSON"}
        >
          <Download className="w-3.5 h-3.5" />
          Export
          {editor.isDirty && (
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
          )}
        </button>
      </div>

      {/* Canvas */}
      {editor.data ? (
        <NodeCanvas
          key={activeId}
          scenario={editor.data}
          displayMode={displayMode}
          selectedStepId={editor.selectedStepId}
          onSelectStep={editor.setSelectedStepId}
        />
      ) : (
        <div className="flex items-center justify-center h-screen text-muted-foreground">
          Could not parse selected scenario
        </div>
      )}

      {/* Scenario Library — fixed, slides in from the left */}
      <ScenarioLibraryPanel
        isOpen={libraryOpen}
        data={editor.data}
        onClose={() => setLibraryOpen(false)}
        onAddPersona={editor.addPersonaToCatalog}
        onUpdatePersona={editor.updatePersonaCatalog}
        onDeletePersona={editor.deletePersonaFromCatalog}
        onAddResource={editor.addResourceToCatalog}
        onUpdateResource={editor.updateResourceCatalog}
        onDeleteResource={editor.deleteResourceFromCatalog}
      />

      {/* Step detail panel — fixed, slides in from the right */}
      <StepDetailPanel
        step={selectedStep}
        stepIndex={selectedStepIndex}
        allSteps={allSteps}
        outcomeNodes={editor.data?.outcomeNodes ?? []}
        personas={editor.data?.personas ?? []}
        resources={editor.data?.resources ?? []}
        onClose={() => editor.setSelectedStepId(null)}
        onUpdatePath={editor.updatePath}
        onAddPath={editor.addPath}
        onDeletePath={editor.deletePath}
        onUpdateTask={editor.updateTask}
        onAddTask={editor.addTask}
        onDeleteTask={editor.deleteTask}
        onUpdatePersona={editor.updatePersona}
        onUpdateStep={editor.updateStep}
        onSetPathTarget={editor.setPathTarget}
        onUpdateEvaluation={editor.updateEvaluation}
        onClearEvaluation={editor.clearEvaluation}
        onAddEvaluation={editor.addEvaluation}
      />
    </div>
  );
};

export default Index;
