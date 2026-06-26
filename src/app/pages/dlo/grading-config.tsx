import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { GradingConfigForm } from "../../components/grading/grading-config-form";
import { useAppContext } from "../../lib/context";
import { apiClient } from "../../lib/api-client";
import { DEFAULT_STRUCTURE, DEFAULT_STRUCTURE_WEIGHTS, DEFAULT_SECTION_WEIGHTS } from "../../lib/constants";
import { ChevronDown, Lock, Loader2 } from "lucide-react";
import type { TermResponse } from "../../types/api";

export function DLOGradingConfigPage() {
  const { user } = useAppContext();
  // Prefer the department name from the user object (populated after backend fix).
  // Fall back to resolving by department_id from the departments list.
  const [department, setDepartment] = useState<string>(user?.department ?? "");
  const departmentId = user?.department_id;

  const [terms, setTerms] = useState<TermResponse[]>([]);
  const [selectedTermId, setSelectedTermId] = useState<string | number | undefined>(undefined);
  const [termsLoading, setTermsLoading] = useState(true);
  const [showTermDropdown, setShowTermDropdown] = useState(false);

  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [pendingInput, setPendingInput] = useState<any>(null);
  const [isActivating, setIsActivating] = useState(false);

  // Resolve department name from departments list if not already set via user context
  useEffect(() => {
    if (user?.department) {
      setDepartment(user.department);
      return;
    }
    if (!departmentId) return;
    apiClient.getDepartments().then((res) => {
      if (res.success) {
        const found = res.data.find((d: any) => String(d.id) === String(departmentId));
        if (found) setDepartment(found.name ?? "");
      }
    });
  }, [user?.department, departmentId]);

  // Load terms eligible for this department
  useEffect(() => {
    if (!department && !departmentId) return;
    setTermsLoading(true);
    apiClient.getTerms().then((res) => {
      if (res.success && res.data.length > 0) {
        const eligible = res.data.filter((t) => {
          const depts = (t.departments ?? []).map((d: any) =>
            typeof d === "string" ? d : d.name ?? String(d)
          );
          // Empty departments means unrestricted (all departments)
          return depts.length === 0 || !department || depts.includes(department);
        });
        const sorted = [...eligible].sort((a, b) => {
          const order: Record<string, number> = { active: 0, upcoming: 1, completed: 2, archived: 3 };
          return (order[(a.status as string).toLowerCase()] ?? 4) - (order[(b.status as string).toLowerCase()] ?? 4);
        });
        setTerms(sorted);
        if (sorted.length > 0) {
          const active = sorted.find((t) => (t.status as string).toLowerCase() === "active");
          setSelectedTermId((active ?? sorted[0]).id);
        } else {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    }).finally(() => setTermsLoading(false));
  }, [department, departmentId]);

  const fetchConfig = async (termId: string | number) => {
    setLoading(true);
    setPendingInput(null);
    // Use numeric department_id for exact matching; fall back to name if not available
    const filter = departmentId ? { department_id: departmentId, term_id: termId } : { department, term_id: termId };
    const res = await apiClient.getGradingConfigs(filter);
    if (res.success && res.data.length > 0) {
      setConfig(res.data[0]);
    } else {
      setConfig({
        departmentId: departmentId ?? department,
        structure: DEFAULT_STRUCTURE,
        structureWeights: DEFAULT_STRUCTURE_WEIGHTS,
        sectionWeights: DEFAULT_SECTION_WEIGHTS,
        status: "draft",
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    if (selectedTermId !== undefined && (department || departmentId)) fetchConfig(selectedTermId);
  }, [selectedTermId, department, departmentId]);

  const selectedTerm = terms.find((t) => String(t.id) === String(selectedTermId));
  const isLocked = config?.status === "active";

  // Single action: save draft → submit → approve in one click
  const handleSaveAndActivate = async (input: any) => {
    setPendingInput(input);
    setIsActivating(true);

    // Step 1: save/update the config (use numeric department_id for reliable matching)
    const saveRes = await apiClient.saveGradingConfig({
      department_id: departmentId ?? department,
      academic_term_id: selectedTermId,
      ...input,
    });
    if (!saveRes.success) {
      toast.error(saveRes.message ?? "Failed to save configuration.");
      setIsActivating(false);
      return;
    }
    const savedConfig = saveRes.data;
    setConfig(savedConfig);

    // Step 2: submit for approval (moves to pending_approval)
    const submitRes = await apiClient.submitGradingConfigForApproval(savedConfig.id);
    if (!submitRes.success) {
      toast.error(submitRes.message ?? "Failed to submit configuration.");
      setIsActivating(false);
      return;
    }

    // Step 3: approve and lock
    const approveRes = await apiClient.approveGradingConfig(savedConfig.id);
    if (!approveRes.success) {
      toast.error(approveRes.message ?? "Failed to activate configuration.");
      setIsActivating(false);
      return;
    }

    toast.success("Grading configuration saved and locked for the term.");
    fetchConfig(selectedTermId!);
    setIsActivating(false);
  };

  return (
    <div className="space-y-6">
      {/* Header + term picker */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl text-[#1a1a2e]">Grading Configuration</h1>
          <p className="text-sm text-gray-600 mt-1">
            Configure how attachment grades are calculated for {department}.
          </p>
        </div>

        {/* Term dropdown */}
        <div className="relative shrink-0" style={{ minWidth: "240px" }}>
          <button
            type="button"
            disabled={termsLoading || terms.length === 0}
            onClick={() => setShowTermDropdown((v) => !v)}
            className="w-full flex items-center justify-between gap-2 px-4 py-2.5 border border-border rounded-lg bg-background hover:bg-accent transition-colors text-sm font-medium disabled:opacity-50"
          >
            <span className="truncate">
              {termsLoading ? "Loading terms…" : terms.length === 0 ? "No eligible terms" : selectedTerm ? selectedTerm.name : "Select term"}
            </span>
            <ChevronDown className={`w-4 h-4 shrink-0 text-muted-foreground transition-transform ${showTermDropdown ? "rotate-180" : ""}`} />
          </button>

          {showTermDropdown && terms.length > 0 && (
            <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-background border border-border rounded-lg shadow-lg max-h-64 overflow-y-auto">
              {terms.map((t) => {
                const statusLower = (t.status as string).toLowerCase();
                const isActive = statusLower === "active";
                const isSelected = String(t.id) === String(selectedTermId);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => { setSelectedTermId(t.id); setShowTermDropdown(false); }}
                    className={`w-full flex items-center justify-between gap-2 px-4 py-2.5 text-sm text-left hover:bg-accent transition-colors ${isSelected ? "text-primary font-medium" : "text-foreground"}`}
                  >
                    <span className="truncate">{t.name}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded capitalize shrink-0 ${isActive ? "bg-emerald-100 text-emerald-700" : "bg-secondary text-muted-foreground"}`}>
                      {statusLower}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Status badge */}
      {config && !loading && (
        <div className="flex items-center gap-3">
          <StatusBadge status={config.status ?? "draft"} />
          {isLocked && (
            <p className="text-sm text-emerald-700">This configuration is locked for {selectedTerm?.name}.</p>
          )}
        </div>
      )}

      {/* Config form */}
      {loading || !config ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : terms.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">
          No terms are currently assigned to the {department} department.
        </Card>
      ) : (
        <Card className="p-6">
          <GradingConfigForm
            initial={config}
            readOnly={isLocked}
            onSave={handleSaveAndActivate}
            saveLabel={isActivating ? "Activating…" : "Save & Activate for Term"}
          />
        </Card>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700",
    pending_approval: "bg-amber-100 text-amber-800",
    active: "bg-emerald-100 text-emerald-800",
  };
  const label: Record<string, string> = {
    draft: "Draft",
    pending_approval: "Pending Approval",
    active: "Active & Locked",
  };
  return <Badge className={map[status] ?? "bg-gray-100 text-gray-700"}>{label[status] ?? status}</Badge>;
}
