import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useModuleContext } from "@/contexts/ModuleContext";
import { PersonaEditor } from "@/components/PersonaEditor";
import { ResourceEditor } from "@/components/ResourceEditor";
import { JsonModule } from "@/data/transformScenario";
import {
  Plus, Trash2, Download, Upload, ChevronDown, ChevronRight,
  Users, FileStack, BookOpen, Pencil,
} from "lucide-react";

const ModuleManager = () => {
  const navigate = useNavigate();
  const editor = useModuleContext();
  const [expandedModuleId, setExpandedModuleId] = useState<string | null>(
    editor.modules[0]?.id ?? null
  );
  const [creatingModule, setCreatingModule] = useState(false);
  const [newModTitle, setNewModTitle] = useState("");
  const [newModDesc, setNewModDesc] = useState("");
  const [addingScenario, setAddingScenario] = useState<string | null>(null);
  const [newScenTitle, setNewScenTitle] = useState("");
  const [newScenDesc, setNewScenDesc] = useState("");
  const [activeTab, setActiveTab] = useState<Record<string, "scenarios" | "characters" | "resources">>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getTab = (moduleId: string) => activeTab[moduleId] ?? "scenarios";
  const setTab = (moduleId: string, tab: "scenarios" | "characters" | "resources") =>
    setActiveTab((prev) => ({ ...prev, [moduleId]: tab }));

  const toggleExpand = (id: string) =>
    setExpandedModuleId((prev) => (prev === id ? null : id));

  const handleCreateModule = () => {
    if (!newModTitle.trim()) return;
    const id = editor.createModule(newModTitle.trim(), newModDesc.trim());
    setCreatingModule(false);
    setNewModTitle("");
    setNewModDesc("");
    setExpandedModuleId(id);
  };

  const handleAddScenario = (moduleId: string) => {
    if (!newScenTitle.trim()) return;
    const scenarioId = editor.addScenario(moduleId, newScenTitle.trim(), newScenDesc.trim());
    setAddingScenario(null);
    setNewScenTitle("");
    setNewScenDesc("");
    navigate(`/module/${moduleId}/scenario/${scenarioId}`);
  };

  const handleImport = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const json = JSON.parse(ev.target?.result as string) as JsonModule;
          const id = editor.importModule(json);
          setExpandedModuleId(id);
        } catch {
          alert("Invalid module JSON file.");
        }
      };
      reader.readAsText(file);
      e.target.value = "";
    },
    [editor]
  );

  const btnBase =
    "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors";

  return (
    <div className="flex flex-col w-full h-screen overflow-hidden bg-background">
      {/* Header */}
      <div className="shrink-0 border-b border-border bg-background">
        <div className="px-6 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold text-foreground">Module Manager</h1>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {editor.modules.length} module{editor.modules.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className={`${btnBase} border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted`}
            >
              <Upload className="w-3.5 h-3.5" />
              Import Module
            </button>
            <button
              onClick={() => setCreatingModule(true)}
              className={`${btnBase} border-primary/40 bg-primary/5 text-primary hover:bg-primary/10`}
            >
              <Plus className="w-3.5 h-3.5" />
              Create Module
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-6 space-y-4">
          {/* New module form */}
          {creatingModule && (
            <div
              className="rounded-xl border-2 border-dashed border-primary/30 bg-primary/[0.02] p-5 space-y-3"
            >
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                New Module
              </p>
              <input
                type="text"
                value={newModTitle}
                onChange={(e) => setNewModTitle(e.target.value)}
                placeholder="Module title…"
                autoFocus
                className="w-full text-sm font-semibold rounded-md border border-border/60 bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-primary/30"
              />
              <textarea
                value={newModDesc}
                onChange={(e) => setNewModDesc(e.target.value)}
                placeholder="Description (optional)…"
                rows={2}
                className="w-full text-[11px] rounded-md border border-border/60 bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCreateModule}
                  disabled={!newModTitle.trim()}
                  className="px-4 py-1.5 rounded-md text-[11px] font-semibold disabled:opacity-40"
                  style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}
                >
                  Create
                </button>
                <button
                  onClick={() => { setCreatingModule(false); setNewModTitle(""); setNewModDesc(""); }}
                  className="px-3 py-1.5 rounded-md text-[11px] font-medium text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Module cards */}
          {editor.modules.map((mod) => {
            const isExpanded = expandedModuleId === mod.id;
            const tab = getTab(mod.id);

            return (
              <div
                key={mod.id}
                className="rounded-xl border border-border bg-card shadow-sm overflow-hidden"
              >
                {/* Module header */}
                <button
                  onClick={() => toggleExpand(mod.id)}
                  className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-muted/30 transition-colors"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <h2 className="text-sm font-bold text-foreground truncate">{mod.title}</h2>
                    <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                      {mod.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <BookOpen className="w-3 h-3" />
                      {mod.scenarios.length}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {mod.personas.length}
                    </span>
                    <span className="flex items-center gap-1">
                      <FileStack className="w-3 h-3" />
                      {mod.resources.length}
                    </span>
                  </div>
                </button>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="border-t border-border">
                    {/* Module actions */}
                    <div className="flex items-center gap-2 px-5 py-2 bg-muted/20 border-b border-border/50">
                      <button
                        onClick={() => editor.exportModule(mod.id)}
                        className={`${btnBase} border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted`}
                      >
                        <Download className="w-3 h-3" />
                        Export
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Delete module "${mod.title}"? This cannot be undone.`)) {
                            editor.deleteModule(mod.id);
                            if (expandedModuleId === mod.id) setExpandedModuleId(null);
                          }
                        }}
                        className={`${btnBase} border-destructive/30 text-destructive/70 hover:text-destructive hover:bg-destructive/5`}
                      >
                        <Trash2 className="w-3 h-3" />
                        Delete Module
                      </button>
                    </div>

                    {/* Tabs */}
                    <div className="flex border-b border-border/50">
                      {(
                        [
                          { id: "scenarios" as const, label: "Scenarios", icon: BookOpen, count: mod.scenarios.length },
                          { id: "characters" as const, label: "Characters", icon: Users, count: mod.personas.length },
                          { id: "resources" as const, label: "Resources", icon: FileStack, count: mod.resources.length },
                        ] as const
                      ).map(({ id, label, icon: Icon, count }) => (
                        <button
                          key={id}
                          onClick={() => setTab(mod.id, id)}
                          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-semibold transition-colors ${
                            tab === id
                              ? "text-primary border-b-2 border-primary"
                              : "text-muted-foreground hover:text-foreground border-b-2 border-transparent"
                          }`}
                        >
                          <Icon className="w-3 h-3" />
                          {label}
                          {count > 0 && (
                            <span className="text-[8px] px-1 py-0.5 rounded-full bg-secondary text-muted-foreground">
                              {count}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>

                    {/* Tab content */}
                    <div className="p-4">
                      {tab === "scenarios" && (
                        <div className="space-y-2">
                          {mod.scenarios.length === 0 && !addingScenario && (
                            <p className="text-[11px] text-muted-foreground/50 italic text-center py-6">
                              No scenarios yet. Add one to get started.
                            </p>
                          )}

                          {mod.scenarios.map((s) => (
                            <div
                              key={s.scenarioNode.id}
                              className="group flex items-center gap-3 px-4 py-3 rounded-lg border border-border/60 hover:border-border hover:bg-muted/20 transition-colors cursor-pointer"
                              onClick={() => navigate(`/module/${mod.id}/scenario/${s.scenarioNode.id}`)}
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-[12px] font-semibold text-foreground truncate">
                                  {s.title}
                                </p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                  {s.scenarioNode.steps?.length ?? 0} steps · {s.outcomeNodes.length} outcomes
                                </p>
                              </div>
                              <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/module/${mod.id}/scenario/${s.scenarioNode.id}`);
                                  }}
                                  className="px-2 py-1 rounded text-[9px] font-semibold text-primary hover:bg-primary/10 transition-colors"
                                >
                                  <Pencil className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (confirm(`Delete scenario "${s.title}"?`)) {
                                      editor.deleteScenario(mod.id, s.scenarioNode.id);
                                    }
                                  }}
                                  className="px-2 py-1 rounded text-[9px] text-destructive/60 hover:text-destructive hover:bg-destructive/10 transition-colors"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ))}

                          {addingScenario === mod.id ? (
                            <div className="rounded-lg border-2 border-dashed border-border/60 p-4 space-y-2">
                              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                                New Scenario
                              </p>
                              <input
                                type="text"
                                value={newScenTitle}
                                onChange={(e) => setNewScenTitle(e.target.value)}
                                placeholder="Scenario title…"
                                autoFocus
                                className="w-full text-[12px] font-semibold rounded-md border border-border/60 bg-background px-3 py-1.5 outline-none focus:ring-2 focus:ring-primary/30"
                              />
                              <textarea
                                value={newScenDesc}
                                onChange={(e) => setNewScenDesc(e.target.value)}
                                placeholder="Description (optional)…"
                                rows={2}
                                className="w-full text-[11px] rounded-md border border-border/60 bg-background px-3 py-1.5 outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                              />
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleAddScenario(mod.id)}
                                  disabled={!newScenTitle.trim()}
                                  className="px-3 py-1.5 rounded-md text-[11px] font-semibold disabled:opacity-40"
                                  style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}
                                >
                                  Create & Edit
                                </button>
                                <button
                                  onClick={() => { setAddingScenario(null); setNewScenTitle(""); setNewScenDesc(""); }}
                                  className="px-3 py-1.5 rounded-md text-[11px] text-muted-foreground hover:text-foreground"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => setAddingScenario(mod.id)}
                              className="w-full flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-dashed border-border/60 text-[11px] text-muted-foreground hover:text-foreground hover:border-border transition-colors"
                            >
                              <Plus className="w-3.5 h-3.5 shrink-0" />
                              Add scenario
                            </button>
                          )}
                        </div>
                      )}

                      {tab === "characters" && (
                        <div>
                          <p className="text-[10px] text-muted-foreground/70 leading-relaxed mb-3">
                            Characters are shared across all scenarios in this module.
                          </p>
                          <PersonaEditor
                            personas={mod.personas}
                            onAdd={(p) => editor.addPersona(mod.id, p)}
                            onUpdate={(id, patch) => editor.updatePersona(mod.id, id, patch)}
                            onDelete={(id) => editor.deletePersona(mod.id, id)}
                          />
                        </div>
                      )}

                      {tab === "resources" && (
                        <div>
                          <p className="text-[10px] text-muted-foreground/70 leading-relaxed mb-3">
                            Resources are shared across all scenarios in this module.
                          </p>
                          <ResourceEditor
                            resources={mod.resources}
                            onAdd={(r) => editor.addResource(mod.id, r)}
                            onUpdate={(id, patch) => editor.updateResource(mod.id, id, patch)}
                            onDelete={(id) => editor.deleteResource(mod.id, id)}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ModuleManager;
