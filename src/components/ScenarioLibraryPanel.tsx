import { useState } from "react";
import { Persona, ScenarioResource, ScenarioData } from "@/types/scenario";
import { PersonaEditor } from "./PersonaEditor";
import { ResourceEditor } from "./ResourceEditor";
import { X, Users, FileStack, Info } from "lucide-react";

type LibraryTab = "metadata" | "personas" | "resources";

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
  { id: "metadata", label: "Metadata", icon: Info },
  { id: "personas", label: "Characters", icon: Users },
  { id: "resources", label: "Resources", icon: FileStack },
];

const SectionHeader = ({ label }: { label: string }) => (
  <div className="flex items-center gap-2 px-4 pt-4 pb-2">
    <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">
      {label}
    </span>
    <div className="flex-1 h-px bg-border/50" />
  </div>
);

const MetadataRow = ({ label, value }: { label: string; value?: string }) => {
  if (!value) return null;
  return (
    <div className="px-4 pb-2">
      <p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-0.5">
        {label}
      </p>
      <p className="text-[11px] text-foreground leading-relaxed">{value}</p>
    </div>
  );
};

const MetadataTab = ({ data }: { data: ScenarioData }) => {
  const node = data.scenarioNode;
  return (
    <div className="flex-1 overflow-y-auto">
      <SectionHeader label="Scenario" />
      <MetadataRow label="Title" value={data.title} />
      <MetadataRow label="Description" value={node.description} />

      {data.globalTimers.length > 0 && (
        <>
          <SectionHeader label="Global Timers" />
          {data.globalTimers.map((t) => (
            <div key={t.id} className="mx-3 mb-2 px-3 py-2 rounded-lg" style={{ border: "1px solid hsl(var(--border))", background: "hsl(var(--secondary) / 0.35)" }}>
              <p className="text-[11px] font-semibold text-foreground">{t.name}</p>
              <p className="text-[9px] text-muted-foreground mt-0.5">
                Triggers after {Math.round(t.timeoutMs / 1000)}s → <span className="font-mono">{t.targetStepId}</span>
              </p>
            </div>
          ))}
        </>
      )}

      {data.outcomeNodes.length > 0 && (
        <>
          <SectionHeader label="Outcomes" />
          {data.outcomeNodes.map((o) => {
            const outcomeColorMap = {
              safe_path: { color: "hsl(145, 65%, 28%)", bg: "hsl(145, 65%, 95%)", border: "hsl(145, 65%, 78%)" },
              partial_failure: { color: "hsl(40, 75%, 30%)", bg: "hsl(40, 80%, 95%)", border: "hsl(40, 80%, 78%)" },
              critical_failure: { color: "hsl(0, 65%, 42%)", bg: "hsl(0, 65%, 96%)", border: "hsl(0, 65%, 80%)" },
            };
            const s = outcomeColorMap[o.outcome];
            return (
              <div
                key={o.id}
                className="mx-3 mb-2 px-3 py-2 rounded-lg"
                style={{ border: `1px solid ${s.border}`, background: s.bg }}
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  <p className="text-[11px] font-semibold" style={{ color: s.color }}>
                    {o.title}
                  </p>
                  <span
                    className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full"
                    style={{ background: s.border + "55", color: s.color }}
                  >
                    {o.outcome.replace("_", " ")}
                  </span>
                </div>
                {o.description && (
                  <p className="text-[10px] leading-relaxed" style={{ color: s.color + "cc" }}>
                    {o.description}
                  </p>
                )}
              </div>
            );
          })}
        </>
      )}

      <div className="h-8" />
    </div>
  );
};

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
          {activeTab === "metadata" && <MetadataTab data={data} />}

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
