import { useState } from "react";
import { Persona } from "@/types/scenario";
import { Plus, Pencil, Trash2, Check, X, UserCircle2 } from "lucide-react";

interface PersonaEditorProps {
  personas: Persona[];
  onAdd: (persona: Persona) => void;
  onUpdate: (id: string, patch: Partial<Persona>) => void;
  onDelete: (id: string) => void;
}

const EMPTY_FORM: Omit<Persona, "id"> = {
  name: "",
  role: "",
  description: "",
  communicationStyle: "",
};

function generateId(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") || `persona-${Date.now()}`;
}

const FieldLabel = ({ children }: { children: React.ReactNode }) => (
  <span className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground/50 block mb-0.5">
    {children}
  </span>
);

const InlineInput = ({
  value,
  onChange,
  placeholder,
  autoFocus,
  multiline,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  multiline?: boolean;
}) => {
  const base =
    "w-full text-[11px] rounded-md border border-border/60 bg-background px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all";
  return multiline ? (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      autoFocus={autoFocus}
      rows={2}
      className={`${base} resize-none`}
    />
  ) : (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      autoFocus={autoFocus}
      className={base}
    />
  );
};

// ── Inline edit form (shared by add + edit) ──────────────────────
const PersonaForm = ({
  initial,
  onSave,
  onCancel,
  isNew,
}: {
  initial: Omit<Persona, "id">;
  onSave: (fields: Omit<Persona, "id">) => void;
  onCancel: () => void;
  isNew: boolean;
}) => {
  const [fields, setFields] = useState(initial);

  const set = (key: keyof typeof fields) => (v: string) =>
    setFields((prev) => ({ ...prev, [key]: v }));

  const canSave = fields.name.trim().length > 0 && fields.role.trim().length > 0;

  return (
    <div
      className="mx-3 mb-3 rounded-lg overflow-hidden"
      style={{
        border: isNew
          ? "1px dashed hsl(var(--border))"
          : "1px solid hsl(var(--primary) / 0.3)",
        background: isNew
          ? "hsl(var(--secondary) / 0.2)"
          : "hsl(var(--primary) / 0.03)",
      }}
    >
      <div className="px-3 py-2.5 space-y-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground/60">
            {isNew ? "New Character" : "Edit Character"}
          </span>
          <button
            onClick={onCancel}
            className="w-4 h-4 flex items-center justify-center rounded hover:bg-secondary text-muted-foreground"
          >
            <X className="w-3 h-3" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <FieldLabel>Name *</FieldLabel>
            <InlineInput
              value={fields.name}
              onChange={set("name")}
              placeholder="Character name…"
              autoFocus
            />
          </div>
          <div>
            <FieldLabel>Role *</FieldLabel>
            <InlineInput
              value={fields.role}
              onChange={set("role")}
              placeholder="e.g. Control Room Operator"
            />
          </div>
        </div>

        <div>
          <FieldLabel>Personality / Background</FieldLabel>
          <InlineInput
            value={fields.description ?? ""}
            onChange={set("description")}
            placeholder="Who is this character? What motivates them?"
            multiline
          />
        </div>

        <div>
          <FieldLabel>Communication Style</FieldLabel>
          <InlineInput
            value={fields.communicationStyle ?? ""}
            onChange={set("communicationStyle")}
            placeholder="e.g. Direct, concise, slightly defensive under pressure…"
          />
        </div>

        <button
          onClick={() => canSave && onSave(fields)}
          disabled={!canSave}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[11px] font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: "hsl(var(--primary))",
            color: "hsl(var(--primary-foreground))",
          }}
        >
          <Check className="w-3 h-3" />
          {isNew ? "Add Character" : "Save Changes"}
        </button>
      </div>
    </div>
  );
};

// ── Single persona card ──────────────────────────────────────────
const PersonaCard = ({
  persona,
  onUpdate,
  onDelete,
}: {
  persona: Persona;
  onUpdate: (id: string, patch: Partial<Persona>) => void;
  onDelete: (id: string) => void;
}) => {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <PersonaForm
        initial={{
          name: persona.name,
          role: persona.role,
          description: persona.description ?? "",
          communicationStyle: persona.communicationStyle ?? "",
        }}
        onSave={(fields) => {
          onUpdate(persona.id, fields);
          setEditing(false);
        }}
        onCancel={() => setEditing(false)}
        isNew={false}
      />
    );
  }

  return (
    <div
      className="mx-3 mb-2 rounded-lg overflow-hidden group"
      style={{ border: "1px solid hsl(var(--border))" }}
    >
      <div
        className="px-3 py-2.5 flex items-start gap-2.5"
        style={{ background: "hsl(var(--secondary) / 0.35)" }}
      >
        <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 bg-primary/10 text-primary">
          <UserCircle2 className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-semibold text-foreground leading-tight truncate">
            {persona.name}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{persona.role}</p>
          {persona.description && (
            <p className="text-[10px] text-muted-foreground/70 mt-1 leading-relaxed line-clamp-2">
              {persona.description}
            </p>
          )}
          {persona.communicationStyle && (
            <p
              className="text-[9px] mt-1.5 italic px-2 py-1 rounded"
              style={{
                background: "hsl(var(--primary) / 0.06)",
                color: "hsl(var(--primary) / 0.8)",
                border: "1px solid hsl(var(--primary) / 0.15)",
              }}
            >
              {persona.communicationStyle}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5">
          <button
            onClick={() => setEditing(true)}
            title="Edit character"
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-primary/10 text-muted-foreground/50 hover:text-primary transition-colors"
          >
            <Pencil className="w-3 h-3" />
          </button>
          <button
            onClick={() => onDelete(persona.id)}
            title="Remove character"
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-destructive/10 text-muted-foreground/50 hover:text-destructive transition-colors"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main export ──────────────────────────────────────────────────
export const PersonaEditor = ({ personas, onAdd, onUpdate, onDelete }: PersonaEditorProps) => {
  const [addingNew, setAddingNew] = useState(false);

  const handleAdd = (fields: Omit<Persona, "id">) => {
    const id = generateId(fields.name);
    const uniqueId = personas.some((p) => p.id === id) ? `${id}-${Date.now()}` : id;
    onAdd({ id: uniqueId, ...fields });
    setAddingNew(false);
  };

  return (
    <div className="flex flex-col gap-0">
      {personas.length === 0 && !addingNew && (
        <p className="mx-3 mb-3 text-[11px] text-muted-foreground/50 italic text-center py-4">
          No characters defined yet.
        </p>
      )}

      {personas.map((p) => (
        <PersonaCard key={p.id} persona={p} onUpdate={onUpdate} onDelete={onDelete} />
      ))}

      {addingNew ? (
        <PersonaForm
          initial={EMPTY_FORM}
          onSave={handleAdd}
          onCancel={() => setAddingNew(false)}
          isNew
        />
      ) : (
        <button
          onClick={() => setAddingNew(true)}
          className="mx-3 mb-2 flex items-center gap-1.5 px-3 py-2 rounded-lg border border-dashed border-border/60 text-[11px] text-muted-foreground hover:text-foreground hover:border-border transition-colors"
        >
          <Plus className="w-3.5 h-3.5 shrink-0" />
          Add character
        </button>
      )}
    </div>
  );
};
