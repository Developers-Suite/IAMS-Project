import { useEffect, useState } from "react";
import { Card } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { GradingConfigForm } from "../../components/grading/grading-config-form";
import { useAppContext } from "../../lib/context";
import { apiClient } from "../../lib/api-client";
import { DEFAULT_STRUCTURE, DEFAULT_STRUCTURE_WEIGHTS, DEFAULT_SECTION_WEIGHTS } from "../../lib/constants";
import { Loader2 } from "lucide-react";

export function HODGradingConfigPage() {
  const { user } = useAppContext();
  const department = user?.department ?? "Computer Science";

  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTermId, setActiveTermId] = useState<string | number | undefined>(undefined);

  useEffect(() => {
    apiClient.getActiveTerm().then((res) => {
      if (res.success) setActiveTermId(res.data?.term?.id);
    });
  }, []);

  const fetchConfig = async () => {
    setLoading(true);
    const res = await apiClient.getGradingConfigs({ department, ...(activeTermId ? { term_id: activeTermId } : {}) });
    if (res.success && res.data.length > 0) {
      setConfig(res.data[0]);
    } else {
      setConfig({
        departmentId: department,
        structure: DEFAULT_STRUCTURE,
        structureWeights: DEFAULT_STRUCTURE_WEIGHTS,
        sectionWeights: DEFAULT_SECTION_WEIGHTS,
        status: "draft",
        updatedBy: "System",
        updatedAt: new Date().toISOString(),
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchConfig();
  }, [department, activeTermId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl text-[#1a1a2e]">Grading Configuration</h1>
          <p className="text-sm text-gray-600 mt-1">
            {department} grading structure — managed by the DLO.
          </p>
        </div>
        <StatusBadge status={config?.status ?? "draft"} />
      </div>

      <Card className="p-4 text-sm text-gray-600">
        <div>
          <span className="text-gray-500">Drafted by:</span> {config?.createdBy ?? "N/A"}
        </div>
        {config?.submittedForApprovalBy && (
          <div className="mt-1">
            <span className="text-gray-500">Submitted for approval by:</span>{" "}
            {config.submittedForApprovalBy} · {config.submittedForApprovalAt && new Date(config.submittedForApprovalAt).toLocaleString()}
          </div>
        )}
        {config?.approvedBy && (
          <div className="mt-1">
            <span className="text-gray-500">Approved by:</span>{" "}
            {config.approvedBy} · {config.approvedAt && new Date(config.approvedAt).toLocaleString()}
          </div>
        )}
      </Card>

      <Card className="p-6">
        {config ? (
          <GradingConfigForm initial={config} readOnly />
        ) : (
          <div className="flex items-center justify-center h-32 text-muted-foreground">
            No configuration available for your department.
          </div>
        )}
      </Card>

    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700",
    pending_approval: "bg-yellow-100 text-yellow-800",
    active: "bg-emerald-100 text-emerald-800",
  };
  const label: Record<string, string> = {
    draft: "Draft",
    pending_approval: "Pending DLO Approval",
    active: "Active & Locked",
  };
  return <Badge className={map[status]}>{label[status]}</Badge>;
}
