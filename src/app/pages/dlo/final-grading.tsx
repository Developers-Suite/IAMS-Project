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
        report_score: editReport === "" ? null : Number(editReport),
        presentation_score: editPresentation === "" ? null : Number(editPresentation),
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
    const [internRes, gradesRes] = await Promise.all([
      apiClient.getInternships({ status: "active,completed", per_page: 100, department }),
      apiClient.getGrades({ per_page: 100, department }),
    ]);

    const gradeByInternship = new Map<string, any>();
    if (gradesRes.success) {
      for (const g of gradesRes.data) {
        gradeByInternship.set(String(g.internship_id ?? g.internship?.id), g);
      }
    }

    if (internRes.success) {
      setRows(internRes.data.map((i: any) => {
        const g = gradeByInternship.get(String(i.id));
        return {
          internshipId: String(i.id),
          gradeId: g?.id != null ? String(g.id) : null,
          studentName: i.student?.user?.name ?? "—",
          studentId: i.student?.student_id ?? "—",
          companyName: i.company?.name ?? "—",
          gradeStatus: g?.status ?? null,
          industrialScore: g?.industrial_assessment_score ?? null,
          siteVisitScore: g?.site_visitation_score ?? null,
          reportScore: g?.report_score ?? null,
          presentationScore: g?.presentation_score ?? null,
          finalPercent: g?.total_score ?? null,
          letterGrade: g?.letter_grade ?? null,
        };
      }));
    }
    setLoading(false);
  }, [department]);

  useEffect(() => { load(); }, [load]);

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
          Compile final grades from submitted component scores (industrial assessment, site visitation, report, presentation).
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-blue-800" style={{ fontSize: "0.8rem" }}>
          <p><strong>Workflow:</strong> Compile the grade from all submitted component scores → Approve the final grade → Publish to make it visible to the student.</p>
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
                    Industry Supervisor Grade<br/>
                    <span className="text-muted-foreground font-normal" style={{ fontSize: "0.65rem" }}>(weekly logbook + evaluation)</span>
                  </th>
                  <th className="text-center px-4 py-3.5" style={{ fontSize: "0.75rem" }}>
                    Academic Supervisor<br/>
                    <span className="text-muted-foreground font-normal" style={{ fontSize: "0.65rem" }}>(site visitation)</span>
                  </th>
                  <th className="text-center px-4 py-3.5" style={{ fontSize: "0.75rem" }}>
                    DLO<br/>
                    <span className="text-muted-foreground font-normal" style={{ fontSize: "0.65rem" }}>(report + presentation)</span>
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
                        {r.reportScore !== null || r.presentationScore !== null ? (
                          <>
                            <span>Report: {r.reportScore !== null ? `${Number(r.reportScore).toFixed(1)}%` : "—"}</span>
                            <span className="text-muted-foreground">|</span>
                            <span>Pres: {r.presentationScore !== null ? `${Number(r.presentationScore).toFixed(1)}%` : "—"}</span>
                          </>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
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
                          title="Input / Override Component Grades"
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
              <h3 className="text-lg font-bold">Input / Override Grades</h3>
              <p className="text-xs text-muted-foreground mt-1">
                For student: <strong className="text-foreground">{selectedForEdit.studentName}</strong> ({selectedForEdit.studentId})
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                  Industry Supervisor Grade (weekly logbook + evaluation)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={editIndustrial}
                  onChange={(e) => setEditIndustrial(e.target.value)}
                  placeholder="Not graded yet (Enter 0-100)"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                  Academic Supervisor Grade (site visitation)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={editSiteVisit}
                  onChange={(e) => setEditSiteVisit(e.target.value)}
                  placeholder="Not graded yet (Enter 0-100)"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                  DLO Grade (report)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={editReport}
                  onChange={(e) => setEditReport(e.target.value)}
                  placeholder="Not graded yet (Enter 0-100)"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                  DLO Grade (presentation)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={editPresentation}
                  onChange={(e) => setEditPresentation(e.target.value)}
                  placeholder="Not graded yet (Enter 0-100)"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary"
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
