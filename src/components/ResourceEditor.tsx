import { useState, useRef, useCallback } from "react";
import { ScenarioResource, CheckboxItem } from "@/types/scenario";
import {
  Plus, Pencil, Trash2, Check, X, FileText, ExternalLink,
  Upload, File, Link, XCircle, CheckSquare,
} from "lucide-react";

interface ResourceEditorProps {
  resources: ScenarioResource[];
  onAdd: (resource: ScenarioResource) => void;
  onUpdate: (id: string, patch: Partial<ScenarioResource>) => void;
  onDelete: (id: string) => void;
}

const EMPTY_FORM: Omit<ScenarioResource, "id"> = {
  title: "",
  type: "",
  description: "",
  url: "",
  fileName: "",
  checkboxItems: [],
};

const RESOURCE_TYPES = ["Document", "Video", "Checklist", "Form", "Reference", "Tool", "Other"];

const ACCEPTED_TYPES = ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.png,.jpg,.jpeg,.mp4,.mp3";

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

// ── File upload zone ──────────────────────────────────────────────
const FileUploadZone = ({
  fileName,
  onFileSelect,
  onClear,
  urlMode,
  onToggleUrlMode,
  urlValue,
  onUrlChange,
}: {
  fileName: string;
  onFileSelect: (file: File) => void;
  onClear: () => void;
  urlMode: boolean;
  onToggleUrlMode: () => void;
  urlValue: string;
  onUrlChange: (v: string) => void;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) onFileSelect(file);
    },
    [onFileSelect]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => setDragging(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileSelect(file);
    e.target.value = "";
  };

  if (urlMode) {
    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <FieldLabel>URL</FieldLabel>
          <button
            type="button"
            onClick={onToggleUrlMode}
            className="text-[8px] font-semibold text-primary/70 hover:text-primary transition-colors flex items-center gap-0.5"
          >
            <Upload className="w-2.5 h-2.5" />
            Upload file instead
          </button>
        </div>
        <InlineInput
          value={urlValue}
          onChange={onUrlChange}
          placeholder="https://…"
          autoFocus
        />
      </div>
    );
  }

  if (fileName) {
    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <FieldLabel>File</FieldLabel>
          <button
            type="button"
            onClick={onToggleUrlMode}
            className="text-[8px] font-semibold text-muted-foreground/50 hover:text-primary transition-colors flex items-center gap-0.5"
          >
            <Link className="w-2.5 h-2.5" />
            Use URL instead
          </button>
        </div>
        <div
          className="flex items-center gap-2 px-2.5 py-2 rounded-md"
          style={{ border: "1px solid hsl(var(--primary) / 0.3)", background: "hsl(var(--primary) / 0.04)" }}
        >
          <File className="w-3.5 h-3.5 shrink-0 text-primary/60" />
          <span className="flex-1 text-[11px] font-medium text-foreground truncate min-w-0">
            {fileName}
          </span>
          <button
            type="button"
            onClick={onClear}
            className="shrink-0 text-muted-foreground/40 hover:text-destructive transition-colors"
          >
            <XCircle className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <FieldLabel>File</FieldLabel>
        <button
          type="button"
          onClick={onToggleUrlMode}
          className="text-[8px] font-semibold text-muted-foreground/50 hover:text-primary transition-colors flex items-center gap-0.5"
        >
          <Link className="w-2.5 h-2.5" />
          Paste URL instead
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES}
        onChange={handleInputChange}
        className="hidden"
      />
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
        className="flex flex-col items-center justify-center gap-1.5 px-3 py-4 rounded-md border-2 border-dashed cursor-pointer transition-all"
        style={{
          borderColor: dragging
            ? "hsl(var(--primary) / 0.6)"
            : "hsl(var(--border))",
          background: dragging
            ? "hsl(var(--primary) / 0.04)"
            : "hsl(var(--secondary) / 0.2)",
        }}
      >
        <Upload
          className="w-4 h-4 transition-colors"
          style={{ color: dragging ? "hsl(var(--primary))" : "hsl(var(--muted-foreground) / 0.4)" }}
        />
        <span className="text-[10px] text-muted-foreground/60 text-center">
          <span className="font-semibold text-foreground/70">Browse</span> or drag & drop
        </span>
        <span className="text-[8px] text-muted-foreground/40">
          PDF, Word, Excel, PPT, image, video…
        </span>
      </div>
    </div>
  );
};

// ── Checkbox items editor ─────────────────────────────────────────
const CheckboxItemsEditor = ({
  items,
  onChange,
}: {
  items: CheckboxItem[];
  onChange: (items: CheckboxItem[]) => void;
}) => {
  const handleAdd = () => {
    const newId = `cb-${Date.now()}`;
    onChange([...items, { id: newId, name: "" }]);
  };

  const handleUpdate = (idx: number, name: string) => {
    const next = items.map((item, i) => (i === idx ? { ...item, name } : item));
    onChange(next);
  };

  const handleDelete = (idx: number) => {
    onChange(items.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <FieldLabel>Checkbox Items</FieldLabel>
        <span className="text-[8px] text-muted-foreground/40 italic">optional</span>
      </div>
      {items.length > 0 && (
        <div className="space-y-1">
          {items.map((item, idx) => (
            <div key={item.id} className="flex items-center gap-1.5">
              <CheckSquare className="w-3 h-3 shrink-0 text-muted-foreground/40" />
              <input
                type="text"
                value={item.name}
                onChange={(e) => handleUpdate(idx, e.target.value)}
                placeholder={`Checkbox ${idx + 1} name…`}
                className="flex-1 text-[11px] rounded-md border border-border/50 bg-background px-2 py-1 outline-none focus:ring-2 focus:ring-primary/20"
              />
              <button
                type="button"
                onClick={() => handleDelete(idx)}
                className="w-5 h-5 flex items-center justify-center rounded hover:bg-destructive/10 text-muted-foreground/40 hover:text-destructive transition-colors shrink-0"
              >
                <Trash2 className="w-2.5 h-2.5" />
              </button>
            </div>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={handleAdd}
        className="flex items-center gap-1 text-[10px] text-muted-foreground/60 hover:text-primary transition-colors"
      >
        <Plus className="w-3 h-3" />
        Add checkbox item
      </button>
    </div>
  );
};

// ── Resource form ─────────────────────────────────────────────────
const ResourceForm = ({
  initial,
  initialId,
  onSave,
  onCancel,
  isNew,
  existingIds,
}: {
  initial: Omit<ScenarioResource, "id">;
  initialId?: string;
  onSave: (id: string, fields: Omit<ScenarioResource, "id">) => void;
  onCancel: () => void;
  isNew: boolean;
  existingIds: string[];
}) => {
  const [id, setId] = useState(initialId ?? "");
  const [fields, setFields] = useState(initial);
  const [urlMode, setUrlMode] = useState(
    !!(initial.url && !initial.fileName) && initial.url.startsWith("http")
  );

  const set = (key: keyof typeof fields) => (v: string) =>
    setFields((prev) => ({ ...prev, [key]: v }));

  const handleFileSelect = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setFields((prev) => ({ ...prev, url: dataUrl, fileName: file.name }));
      if (!fields.title) {
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
        setFields((prev) => ({
          ...prev,
          url: dataUrl,
          fileName: file.name,
          title: prev.title || nameWithoutExt,
        }));
      }
    };
    reader.readAsDataURL(file);
    setUrlMode(false);
  };

  const handleClearFile = () => {
    setFields((prev) => ({ ...prev, url: "", fileName: "" }));
  };

  const handleToggleUrlMode = () => {
    if (!urlMode) {
      setFields((prev) => ({ ...prev, url: "", fileName: "" }));
    }
    setUrlMode((v) => !v);
  };

  const canSave =
    fields.title.trim().length > 0 &&
    fields.type.trim().length > 0 &&
    id.trim().length > 0 &&
    (!isNew || !existingIds.includes(id.trim()));

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
            {isNew ? "New Resource" : "Edit Resource"}
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
            <FieldLabel>ID *</FieldLabel>
            <input
              type="text"
              value={id}
              onChange={(e) => setId(e.target.value.toUpperCase().replace(/\s/g, "_"))}
              placeholder="e.g. PTW"
              disabled={!isNew}
              autoFocus={isNew}
              className="w-full text-[11px] rounded-md border border-border/60 bg-background px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all font-mono disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
          <div>
            <FieldLabel>Type *</FieldLabel>
            <select
              value={fields.type}
              onChange={(e) => set("type")(e.target.value)}
              className="w-full text-[11px] rounded-md border border-border/60 bg-background px-2 py-1.5 outline-none focus:ring-2 focus:ring-primary/30 transition-all"
            >
              <option value="">Select type…</option>
              {RESOURCE_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <FieldLabel>Title *</FieldLabel>
          <InlineInput
            value={fields.title}
            onChange={set("title")}
            placeholder="Resource title…"
            autoFocus={!isNew}
          />
        </div>

        <div>
          <FieldLabel>Description</FieldLabel>
          <InlineInput
            value={fields.description ?? ""}
            onChange={set("description")}
            placeholder="What is this resource for?"
            multiline
          />
        </div>

        <FileUploadZone
          fileName={fields.fileName ?? ""}
          onFileSelect={handleFileSelect}
          onClear={handleClearFile}
          urlMode={urlMode}
          onToggleUrlMode={handleToggleUrlMode}
          urlValue={fields.url ?? ""}
          onUrlChange={set("url")}
        />

        <CheckboxItemsEditor
          items={fields.checkboxItems ?? []}
          onChange={(items) =>
            setFields((prev) => ({ ...prev, checkboxItems: items.length > 0 ? items : undefined }))
          }
        />

        <button
          onClick={() => canSave && onSave(id.trim(), fields)}
          disabled={!canSave}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[11px] font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: "hsl(var(--primary))",
            color: "hsl(var(--primary-foreground))",
          }}
        >
          <Check className="w-3 h-3" />
          {isNew ? "Add Resource" : "Save Changes"}
        </button>
      </div>
    </div>
  );
};

const typeColors: Record<string, string> = {
  Document: "hsl(220, 65%, 52%)",
  Video: "hsl(280, 60%, 50%)",
  Checklist: "hsl(145, 55%, 38%)",
  Form: "hsl(40, 70%, 38%)",
  Reference: "hsl(180, 50%, 40%)",
  Tool: "hsl(0, 60%, 48%)",
  Other: "hsl(var(--muted-foreground))",
};

const ResourceCard = ({
  resource,
  allIds,
  onUpdate,
  onDelete,
}: {
  resource: ScenarioResource;
  allIds: string[];
  onUpdate: (id: string, patch: Partial<ScenarioResource>) => void;
  onDelete: (id: string) => void;
}) => {
  const [editing, setEditing] = useState(false);
  const color = typeColors[resource.type] ?? typeColors.Other;

  const hasFile = !!resource.fileName;
  const hasUrl = !!resource.url && !hasFile;

  if (editing) {
    return (
      <ResourceForm
        initial={{
          title: resource.title,
          type: resource.type,
          description: resource.description ?? "",
          url: resource.url ?? "",
          fileName: resource.fileName ?? "",
          checkboxItems: resource.checkboxItems ?? [],
        }}
        initialId={resource.id}
        onSave={(_id, fields) => {
          onUpdate(resource.id, fields);
          setEditing(false);
        }}
        onCancel={() => setEditing(false)}
        isNew={false}
        existingIds={allIds.filter((id) => id !== resource.id)}
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
        <div
          className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
          style={{ background: `${color}18`, color }}
        >
          <FileText className="w-3.5 h-3.5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-[12px] font-semibold text-foreground leading-tight truncate">
              {resource.title}
            </p>
            {hasFile && (
              <span
                className="text-[7px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 flex items-center gap-0.5"
                style={{ background: "hsl(var(--primary) / 0.08)", color: "hsl(var(--primary) / 0.7)", border: "1px solid hsl(var(--primary) / 0.15)" }}
              >
                <File className="w-2 h-2" />
                {resource.fileName}
              </span>
            )}
            {hasUrl && (
              <a
                href={resource.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground/40 hover:text-primary transition-colors shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span
              className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full"
              style={{ background: `${color}18`, color, border: `1px solid ${color}33` }}
            >
              {resource.type}
            </span>
            <span
              className="text-[8px] font-mono text-muted-foreground/50 px-1 py-0.5 rounded"
              style={{ background: "hsl(var(--muted))" }}
            >
              {resource.id}
            </span>
          </div>
          {resource.description && (
            <p className="text-[10px] text-muted-foreground/70 mt-1 leading-relaxed line-clamp-2">
              {resource.description}
            </p>
          )}
          {resource.checkboxItems && resource.checkboxItems.length > 0 && (
            <div className="flex items-center gap-1 mt-1">
              <CheckSquare className="w-2.5 h-2.5 text-muted-foreground/50" />
              <span className="text-[9px] text-muted-foreground/60">
                {resource.checkboxItems.length} checkbox{resource.checkboxItems.length !== 1 ? "es" : ""}
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5">
          <button
            onClick={() => setEditing(true)}
            title="Edit resource"
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-primary/10 text-muted-foreground/50 hover:text-primary transition-colors"
          >
            <Pencil className="w-3 h-3" />
          </button>
          <button
            onClick={() => onDelete(resource.id)}
            title="Remove resource"
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-destructive/10 text-muted-foreground/50 hover:text-destructive transition-colors"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};

export const ResourceEditor = ({ resources, onAdd, onUpdate, onDelete }: ResourceEditorProps) => {
  const [addingNew, setAddingNew] = useState(false);
  const existingIds = resources.map((r) => r.id);

  const handleAdd = (id: string, fields: Omit<ScenarioResource, "id">) => {
    onAdd({ id, ...fields });
    setAddingNew(false);
  };

  return (
    <div className="flex flex-col gap-0">
      {resources.length === 0 && !addingNew && (
        <p className="mx-3 mb-3 text-[11px] text-muted-foreground/50 italic text-center py-4">
          No resources defined yet.
        </p>
      )}

      {resources.map((r) => (
        <ResourceCard
          key={r.id}
          resource={r}
          allIds={existingIds}
          onUpdate={onUpdate}
          onDelete={onDelete}
        />
      ))}

      {addingNew ? (
        <ResourceForm
          initial={EMPTY_FORM}
          onSave={handleAdd}
          onCancel={() => setAddingNew(false)}
          isNew
          existingIds={existingIds}
        />
      ) : (
        <button
          onClick={() => setAddingNew(true)}
          className="mx-3 mb-2 flex items-center gap-1.5 px-3 py-2 rounded-lg border border-dashed border-border/60 text-[11px] text-muted-foreground hover:text-foreground hover:border-border transition-colors"
        >
          <Plus className="w-3.5 h-3.5 shrink-0" />
          Add resource
        </button>
      )}
    </div>
  );
};
