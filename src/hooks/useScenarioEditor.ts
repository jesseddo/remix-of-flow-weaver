import { useState, useEffect, useCallback } from "react";
import { ScenarioData, ScenarioTask, ScenarioPath, PrerequisiteCondition, OutcomeType, StepConnection, Persona, ScenarioResource } from "@/types/scenario";
import { transformScenario, JsonScenario } from "@/data/transformScenario";
import { exportToJsonFile } from "@/utils/exportToJson";

export interface UpdatePathPatch {
  label?: string;
  prerequisite?: PrerequisiteCondition;
}

export interface UpdateTaskPatch {
  label?: string;
  required?: boolean;
  hidden?: boolean;
  prerequisite?: PrerequisiteCondition;
}

export interface UpdatePersonaPatch {
  persona?: string;
  personaAdherence?: number;
}

export interface UpdateStepPatch {
  title?: string;
  description?: string;
  resource?: string;
}

export interface UpdateEvaluationPatch {
  competency?: string;
  competencyId?: string;
  weight?: "high" | "medium" | "low";
  requirement?: string;
}

export type PathTarget =
  | { kind: "step"; stepId: string }
  | { kind: "outcome"; nodeId: string; label: string; type: OutcomeType };

function deriveFlowType(pathCount: number): "conditional" | "gated" | "linear" {
  if (pathCount > 1) return "conditional";
  if (pathCount === 1) return "gated";
  return "linear";
}

export function useScenarioEditor(originalJson: JsonScenario | null) {
  const [data, setData] = useState<ScenarioData | null>(() =>
    originalJson ? transformScenario(originalJson) : null
  );
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    setData(originalJson ? transformScenario(originalJson) : null);
    setSelectedStepId(null);
    setIsDirty(false);
  }, [originalJson]);

  const markDirty = useCallback(() => setIsDirty(true), []);

  const updatePath = useCallback(
    (stepId: string, pathId: string, patch: UpdatePathPatch) => {
      setData((prev) => {
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
    [markDirty]
  );

  const addPath = useCallback(
    (stepId: string, path: ScenarioPath) => {
      setData((prev) => {
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
    [markDirty]
  );

  const deletePath = useCallback(
    (stepId: string, pathId: string) => {
      setData((prev) => {
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
    [markDirty]
  );

  const setPathTarget = useCallback(
    (stepId: string, pathId: string, target: PathTarget) => {
      setData((prev) => {
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
                        return { ...rest, targetStepId: target.stepId };
                      } else {
                        // eslint-disable-next-line @typescript-eslint/no-unused-vars
                        const { targetStepId, ...rest } = path;
                        const conn: StepConnection = {
                          label: target.label,
                          targetNodeId: target.nodeId,
                          type: target.type,
                        };
                        return { ...rest, connections: [conn] };
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
    [markDirty]
  );

  const updateTask = useCallback(
    (stepId: string, taskId: string, patch: UpdateTaskPatch) => {
      setData((prev) => {
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
    [markDirty]
  );

  const addTask = useCallback(
    (stepId: string, task: ScenarioTask) => {
      setData((prev) => {
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
    [markDirty]
  );

  const deleteTask = useCallback(
    (stepId: string, taskId: string) => {
      setData((prev) => {
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
    [markDirty]
  );

  const updatePersona = useCallback(
    (stepId: string, patch: UpdatePersonaPatch) => {
      setData((prev) => {
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
    [markDirty]
  );

  const updateStep = useCallback(
    (stepId: string, patch: UpdateStepPatch) => {
      setData((prev) => {
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
    [markDirty]
  );

  const updateEvaluation = useCallback(
    (stepId: string, patch: UpdateEvaluationPatch) => {
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          scenarioNode: {
            ...prev.scenarioNode,
            steps: prev.scenarioNode.steps?.map((step) => {
              if (step.id !== stepId) return step;
              const current = step.evaluation ?? { competency: "", weight: "high" as const, requirement: "" };
              return { ...step, evaluation: { ...current, ...patch } };
            }),
          },
        };
      });
      markDirty();
    },
    [markDirty]
  );

  const clearEvaluation = useCallback(
    (stepId: string) => {
      setData((prev) => {
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
    [markDirty]
  );

  const addEvaluation = useCallback(
    (stepId: string) => {
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          scenarioNode: {
            ...prev.scenarioNode,
            steps: prev.scenarioNode.steps?.map((step) =>
              step.id === stepId
                ? { ...step, evaluation: { competency: "", weight: "high" as const, requirement: "" } }
                : step
            ),
          },
        };
      });
      markDirty();
    },
    [markDirty]
  );

  // ── Persona catalog ──────────────────────────────────────────────

  const addPersonaToCatalog = useCallback(
    (persona: Persona) => {
      setData((prev) => {
        if (!prev) return prev;
        return { ...prev, personas: [...prev.personas, persona] };
      });
      markDirty();
    },
    [markDirty]
  );

  const updatePersonaCatalog = useCallback(
    (id: string, patch: Partial<Persona>) => {
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          personas: prev.personas.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        };
      });
      markDirty();
    },
    [markDirty]
  );

  const deletePersonaFromCatalog = useCallback(
    (id: string) => {
      setData((prev) => {
        if (!prev) return prev;
        return { ...prev, personas: prev.personas.filter((p) => p.id !== id) };
      });
      markDirty();
    },
    [markDirty]
  );

  // ── Resource catalog ─────────────────────────────────────────────

  const addResourceToCatalog = useCallback(
    (resource: ScenarioResource) => {
      setData((prev) => {
        if (!prev) return prev;
        return { ...prev, resources: [...prev.resources, resource] };
      });
      markDirty();
    },
    [markDirty]
  );

  const updateResourceCatalog = useCallback(
    (id: string, patch: Partial<ScenarioResource>) => {
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          resources: prev.resources.map((r) => (r.id === id ? { ...r, ...patch } : r)),
        };
      });
      markDirty();
    },
    [markDirty]
  );

  const deleteResourceFromCatalog = useCallback(
    (id: string) => {
      setData((prev) => {
        if (!prev) return prev;
        return { ...prev, resources: prev.resources.filter((r) => r.id !== id) };
      });
      markDirty();
    },
    [markDirty]
  );

  const exportToJson = useCallback(() => {
    if (!data || !originalJson) return;
    exportToJsonFile(data, originalJson);
    setIsDirty(false);
  }, [data, originalJson]);

  return {
    data,
    selectedStepId,
    setSelectedStepId,
    isDirty,
    updatePath,
    addPath,
    deletePath,
    setPathTarget,
    updateTask,
    addTask,
    deleteTask,
    updatePersona,
    updateStep,
    updateEvaluation,
    clearEvaluation,
    addEvaluation,
    addPersonaToCatalog,
    updatePersonaCatalog,
    deletePersonaFromCatalog,
    addResourceToCatalog,
    updateResourceCatalog,
    deleteResourceFromCatalog,
    exportToJson,
  };
}
