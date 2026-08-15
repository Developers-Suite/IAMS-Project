import { useRef, useState, useEffect } from "react";
import { useTerm, type TermSummary } from "../lib/term-context";
import { Calendar, Lock, ChevronDown, CheckCircle2, X, RotateCcw } from "lucide-react";

function termTypeLabel(type: string): string {
  if (type === "short_term") return "Vacation";
  if (type === "regular") return "Semestral";
  return type || "Term";
}

function statusColor(status: string): string {
  if (status === "active") return "bg-emerald-500";
  if (status === "upcoming") return "bg-blue-400";
  if (status === "completed" || status === "archived") return "bg-violet-400";
  return "bg-gray-400";
}

export function TermSwitcher() {
  const { activeTerm, selectedTerm, isArchiveMode, allTerms, setSelectedTerm } = useTerm();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!selectedTerm && !activeTerm) return null;

  const liveTerms = allTerms.filter((t) => t.status === "active" || t.status === "upcoming");
  const archiveTerms = allTerms.filter(
    (t) => t.status === "completed" || t.status === "archived"
  );

  return (
    <div className="relative" ref={ref}>
      {/* Pill button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
          isArchiveMode
            ? "bg-amber-50 border-amber-300 text-amber-800 dark:bg-amber-500/10 dark:border-amber-500/40 dark:text-amber-300"
            : "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-300"
        }`}
        title={isArchiveMode ? "Viewing archived term — click to switch" : "Active term — click to browse archives"}
      >
        {isArchiveMode ? (
          <Lock className="w-3 h-3 shrink-0" />
        ) : (
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
        )}
        <span className="hidden sm:inline max-w-[120px] truncate">
          {selectedTerm?.name ?? activeTerm?.name ?? "No Term"}
        </span>
        <ChevronDown className="w-3 h-3 shrink-0 opacity-70" />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="fixed left-3 right-3 top-16 sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-1.5 sm:w-72 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden flex flex-col max-h-[calc(100dvh-5rem)] sm:max-h-[80vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-3 py-2.5 border-b border-border flex items-center justify-between shrink-0">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Term Workspace
            </p>
            <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-y-auto flex-1">
            {/* Live / Active */}
            {liveTerms.length > 0 && (
              <div className="px-3 pt-2.5">
                <p className="text-[0.62rem] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">
                  Live
                </p>
                {liveTerms.map((t) => (
                  <TermRow
                    key={t.id}
                    term={t}
                    selected={selectedTerm?.id === t.id}
                    onSelect={() => { setSelectedTerm(null); setOpen(false); }}
                  />
                ))}
              </div>
            )}

            {/* Archive */}
            {archiveTerms.length > 0 && (
              <div className="px-3 pt-2.5 pb-2">
                <p className="text-[0.62rem] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">
                  Archive
                </p>
                {archiveTerms.map((t) => (
                  <TermRow
                    key={t.id}
                    term={t}
                    selected={selectedTerm?.id === t.id}
                    onSelect={() => { setSelectedTerm(t); setOpen(false); }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Return to live CTA when in archive mode */}
          {isArchiveMode && (
            <div className="px-3 pb-3 pt-2 border-t border-border shrink-0">
              <button
                onClick={() => { setSelectedTerm(null); setOpen(false); }}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 text-xs bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
              >
                <RotateCcw className="w-3 h-3" /> Return to Live Term
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Row component ─────────────────────────────────────────────────────────────

function TermRow({
  term,
  selected,
  onSelect,
}: {
  term: TermSummary;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg mb-1 text-left transition-colors ${
        selected
          ? "bg-primary/10 border border-primary/30"
          : "hover:bg-muted/50"
      }`}
    >
      <span className={`w-2 h-2 rounded-full shrink-0 ${statusColor(term.status)}`} />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate">{term.name}</p>
        <p className="text-[0.65rem] text-muted-foreground">
          {termTypeLabel(term.type)} · {term.status}
        </p>
      </div>
      {selected && <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />}
    </button>
  );
}

// ── Archive banner (shown at top of every page when in archive mode) ──────────

export function ArchiveModeBanner() {
  const { isArchiveMode, selectedTerm, setSelectedTerm } = useTerm();
  if (!isArchiveMode || !selectedTerm) return null;

  return (
    <div className="w-full bg-amber-50 dark:bg-amber-500/10 border-b border-amber-200 dark:border-amber-500/30 px-4 py-2.5 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
        <p className="text-amber-800 dark:text-amber-200 text-xs">
          <span className="font-semibold">Viewing Archive:</span> {selectedTerm.name} —{" "}
          <span className="opacity-75">Read-only snapshot. Changes are disabled.</span>
        </p>
      </div>
      <button
        onClick={() => setSelectedTerm(null)}
        className="shrink-0 flex items-center gap-1 text-xs text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 font-medium transition-colors"
      >
        <RotateCcw className="w-3 h-3" /> Return to Live
      </button>
    </div>
  );
}
