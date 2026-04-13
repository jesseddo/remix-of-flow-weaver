import { createContext, useContext, useMemo, ReactNode } from "react";
import { useModuleEditor } from "@/hooks/useModuleEditor";
import { JsonModule } from "@/data/transformScenario";
import originalJson from "@/data/scenarios.json";
import scriptJson from "@/data/scenarios-script.json";

const defaultModules: JsonModule[] = [
  originalJson as unknown as JsonModule,
  scriptJson as unknown as JsonModule,
];

type ModuleEditorReturn = ReturnType<typeof useModuleEditor>;

const ModuleContext = createContext<ModuleEditorReturn | null>(null);

export function ModuleProvider({ children }: { children: ReactNode }) {
  const editor = useModuleEditor(defaultModules);
  const value = useMemo(() => editor, [editor]);
  return <ModuleContext.Provider value={value}>{children}</ModuleContext.Provider>;
}

export function useModuleContext(): ModuleEditorReturn {
  const ctx = useContext(ModuleContext);
  if (!ctx) throw new Error("useModuleContext must be used within a ModuleProvider");
  return ctx;
}
