import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { apiClient } from "./api-client";
import { useAppContext } from "./context";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface TermSummary {
  id: number;
  name: string;
  status: string; // "active" | "upcoming" | "completed" | "archived" | "draft"
  type: string;   // "regular" | "short_term"
  start_date?: string;
  end_date?: string;
}

interface TermContextType {
  /** The system's currently live/active term (null if none). */
  activeTerm: TermSummary | null;
  /** The term the current user is viewing (defaults to activeTerm). */
  selectedTerm: TermSummary | null;
  /** Convenience: the id of selectedTerm, ready to pass as `term_id` to API calls. */
  selectedTermId: number | null;
  /** True when the user has switched to an archived/past term. */
  isArchiveMode: boolean;
  /** Full ordered list of all terms (newest first). */
  allTerms: TermSummary[];
  /** Switch the viewed workspace to a specific term. Pass null to return to live. */
  setSelectedTerm: (term: TermSummary | null) => void;
  /** True while initial term data is loading. */
  termLoading: boolean;
  /** Re-fetch term list (call after a term is created/archived). */
  refreshTerms: () => void;
}

const TermContext = createContext<TermContextType>({
  activeTerm: null,
  selectedTerm: null,
  selectedTermId: null,
  isArchiveMode: false,
  allTerms: [],
  setSelectedTerm: () => {},
  termLoading: true,
  refreshTerms: () => {},
});

// ── Helpers ────────────────────────────────────────────────────────────────────

function normalizeTerm(t: any): TermSummary {
  return {
    id: Number(t.id),
    name: t.name ?? "Unknown Term",
    status: (t.status ?? "").toLowerCase(),
    type: t.type ?? "",
    start_date: t.start_date,
    end_date: t.end_date,
  };
}

const ACTIVE_STATUSES = new Set(["active"]);

// ── Provider ───────────────────────────────────────────────────────────────────

export function TermProvider({ children }: { children: ReactNode }) {
  const appCtx = useAppContext();
  const [allTerms, setAllTerms] = useState<TermSummary[]>([]);
  const [activeTerm, setActiveTerm] = useState<TermSummary | null>(null);
  const [selectedTerm, setSelectedTermState] = useState<TermSummary | null>(null);
  const [termLoading, setTermLoading] = useState(true);

  const fetchTerms = useCallback(async () => {
    try {
      const [termsRes, activeRes] = await Promise.all([
        apiClient.getTerms(),
        apiClient.getActiveTerm(),
      ]);

      let active: TermSummary | null = null;
      if (activeRes.success && activeRes.data) {
        const raw = (activeRes.data as any)?.term ?? activeRes.data;
        if (raw?.id) active = normalizeTerm(raw);
      }

      let terms: TermSummary[] = [];
      if (termsRes.success && Array.isArray(termsRes.data)) {
        terms = termsRes.data
          .map(normalizeTerm)
          .sort((a, b) => b.id - a.id); // newest first
      }

      setAllTerms(terms);
      setActiveTerm(active);

      // On first load, default selectedTerm to the active term.
      // Keep existing selection if the user had already switched to an archive.
      setSelectedTermState((prev) => {
        if (!prev) {
           const storedId = appCtx.selectedTermId || localStorage.getItem("iams_selected_term_id");
           if (storedId) {
             const storedTerm = terms.find((t) => String(t.id) === storedId);
             if (storedTerm) return storedTerm;
           }
           return active;
        }
        // If the previously selected term is no longer in the list, fall back to active.
        const stillExists = terms.some((t) => t.id === prev.id);
        return stillExists ? prev : active;
      });
    } catch {
      // Silently fail — pages still render, just without term filtering.
    } finally {
      setTermLoading(false);
    }
  }, [appCtx.selectedTermId]);

  useEffect(() => {
    void fetchTerms();
  }, [fetchTerms]);

  const setSelectedTerm = (term: TermSummary | null) => {
    const newTerm = term ?? activeTerm;
    setSelectedTermState(newTerm);
    if (newTerm) {
       appCtx.setSelectedTermId(String(newTerm.id));
    } else {
       appCtx.setSelectedTermId(null);
    }
  };

  const isArchiveMode = !!(
    selectedTerm &&
    activeTerm &&
    selectedTerm.id !== activeTerm.id
  );

  const selectedTermId = selectedTerm?.id ?? null;

  return (
    <TermContext.Provider
      value={{
        activeTerm,
        selectedTerm,
        selectedTermId,
        isArchiveMode,
        allTerms,
        setSelectedTerm,
        termLoading,
        refreshTerms: fetchTerms,
      }}
    >
      {children}
    </TermContext.Provider>
  );
}

// ── Hook ───────────────────────────────────────────────────────────────────────

export function useTerm(): TermContextType {
  const ctx = useContext(TermContext);
  if (!ctx) throw new Error("useTerm must be used within TermProvider");
  return ctx;
}
