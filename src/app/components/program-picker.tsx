import { useMemo, useRef, useState, useEffect } from "react";
import { Search, X } from "lucide-react";
import { apiClient } from "../lib/api-client";

interface ProgramPickerProps {
  selectedDepartments: string[];
  selectedPrograms: string[];
  onChange: (programs: string[]) => void;
}

interface ProgramItem {
  name: string;
  department: string;
}

export function ProgramPicker({ selectedDepartments, selectedPrograms, onChange }: ProgramPickerProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [available, setAvailable] = useState<ProgramItem[]>([]);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedDepartments.length === 0) { setAvailable([]); return; }

    let cancelled = false;

    const load = async () => {
      // Fetch all departments once to resolve names to IDs
      const deptRes = await apiClient.getDepartments({ status: "active" }).catch(() => ({ success: false, data: [] }));
      if (cancelled) return;

      const deptMap: Record<string, string> = {};
      if (deptRes.success) {
        for (const d of deptRes.data) {
          deptMap[d.name] = String(d.id);
        }
      }

      const results: ProgramItem[] = [];
      await Promise.all(
        selectedDepartments.map(async (deptName) => {
          const deptId = deptMap[deptName];
          if (!deptId) return;
          const res = await apiClient.getProgrammes(deptId, { status: "active" }).catch(() => ({ success: false, data: [] }));
          if (!cancelled && res.success) {
            res.data.forEach((p: any) => results.push({ name: p.name, department: deptName }));
          }
        })
      );

      if (!cancelled) {
        results.sort((a, b) => a.name.localeCompare(b.name));
        setAvailable(results);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [selectedDepartments.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return available.filter(({ name }) =>
      !selectedPrograms.includes(name) && (q === "" || name.toLowerCase().includes(q))
    );
  }, [available, selectedPrograms, query]);

  // Group selected programs by their parent department
  const groupedSelected = useMemo(() => {
    const deptSets = new Map<string, Set<string>>();
    available.forEach(({ name, department }) => {
      if (!deptSets.has(department)) deptSets.set(department, new Set());
      deptSets.get(department)!.add(name);
    });
    const groups: Record<string, string[]> = {};
    selectedDepartments.forEach((dep) => {
      const set = deptSets.get(dep);
      const items = selectedPrograms.filter((p) => set?.has(p));
      if (items.length > 0) groups[dep] = items;
    });
    return groups;
  }, [available, selectedDepartments, selectedPrograms]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const addProgram = (p: string) => {
    onChange([...selectedPrograms, p]);
    setQuery("");
  };

  const removeProgram = (p: string) => {
    onChange(selectedPrograms.filter((x) => x !== p));
  };

  return (
    <div className="space-y-3">
      <div ref={wrapperRef} className="relative">
        <div className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg bg-background focus-within:ring-2 focus-within:ring-primary/30">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            placeholder="Search programs to add..."
            className="flex-1 bg-transparent outline-none"
            style={{ fontSize: "0.85rem" }}
          />
        </div>
        {open && matches.length > 0 && (
          <div className="absolute z-10 mt-1 left-0 right-0 bg-card border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {matches.slice(0, 30).map(({ name, department }) => (
              <button
                key={name}
                onClick={() => addProgram(name)}
                className="w-full text-left px-3 py-2 hover:bg-accent flex items-center justify-between gap-3"
                style={{ fontSize: "0.8rem" }}
              >
                <span>{name}</span>
                <span className="text-muted-foreground shrink-0" style={{ fontSize: "0.7rem" }}>{department}</span>
              </button>
            ))}
          </div>
        )}
        {open && matches.length === 0 && query.trim() !== "" && (
          <div className="absolute z-10 mt-1 left-0 right-0 bg-card border border-border rounded-lg shadow-lg p-3 text-muted-foreground" style={{ fontSize: "0.8rem" }}>
            No matching programs.
          </div>
        )}
      </div>

      {Object.keys(groupedSelected).length === 0 ? (
        <p className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>
          No programs added yet — all programs in the selected departments will be eligible.
        </p>
      ) : (
        <div className="space-y-2">
          {Object.entries(groupedSelected).map(([dep, items]) => (
            <div key={dep}>
              <p className="text-muted-foreground mb-1.5" style={{ fontSize: "0.7rem" }}>{dep}</p>
              <div className="flex flex-wrap gap-1.5">
                {items.map((p) => (
                  <span
                    key={p}
                    className="px-2.5 py-1 bg-primary/10 text-primary rounded-full flex items-center gap-1.5"
                    style={{ fontSize: "0.75rem" }}
                  >
                    {p}
                    <button onClick={() => removeProgram(p)} className="hover:bg-primary/20 rounded-full p-0.5">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
