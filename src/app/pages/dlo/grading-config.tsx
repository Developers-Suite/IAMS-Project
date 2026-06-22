import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { GradingConfigForm } from "../../components/grading/grading-config-form";
import { useAppContext } from "../../lib/context";
import { apiClient } from "../../lib/api-client";
import { DEFAULT_STRUCTURE, DEFAULT_STRUCTURE_WEIGHTS, DEFAULT_SECTION_WEIGHTS } from "../../lib/constants";
import { ChevronDown, Send, CheckCircle2, Loader2 } from "lucide-react";
import type { TermResponse } from "../../types/api";

export function DLOGradingConfigPage() {
  const { user } = useAppContext();
  const department = user?.department ?? "Computer Science";

  const [terms, setTerms] = useState<TermResponse[]>([]);
  const [selectedTermId, setSelectedTermId] = useState<string | number | undefined>(undefined);
  const [termsLoading, setTermsLoading] = useState(true);
  const [showTermDropdown, setShowTermDropdown] = useState(false);

  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  // Load all terms once
  useEffect(() => {
    setTermsLoading(true);
    apiClient.getTerms().then((res) => {
      if (res.success && res.data.length > 0) {
        const sorted = [...res.data].sort((a, b) => {
          const order = { active: 0, upcoming: 1, completed: 2, archived: 3 };
          const aO = order[(a.status as string).toLowerCase() as keyof typeof order] ?? 4;
          const bO = order[(b.status as string).toLowerCase() as keyof typeof order] ?? 4;
          return aO - bO;
        });
        setTerms(sorted);
        const active = sorted.find((t) => (t.status as string).toLowerCase() === "active");
        setSelectedTermId((active ?? sorted[0]).id);
      }
    }).finally(() => setTermsLoading(false));
  }, []);

  const fetchConfig = async (termId: string | number) => {
    setLoading(true);
    const res = await apiClient.getGradingConfigs({ department, term_id: termId });
    if (res.success && res.data.length > 0) {
      setConfig(res.data[0]);
    } else {
      setConfig({
        departmentId: department,
        structure: DEFAULT_STRUCTURE,
        structureWeights: DEFAULT_STRUCTURE_WEIGHTS,
        sectionWeights: DEFAULT_SECTION_WEIGHTS,
        status: "draft",
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    if (selectedTermId !== undefined) fetchConfig(selectedTermId);
  }, [selectedTermId, department]);

  const selectedTerm = terms.find((t) => String(t.id) === String(selectedTermId));
  const isLocked = config?.status === "active";
  const isPendingApproval = config?.status === "pending_approval";

  const handleSaveDraft = async (input: any) => {
    setIsSaving(true);
    const res = await apiClient.saveGradingConfig({
      department_id: department,
      academic_term_id: selectedTermId,
      ...input,
    });
    if (res.success) {
      setConfig(res.data);
      toast.success("Grading configuration draft saved.");
    } else {
      toast.error(res.message ?? "Failed to save draft.");
    }
    setIsSaving(false);
  };

  const handleSubmit = async () => {
    if (!config?.id) { toast.error("Save a draft before submitting."); return; }
    setIsSubmitting(true);
    const res = await apiClient.submitGradingConfigForApproval(config.id);
    if (res.success) {
      toast.success("Configuration ready for approval.");
      fetchConfig(selectedTermId!);
    } else {
      toast.error(res.message ?? "Failed to submit.");
    }
    setIsSubmitting(false);
  };

  const handleApprove = async () => {
    if (!config?.id) return;
    setIsApproving(true);
    const res = await apiClient.approveGradingConfig(config.id);
    if (res.success) {
      toast.success("Configuration approved and locked for the term.");
      fetchConfig(selectedTermId!);
    } else {
      toast.error(res.message ?? "Failed to approve.");
    }
    setIsApproving(false);
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
        <div className="relative shrink-0" style={{ minWidth: "220px" }}>
          <button
            type="button"
            disabled={termsLoading}
            onClick={() => setShowTermDropdown((v) => !v)}
            className="w-full flex items-center justify-between gap-2 px-4 py-2.5 border border-border rounded-lg bg-background hover:bg-accent transition-colors text-sm font-medium disabled:opacity-50"
          >
            <span className="truncate">
              {termsLoading ? "Loading terms…" : selectedTerm ? selectedTerm.name : "Select term"}
            </span>
            <ChevronDown className={`w-4 h-4 shrink-0 text-muted-foreground transition-transform ${showTermDropdown ? "rotate-180" : ""}`} />
          </button>

          {showTermDropdown && (
            <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-background border border-border rounded-lg shadow-lg max-h-64 overflow-y-auto">
              {terms.map((t) => {
                const isActive = (t.status as string).toLowerCase() === "active";
                const isSelected = String(t.id) === String(selectedTermId);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => { setSelectedTermId(t.id); setShowTermDropdown(false); }}
                    className={`w-full flex items-center justify-between gap-2 px-4 py-2.5 text-sm text-left hover:bg-accent transition-colors ${isSelected ? "text-primary font-medium" : "text-foreground"}`}
                  >
                    <span className="truncate">{t.name}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded shrink-0 ${isActive ? "bg-emerald-100 text-emerald-700" : "bg-secondary text-muted-foreground"}`}>
                      {isActive ? "Active" : (t.status as string)}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Status banner */}
      {config && (
        <div className="flex items-center justify-between">
          <StatusBadge status={config.status ?? "draft"} />
          {isLocked && (
            <p className="text-sm text-emerald-700">This configuration is locked for the selected term.</p>
          )}
        </div>
      )}

      {/* Config form */}
      {loading || !config ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <Card className="p-6">
          <GradingConfigForm
            initial={config}
            readOnly={isLocked}
            onSave={handleSaveDraft}
            saveLabel={isSaving ? "Saving…" : "Save Draft"}
          />
        </Card>
      )}

      {/* Action buttons */}
      {!loading && !isLocked && (
        <div className="flex justify-end gap-3">
          {isPendingApproval ? (
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={isApproving}
              onClick={handleApprove}
            >
              {isApproving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="size-4 mr-2" />}
              Approve & Lock for Term
            </Button>
          ) : (
            <Button
              variant="outline"
              disabled={!config?.id || config?.status !== "draft" || isSubmitting}
              onClick={handleSubmit}
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="size-4 mr-2" />}
              Submit for Approval
            </Button>
          )}
        </div>
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
