import { ModuleData } from "@/types/scenario";
import { JsonModule, transformModule } from "@/data/transformScenario";
import { moduleDataToJson } from "@/utils/exportToJson";

const STORAGE_KEY = "flowweaver_modules";
const STORAGE_VERSION = 1;

interface StorageEnvelope {
  version: number;
  modules: JsonModule[];
}

export function saveModulesToStorage(modules: ModuleData[]): void {
  try {
    const envelope: StorageEnvelope = {
      version: STORAGE_VERSION,
      modules: modules.map(moduleDataToJson),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(envelope));
  } catch {
    // Storage full or unavailable — silently ignore
  }
}

export function loadModulesFromStorage(): ModuleData[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const envelope: StorageEnvelope = JSON.parse(raw);
    if (envelope.version !== STORAGE_VERSION || !Array.isArray(envelope.modules)) {
      return null;
    }

    return envelope.modules.map(transformModule);
  } catch {
    return null;
  }
}

export function clearStorage(): void {
  localStorage.removeItem(STORAGE_KEY);
}
