import { createContext, useContext, useMemo, ReactNode } from "react";
import { useModuleEditor } from "@/hooks/useModuleEditor";
import { JsonModule, transformModule } from "@/data/transformScenario";
import { loadModulesFromStorage } from "@/utils/localStorageSync";
import originalJson from "@/data/scenarios.json";
import scriptJson from "@/data/scenarios-script.json";

const defaultJsonModules: JsonModule[] = [
  originalJson as unknown as JsonModule,
  scriptJson as unknown as JsonModule,
];

const initialModules =
  loadModulesFromStorage() ?? defaultJsonModules.map(transformModule);

type ModuleEditorReturn = ReturnType<typeof useModuleEditor>;

const ModuleContext = createContext<ModuleEditorReturn | null>(null);

export function ModuleProvider({ children }: { children: ReactNode }) {
  const editor = useModuleEditor(initialModules, defaultJsonModules);
  const value = useMemo(() => editor, [editor]);
  return <ModuleContext.Provider value={value}>{children}</ModuleContext.Provider>;
}

export function useModuleContext(): ModuleEditorReturn {
  const ctx = useContext(ModuleContext);
  if (!ctx) throw new Error("useModuleContext must be used within a ModuleProvider");
  return ctx;
}
