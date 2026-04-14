import { useState, useEffect, useCallback, useRef } from "react";
import {
  ScenarioData,
  ScenarioStep,
  ScenarioTask,
  ScenarioPath,
  PrerequisiteCondition,
  OutcomeType,
  StepConnection,
  Persona,
  ScenarioResource,
  NodeType,
  StepEvaluation,
  EvaluationCompetency,
  OutcomeNode,
  GlobalTimer,
  TaskActionType,
} from "@/types/scenario";
import { stepEvaluationHasContent } from "@/data/evaluationCompetencies";

export interface UpdatePathPatch {
  label?: string;
  prerequisite?: PrerequisiteCondition;
}

export interface UpdateTaskPatch {
  label?: string;
  actionType?: TaskActionType;
  resourceId?: string;
  checklistItemId?: string;
  checklistItemIds?: string[];
  chatCriteria?: string;
  scoreIncrement?: number;
}

export interface UpdatePersonaPatch {
  persona?: string;
  personaAdherence?: number;
}

export interface UpdateStepPatch {
  title?: string;
  description?: string;
  resource?: string;
  messageDescription?: string;
  type?: NodeType;
}

export interface UpdateEvaluationPatch {
  expectedBehavior?: string;
  competency?: EvaluationCompetency | "";
  notes?: string;
}

function emptyStepEvaluation(): StepEvaluation {
  return { expectedBehavior: "", competency: "", notes: undefined };
}

export type PathTarget =
  | { kind: "step"; stepId: string }
  | { kind: "outcome"; nodeId: string; label: string; type: OutcomeType };

function deriveFlowType(pathCount: number): "conditional" | "gated" | "linear" {
  if (pathCount > 1) return "conditional";
  if (pathCount === 1) return "gated";
  return "linear";
}

export interface ScenarioEditorCallbacks {
  onPersonasChange?: (personas: Persona[]) => void;
  onResourcesChange?: (resources: ScenarioResource[]) => void;
  onScenarioChange?: (data: ScenarioData) => void;
}

export function useScenarioEditor(
  initialData: ScenarioData | null,
  modulePersonas?: Persona[],
  moduleResources?: ScenarioResource[],
  callbacks?: ScenarioEditorCallbacks,
) {
  const [data, setData] = useState<ScenarioData | null>(initialData);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isNewScenario, setIsNewScenario] = useState(false);
  const skipNextResetRef = useRef(false);

  useEffect(() => {
    if (skipNextResetRef.current) {
      skipNextResetRef.current = false;
      return;
    }
    setData(initialData);
    setSelectedStepId(null);
    setIsDirty(false);
    setIsNewScenario(false);
  }, [initialData]);

  useEffect(() => {
    if (!data) return;
    if (modulePersonas) {
      setData((prev) => prev ? { ...prev, personas: modulePersonas } : prev);
    }
  }, [modulePersonas]);

  useEffect(() => {
    if (!data) return;
    if (moduleResources) {
      setData((prev) => prev ? { ...prev, resources: moduleResources } : prev);
    }
  }, [moduleResources]);

  const markDirty = useCallback(() => setIsDirty(true), []);

  const notifyChange = useCallback((next: ScenarioData) => {
    callbacks?.onScenarioChange?.(next);
  }, [callbacks]);

  const setDataAndNotify = useCallback(
    (updater: (prev: ScenarioData | null) => ScenarioData | null) => {
      setData((prev) => {
        const next = updater(prev);
        if (next && next !== prev) {
          skipNextResetRef.current = true;
          callbacks?.onScenarioChange?.(next);
        }
        return next;
      });
    },
    [callbacks],
  );

  const updatePath = useCallback(
    (stepId: string, pathId: string, patch: UpdatePathPatch) => {
      setDataAndNotify((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          scenarioNode: {
            ...prev.scenarioNode,
            steps: prev.scenarioNode.steps?.map((step) =>
              step.id === stepId
                ? {
                    ...step,
                    paths: step.paths?.map((path) =>
                      path.id === pathId ? { ...path, ...patch } : path
                    ),
                  }
                : step
            ),
          },
        };
      });
      markDirty();
    },
    [markDirty, setDataAndNotify]
  );

  const addPath = useCallback(
    (stepId: string, path: ScenarioPath) => {
      setDataAndNotify((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          scenarioNode: {
            ...prev.scenarioNode,
            steps: prev.scenarioNode.steps?.map((step) => {
              if (step.id !== stepId) return step;
              const newPaths = [...(step.paths ?? []), path];
              return { ...step, paths: newPaths, flowType: deriveFlowType(newPaths.length) };
            }),
          },
        };
      });
      markDirty();
    },
    [markDirty, setDataAndNotify]
  );

  const deletePath = useCallback(
    (stepId: string, pathId: string) => {
      setDataAndNotify((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          scenarioNode: {
            ...prev.scenarioNode,
            steps: prev.scenarioNode.steps?.map((step) => {
              if (step.id !== stepId) return step;
              const newPaths = step.paths?.filter((p) => p.id !== pathId) ?? [];
              return { ...step, paths: newPaths, flowType: deriveFlowType(newPaths.length) };
            }),
          },
        };
      });
      markDirty();
    },
    [markDirty, setDataAndNotify]
  );

  const setPathTarget = useCallback(
    (stepId: string, pathId: string, target: PathTarget) => {
      setDataAndNotify((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          scenarioNode: {
            ...prev.scenarioNode,
            steps: prev.scenarioNode.steps?.map((step) =>
              step.id === stepId
                ? {
                    ...step,
                    paths: step.paths?.map((path) => {
                      if (path.id !== pathId) return path;
                      if (target.kind === "step") {
                        // eslint-disable-next-line @typescript-eslint/no-unused-vars
                        const { connections, ...rest } = path;
                        const stepObj = prev.scenarioNode.steps?.find((s) => s.id === target.stepId);
                        return { ...rest, targetStepId: target.stepId, targetLabel: stepObj?.title ?? target.stepId };
                      } else {
                        // eslint-disable-next-line @typescript-eslint/no-unused-vars
                        const { targetStepId, ...rest } = path;
                        const conn: StepConnection = {
                          label: target.label,
                          targetNodeId: target.nodeId,
                          type: target.type,
                        };
                        return { ...rest, connections: [conn], targetLabel: target.label };
                      }
                    }),
                  }
                : step
            ),
          },
        };
      });
      markDirty();
    },
    [markDirty, setDataAndNotify]
  );

  const clearPathTarget = useCallback(
    (stepId: string, pathId: string) => {
      setDataAndNotify((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          scenarioNode: {
            ...prev.scenarioNode,
            steps: prev.scenarioNode.steps?.map((step) =>
              step.id === stepId
                ? {
                    ...step,
                    paths: step.paths?.map((path) => {
                      if (path.id !== pathId) return path;
                      // eslint-disable-next-line @typescript-eslint/no-unused-vars
                      const { connections, targetStepId, targetLabel, ...rest } = path;
                      return rest;
                    }),
                  }
                : step
            ),
          },
        };
      });
      markDirty();
    },
    [markDirty, setDataAndNotify]
  );

  const updateTask = useCallback(
    (stepId: string, taskId: string, patch: UpdateTaskPatch) => {
      setDataAndNotify((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          scenarioNode: {
            ...prev.scenarioNode,
            steps: prev.scenarioNode.steps?.map((step) =>
              step.id === stepId
                ? {
                    ...step,
                    tasks: step.tasks?.map((task) =>
                      task.id === taskId ? { ...task, ...patch } : task
                    ),
                  }
                : step
            ),
          },
        };
      });
      markDirty();
    },
    [markDirty, setDataAndNotify]
  );

  const addTask = useCallback(
    (stepId: string, task: ScenarioTask) => {
      setDataAndNotify((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          scenarioNode: {
            ...prev.scenarioNode,
            steps: prev.scenarioNode.steps?.map((step) =>
              step.id === stepId
                ? { ...step, tasks: [...(step.tasks ?? []), task] }
                : step
            ),
          },
        };
      });
      markDirty();
    },
    [markDirty, setDataAndNotify]
  );

  const addPathConditionTask = useCallback(
    (
      stepId: string,
      pathId: string,
      task: ScenarioTask,
      prerequisite: PrerequisiteCondition,
    ) => {
      setDataAndNotify((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          scenarioNode: {
            ...prev.scenarioNode,
            steps: (prev.scenarioNode.steps ?? []).map((step) => {
              if (step.id !== stepId) return step;
              const paths = step.paths ?? [];
              return {
                ...step,
                tasks: [...(step.tasks ?? []), task],
                paths: paths.map((path) =>
                  path.id === pathId ? { ...path, prerequisite } : path
                ),
              };
            }),
          },
        };
      });
      markDirty();
    },
    [markDirty, setDataAndNotify]
  );

  const deleteTask = useCallback(
    (stepId: string, taskId: string) => {
      setDataAndNotify((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          scenarioNode: {
            ...prev.scenarioNode,
            steps: prev.scenarioNode.steps?.map((step) =>
              step.id === stepId
                ? { ...step, tasks: step.tasks?.filter((t) => t.id !== taskId) }
                : step
            ),
          },
        };
      });
      markDirty();
    },
    [markDirty, setDataAndNotify]
  );

  const updatePersona = useCallback(
    (stepId: string, patch: UpdatePersonaPatch) => {
      setDataAndNotify((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          scenarioNode: {
            ...prev.scenarioNode,
            steps: prev.scenarioNode.steps?.map((step) =>
              step.id === stepId ? { ...step, ...patch } : step
            ),
          },
        };
      });
      markDirty();
    },
    [markDirty, setDataAndNotify]
  );

  const updateStep = useCallback(
    (stepId: string, patch: UpdateStepPatch) => {
      setDataAndNotify((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          scenarioNode: {
            ...prev.scenarioNode,
            steps: prev.scenarioNode.steps?.map((step) =>
              step.id === stepId ? { ...step, ...patch } : step
            ),
          },
        };
      });
      markDirty();
    },
    [markDirty, setDataAndNotify]
  );

  const updateEvaluation = useCallback(
    (stepId: string, patch: UpdateEvaluationPatch) => {
      setDataAndNotify((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          scenarioNode: {
            ...prev.scenarioNode,
            steps: prev.scenarioNode.steps?.map((step) => {
              if (step.id !== stepId) return step;
              const current = step.evaluation ?? emptyStepEvaluation();
              const next: StepEvaluation = {
                ...current,
                ...patch,
              };
              if (patch.notes !== undefined) {
                const t = patch.notes.trim();
                next.notes = t.length > 0 ? t : undefined;
              }
              if (!stepEvaluationHasContent(next)) {
                const { evaluation: _e, ...rest } = step;
                return rest;
              }
              return { ...step, evaluation: next };
            }),
          },
        };
      });
      markDirty();
    },
    [markDirty, setDataAndNotify]
  );

  const clearEvaluation = useCallback(
    (stepId: string) => {
      setDataAndNotify((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          scenarioNode: {
            ...prev.scenarioNode,
            steps: prev.scenarioNode.steps?.map((step) => {
              if (step.id !== stepId) return step;
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              const { evaluation: _ev, ...rest } = step;
              return rest;
            }),
          },
        };
      });
      markDirty();
    },
    [markDirty, setDataAndNotify]
  );

  // ── Persona catalog (delegates to module via callbacks) ─────────

  const addPersonaToCatalog = useCallback(
    (persona: Persona) => {
      setData((prev) => {
        if (!prev) return prev;
        const next = { ...prev, personas: [...prev.personas, persona] };
        skipNextResetRef.current = true;
        callbacks?.onPersonasChange?.(next.personas);
        return next;
      });
      markDirty();
    },
    [markDirty, callbacks]
  );

  const updatePersonaCatalog = useCallback(
    (id: string, patch: Partial<Persona>) => {
      setData((prev) => {
        if (!prev) return prev;
        const next = {
          ...prev,
          personas: prev.personas.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        };
        skipNextResetRef.current = true;
        callbacks?.onPersonasChange?.(next.personas);
        return next;
      });
      markDirty();
    },
    [markDirty, callbacks]
  );

  const deletePersonaFromCatalog = useCallback(
    (id: string) => {
      setData((prev) => {
        if (!prev) return prev;
        const next = { ...prev, personas: prev.personas.filter((p) => p.id !== id) };
        skipNextResetRef.current = true;
        callbacks?.onPersonasChange?.(next.personas);
        return next;
      });
      markDirty();
    },
    [markDirty, callbacks]
  );

  // ── Resource catalog (delegates to module via callbacks) ─────────

  const addResourceToCatalog = useCallback(
    (resource: ScenarioResource) => {
      setData((prev) => {
        if (!prev) return prev;
        const next = { ...prev, resources: [...prev.resources, resource] };
        skipNextResetRef.current = true;
        callbacks?.onResourcesChange?.(next.resources);
        return next;
      });
      markDirty();
    },
    [markDirty, callbacks]
  );

  const updateResourceCatalog = useCallback(
    (id: string, patch: Partial<ScenarioResource>) => {
      setData((prev) => {
        if (!prev) return prev;
        const next = {
          ...prev,
          resources: prev.resources.map((r) => (r.id === id ? { ...r, ...patch } : r)),
        };
        skipNextResetRef.current = true;
        callbacks?.onResourcesChange?.(next.resources);
        return next;
      });
      markDirty();
    },
    [markDirty, callbacks]
  );

  const deleteResourceFromCatalog = useCallback(
    (id: string) => {
      setData((prev) => {
        if (!prev) return prev;
        const next = { ...prev, resources: prev.resources.filter((r) => r.id !== id) };
        skipNextResetRef.current = true;
        callbacks?.onResourcesChange?.(next.resources);
        return next;
      });
      markDirty();
    },
    [markDirty, callbacks]
  );

  // ── Scenario creation ────────────────────────────────────────

  const createBlankScenario = useCallback((title: string, description: string) => {
    skipNextResetRef.current = true;
    const id = `scenario-${Date.now()}`;
    const newData: ScenarioData = {
      title,
      scenarioNode: {
        id,
        title,
        description,
        steps: [],
        position: { x: 60, y: 80 },
      },
      outcomeNodes: [],
      personas: modulePersonas ?? [],
      resources: moduleResources ?? [],
    };
    setData(newData);
    setSelectedStepId(null);
    setIsDirty(true);
    setIsNewScenario(true);
  }, [modulePersonas, moduleResources]);

  const updateTitle = useCallback((title: string) => {
    setDataAndNotify((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        title,
        scenarioNode: { ...prev.scenarioNode, title },
      };
    });
    markDirty();
  }, [markDirty, setDataAndNotify]);

  const updateDescription = useCallback((description: string) => {
    setDataAndNotify((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        scenarioNode: { ...prev.scenarioNode, description },
      };
    });
    markDirty();
  }, [markDirty, setDataAndNotify]);

  const addNewStep = useCallback((nodeType: NodeType = "chat") => {
    setDataAndNotify((prev) => {
      if (!prev) return prev;
      const stepNum = (prev.scenarioNode.steps?.length ?? 0) + 1;
      const newStep: ScenarioStep = {
        id: `step-${Date.now()}`,
        title: `Step ${stepNum}`,
        type: nodeType,
        description: "",
        tags: [],
        flowType: "linear",
        tasks: [],
        paths: [],
      };
      return {
        ...prev,
        scenarioNode: {
          ...prev.scenarioNode,
          steps: [...(prev.scenarioNode.steps ?? []), newStep],
        },
      };
    });
    markDirty();
  }, [markDirty, setDataAndNotify]);

  const createStepAndLinkToPath = useCallback(
    (fromStepId: string, pathId: string, nodeType: NodeType = "chat") => {
      setDataAndNotify((prev) => {
        if (!prev) return prev;
        const stepNum = (prev.scenarioNode.steps?.length ?? 0) + 1;
        const newStep: ScenarioStep = {
          id: `step-${Date.now()}`,
          title: `Step ${stepNum}`,
          type: nodeType,
          description: "",
          tags: [],
          flowType: "linear",
          tasks: [],
          paths: [],
        };
        return {
          ...prev,
          scenarioNode: {
            ...prev.scenarioNode,
            steps: [
              ...(prev.scenarioNode.steps ?? []).map((step) =>
                step.id === fromStepId
                  ? {
                      ...step,
                      paths: step.paths?.map((p) => {
                        if (p.id !== pathId) return p;
                        const { connections, ...rest } = p;
                        return { ...rest, targetStepId: newStep.id, targetLabel: newStep.title };
                      }),
                    }
                  : step
              ),
              newStep,
            ],
          },
        };
      });
      markDirty();
    },
    [markDirty, setDataAndNotify]
  );

  const deleteStep = useCallback((stepId: string) => {
    setDataAndNotify((prev) => {
      if (!prev) return prev;
      const deletedStep = prev.scenarioNode.steps?.find((s) => s.id === stepId);
      const steps = prev.scenarioNode.steps?.filter((s) => s.id !== stepId) ?? [];
      const cleaned = steps.map((step) => ({
        ...step,
        paths: step.paths?.map((p) => {
          if (p.targetStepId === stepId) {
            return { ...p, targetLabel: p.targetLabel ?? deletedStep?.title ?? stepId };
          }
          return p;
        }),
      }));
      return {
        ...prev,
        scenarioNode: { ...prev.scenarioNode, steps: cleaned },
      };
    });
    if (selectedStepId === stepId) setSelectedStepId(null);
    markDirty();
  }, [markDirty, selectedStepId, setDataAndNotify]);

  const addOutcomeNode = useCallback((outcomeType: OutcomeType, title?: string) => {
    setDataAndNotify((prev) => {
      if (!prev) return prev;
      if (prev.outcomeNodes.some((o) => o.outcome === outcomeType)) return prev;
      const num = prev.outcomeNodes.length + 1;
      const defaultTitle = outcomeType === "safe_path" ? `Success ${num}` :
             outcomeType === "partial_failure" ? `Partial Failure ${num}` :
             `Critical Failure ${num}`;
      const newOutcome: OutcomeNode = {
        id: `outcome-${Date.now()}`,
        title: title ?? defaultTitle,
        type: "chat",
        description: "",
        tags: [outcomeType === "safe_path" ? "Safe Outcome" :
               outcomeType === "partial_failure" ? "Partial Failure" :
               "Critical Failure"],
        outcome: outcomeType,
        position: { x: 800, y: 80 + (num - 1) * 300 },
      };
      return {
        ...prev,
        outcomeNodes: [...prev.outcomeNodes, newOutcome],
      };
    });
    markDirty();
  }, [markDirty, setDataAndNotify]);

  const createOutcomeAndLinkToPath = useCallback(
    (stepId: string, pathId: string, outcomeType: OutcomeType, title: string) => {
      setDataAndNotify((prev) => {
        if (!prev) return prev;
        if (prev.outcomeNodes.some((o) => o.outcome === outcomeType)) return prev;
        const num = prev.outcomeNodes.length + 1;
        const newOutcome: OutcomeNode = {
          id: `outcome-${Date.now()}`,
          title,
          type: "chat",
          description: "",
          tags: [outcomeType === "safe_path" ? "Safe Outcome" :
                 outcomeType === "partial_failure" ? "Partial Failure" :
                 "Critical Failure"],
          outcome: outcomeType,
          position: { x: 800, y: 80 + (num - 1) * 300 },
        };
        const conn: StepConnection = {
          label: title,
          targetNodeId: newOutcome.id,
          type: outcomeType,
        };
        return {
          ...prev,
          outcomeNodes: [...prev.outcomeNodes, newOutcome],
          scenarioNode: {
            ...prev.scenarioNode,
            steps: prev.scenarioNode.steps?.map((step) =>
              step.id === stepId
                ? {
                    ...step,
                    paths: step.paths?.map((path) => {
                      if (path.id !== pathId) return path;
                      // eslint-disable-next-line @typescript-eslint/no-unused-vars
                      const { targetStepId, ...rest } = path;
                      return { ...rest, connections: [conn], targetLabel: title };
                    }),
                  }
                : step
            ),
          },
        };
      });
      markDirty();
    },
    [markDirty, setDataAndNotify]
  );

  const deleteOutcomeNode = useCallback((outcomeId: string) => {
    setDataAndNotify((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        scenarioNode: prev.scenarioNode,
        outcomeNodes: prev.outcomeNodes.filter((o) => o.id !== outcomeId),
      };
    });
    markDirty();
  }, [markDirty, setDataAndNotify]);

  const updateOutcomeNode = useCallback((id: string, patch: Partial<Pick<OutcomeNode, "title" | "description" | "outcome">>) => {
    setDataAndNotify((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        outcomeNodes: prev.outcomeNodes.map((o) => (o.id === id ? { ...o, ...patch } : o)),
      };
    });
    markDirty();
  }, [markDirty, setDataAndNotify]);

  const setGlobalTimer = useCallback((timer: GlobalTimer | undefined) => {
    setDataAndNotify((prev) => {
      if (!prev) return prev;
      if (timer) {
        return { ...prev, globalTimer: timer };
      }
      const { globalTimer: _, ...rest } = prev;
      return rest as ScenarioData;
    });
    markDirty();
  }, [markDirty, setDataAndNotify]);

  const updateGlobalTimer = useCallback((patch: Partial<Pick<GlobalTimer, "name" | "timeoutMs" | "targetStepId">>) => {
    setDataAndNotify((prev) => {
      if (!prev?.globalTimer) return prev;
      return {
        ...prev,
        globalTimer: { ...prev.globalTimer, ...patch },
      };
    });
    markDirty();
  }, [markDirty, setDataAndNotify]);

  return {
    data,
    selectedStepId,
    setSelectedStepId,
    isDirty,
    isNewScenario,
    updatePath,
    addPath,
    deletePath,
    setPathTarget,
    clearPathTarget,
    updateTask,
    addTask,
    addPathConditionTask,
    deleteTask,
    updatePersona,
    updateStep,
    updateEvaluation,
    clearEvaluation,
    addPersonaToCatalog,
    updatePersonaCatalog,
    deletePersonaFromCatalog,
    addResourceToCatalog,
    updateResourceCatalog,
    deleteResourceFromCatalog,
    createBlankScenario,
    updateTitle,
    updateDescription,
    addNewStep,
    createStepAndLinkToPath,
    deleteStep,
    addOutcomeNode,
    createOutcomeAndLinkToPath,
    deleteOutcomeNode,
    updateOutcomeNode,
    setGlobalTimer,
    updateGlobalTimer,
  };
}
