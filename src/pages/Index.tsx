import { useState, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import NodeCanvas from "@/components/NodeCanvas";
import { StepDetailPanel } from "@/components/StepDetailPanel";
import { ScenarioLibraryPanel } from "@/components/ScenarioLibraryPanel";
import { WalkthroughPanel } from "@/components/WalkthroughPanel";
import { ScenarioMetadataPopover } from "@/components/ScenarioMetadataPopover";
import { ScenarioCreationToolbar } from "@/components/ScenarioCreationToolbar";
import { useScenarioEditor } from "@/hooks/useScenarioEditor";
import { useModuleContext } from "@/contexts/ModuleContext";
import { validateScenario } from "@/utils/scenarioValidation";
import { ScenarioData } from "@/types/scenario";
import { Download, Library, Play, ArrowLeft } from "lucide-react";

export type DisplayMode = "steps" | "grouped" | "modal";

const WALKTHROUGH_DOCK_INSET_PX = 340;

const Index = () => {
  const { moduleId, scenarioId } = useParams<{ moduleId: string; scenarioId: string }>();
  const navigate = useNavigate();
  const moduleCtx = useModuleContext();

  const currentModule = useMemo(
    () => moduleCtx.modules.find((m) => m.id === moduleId) ?? null,
    [moduleCtx.modules, moduleId]
  );

  const initialScenarioData = useMemo(
    () => currentModule?.scenarios.find((s) => s.scenarioNode.id === scenarioId) ?? null,
    [currentModule, scenarioId]
  );

  const [displayMode, setDisplayMode] = useState<DisplayMode>("steps");

  const handleScenarioChange = useCallback(
    (updated: ScenarioData) => {
      if (moduleId && scenarioId) {
        moduleCtx.updateScenarioInModule(moduleId, scenarioId, updated);
      }
    },
    [moduleCtx, moduleId, scenarioId]
  );

  const handlePersonasChange = useCallback(
    (personas: typeof currentModule extends null ? never : NonNullable<typeof currentModule>["personas"]) => {
      if (moduleId) moduleCtx.updateModulePersonas(moduleId, personas);
    },
    [moduleCtx, moduleId]
  );

  const handleResourcesChange = useCallback(
    (resources: typeof currentModule extends null ? never : NonNullable<typeof currentModule>["resources"]) => {
      if (moduleId) moduleCtx.updateModuleResources(moduleId, resources);
    },
    [moduleCtx, moduleId]
  );

  const editor = useScenarioEditor(
    initialScenarioData,
    currentModule?.personas,
    currentModule?.resources,
    {
      onScenarioChange: handleScenarioChange,
      onPersonasChange: handlePersonasChange,
      onResourcesChange: handleResourcesChange,
    },
  );

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

  const validationWarnings = useMemo(
    () => (editor.data ? validateScenario(editor.data) : []),
    [editor.data],
  );

  const [libraryOpen, setLibraryOpen] = useState(false);
  const [walkthroughOpen, setWalkthroughOpen] = useState(false);
  const [walkthroughHighlightId, setWalkthroughHighlightId] = useState<string | null>(null);

  const handleHighlightStep = useCallback((id: string | null) => {
    setWalkthroughHighlightId(id);
  }, []);

  const handleNewScenario = useCallback(
    (title: string, description: string) => {
      editor.createBlankScenario(title, description);
    },
    [editor]
  );

  const handleExport = useCallback(() => {
    if (moduleId) {
      moduleCtx.exportModule(moduleId);
    }
  }, [moduleCtx, moduleId]);

  const steps = editor.data?.scenarioNode.steps ?? [];
  const outcomeNodes = editor.data?.outcomeNodes ?? [];
  const totalNodes = steps.length + outcomeNodes.length + (editor.data?.globalTimers.length ?? 0);

  return (
    <div className="flex flex-col w-full h-screen overflow-hidden">
      {/* Header */}
      <div className="shrink-0 border-b border-border bg-background">
        <div className="px-4 py-1.5 flex items-center gap-3 min-h-[40px]">
          {/* Back button */}
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition-colors shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Modules
          </button>

          <div className="w-px h-5 bg-border/60 shrink-0" />

          {currentModule && (
            <span className="text-[10px] text-muted-foreground/60 shrink-0 truncate max-w-[120px]">
              {currentModule.title}
            </span>
          )}

          {editor.data ? (
            <div className="flex items-center gap-3 min-w-0 shrink-0">
              {editor.isNewScenario ? (
                <input
                  type="text"
                  value={editor.data.title}
                  onChange={(e) => editor.updateTitle(e.target.value)}
                  className="text-sm font-bold text-foreground whitespace-nowrap bg-transparent border-b border-dashed border-primary/40 focus:border-primary focus:outline-none px-0.5 max-w-[260px]"
                  placeholder="Scenario title..."
                />
              ) : (
                <h1 className="text-sm font-bold text-foreground whitespace-nowrap">{editor.data.title}</h1>
              )}
              <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                {displayMode === "modal"
                  ? `${totalNodes} nodes · ${steps.length} steps · ${outcomeNodes.length} outcomes`
                  : `${1 + outcomeNodes.length} nodes · ${steps.length} steps`}
              </span>
              <ScenarioMetadataPopover data={editor.data} />
            </div>
          ) : (
            <p className="text-xs text-muted-foreground shrink-0">
              Scenario not found.
            </p>
          )}

          <div className="flex-1" />

          <div className="flex items-center gap-2 shrink-0">
            {/* Display mode toggle */}
            <div className="flex rounded-lg border border-border bg-background shadow-sm overflow-hidden">
              {(
                [
                  ["steps", "Steps"],
                  ["grouped", "Grouped"],
                  ["modal", "Modal"],
                ] as const
              ).map(([mode, label]) => (
                <button
                  key={mode}
                  onClick={() => setDisplayMode(mode)}
                  className={`px-3 py-1 text-[11px] font-medium transition-colors ${
                    displayMode === mode
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Library toggle */}
            <button
              onClick={() => setLibraryOpen((v) => !v)}
              className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-md border shadow-sm transition-colors ${
                libraryOpen
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
              title="Open Scenario Library"
            >
              <Library className="w-3 h-3" />
              Library
            </button>

            {/* Export Module JSON */}
            <button
              onClick={handleExport}
              className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-md border border-border bg-background shadow-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Download module as JSON"
            >
              <Download className="w-3 h-3" />
              Export
              {editor.isDirty && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
              )}
            </button>

            {/* Preview Walkthrough */}
            {editor.data && (
              <button
                onClick={() => setWalkthroughOpen(true)}
                className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-md border shadow-sm transition-colors border-emerald-700/60 bg-emerald-950/60 text-emerald-300 hover:bg-emerald-900/70 hover:text-emerald-200 hover:border-emerald-600"
                title="Preview scenario as a learner walkthrough"
              >
                <Play className="w-3 h-3" />
                Preview
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Creation Toolbar */}
      <ScenarioCreationToolbar
        hasScenario={!!editor.data}
        onNewScenario={handleNewScenario}
        onAddStep={(type) => editor.addNewStep(type)}
        onAddOutcome={editor.addOutcomeNode}
        onAddTimer={editor.addGlobalTimer}
        onSave={handleExport}
        isDirty={editor.isDirty}
      />

      {/* Main area: canvas + panels */}
      <div className="relative flex-1 min-h-0 min-w-0">
        {editor.data ? (
          <NodeCanvas
            key={scenarioId ?? ""}
            scenario={editor.data}
            displayMode={displayMode}
            selectedStepId={walkthroughOpen ? walkthroughHighlightId : editor.selectedStepId}
            onSelectStep={walkthroughOpen ? undefined : editor.setSelectedStepId}
            validationWarnings={validationWarnings}
            walkthroughMode={walkthroughOpen}
            walkthroughBottomInset={walkthroughOpen ? WALKTHROUGH_DOCK_INSET_PX : 0}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Scenario not found. Go back to the Module Manager.
          </div>
        )}

        {/* Scenario Library */}
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

        {/* Step detail panel */}
        {!walkthroughOpen && (
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
            onAddPathCondition={editor.addPathConditionTask}
            onDeleteTask={editor.deleteTask}
            onUpdatePersona={editor.updatePersona}
            onUpdateStep={editor.updateStep}
            onSetPathTarget={editor.setPathTarget}
            onUpdateEvaluation={editor.updateEvaluation}
            onClearEvaluation={editor.clearEvaluation}
            onAddPersonaToCatalog={editor.addPersonaToCatalog}
          />
        )}

        {/* Walkthrough panel overlay */}
        {walkthroughOpen && editor.data && (
          <WalkthroughPanel
            scenario={editor.data}
            onExit={() => {
              setWalkthroughOpen(false);
              setWalkthroughHighlightId(null);
            }}
            onHighlightStep={handleHighlightStep}
          />
        )}
      </div>
    </div>
  );
};

export default Index;
