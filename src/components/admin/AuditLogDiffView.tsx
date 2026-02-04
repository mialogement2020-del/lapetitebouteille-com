import { useMemo } from "react";
import { ArrowRight, Minus, Plus, Equal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Json } from "@/integrations/supabase/types";

interface DiffEntry {
  key: string;
  type: "added" | "removed" | "changed" | "unchanged";
  oldValue?: unknown;
  newValue?: unknown;
}

interface AuditLogDiffViewProps {
  oldValues: Json | null;
  newValues: Json | null;
}

function formatValue(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return value.toString();
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return JSON.stringify(value);
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function computeDiff(oldObj: Record<string, unknown> | null, newObj: Record<string, unknown> | null): DiffEntry[] {
  const diff: DiffEntry[] = [];
  const allKeys = new Set<string>();

  if (oldObj) Object.keys(oldObj).forEach((k) => allKeys.add(k));
  if (newObj) Object.keys(newObj).forEach((k) => allKeys.add(k));

  const sortedKeys = Array.from(allKeys).sort();

  for (const key of sortedKeys) {
    const oldVal = oldObj?.[key];
    const newVal = newObj?.[key];
    const oldExists = oldObj && key in oldObj;
    const newExists = newObj && key in newObj;

    if (!oldExists && newExists) {
      diff.push({ key, type: "added", newValue: newVal });
    } else if (oldExists && !newExists) {
      diff.push({ key, type: "removed", oldValue: oldVal });
    } else if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      diff.push({ key, type: "changed", oldValue: oldVal, newValue: newVal });
    } else {
      diff.push({ key, type: "unchanged", oldValue: oldVal, newValue: newVal });
    }
  }

  return diff;
}

export function AuditLogDiffView({ oldValues, newValues }: AuditLogDiffViewProps) {
  const diff = useMemo(() => {
    const oldObj = oldValues && typeof oldValues === "object" && !Array.isArray(oldValues)
      ? (oldValues as Record<string, unknown>)
      : null;
    const newObj = newValues && typeof newValues === "object" && !Array.isArray(newValues)
      ? (newValues as Record<string, unknown>)
      : null;
    
    return computeDiff(oldObj, newObj);
  }, [oldValues, newValues]);

  const hasChanges = diff.some((d) => d.type !== "unchanged");

  if (!hasChanges && diff.length === 0) {
    return (
      <div className="text-center py-6 text-cream/50">
        <p className="text-sm">Aucun détail de modification disponible</p>
      </div>
    );
  }

  const changedEntries = diff.filter((d) => d.type !== "unchanged");
  const unchangedEntries = diff.filter((d) => d.type === "unchanged");

  return (
    <div className="space-y-3">
      {/* Summary badges */}
      <div className="flex flex-wrap gap-2">
        {changedEntries.filter((d) => d.type === "added").length > 0 && (
          <Badge className="bg-success/20 text-success border-success/30 text-xs">
            <Plus className="h-3 w-3 mr-1" />
            {changedEntries.filter((d) => d.type === "added").length} ajouté(s)
          </Badge>
        )}
        {changedEntries.filter((d) => d.type === "removed").length > 0 && (
          <Badge className="bg-destructive/20 text-destructive border-destructive/30 text-xs">
            <Minus className="h-3 w-3 mr-1" />
            {changedEntries.filter((d) => d.type === "removed").length} supprimé(s)
          </Badge>
        )}
        {changedEntries.filter((d) => d.type === "changed").length > 0 && (
          <Badge className="bg-warning/20 text-warning border-warning/30 text-xs">
            <ArrowRight className="h-3 w-3 mr-1" />
            {changedEntries.filter((d) => d.type === "changed").length} modifié(s)
          </Badge>
        )}
        {unchangedEntries.length > 0 && (
          <Badge variant="outline" className="border-cream/20 text-cream/50 text-xs">
            <Equal className="h-3 w-3 mr-1" />
            {unchangedEntries.length} inchangé(s)
          </Badge>
        )}
      </div>

      {/* Diff table */}
      <ScrollArea className="max-h-[300px]">
        <div className="space-y-1">
          {/* Changed entries first */}
          {changedEntries.map((entry) => (
            <DiffRow key={entry.key} entry={entry} />
          ))}

          {/* Unchanged entries (collapsed by default, but shown dimmed) */}
          {unchangedEntries.length > 0 && changedEntries.length > 0 && (
            <div className="pt-2 border-t border-gold/10 mt-2">
              <p className="text-xs text-cream/40 mb-1">Valeurs inchangées</p>
              {unchangedEntries.map((entry) => (
                <DiffRow key={entry.key} entry={entry} />
              ))}
            </div>
          )}

          {/* Only unchanged entries */}
          {unchangedEntries.length > 0 && changedEntries.length === 0 && (
            <>
              {unchangedEntries.map((entry) => (
                <DiffRow key={entry.key} entry={entry} />
              ))}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function DiffRow({ entry }: { entry: DiffEntry }) {
  const { key, type, oldValue, newValue } = entry;

  const getBgColor = () => {
    switch (type) {
      case "added":
        return "bg-success/10 border-l-2 border-l-success";
      case "removed":
        return "bg-destructive/10 border-l-2 border-l-destructive";
      case "changed":
        return "bg-warning/10 border-l-2 border-l-warning";
      default:
        return "bg-cream/5 border-l-2 border-l-cream/20";
    }
  };

  const getIcon = () => {
    switch (type) {
      case "added":
        return <Plus className="h-3 w-3 text-success" />;
      case "removed":
        return <Minus className="h-3 w-3 text-destructive" />;
      case "changed":
        return <ArrowRight className="h-3 w-3 text-warning" />;
      default:
        return <Equal className="h-3 w-3 text-cream/30" />;
    }
  };

  return (
    <div className={`rounded-r px-3 py-2 ${getBgColor()}`}>
      <div className="flex items-start gap-2">
        <div className="mt-0.5">{getIcon()}</div>
        <div className="flex-1 min-w-0">
          <span className="text-xs font-medium text-cream/70">{key}</span>
          
          {type === "added" && (
            <div className="mt-1">
              <span className="text-xs text-success bg-success/20 px-1.5 py-0.5 rounded">
                {formatValue(newValue)}
              </span>
            </div>
          )}

          {type === "removed" && (
            <div className="mt-1">
              <span className="text-xs text-destructive bg-destructive/20 px-1.5 py-0.5 rounded line-through">
                {formatValue(oldValue)}
              </span>
            </div>
          )}

          {type === "changed" && (
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="text-xs text-destructive bg-destructive/20 px-1.5 py-0.5 rounded line-through">
                {formatValue(oldValue)}
              </span>
              <ArrowRight className="h-3 w-3 text-cream/40" />
              <span className="text-xs text-success bg-success/20 px-1.5 py-0.5 rounded">
                {formatValue(newValue)}
              </span>
            </div>
          )}

          {type === "unchanged" && (
            <div className="mt-1">
              <span className="text-xs text-cream/40">
                {formatValue(oldValue)}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
