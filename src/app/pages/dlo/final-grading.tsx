import { useState, useEffect, useCallback } from "react";
import { SkeletonTable } from "../../components/skeleton";
import { StatusBadge } from "../../components/status-badge";
import { useAppContext } from "../../lib/context";
import { AlertTriangle, GraduationCap, RefreshCw, CheckCircle2, Send, Pen } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "../../lib/api-client";

interface Row {
  internshipId: string;
  gradeId: string | null;
  studentName: string;
  studentId: string;
  companyName: string;
  gradeStatus: string | null;   // backend: draft|calculated|approved|published
  industrialScore: number | null;
  siteVisitScore: number | null;
  reportScore: number | null;
  presentationScore: number | null;
  finalPercent: number | null;
  letterGrade: string | null;
}

export function DLOFinalGradingPage() {
  const { user } = useAppContext();
  const department = user?.department || "";

  const [rows, setRows] = useState<Row[]>([]);
  const [activeConfig, setActiveConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [compiling, setCompiling] = useState<string | null>(null);
  const [approving, setApproving] = useState<string | null>(null);
  const [publishing, setPublishing] = useState<string | null>(null);

  const [selectedForEdit, setSelectedForEdit] = useState<Row | null>(null);
  const [editIndustrial, setEditIndustrial] = useState("");
  const [editSiteVisit, setEditSiteVisit] = useState("");
  const [editReport, setEditReport] = useState("");
  const [editPresentation, setEditPresentation] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const handleOpenEdit = (r: Row) => {
    setSelectedForEdit(r);
    setEditIndustrial(r.industrialScore !== null ? String(r.industrialScore) : "");
    setEditSiteVisit(r.siteVisitScore !== null ? String(r.siteVisitScore) : "");
    setEditReport(r.reportScore !== null ? String(r.reportScore) : "");
    setEditPresentation(r.presentationScore !== null ? String(r.presentationScore) : "");
  };

  const handleSaveEdit = async () => {
    if (!selectedForEdit) return;
    setSavingEdit(true);
    try {
      let currentGradeId = selectedForEdit.gradeId;
      if (!currentGradeId) {
        const compileRes = await apiClient.compileGrade(selectedForEdit.internshipId);
        if (compileRes.success && compileRes.data) {
          currentGradeId = String(compileRes.data.id || compileRes.data.grade?.id || "");
        }
      }

      const payload: Record<string, any> = {
        industrial_assessment_score: editIndustrial === "" ? null : Number(editIndustrial),
        site_visitation_score: editSiteVisit === "" ? null : Number(editSiteVisit),
        report_score: isReportActive && editReport !== "" ? Number(editReport) : null,
        presentation_score: isPresentationActive && editPresentation !== "" ? Number(editPresentation) : null,
      };

      const targetId = currentGradeId || selectedForEdit.internshipId;
      const res = await apiClient.updateGrade(targetId, payload);

      if (res.success) {
        toast.success("Grades updated successfully!");
        setSelectedForEdit(null);
        load();
      } else {
        toast.error(res.message ?? "Failed to update grades.");
      }
    } catch (error) {
      console.error("Error saving grades:", error);
      toast.error("An error occurred while saving grades.");
    } finally {
      setSavingEdit(false);
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    const filter = user?.department_id ? { department_id: user.department_id } : { department };
    const [internRes, gradesRes, configRes, indAssRes, siteVisRes] = await Promise.all([
      apiClient.getInternships({ status: "active,completed", per_page: 100, department }),
      apiClient.getGrades({ per_page: 100, department }),
      apiClient.getGradingConfigs(filter).catch(() => ({ success: false, data: [] })),
      apiClient.getIndustrialAssessments({ per_page: 100 }).catch(() => ({ success: false, data: [] })),
      apiClient.getSiteVisitations({ per_page: 100 }).catch(() => ({ success: false, data: [] })),
    ]);

    if (configRes.success && configRes.data?.length > 0) {
      const active = configRes.data.find((c: any) => c.status === "active" || c.is_active || c.is_default) || configRes.data[0];
      setActiveConfig(active);
    }

    const gradeByInternship = new Map<string, any>();
    if (gradesRes.success && Array.isArray(gradesRes.data)) {
      for (const g of gradesRes.data) {
        gradeByInternship.set(String(g.internship_id ?? g.internship?.id), g);
      }
    }

    const indByInternship = new Map<string, number>();
    if (indAssRes?.success && Array.isArray(indAssRes.data)) {
      for (const a of indAssRes.data) {
        const iId = String(a.internship_id ?? a.internship?.id ?? "");
        const score = a.total_score ?? a.score_percentage ?? a.score;
        if (iId && score != null) indByInternship.set(iId, Number(score));
      }
    }

    const siteByInternship = new Map<string, number>();
    if (siteVisRes?.success && Array.isArray(siteVisRes.data)) {
      for (const v of siteVisRes.data) {
        const iId = String(v.internship_id ?? v.internship?.id ?? "");
        const scoreObj = v.site_visitation_score ?? v.score_object ?? v;
        const rawScore = scoreObj?.score ?? v.total_score ?? v.score;
        if (iId && rawScore != null) {
          const maxScore = Number(scoreObj?.max_score ?? 30);
          const scorePercent = maxScore > 0 ? (Number(rawScore) / maxScore) * 100 : Number(rawScore);
          siteByInternship.set(iId, Math.round(scorePercent * 100) / 100);
        }
      }
    }

    if (internRes.success && Array.isArray(internRes.data)) {
      setRows(internRes.data.map((i: any) => {
        const iId = String(i.id);
        const g = gradeByInternship.get(iId);
        return {
          internshipId: iId,
          gradeId: g?.id != null ? String(g.id) : null,
          studentName: i.student?.user?.name ?? "—",
          studentId: i.student?.student_id ?? "—",
          companyName: i.company?.name ?? "—",
          gradeStatus: g?.status ?? null,
          industrialScore: g?.industrial_assessment_score ?? indByInternship.get(iId) ?? null,
          siteVisitScore: g?.site_visitation_score ?? siteByInternship.get(iId) ?? null,
          reportScore: g?.report_score ?? null,
          presentationScore: g?.presentation_score ?? null,
          finalPercent: g?.total_score ?? null,
          letterGrade: g?.letter_grade ?? null,
        };
      }));
    }
    setLoading(false);
  }, [department, user?.department_id]);

  useEffect(() => { load(); }, [load]);

  // Determine active component weights from grading config
  const struct = activeConfig?.structure ?? activeConfig?.grading_structure ?? "C";
  const w1 = activeConfig?.structureWeights?.w1 ?? activeConfig?.industrial_assessment_weight ?? 40;
  const w2 = activeConfig?.structureWeights?.w2 ?? activeConfig?.site_visitation_weight ?? 30;
  const w3 = activeConfig?.structureWeights?.w3 ?? activeConfig?.report_weight ?? (struct === "B" ? 0 : 20);
  const w4 = activeConfig?.structureWeights?.w4 ?? activeConfig?.presentation_weight ?? (struct === "A" ? 0 : 10);

  const isReportActive = struct !== "B" && w3 > 0;
  const isPresentationActive = struct !== "A" && w4 > 0;

  const displayStatus = (s: string | null) =>
    s === "calculated" ? "Ready for Approval" : s === "approved" ? "Approved" : s === "published" ? "Published" : "Pending";

  const handleCompile = async (internshipId: string) => {
    setCompiling(internshipId);
    const res = await apiClient.compileGrade(internshipId);
    setCompiling(null);
    if (res.success) {
      toast.success(res.message ?? "Final grade compiled from submitted components.");
      load();
    } else {
      toast.error(res.message ?? "Could not compile — ensure all component scores are submitted and approved.");
    }
  };

  const handleApprove = async (gradeId: string) => {
    setApproving(gradeId);
    const res = await apiClient.approveGrade(gradeId);
    setApproving(null);
    if (res.success) {
      toast.success(res.message ?? "Grade approved.");
      load();
    } else {
      toast.error(res.message ?? "Failed to approve grade.");
    }
  };

  const handlePublish = async (gradeId: string) => {
    setPublishing(gradeId);
    const res = await apiClient.publishGrade(gradeId);
    setPublishing(null);
    if (res.success) {
      toast.success(res.message ?? "Grade published to student.");
      load();
    } else {
      toast.error(res.message ?? "Failed to publish grade.");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1>Final Grading</h1>
        <p className="text-muted-foreground" style={{ fontSize: "0.85rem" }}>
          Input report and presentation scores, then compile and publish final grades for your department.
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3 dark:bg-blue-950/20 dark:border-blue-800">
        <AlertTriangle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-blue-800 dark:text-blue-300" style={{ fontSize: "0.8rem" }}>
          <p className="font-semibold">Department Grading Structure ({struct}):</p>
          <p className="mt-0.5">
            Workplace Supervisor: <strong>{w1}%</strong> | University Supervisor Visit: <strong>{w2}%</strong> |{" "}
            Report: <strong>{isReportActive ? `${w3}%` : "Excluded"}</strong> |{" "}
            Presentation: <strong>{isPresentationActive ? `${w4}%` : "Excluded"}</strong>
          </p>
          <p className="mt-1 text-blue-700 dark:text-blue-400">
            <strong>DLO Role:</strong> As DLO, you solely input the Report and Presentation scores based on your active department config, then compile and publish final results.
          </p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3>Students Awaiting Final Grading</h3>
          <button onClick={load} className="text-primary hover:underline flex items-center gap-1" style={{ fontSize: "0.8rem" }}>
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
        {loading ? (
          <SkeletonTable rows={5} cols={5} showFilters={false} />
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground" style={{ fontSize: "0.85rem" }}>No active or completed internships.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3.5" style={{ fontSize: "0.75rem" }}>Student</th>
                  <th className="text-center px-4 py-3.5" style={{ fontSize: "0.75rem" }}>
                    Workplace Supervisor<br/>
                    <span className="text-muted-foreground font-normal" style={{ fontSize: "0.65rem" }}>({w1}%)</span>
                  </th>
                  <th className="text-center px-4 py-3.5" style={{ fontSize: "0.75rem" }}>
                    University Supervisor<br/>
                    <span className="text-muted-foreground font-normal" style={{ fontSize: "0.65rem" }}>({w2}%)</span>
                  </th>
                  <th className="text-center px-4 py-3.5" style={{ fontSize: "0.75rem" }}>
                    DLO Scores<br/>
                    <span className="text-muted-foreground font-normal" style={{ fontSize: "0.65rem" }}>
                      {isReportActive ? `Report (${w3}%)` : ""} {isReportActive && isPresentationActive ? "|" : ""} {isPresentationActive ? `Pres (${w4}%)` : ""}
                    </span>
                  </th>
                  <th className="text-center px-4 py-3.5" style={{ fontSize: "0.75rem" }}>Final Score</th>
                  <th className="text-left px-4 py-3.5" style={{ fontSize: "0.75rem" }}>Status</th>
                  <th className="text-right px-4 py-3.5" style={{ fontSize: "0.75rem" }}></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.internshipId} className="border-b border-border last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-3" style={{ fontSize: "0.85rem" }}>
                      <div>
                        <p className="font-medium">{r.studentName}</p>
                        <p className="text-muted-foreground" style={{ fontSize: "0.7rem" }}>{r.studentId}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center" style={{ fontSize: "0.85rem" }}>
                      {r.industrialScore !== null
                        ? <span className="font-medium">{Number(r.industrialScore).toFixed(1)}%</span>
                        : <span className="text-muted-foreground text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center" style={{ fontSize: "0.85rem" }}>
                      {r.siteVisitScore !== null
                        ? <span className="font-medium">{Number(r.siteVisitScore).toFixed(1)}%</span>
                        : <span className="text-muted-foreground text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center" style={{ fontSize: "0.85rem" }}>
                      <div className="inline-flex items-center gap-1.5 font-medium" style={{ fontSize: "0.8rem" }}>
                        {isReportActive && (
                          <span>Report: {r.reportScore !== null ? `${Number(r.reportScore).toFixed(1)}%` : "—"}</span>
                        )}
                        {isReportActive && isPresentationActive && <span className="text-muted-foreground">|</span>}
                        {isPresentationActive && (
                          <span>Pres: {r.presentationScore !== null ? `${Number(r.presentationScore).toFixed(1)}%` : "—"}</span>
                        )}
                        {!isReportActive && !isPresentationActive && (
                          <span className="text-muted-foreground text-xs">Exempt</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center" style={{ fontSize: "0.85rem" }}>
                      {r.finalPercent !== null
                        ? <span className="font-semibold text-primary">{Number(r.finalPercent).toFixed(1)}%{r.letterGrade ? ` (${r.letterGrade})` : ""}</span>
                        : <span className="text-muted-foreground text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={displayStatus(r.gradeStatus)} /></td>
                    <td className="px-4 py-3 text-right space-x-2">
                      {r.gradeStatus !== "published" && (
                        <button
                          onClick={() => handleOpenEdit(r)}
                          className="px-2 py-1.5 border border-border rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                          title="Input / Edit DLO Scores"
                          style={{ fontSize: "0.8rem" }}
                        >
                          <Pen className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {r.gradeStatus === "draft" || !r.gradeStatus ? (
                        <button onClick={() => handleCompile(r.internshipId)} disabled={compiling === r.internshipId}
                          className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-1.5" style={{ fontSize: "0.8rem" }}>
                          {compiling === r.internshipId
                            ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Compiling…</>
                            : <><GraduationCap className="w-3.5 h-3.5" /> Compile</>}
                        </button>
                      ) : r.gradeStatus === "calculated" ? (
                        <button onClick={() => handleApprove(r.gradeId!)} disabled={approving === r.gradeId}
                          className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-1.5" style={{ fontSize: "0.8rem" }}>
                          {approving === r.gradeId
                            ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Approving…</>
                            : <><CheckCircle2 className="w-3.5 h-3.5" /> Approve</>}
                        </button>
                      ) : r.gradeStatus === "approved" ? (
                        <button onClick={() => handlePublish(r.gradeId!)} disabled={publishing === r.gradeId}
                          className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-1.5" style={{ fontSize: "0.8rem" }}>
                          {publishing === r.gradeId
                            ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Publishing…</>
                            : <><Send className="w-3.5 h-3.5" /> Publish</>}
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-emerald-600" style={{ fontSize: "0.8rem" }}>
                          <CheckCircle2 className="w-3.5 h-3.5" /> Published
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedForEdit && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div>
              <h3 className="text-lg font-bold">Input / Edit DLO Component Grades</h3>
              <p className="text-xs text-muted-foreground mt-1">
                For student: <strong className="text-foreground">{selectedForEdit.studentName}</strong> ({selectedForEdit.studentId})
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                Department Config: Structure {struct}
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                  Workplace Supervisor Grade ({w1}%) <span className="font-normal">(From Company Supervisor)</span>
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={editIndustrial}
                  onChange={(e) => setEditIndustrial(e.target.value)}
                  placeholder="Submitted by workplace supervisor (0-100)"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                  University Supervisor Grade ({w2}%) <span className="font-normal">(From Site Visitation)</span>
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={editSiteVisit}
                  onChange={(e) => setEditSiteVisit(e.target.value)}
                  placeholder="Submitted by university supervisor (0-100)"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 flex items-center justify-between">
                  <span>DLO Grade: Attachment Report ({isReportActive ? `${w3}%` : "Excluded"})</span>
                  {!isReportActive && <span className="text-amber-600 dark:text-amber-400 font-normal">(Excluded in Dept Config)</span>}
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  disabled={!isReportActive}
                  value={isReportActive ? editReport : ""}
                  onChange={(e) => setEditReport(e.target.value)}
                  placeholder={isReportActive ? "Enter DLO Report Grade (0-100)" : "Report score is excluded in current config"}
                  className={`w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary ${
                    isReportActive ? "bg-background" : "bg-muted/40 text-muted-foreground cursor-not-allowed"
                  }`}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 flex items-center justify-between">
                  <span>DLO Grade: Presentation Defense ({isPresentationActive ? `${w4}%` : "Excluded"})</span>
                  {!isPresentationActive && <span className="text-amber-600 dark:text-amber-400 font-normal">(Excluded in Dept Config)</span>}
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  disabled={!isPresentationActive}
                  value={isPresentationActive ? editPresentation : ""}
                  onChange={(e) => setEditPresentation(e.target.value)}
                  placeholder={isPresentationActive ? "Enter DLO Presentation Grade (0-100)" : "Presentation score is excluded in current config"}
                  className={`w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary ${
                    isPresentationActive ? "bg-background" : "bg-muted/40 text-muted-foreground cursor-not-allowed"
                  }`}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedForEdit(null)}
                disabled={savingEdit}
                className="px-4 py-2 border border-border rounded-lg hover:bg-accent text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={savingEdit}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 text-sm font-semibold transition-opacity flex items-center gap-1.5"
              >
                {savingEdit ? "Saving..." : "Save Scores"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
