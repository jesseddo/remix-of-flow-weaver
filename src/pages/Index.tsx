import { useState, useMemo, useCallback } from "react";
import NodeCanvas from "@/components/NodeCanvas";
import originalJson from "@/data/scenarios.json";
import scriptJson from "@/data/scenarios-script.json";
import { transformScenario, JsonScenario } from "@/data/transformScenario";

const sources = [
  { key: "original", label: "Original", data: originalJson as JsonScenario[] },
  { key: "script", label: "Script (V3)", data: scriptJson as JsonScenario[] },
];

const Index = () => {
  const [sourceKey, setSourceKey] = useState(sources[0].key);

  const availableScenarios = useMemo(() => {
    const src = sources.find((s) => s.key === sourceKey)!;
    return src.data.filter((s) => s.scenes && s.scenes.length > 0);
  }, [sourceKey]);

  const [selectedId, setSelectedId] = useState(availableScenarios[0]?.id ?? "");

  const activeId = availableScenarios.find((s) => s.id === selectedId)
    ? selectedId
    : availableScenarios[0]?.id ?? "";

  const handleSourceChange = useCallback(
    (key: string) => {
      setSourceKey(key);
      const next = sources.find((s) => s.key === key)!;
      const nextAvailable = next.data.filter((s) => s.scenes && s.scenes.length > 0);
      setSelectedId(nextAvailable[0]?.id ?? "");
    },
    [],
  );

  const scenarioData = useMemo(() => {
    const json = availableScenarios.find((s) => s.id === activeId);
    return json ? transformScenario(json) : null;
  }, [activeId, availableScenarios]);

  if (availableScenarios.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen text-muted-foreground">
        No scenarios with scenes found.
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen">
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3">
        {/* Source toggle */}
        <div className="flex rounded-lg border border-border bg-background shadow-sm overflow-hidden">
          {sources.map((src) => (
            <button
              key={src.key}
              onClick={() => handleSourceChange(src.key)}
              className={`px-4 py-1.5 text-sm font-medium transition-colors ${
                sourceKey === src.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {src.label}
            </button>
          ))}
        </div>

        {/* Scenario dropdown */}
        {availableScenarios.length > 1 && (
          <select
            value={activeId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="bg-background border border-border rounded-md px-3 py-1.5 text-sm font-medium text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            {availableScenarios.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title} ({s.version})
              </option>
            ))}
          </select>
        )}
      </div>

      {scenarioData ? (
        <NodeCanvas key={activeId} scenario={scenarioData} />
      ) : (
        <div className="flex items-center justify-center h-screen text-muted-foreground">
          Could not parse selected scenario
        </div>
      )}
    </div>
  );
};

export default Index;
