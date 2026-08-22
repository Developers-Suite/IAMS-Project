import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import { StatusBadge } from "../../components/status-badge";
import { Pagination } from "../../components/ui/pagination";
import { useAppContext } from "../../lib/context";
import { fmtDate } from "../../lib/date-utils";
import { apiClient } from "../../lib/api-client";
import { SkeletonTableRows } from "../../components/skeleton";
import {
  Search, AlertTriangle, MessageSquare, Download, X,
  Eye, BookMarked, MapPin, Clock, CheckCircle2, FileText, Award, Flag,
  ChevronRight, User,
} from "lucide-react";
import { toast } from "sonner";
import type { ExtendedRole } from "../../services/auth-service";
import { exportToCSV } from "../../lib/csv-export";
import { useTerm } from "../../lib/term-context";

interface Props {
  viewRole: ExtendedRole;
}

function normalizeUserWithInternship(u: any, internship?: any) {
  return {
    id: String(u.id),
    internshipId: internship ? String(internship.id) : null,
    studentName: u.name ?? "—",
    studentId: u.student_profile?.student_id ?? "—",
    studentUserId: String(u.id),
    companyName: internship?.company?.name ?? "—",
    department: u.student_profile?.department?.name ?? u.department ?? "—",
    level: u.student_profile?.level ?? "—",
    supervisorAssigned: internship?.academic_supervisor?.user?.name ?? internship?.academicSupervisor?.user?.name ?? "",
    status: internship?.status ?? "registered",
    startDate: internship ? fmtDate(internship.start_date ?? internship.created_at) : "—",
  };
}

const ROLE_PATH: Record<string, string> = {
  clo: "clo", dlo: "dlo", student: "student",
  academic_supervisor: "academic", industry_supervisor: "supervisor", hod: "hod",
};

export function StudentsPage({ viewRole }: Props) {
  const { user } = useAppContext();
  const { selectedTermId, isArchiveMode } = useTerm();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [enrolledStudents, setEnrolledStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage] = useState(10);
  const [missed3, setMissed3] = useState<string[]>([]);
  const [missed7, setMissed7] = useState<string[]>([]);
  const [missed3List, setMissed3List] = useState<any[]>([]);
  const [missed7List, setMissed7List] = useState<any[]>([]);
  const [missedModalThreshold, setMissedModalThreshold] = useState<3 | 7 | null>(null);
  const [missedSearch, setMissedSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<"overview" | "scoring">("overview");

  // Detail modal data
  const [detailLogEntries, setDetailLogEntries] = useState<any[]>([]);
  const [detailAttendance, setDetailAttendance] = useState<any[]>([]);
  const [detailGrade, setDetailGrade] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Scoring panel state
  const [reportScore, setReportScore] = useState("");
  const [reportComment, setReportComment] = useState("");
  const [presScore, setPresScore] = useState("");
  const [presComment, setPresComment] = useState("");
  const [indScore, setIndScore] = useState("");
  const [indComment, setIndComment] = useState("");
  const [siteScore, setSiteScore] = useState("");
  const [siteComment, setSiteComment] = useState("");
  const [scoreSaving, setScoreSaving] = useState(false);

  const canScore = viewRole === "dlo" || viewRole === "clo";

  const fetchStudents = useCallback(async () => {
    setLoading(true);

    // Academic supervisors can't access /users (CLO/DLO only).
    // Load their assigned students directly from the dashboard instead.
    if (viewRole === "academic") {
      const dashRes = await apiClient.getDashboard("academic-supervisor");
      if (dashRes.success) {
        const internships: any[] = dashRes.data?.assigned_internships ?? [];
        const rows = internships.map((i: any) => ({
          id: String(i.student?.user?.id ?? i.id),
          internshipId: String(i.id),
          studentName: i.student?.user?.name ?? "—",
          studentId: i.student?.student_id ?? "—",
          studentUserId: String(i.student?.user?.id ?? ""),
          companyName: i.company?.name ?? "—",
          department: i.student?.department?.name ?? "—",
          level: i.student?.level ?? "—",
          supervisorAssigned: i.academic_supervisor?.user?.name ?? "",
          status: i.status ?? "registered",
          startDate: fmtDate(i.start_date ?? i.created_at),
        }));
        setEnrolledStudents(rows);
        setTotalPages(Math.ceil(rows.length / itemsPerPage) || 1);
      }
      setLoading(false);
      return;
    }

    const [usersRes, internshipsRes] = await Promise.all([
      apiClient.getUsers({ role: "student", per_page: 200 }),
      apiClient.getInternships({ per_page: 200, ...(selectedTermId ? { academic_term_id: selectedTermId } : {}) }),
    ]);
    if (usersRes.success) {
      // Build a map from userId → internship
      const internshipMap = new Map<string, any>();
      if (internshipsRes.success) {
        for (const i of internshipsRes.data) {
          const uid = String(i.student?.user?.id ?? "");
          if (uid) internshipMap.set(uid, i);
        }
      }
      const rows = usersRes.data.map((u: any) =>
        normalizeUserWithInternship(u, internshipMap.get(String(u.id)))
      );
      setEnrolledStudents(rows);
      setTotalPages(Math.ceil(rows.length / itemsPerPage) || 1);
    }
    setLoading(false);
  }, [viewRole, itemsPerPage, selectedTermId]);

  const fetchMissed = useCallback(async () => {
    const [r3, r7] = await Promise.all([
      apiClient.getMissedAttendance({ days: 3, ...(selectedTermId ? { term_id: selectedTermId } : {}) }),
      apiClient.getMissedAttendance({ days: 7, ...(selectedTermId ? { term_id: selectedTermId } : {}) }),
    ]);
    if (r3.success && Array.isArray(r3.data)) {
      setMissed3List(r3.data);
      setMissed3(r3.data.map((i: any) => String(i.id)));
    }
    if (r7.success && Array.isArray(r7.data)) {
      setMissed7List(r7.data);
      setMissed7(r7.data.map((i: any) => String(i.id)));
    }
  }, [selectedTermId]);

  useEffect(() => { fetchStudents(); fetchMissed(); }, [fetchStudents, fetchMissed]);

  // Load detail data when a student is selected
  useEffect(() => {
    if (!selectedStudent) {
      setDetailLogEntries([]);
      setDetailAttendance([]);
      setDetailGrade(null);
      setReportScore(""); setReportComment(""); setPresScore(""); setPresComment("");
      setIndScore(""); setIndComment(""); setSiteScore(""); setSiteComment("");
      return;
    }
    const row = enrolledStudents.find((s) => s.id === selectedStudent);
    const internshipId = row?.internshipId;
    if (!internshipId) {
      // Student has no internship yet — nothing to load
      setDetailLoading(false);
      return;
    }
    setDetailLoading(true);
    Promise.all([
      apiClient.getInternshipLogbooks(internshipId, { per_page: 5 }),
      apiClient.getInternshipAttendance(internshipId, {}),
      apiClient.getGrade(internshipId),
    ]).then(([logsRes, attRes, gradeRes]) => {
      if (logsRes.success) setDetailLogEntries(logsRes.data ?? []);
      if (attRes.success) setDetailAttendance(Array.isArray(attRes.data) ? attRes.data : attRes.data?.attendance ?? []);
      if (gradeRes.success && gradeRes.data) {
        const g = (gradeRes.data as any)?.grade ?? gradeRes.data;
        setDetailGrade(g);
        setReportScore(String(g?.report_score ?? ""));
        setReportComment(g?.report_comments ?? "");
        setPresScore(String(g?.presentation_score ?? ""));
        setPresComment(g?.presentation_comments ?? "");
        setIndScore(String(g?.industrial_assessment_score ?? ""));
        setIndComment(g?.industrial_assessment_comments ?? "");
        setSiteScore(String(g?.site_visitation_score ?? ""));
        setSiteComment(g?.site_visitation_comments ?? "");
      } else {
        setDetailGrade(null);
        setReportScore(""); setReportComment(""); setPresScore(""); setPresComment("");
        setIndScore(""); setIndComment(""); setSiteScore(""); setSiteComment("");
      }
    }).finally(() => setDetailLoading(false));
  }, [selectedStudent, enrolledStudents]);

  // Compute activity status from last logbook entry
  const getActivityFromLogs = (internshipId: string) => {
    // For the main table we don't have individual logs — show status-based colour
    return null; // real status shown via StatusBadge
  };

  const departments = [...new Set(enrolledStudents.map((s) => s.department).filter(Boolean))].sort();

  const filtered = enrolledStudents.filter((a) => {
    const q = search.toLowerCase();
    const matchSearch = !search ||
      a.studentName.toLowerCase().includes(q) ||
      a.studentId.toLowerCase().includes(q) ||
      a.companyName.toLowerCase().includes(q);
    const matchDept = deptFilter === "All" || a.department === deptFilter;
    const matchStatus = statusFilter === "All" || a.status === statusFilter;
    return matchSearch && matchDept && matchStatus;
  });

  const detail = selectedStudent ? enrolledStudents.find((a) => a.id === selectedStudent) : null;
  const selectedInternshipId = detail?.internshipId ?? null;

  // Compute last log date from detailLogEntries when a student is selected
  const lastLogDate = detailLogEntries.length > 0
    ? detailLogEntries.sort((a, b) => b.entry_date > a.entry_date ? 1 : -1)[0]?.entry_date
    : null;

  const handleSaveReport = async () => {
    if (!selectedInternshipId || !reportScore) return;
    setScoreSaving(true);

    // Convert single score (0-100) to 5 sub-scores (0-4 each)
    // Percentage of max score: reportScore/100
    // Convert each sub-score: (reportScore/100) * 4
    const scorePercentage = Number(reportScore) / 100;
    const subScore = scorePercentage * 4;

    const res = await apiClient.gradeReport(selectedInternshipId, {
      content_quality: subScore,
      organization: subScore,
      technical_depth: subScore,
      writing_quality: subScore,
      formatting: subScore,
      comments: reportComment || undefined,
    });
    setScoreSaving(false);
    if (res.success) {
      toast.success("Report score saved.");
      const gr = await apiClient.getGrade(selectedInternshipId);
      if (gr.success) setDetailGrade((gr.data as any)?.grade ?? gr.data);
    } else {
      toast.error(res.message ?? "Failed to save report score.");
    }
  };

  const handleSavePresentation = async () => {
    if (!selectedInternshipId || !presScore) return;
    setScoreSaving(true);

    try {
      // Check if presentation exists for this internship
      let presentationId = detailGrade?.presentation_id;

      if (!presentationId) {
        const schedRes = await apiClient.schedulePresentationScore({
          internship_id: Number(selectedInternshipId),
          presentation_date: new Date().toISOString().split('T')[0],
        });

        if (!schedRes.success) {
          toast.error("Failed to create presentation record.");
          setScoreSaving(false);
          return;
        }

        presentationId = schedRes.data?.presentation?.id;
      }

      if (!presentationId) {
        toast.error("No presentation ID available.");
        setScoreSaving(false);
        return;
      }

      // Convert DLO score (0-100) to presentation scale (0-20, default max)
      const presentationMaxScore = 20;
      const normalizedScore = (Number(presScore) / 100) * presentationMaxScore;

      // Now grade the presentation
      const gradeRes = await apiClient.gradePresentationScore(String(presentationId), {
        assessor_1_score: normalizedScore,
        comments: presComment || undefined,
      });

      setScoreSaving(false);
      if (gradeRes.success) {
        toast.success("Presentation score saved.");
        const gr = await apiClient.getGrade(selectedInternshipId!);
        if (gr.success) setDetailGrade((gr.data as any)?.grade ?? gr.data);
      } else {
        toast.error(gradeRes.message ?? "Failed to save presentation score.");
      }
    } catch (error) {
      setScoreSaving(false);
      toast.error("An error occurred while saving presentation score.");
    }
  };

  const handleSaveInd = async () => {
    if (!selectedInternshipId) return;
    setScoreSaving(true);
    const targetId = detailGrade?.id || selectedInternshipId;
    const res = await apiClient.updateGrade(String(targetId), {
      industrial_assessment_score: indScore ? Number(indScore) : null,
      remarks: indComment || undefined,
    });
    setScoreSaving(false);
    if (res.success) {
      toast.success("Industrial Assessment score saved.");
      const gr = await apiClient.getGrade(selectedInternshipId);
      if (gr.success) setDetailGrade((gr.data as any)?.grade ?? gr.data);
    } else toast.error(res.message ?? "Failed to save score.");
  };

  const handleSaveSite = async () => {
    if (!selectedInternshipId) return;
    setScoreSaving(true);
    const targetId = detailGrade?.id || selectedInternshipId;
    const res = await apiClient.updateGrade(String(targetId), {
      site_visitation_score: siteScore ? Number(siteScore) : null,
      remarks: siteComment || undefined,
    });
    setScoreSaving(false);
    if (res.success) {
      toast.success("Site Visitation score saved.");
      const gr = await apiClient.getGrade(selectedInternshipId);
      if (gr.success) setDetailGrade((gr.data as any)?.grade ?? gr.data);
    } else toast.error(res.message ?? "Failed to save score.");
  };

  const handleApproveGrade = async () => {
    if (!detailGrade?.id) { toast.error("No compiled grade to approve."); return; }
    const res = await apiClient.approveGrade(String(detailGrade.id));
    if (res.success) {
      toast.success("Grade approved.");
      const gr = await apiClient.getGrade(selectedInternshipId!);
      if (gr.success) setDetailGrade((gr.data as any)?.grade ?? gr.data);
    } else {
      toast.error(res.message ?? "Failed to approve grade.");
    }
  };

  const handleCompileGrade = async () => {
    if (!selectedInternshipId) return;

    try {
      const cfg = gradingConfig;
      if (cfg && structure) {
        const reportWeight = cfg.report_weight ?? 0;
        const presentationWeight = cfg.presentation_weight ?? 0;

        if (reportWeight === 0 && !reportScore) {
          const resReport = await apiClient.gradeReport(selectedInternshipId, {
            content_quality: 0, organization: 0, technical_depth: 0,
            writing_quality: 0, formatting: 0,
            comments: "Auto-filled (not part of this structure)",
          });
          if (!resReport.success) {
            toast.error("Failed to prepare report score.");
            return;
          }
        }

        if (presentationWeight === 0 && !presScore) {
          let presentationId = detailGrade?.presentation_id;
          if (!presentationId) {
            const schedRes = await apiClient.schedulePresentationScore({
              internship_id: Number(selectedInternshipId),
              presentation_date: new Date().toISOString().split('T')[0],
            });
            if (schedRes.success) {
              presentationId = schedRes.data?.presentation?.id;
            }
          }
          if (presentationId) {
            await apiClient.gradePresentationScore(String(presentationId), {
              assessor_1_score: 0,
              comments: "Auto-filled (not part of this structure)",
            });
          }
        }
      }
    } catch (error) {
      console.error("Error preparing components:", error);
    }

    const res = await apiClient.compileGrade(selectedInternshipId);
    if (res.success) {
      toast.success("Grade compiled.");
      const gr = await apiClient.getGrade(selectedInternshipId);
      if (gr.success) setDetailGrade((gr.data as any)?.grade ?? gr.data);
    } else {
      toast.error(res.message ?? "Failed to compile grade.");
    }
  };

  const commPath = `/${ROLE_PATH[viewRole] ?? viewRole}/communications`;

  // Determine which scoring components to show based on grading structure
  const gradingConfig = (detailGrade as any)?.gradingConfiguration;
  const structure = gradingConfig?.structure || gradingConfig?.name || "C"; // Default to C if unknown

  const showReport = structure !== "B"; // A, C, D show report; B doesn't
  const showPresentation = structure !== "A"; // B, C, D show presentation; A doesn't

  const activeMissedList = missedModalThreshold === 7 ? missed7List : missed3List;
  const filteredMissedList = activeMissedList.filter((item: any) => {
    if (!missedSearch.trim()) return true;
    const q = missedSearch.toLowerCase();
    const sName = (item.student?.user?.name ?? item.student?.name ?? "").toLowerCase();
    const sId = (item.student?.student_id ?? item.student_id ?? "").toLowerCase();
    const cName = (item.company?.name ?? "").toLowerCase();
    const dept = (item.student?.department?.name ?? item.department?.name ?? "").toLowerCase();
    return sName.includes(q) || sId.includes(q) || cName.includes(q) || dept.includes(q);
  });

  const openStudentFromMissed = (item: any) => {
    const userId = String(item.student?.user?.id ?? item.student_id ?? item.id);
    const existing = enrolledStudents.find(
      (s) => s.id === userId || s.studentUserId === userId || s.internshipId === String(item.id)
    );
    if (existing) {
      setSelectedStudent(existing.id);
    } else {
      const fallbackRow = {
        id: userId,
        internshipId: String(item.id),
        studentName: item.student?.user?.name ?? item.student?.name ?? "—",
        studentId: item.student?.student_id ?? "—",
        studentUserId: userId,
        companyName: item.company?.name ?? "—",
        department: item.student?.department?.name ?? "—",
        level: item.student?.level ?? "—",
        supervisorAssigned: item.academic_supervisor?.user?.name ?? item.academicSupervisor?.user?.name ?? "",
        status: item.status ?? "active",
        startDate: fmtDate(item.start_date ?? item.created_at),
      };
      setEnrolledStudents((prev) => [fallbackRow, ...prev]);
      setSelectedStudent(userId);
    }
    setMissedModalThreshold(null);
  };

  const messageStudentFromMissed = (item: any) => {
    const userId = String(item.student?.user?.id ?? item.student?.user_id ?? "");
    if (userId) {
      navigate(`${commPath}?tab=messages&recipient=${userId}`);
    } else {
      toast.error("Unable to find user ID for this student.");
    }
  };

  if (loading) return <SkeletonTableRows count={5} />;

  return (
    <div className="space-y-6">
      {/* Missed check-in summary cards */}
      {(missed3.length > 0 || missed7.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => { setMissedModalThreshold(3); setMissedSearch(""); }}
            className={`w-full text-left rounded-xl p-4 flex items-center justify-between gap-3 border transition-all duration-200 group cursor-pointer hover:shadow-md hover:-translate-y-0.5 ${
              missedModalThreshold === 3
                ? "bg-amber-100/90 border-amber-400 ring-2 ring-amber-400/40 dark:bg-amber-950/50 dark:border-amber-600"
                : "bg-amber-50/80 border-amber-200 hover:bg-amber-100/80 dark:bg-amber-950/25 dark:border-amber-800/60 dark:hover:bg-amber-950/40"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-100 border border-amber-300/60 text-amber-700 dark:bg-amber-900/40 dark:border-amber-700/60 dark:text-amber-300 shrink-0 group-hover:scale-105 transition-transform">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-amber-900 dark:text-amber-200 text-base">
                    {missed3.length} student{missed3.length !== 1 ? "s" : ""}
                  </p>
                  <span className="text-[0.65rem] font-bold px-1.5 py-0.5 rounded-full bg-amber-200/80 text-amber-800 dark:bg-amber-900/80 dark:text-amber-300">
                    3+ Days
                  </span>
                </div>
                <p className="text-amber-700 dark:text-amber-400 mt-0.5" style={{ fontSize: "0.75rem" }}>
                  Missed check-in 3+ days · <span className="underline group-hover:text-amber-900 dark:group-hover:text-amber-200 font-medium">Click to view & message</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-amber-700 dark:text-amber-400 text-xs font-semibold shrink-0 group-hover:translate-x-0.5 transition-transform">
              <span className="hidden md:inline">View List</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </button>

          <button
            type="button"
            onClick={() => { setMissedModalThreshold(7); setMissedSearch(""); }}
            className={`w-full text-left rounded-xl p-4 flex items-center justify-between gap-3 border transition-all duration-200 group cursor-pointer hover:shadow-md hover:-translate-y-0.5 ${
              missedModalThreshold === 7
                ? "bg-red-100/90 border-red-400 ring-2 ring-red-400/40 dark:bg-red-950/50 dark:border-red-600"
                : "bg-red-50/80 border-red-200 hover:bg-red-100/80 dark:bg-red-950/25 dark:border-red-800/60 dark:hover:bg-red-950/40"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-red-100 border border-red-300/60 text-red-700 dark:bg-red-900/40 dark:border-red-700/60 dark:text-red-300 shrink-0 group-hover:scale-105 transition-transform">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-red-900 dark:text-red-200 text-base">
                    {missed7.length} student{missed7.length !== 1 ? "s" : ""}
                  </p>
                  <span className="text-[0.65rem] font-bold px-1.5 py-0.5 rounded-full bg-red-200/80 text-red-800 dark:bg-red-900/80 dark:text-red-300 uppercase tracking-wider">
                    Critical 7+ Days
                  </span>
                </div>
                <p className="text-red-700 dark:text-red-400 mt-0.5" style={{ fontSize: "0.75rem" }}>
                  Missed check-in 7+ days · <span className="underline group-hover:text-red-900 dark:group-hover:text-red-200 font-medium">Click to view & message</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-red-700 dark:text-red-400 text-xs font-semibold shrink-0 group-hover:translate-x-0.5 transition-transform">
              <span className="hidden md:inline">View List</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1>Students</h1>
          <p className="text-muted-foreground" style={{ fontSize: "0.85rem" }}>
            {loading ? "Loading…" : `${enrolledStudents.length} internship${enrolledStudents.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <button
          onClick={() => exportToCSV(filtered.map((s) => ({
            Name: s.studentName, ID: s.studentId, Department: s.department,
            Company: s.companyName, Supervisor: s.supervisorAssigned, Status: s.status,
          })), "students_export")}
          className="px-4 py-2 bg-card border border-border rounded-lg hover:bg-accent flex items-center gap-2"
          style={{ fontSize: "0.85rem" }}
        >
          <Download className="w-4 h-4" /> Export
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input type="text" placeholder="Search by name, ID, or company…" value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-card" style={{ fontSize: "0.85rem" }} />
        </div>
        {viewRole === "clo" && (
          <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}
            className="px-3 py-2 border border-border rounded-lg bg-card" style={{ fontSize: "0.85rem" }}>
            <option value="All">All Departments</option>
            {departments.map((d) => <option key={d}>{d}</option>)}
          </select>
        )}
        <div className="flex gap-1.5">
          {["All", "active", "completed", "pending"].map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg border transition-colors capitalize ${statusFilter === s ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground hover:bg-accent"}`}
              style={{ fontSize: "0.8rem" }}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-muted-foreground" style={{ fontSize: "0.85rem" }}>Loading students…</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3" style={{ fontSize: "0.75rem" }}>Student</th>
                  <th className="text-left px-4 py-3" style={{ fontSize: "0.75rem" }}>Status</th>
                  <th className="text-left px-4 py-3" style={{ fontSize: "0.75rem" }}>Company</th>
                  <th className="text-left px-4 py-3" style={{ fontSize: "0.75rem" }}>Supervisor</th>
                  {viewRole === "clo" && <th className="text-left px-4 py-3" style={{ fontSize: "0.75rem" }}>Department</th>}
                  <th className="text-left px-4 py-3" style={{ fontSize: "0.75rem" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id}
                    className={`border-b border-border last:border-0 hover:bg-muted/20 cursor-pointer ${selectedStudent === s.id ? "bg-primary/5" : ""}`}
                    onClick={() => setSelectedStudent(s.id)}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div>
                          <p style={{ fontSize: "0.85rem" }}>{s.studentName}</p>
                          <p style={{ fontSize: "0.7rem" }} className="text-muted-foreground">{s.studentId}</p>
                        </div>
                        {missed7.includes(s.id) && (
                          <span className="px-1.5 py-0.5 rounded text-white bg-red-500 flex items-center gap-1 shrink-0" style={{ fontSize: "0.65rem" }}>
                            <Flag className="w-2.5 h-2.5" /> 7d
                          </span>
                        )}
                        {!missed7.includes(s.id) && missed3.includes(s.id) && (
                          <span className="px-1.5 py-0.5 rounded text-amber-800 bg-amber-200 flex items-center gap-1 shrink-0" style={{ fontSize: "0.65rem" }}>
                            <Flag className="w-2.5 h-2.5" /> 3d
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                    <td className="px-4 py-3" style={{ fontSize: "0.85rem" }}>{s.companyName}</td>
                    <td className="px-4 py-3 text-muted-foreground" style={{ fontSize: "0.85rem" }}>{s.supervisorAssigned || "—"}</td>
                    {viewRole === "clo" && <td className="px-4 py-3 text-muted-foreground" style={{ fontSize: "0.8rem" }}>{s.department}</td>}
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => setSelectedStudent(s.id)}
                        className="p-1.5 rounded-md hover:bg-accent text-muted-foreground" title="View details">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => navigate(`${commPath}?tab=messages&recipient=${s.studentUserId}`)}
                        disabled={!s.studentUserId}
                        className="p-1.5 rounded-md hover:bg-accent text-muted-foreground disabled:opacity-40" title="Message">
                        <MessageSquare className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={viewRole === "clo" ? 6 : 5} className="px-4 py-10 text-center text-muted-foreground" style={{ fontSize: "0.85rem" }}>
                    No students match your filters.
                  </td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        isLoading={loading}
      />

      {/* Detail Modal */}
      {detail && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedStudent(null)}>
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg max-h-[88vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h3>Student Details</h3>
                <button onClick={() => setSelectedStudent(null)} className="p-1 rounded-md hover:bg-accent"><X className="w-4 h-4" /></button>
              </div>

              <div className="flex items-center gap-3 pb-3 border-b border-border">
                <div className="w-11 h-11 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold" style={{ fontSize: "0.8rem" }}>
                  {detail.studentName.split(" ").map((w: string) => w[0]).join("").slice(0, 2)}
                </div>
                <div>
                  <p style={{ fontSize: "0.9rem" }} className="font-medium">{detail.studentName}</p>
                  <p className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>{detail.studentId} · Level {detail.level}</p>
                </div>
                <div className="ml-auto"><StatusBadge status={detail.status} /></div>
              </div>

              {/* Tabs — scoring only for CLO/DLO */}
              {canScore && (
                <div className="flex gap-1 border-b border-border -mt-2">
                  {(["overview", "scoring"] as const).map((k) => (
                    <button key={k} onClick={() => setDetailTab(k)}
                      className={`px-3 py-2 border-b-2 -mb-px capitalize ${detailTab === k ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                      style={{ fontSize: "0.8rem" }}>
                      {k}
                    </button>
                  ))}
                </div>
              )}

              {detailLoading && (
                <div className="text-center py-4 text-muted-foreground" style={{ fontSize: "0.85rem" }}>Loading…</div>
              )}

              {/* Overview Tab */}
              {(!canScore || detailTab === "overview") && !detailLoading && (
                <>
                  {[
                    ["Department", detail.department],
                    ["Company", detail.companyName !== "—" ? detail.companyName : "No internship yet"],
                    ["University Supervisor", detail.supervisorAssigned || "Not assigned"],
                    ["Started", detail.startDate !== "—" ? detail.startDate : "No internship yet"],
                  ].map(([l, v]) => (
                    <div key={l}>
                      <p className="text-muted-foreground" style={{ fontSize: "0.7rem" }}>{l}</p>
                      <p style={{ fontSize: "0.85rem" }}>{v}</p>
                    </div>
                  ))}

                  {!selectedInternshipId && (
                    <div className="pt-3 border-t border-border">
                      <p className="text-muted-foreground italic text-center" style={{ fontSize: "0.82rem" }}>
                        Student has not started an internship yet.
                      </p>
                    </div>
                  )}

                  {/* Recent Logbook */}
                  {selectedInternshipId && <div className="pt-3 border-t border-border">
                    <p className="text-muted-foreground mb-2 flex items-center gap-1" style={{ fontSize: "0.75rem" }}>
                      <BookMarked className="w-3.5 h-3.5" />
                      RECENT LOGBOOK ENTRIES
                      {lastLogDate && <span className="ml-auto text-emerald-600">Last: {lastLogDate}</span>}
                    </p>
                    {detailLogEntries.length === 0 ? (
                      <p className="text-muted-foreground italic" style={{ fontSize: "0.8rem" }}>No entries yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {detailLogEntries.slice(0, 3).map((e: any) => (
                          <div key={e.id} className="p-2.5 bg-secondary/30 rounded-lg">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-muted-foreground" style={{ fontSize: "0.7rem" }}>{e.entry_date}</span>
                              <StatusBadge status={e.status} />
                            </div>
                            <p style={{ fontSize: "0.8rem" }} className="line-clamp-2">{e.activities_description}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>}

                  {/* Recent Attendance */}
                  {selectedInternshipId && <div className="pt-3 border-t border-border">
                    <p className="text-muted-foreground mb-2 flex items-center gap-1" style={{ fontSize: "0.75rem" }}>
                      <MapPin className="w-3.5 h-3.5" /> RECENT CHECK-INS
                    </p>
                    {detailAttendance.length === 0 ? (
                      <p className="text-muted-foreground italic" style={{ fontSize: "0.8rem" }}>No check-ins recorded.</p>
                    ) : (
                      <div className="space-y-2">
                        {detailAttendance.slice(0, 3).map((a: any) => (
                          <div key={a.id} className="p-2.5 bg-secondary/30 rounded-lg flex items-center justify-between">
                            <div>
                              <p style={{ fontSize: "0.8rem", fontWeight: 500 }}>
                                {fmtDate(a.attendance_date)}
                                <span className="text-muted-foreground ml-2" style={{ fontSize: "0.7rem" }}>
                                  <Clock className="w-3 h-3 inline" /> {a.check_in_time}
                                </span>
                              </p>
                              <p className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>{a.status}</p>
                            </div>
                            {(a.status === "present" || a.status === "late") ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                            ) : a.status === "absent" ? (
                              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                            ) : (
                              <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>}
                </>
              )}

              {/* Scoring Tab */}
              {canScore && detailTab === "scoring" && !detailLoading && (
                <div className="space-y-4">
                  {/* Grade summary */}
                  <div className="rounded-lg border border-border p-3 bg-muted/20 space-y-1.5">
                    <p className="text-muted-foreground flex items-center gap-1 mb-2" style={{ fontSize: "0.7rem" }}>
                      <Award className="w-3.5 h-3.5" /> GRADE COMPONENTS
                    </p>
                    {[
                      ["Industrial Assessment", detailGrade?.industrial_assessment_score],
                      ["Site Visitation", detailGrade?.site_visitation_score],
                      ["Report", detailGrade?.report_score],
                      ["Presentation", detailGrade?.presentation_score],
                    ].map(([label, val]) => (
                      <div key={label as string} className="flex items-center justify-between">
                        <span className="text-muted-foreground" style={{ fontSize: "0.8rem" }}>{label}</span>
                        <span className={`flex items-center gap-1.5 ${val ? "text-emerald-600" : "text-amber-600"}`} style={{ fontSize: "0.85rem" }}>
                          {val ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                          {val ?? "Pending"}
                        </span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between pt-2 border-t border-border mt-1">
                      <span style={{ fontSize: "0.85rem" }}>Final</span>
                      <span style={{ fontSize: "0.95rem" }} className="font-semibold">
                        {detailGrade?.total_score ? `${detailGrade.total_score}%` : "—"}
                        {detailGrade?.status && <span className="ml-2"><StatusBadge status={detailGrade.status} /></span>}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-lg border border-border p-3 space-y-2">
                    <p className="text-muted-foreground" style={{ fontSize: "0.7rem" }}>INDUSTRIAL ASSESSMENT (OVERRIDE)</p>
                    <div className="flex gap-2">
                      <input type="number" min={0} max={100} value={indScore} onChange={(e) => setIndScore(e.target.value)}
                        placeholder="0–100"
                        disabled={isArchiveMode}
                        className="flex-1 px-3 py-1.5 rounded-md border border-border bg-card disabled:opacity-50" style={{ fontSize: "0.85rem" }} />
                      {!isArchiveMode && (
                        <button onClick={handleSaveInd} disabled={scoreSaving || !indScore}
                          className="px-3 py-1.5 bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50" style={{ fontSize: "0.8rem" }}>
                          Save
                        </button>
                      )}
                    </div>
                    <textarea value={indComment} onChange={(e) => setIndComment(e.target.value)}
                      placeholder="Comments (optional)" rows={2}
                      disabled={isArchiveMode}
                      className="w-full px-3 py-1.5 rounded-md border border-border bg-card disabled:opacity-50" style={{ fontSize: "0.8rem" }} />
                  </div>

                  <div className="rounded-lg border border-border p-3 space-y-2">
                    <p className="text-muted-foreground" style={{ fontSize: "0.7rem" }}>SITE VISITATION (OVERRIDE)</p>
                    <div className="flex gap-2">
                      <input type="number" min={0} max={100} value={siteScore} onChange={(e) => setSiteScore(e.target.value)}
                        placeholder="0–100"
                        disabled={isArchiveMode}
                        className="flex-1 px-3 py-1.5 rounded-md border border-border bg-card disabled:opacity-50" style={{ fontSize: "0.85rem" }} />
                      {!isArchiveMode && (
                        <button onClick={handleSaveSite} disabled={scoreSaving || !siteScore}
                          className="px-3 py-1.5 bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50" style={{ fontSize: "0.8rem" }}>
                          Save
                        </button>
                      )}
                    </div>
                    <textarea value={siteComment} onChange={(e) => setSiteComment(e.target.value)}
                      placeholder="Comments (optional)" rows={2}
                      disabled={isArchiveMode}
                      className="w-full px-3 py-1.5 rounded-md border border-border bg-card disabled:opacity-50" style={{ fontSize: "0.8rem" }} />
                  </div>

                  {showReport && (
                    <div className="rounded-lg border border-border p-3 space-y-2">
                      <p className="text-muted-foreground" style={{ fontSize: "0.7rem" }}>REPORT SCORE</p>
                      <div className="flex gap-2">
                        <input type="number" min={0} max={100} value={reportScore} onChange={(e) => setReportScore(e.target.value)}
                          placeholder="0–100"
                          disabled={isArchiveMode}
                          className="flex-1 px-3 py-1.5 rounded-md border border-border bg-card disabled:opacity-50" style={{ fontSize: "0.85rem" }} />
                        {!isArchiveMode && (
                          <button onClick={handleSaveReport} disabled={scoreSaving || !reportScore}
                            className="px-3 py-1.5 bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50" style={{ fontSize: "0.8rem" }}>
                            Save
                          </button>
                        )}
                      </div>
                      <textarea value={reportComment} onChange={(e) => setReportComment(e.target.value)}
                        placeholder="Comments (optional)" rows={2}
                        disabled={isArchiveMode}
                        className="w-full px-3 py-1.5 rounded-md border border-border bg-card disabled:opacity-50" style={{ fontSize: "0.8rem" }} />
                    </div>
                  )}

                  {/* Presentation Score - shown for Structures B, C, D */}
                  {showPresentation && (
                    <div className="rounded-lg border border-border p-3 space-y-2">
                      <p className="text-muted-foreground" style={{ fontSize: "0.7rem" }}>PRESENTATION SCORE</p>
                      <div className="flex gap-2">
                        <input type="number" min={0} max={100} value={presScore} onChange={(e) => setPresScore(e.target.value)}
                          placeholder="0–100"
                          disabled={isArchiveMode}
                          className="flex-1 px-3 py-1.5 rounded-md border border-border bg-card disabled:opacity-50" style={{ fontSize: "0.85rem" }} />
                        {!isArchiveMode && (
                          <button onClick={handleSavePresentation} disabled={scoreSaving || !presScore}
                            className="px-3 py-1.5 bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50" style={{ fontSize: "0.8rem" }}>
                            Save
                          </button>
                        )}
                      </div>
                      <textarea value={presComment} onChange={(e) => setPresComment(e.target.value)}
                        placeholder="Comments (optional)" rows={2}
                        disabled={isArchiveMode}
                        className="w-full px-3 py-1.5 rounded-md border border-border bg-card disabled:opacity-50" style={{ fontSize: "0.8rem" }} />
                    </div>
                  )}

                  {/* Compile + Approve */}
                  {!isArchiveMode && (
                    <div className="rounded-lg border border-border p-3 space-y-2">
                      <p className="text-muted-foreground" style={{ fontSize: "0.7rem" }}>FINALISE</p>
                      {!detailGrade?.id && (
                        <button onClick={handleCompileGrade}
                          className="w-full py-2 bg-blue-600 text-white rounded-md hover:opacity-90 flex items-center justify-center gap-2" style={{ fontSize: "0.85rem" }}>
                          <FileText className="w-4 h-4" /> Compile Grade
                        </button>
                      )}
                      <button onClick={handleApproveGrade}
                        disabled={!detailGrade?.id || detailGrade?.status === "approved" || detailGrade?.status === "published"}
                        className="w-full py-2 bg-emerald-600 text-white rounded-md hover:opacity-90 disabled:opacity-40 flex items-center justify-center gap-2" style={{ fontSize: "0.85rem" }}>
                        <CheckCircle2 className="w-4 h-4" /> Approve Final Grade
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Missed Check-In Students Modal */}
      {missedModalThreshold !== null && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setMissedModalThreshold(null)}
        >
          <div
            className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              className={`p-5 border-b flex items-start justify-between gap-4 ${
                missedModalThreshold === 7
                  ? "bg-red-50/70 border-red-200 dark:bg-red-950/40 dark:border-red-900/60"
                  : "bg-amber-50/70 border-amber-200 dark:bg-amber-950/40 dark:border-amber-900/60"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`p-2.5 rounded-xl border shrink-0 mt-0.5 ${
                    missedModalThreshold === 7
                      ? "bg-red-100 border-red-300 text-red-700 dark:bg-red-900/50 dark:text-red-300 dark:border-red-800"
                      : "bg-amber-100 border-amber-300 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 dark:border-amber-800"
                  }`}
                >
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold">
                      {missedModalThreshold === 7
                        ? "Critical: Students Missing Check-In (7+ Days)"
                        : "Students Missing Check-In (3+ Days)"}
                    </h3>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                        missedModalThreshold === 7
                          ? "bg-red-100 text-red-800 border-red-300 dark:bg-red-900/60 dark:text-red-200 dark:border-red-800"
                          : "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/60 dark:text-amber-200 dark:border-amber-800"
                      }`}
                    >
                      {activeMissedList.length} flagged
                    </span>
                  </div>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {missedModalThreshold === 7
                      ? "These students have missed daily check-in for 7 or more consecutive working days. Immediate intervention is required."
                      : "These students have missed daily check-in for 3 or more working days. Reach out via chat or review their profiles."}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setMissedModalThreshold(null)}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search & Filter Toolbar */}
            <div className="p-4 border-b border-border bg-muted/20 flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Filter flagged students by name, student ID, company..."
                  value={missedSearch}
                  onChange={(e) => setMissedSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              {missedSearch && (
                <button
                  onClick={() => setMissedSearch("")}
                  className="text-xs text-muted-foreground hover:text-foreground underline px-1"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Students List */}
            <div className="p-4 overflow-y-auto flex-1 space-y-3 divide-y divide-border/60">
              {filteredMissedList.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground space-y-2">
                  <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 opacity-80" />
                  <p className="font-medium text-sm">No students match this filter.</p>
                  <p className="text-xs text-muted-foreground">
                    {missedSearch ? "Try refining your search terms." : "All students are checked in!"}
                  </p>
                </div>
              ) : (
                filteredMissedList.map((item: any) => {
                  const sName = item.student?.user?.name ?? item.student?.name ?? "—";
                  const sId = item.student?.student_id ?? item.student_id ?? "—";
                  const sDept = item.student?.department?.name ?? item.department?.name ?? "—";
                  const cName = item.company?.name ?? "—";
                  const sUserId = String(item.student?.user?.id ?? item.student?.user_id ?? "");
                  const initials = sName.split(" ").map((w: string) => w[0]).join("").slice(0, 2);

                  return (
                    <div
                      key={item.id}
                      className="pt-3 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl hover:bg-muted/40 transition-colors"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                            missedModalThreshold === 7
                              ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                              : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                          }`}
                        >
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-sm truncate">{sName}</p>
                            <span className="text-xs text-muted-foreground font-mono">({sId})</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            <span className="font-medium text-foreground">{cName}</span> · {sDept}
                          </p>
                          {item.academic_supervisor?.user?.name && (
                            <p className="text-[0.7rem] text-muted-foreground mt-0.5">
                              Supervisor: {item.academic_supervisor.user.name}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        <button
                          type="button"
                          onClick={() => messageStudentFromMissed(item)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition text-xs font-semibold shadow-sm cursor-pointer"
                          title="Open Chat to message student"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Message</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => openStudentFromMissed(item)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-accent text-foreground transition text-xs font-medium cursor-pointer"
                          title="View complete student profile"
                        >
                          <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                          <span>Profile</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-muted/30 border-t border-border flex items-center justify-between text-xs text-muted-foreground px-5">
              <span>Showing {filteredMissedList.length} of {activeMissedList.length} students</span>
              <button
                onClick={() => setMissedModalThreshold(null)}
                className="px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-muted font-medium text-foreground cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
