import { useState, useCallback } from "react";
import {
  ModuleData,
  ScenarioData,
  Persona,
  ScenarioResource,
} from "@/types/scenario";
import { JsonModule, transformModule } from "@/data/transformScenario";
import { exportModuleToJsonFile } from "@/utils/exportToJson";

export function useModuleEditor(initialJsonModules: JsonModule[]) {
  const [modules, setModules] = useState<ModuleData[]>(() =>
    initialJsonModules.map(transformModule)
  );
  const [isDirty, setIsDirty] = useState(false);

  const markDirty = useCallback(() => setIsDirty(true), []);

  // ── Module CRUD ─────────────────────────────────────────────────

  const createModule = useCallback((title: string, description: string) => {
    const id = `module-${Date.now()}`;
    const newModule: ModuleData = {
      id,
      title,
      description,
      personas: [],
      resources: [],
      scenarios: [],
    };
    setModules((prev) => [...prev, newModule]);
    markDirty();
    return id;
  }, [markDirty]);

  const deleteModule = useCallback((moduleId: string) => {
    setModules((prev) => prev.filter((m) => m.id !== moduleId));
    markDirty();
  }, [markDirty]);

  const updateModuleTitle = useCallback((moduleId: string, title: string) => {
    setModules((prev) =>
      prev.map((m) => (m.id === moduleId ? { ...m, title } : m))
    );
    markDirty();
  }, [markDirty]);

  const updateModuleDescription = useCallback((moduleId: string, description: string) => {
    setModules((prev) =>
      prev.map((m) => (m.id === moduleId ? { ...m, description } : m))
    );
    markDirty();
  }, [markDirty]);

  // ── Scenario CRUD within a module ───────────────────────────────

  const addScenario = useCallback((moduleId: string, title: string, description: string) => {
    const scenarioId = `scenario-${Date.now()}`;
    setModules((prev) =>
      prev.map((m) => {
        if (m.id !== moduleId) return m;
        const newScenario: ScenarioData = {
          title,
          scenarioNode: {
            id: scenarioId,
            title,
            description,
            steps: [],
            position: { x: 60, y: 80 },
          },
          outcomeNodes: [],
          globalTimers: [],
          personas: m.personas,
          resources: m.resources,
        };
        return { ...m, scenarios: [...m.scenarios, newScenario] };
      })
    );
    markDirty();
    return scenarioId;
  }, [markDirty]);

  const deleteScenario = useCallback((moduleId: string, scenarioId: string) => {
    setModules((prev) =>
      prev.map((m) => {
        if (m.id !== moduleId) return m;
        return {
          ...m,
          scenarios: m.scenarios.filter((s) => s.scenarioNode.id !== scenarioId),
        };
      })
    );
    markDirty();
  }, [markDirty]);

  const updateScenarioInModule = useCallback(
    (moduleId: string, scenarioId: string, updated: ScenarioData) => {
      setModules((prev) =>
        prev.map((m) => {
          if (m.id !== moduleId) return m;
          return {
            ...m,
            scenarios: m.scenarios.map((s) =>
              s.scenarioNode.id === scenarioId ? updated : s
            ),
          };
        })
      );
      markDirty();
    },
    [markDirty]
  );

  // ── Module-level persona catalog ────────────────────────────────

  const updateModulePersonas = useCallback(
    (moduleId: string, personas: Persona[]) => {
      setModules((prev) =>
        prev.map((m) => {
          if (m.id !== moduleId) return m;
          return {
            ...m,
            personas,
            scenarios: m.scenarios.map((s) => ({ ...s, personas })),
          };
        })
      );
      markDirty();
    },
    [markDirty]
  );

  const addPersona = useCallback(
    (moduleId: string, persona: Persona) => {
      setModules((prev) =>
        prev.map((m) => {
          if (m.id !== moduleId) return m;
          const personas = [...m.personas, persona];
          return {
            ...m,
            personas,
            scenarios: m.scenarios.map((s) => ({ ...s, personas })),
          };
        })
      );
      markDirty();
    },
    [markDirty]
  );

  const updatePersona = useCallback(
    (moduleId: string, personaId: string, patch: Partial<Persona>) => {
      setModules((prev) =>
        prev.map((m) => {
          if (m.id !== moduleId) return m;
          const personas = m.personas.map((p) => (p.id === personaId ? { ...p, ...patch } : p));
          return {
            ...m,
            personas,
            scenarios: m.scenarios.map((s) => ({ ...s, personas })),
          };
        })
      );
      markDirty();
    },
    [markDirty]
  );

  const deletePersona = useCallback(
    (moduleId: string, personaId: string) => {
      setModules((prev) =>
        prev.map((m) => {
          if (m.id !== moduleId) return m;
          const personas = m.personas.filter((p) => p.id !== personaId);
          return {
            ...m,
            personas,
            scenarios: m.scenarios.map((s) => ({ ...s, personas })),
          };
        })
      );
      markDirty();
    },
    [markDirty]
  );

  // ── Module-level resource catalog ───────────────────────────────

  const updateModuleResources = useCallback(
    (moduleId: string, resources: ScenarioResource[]) => {
      setModules((prev) =>
        prev.map((m) => {
          if (m.id !== moduleId) return m;
          return {
            ...m,
            resources,
            scenarios: m.scenarios.map((s) => ({ ...s, resources })),
          };
        })
      );
      markDirty();
    },
    [markDirty]
  );

  const addResource = useCallback(
    (moduleId: string, resource: ScenarioResource) => {
      setModules((prev) =>
        prev.map((m) => {
          if (m.id !== moduleId) return m;
          const resources = [...m.resources, resource];
          return {
            ...m,
            resources,
            scenarios: m.scenarios.map((s) => ({ ...s, resources })),
          };
        })
      );
      markDirty();
    },
    [markDirty]
  );

  const updateResource = useCallback(
    (moduleId: string, resourceId: string, patch: Partial<ScenarioResource>) => {
      setModules((prev) =>
        prev.map((m) => {
          if (m.id !== moduleId) return m;
          const resources = m.resources.map((r) => (r.id === resourceId ? { ...r, ...patch } : r));
          return {
            ...m,
            resources,
            scenarios: m.scenarios.map((s) => ({ ...s, resources })),
          };
        })
      );
      markDirty();
    },
    [markDirty]
  );

  const deleteResource = useCallback(
    (moduleId: string, resourceId: string) => {
      setModules((prev) =>
        prev.map((m) => {
          if (m.id !== moduleId) return m;
          const resources = m.resources.filter((r) => r.id !== resourceId);
          return {
            ...m,
            resources,
            scenarios: m.scenarios.map((s) => ({ ...s, resources })),
          };
        })
      );
      markDirty();
    },
    [markDirty]
  );

  // ── Export ──────────────────────────────────────────────────────

  const exportModule = useCallback((moduleId: string) => {
    const mod = modules.find((m) => m.id === moduleId);
    if (!mod) return;
    exportModuleToJsonFile(mod);
  }, [modules]);

  // ── Import ─────────────────────────────────────────────────────

  const importModule = useCallback((json: JsonModule) => {
    const mod = transformModule(json);
    setModules((prev) => {
      const existing = prev.findIndex((m) => m.id === mod.id);
      if (existing >= 0) {
        const next = [...prev];
        next[existing] = mod;
        return next;
      }
      return [...prev, mod];
    });
    markDirty();
    return mod.id;
  }, [markDirty]);

  return {
    modules,
    isDirty,
    createModule,
    deleteModule,
    updateModuleTitle,
    updateModuleDescription,
    addScenario,
    deleteScenario,
    updateScenarioInModule,
    updateModulePersonas,
    addPersona,
    updatePersona,
    deletePersona,
    updateModuleResources,
    addResource,
    updateResource,
    deleteResource,
    exportModule,
    importModule,
  };
}
