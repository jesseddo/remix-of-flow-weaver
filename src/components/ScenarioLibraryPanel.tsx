import { useState } from "react";
import { Persona, ScenarioResource, ScenarioData } from "@/types/scenario";
import { PersonaEditor } from "./PersonaEditor";
import { ResourceEditor } from "./ResourceEditor";
import { X, Users, FileStack } from "lucide-react";

type LibraryTab = "personas" | "resources";

interface ScenarioLibraryPanelProps {
  isOpen: boolean;
  data: ScenarioData | null;
  onClose: () => void;
  onAddPersona: (persona: Persona) => void;
  onUpdatePersona: (id: string, patch: Partial<Persona>) => void;
  onDeletePersona: (id: string) => void;
  onAddResource: (resource: ScenarioResource) => void;
  onUpdateResource: (id: string, patch: Partial<ScenarioResource>) => void;
  onDeleteResource: (id: string) => void;
}

const TAB_CONFIG: { id: LibraryTab; label: string; icon: typeof Users }[] = [
  { id: "personas", label: "Characters", icon: Users },
  { id: "resources", label: "Resources", icon: FileStack },
];

export const ScenarioLibraryPanel = ({
  isOpen,
  data,
  onClose,
  onAddPersona,
  onUpdatePersona,
  onDeletePersona,
  onAddResource,
  onUpdateResource,
  onDeleteResource,
}: ScenarioLibraryPanelProps) => {
  const [activeTab, setActiveTab] = useState<LibraryTab>("personas");

  return (
    <div
      className="fixed left-0 top-0 h-screen w-[360px] z-30 flex flex-col bg-background border-r border-border shadow-2xl transition-transform duration-300 ease-out"
      style={{ transform: isOpen ? "translateX(0)" : "translateX(-100%)" }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* ── Header ──────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{
          borderBottom: "1px solid hsl(var(--border))",
          background: "hsl(var(--secondary) / 0.4)",
        }}
      >
        <div>
          <p className="text-[11px] font-bold text-foreground">Scenario Library</p>
          {data && (
            <p className="text-[9px] text-muted-foreground truncate max-w-[260px] mt-0.5">
              {data.title}
            </p>
          )}
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-secondary transition-colors"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* ── Tabs ────────────────────────────────────────────────── */}
      <div
        className="flex shrink-0"
        style={{ borderBottom: "1px solid hsl(var(--border))" }}
      >
        {TAB_CONFIG.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-semibold transition-colors ${
              activeTab === id
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground border-b-2 border-transparent"
            }`}
          >
            <Icon className="w-3 h-3" />
            {label}
            {id === "personas" && data && data.personas.length > 0 && (
              <span className="text-[8px] px-1 py-0.5 rounded-full bg-secondary text-muted-foreground">
                {data.personas.length}
              </span>
            )}
            {id === "resources" && data && data.resources.length > 0 && (
              <span className="text-[8px] px-1 py-0.5 rounded-full bg-secondary text-muted-foreground">
                {data.resources.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tab content ─────────────────────────────────────────── */}
      {!data ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-[11px]">
          No scenario loaded.
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {activeTab === "personas" && (
            <div className="pt-3">
              <div className="px-4 pb-2">
                <p className="text-[10px] text-muted-foreground/70 leading-relaxed">
                  Characters are the AI personas that drive each step. Define their identity here; set their behavioral adherence per step in the Step Inspector.
                </p>
              </div>
              <PersonaEditor
                personas={data.personas}
                onAdd={onAddPersona}
                onUpdate={onUpdatePersona}
                onDelete={onDeletePersona}
              />
            </div>
          )}

          {activeTab === "resources" && (
            <div className="pt-3">
              <div className="px-4 pb-2">
                <p className="text-[10px] text-muted-foreground/70 leading-relaxed">
                  Resources are documents, forms, and media referenced by steps. Manage the library here; assign them per step in the Step Inspector.
                </p>
              </div>
              <ResourceEditor
                resources={data.resources}
                onAdd={onAddResource}
                onUpdate={onUpdateResource}
                onDelete={onDeleteResource}
              />
            </div>
          )}

          <div className="h-8" />
        </div>
      )}
    </div>
  );
};
