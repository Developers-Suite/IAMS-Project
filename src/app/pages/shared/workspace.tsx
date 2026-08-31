import { useState, useEffect } from "react";
import { useAppContext } from "../../lib/context";
import { apiClient } from "../../lib/api-client";
import { useNavigate } from "react-router";
import {
  Calendar,
  Users,
  GraduationCap,
  ChevronRight,
  RefreshCw,
  Layers,
  Archive,
  Lock,
  Building2,
  CheckCircle2,
  FileText,
  Clock,
  Sparkles,
} from "lucide-react";
import { SkeletonDashboard } from "../../components/skeleton";
import { toast } from "sonner";
import { useTerm } from "../../lib/term-context";

export function WorkspacePage() {
  const { user } = useAppContext();
  const { allTerms, setSelectedTerm, selectedTermId } = useTerm();
  const navigate = useNavigate();

  const [terms, setTerms] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [internships, setInternships] = useState<any[]>([]);
  const [studentInternships, setStudentInternships] = useState<any[]>([]);
  const [studentApps, setStudentApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    setRefreshing(true);
    try {
      const isDeptRole = user?.role === "dlo" || user?.role === "hod";
      const isSupervisorRole = user?.role === "supervisor" || user?.role === "academic";
      const isStudent = user?.role === "student";

      const [termsRes, appsRes, internshipsRes, studentInternshipsRes, studentAppsRes] = await Promise.all([
        apiClient.getTerms({ per_page: 100 }),
        isDeptRole ? apiClient.getApplications({ department: user?.department, per_page: 200 }) : Promise.resolve({ success: false, data: [] }),
        isSupervisorRole ? apiClient.getDashboard(user?.role === "academic" ? "academic-supervisor" : "industry-supervisor") : Promise.resolve({ success: false, data: {} }),
        isStudent ? apiClient.getInternships({ per_page: 50 }) : Promise.resolve({ success: false, data: [] }),
        isStudent ? apiClient.getApplications({ per_page: 50 }) : Promise.resolve({ success: false, data: [] }),
      ]);

      if (termsRes.success && Array.isArray(termsRes.data) && termsRes.data.length > 0) {
        setTerms(termsRes.data);
      } else if (allTerms && allTerms.length > 0) {
        setTerms(allTerms);
      }

      if (appsRes.success) {
        setApplications(appsRes.data || []);
      }
      if (internshipsRes.success) {
        setInternships(internshipsRes.data?.assigned_internships || []);
      }
      if (studentInternshipsRes.success) {
        setStudentInternships(Array.isArray(studentInternshipsRes.data) ? studentInternshipsRes.data : []);
      }
      if (studentAppsRes.success) {
        setStudentApps(Array.isArray(studentAppsRes.data) ? studentAppsRes.data : []);
      }
    } catch (err) {
      console.error("Error loading workspace data:", err);
      if (allTerms && allTerms.length > 0) {
        setTerms(allTerms);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user?.id, user?.role]);

  // If terms state is empty but allTerms has loaded from TermContext, use allTerms
  const effectiveTerms = terms.length > 0 ? terms : allTerms;

  const activeTerms = effectiveTerms.filter(
    (t: any) => (t.status ?? "").toLowerCase() === "active"
  );

  const archivedTerms = effectiveTerms.filter(
    (t: any) => {
      const status = (t.status ?? "").toLowerCase();
      return status === "archived" || status === "completed";
    }
  );

  const upcomingTerms = effectiveTerms.filter(
    (t: any) => {
      const status = (t.status ?? "").toLowerCase();
      return status === "upcoming" || status === "draft";
    }
  );

  const handleSelectWorkspace = (termId: string | number, termName: string, isArchive = false) => {
    const matchedTerm =
      allTerms.find((t) => String(t.id) === String(termId)) ||
      terms.find((t) => String(t.id) === String(termId));

    if (matchedTerm) {
      setSelectedTerm(matchedTerm);
    }
    toast.success(
      isArchive
        ? `Switched workspace to archived term: ${termName}`
        : `Switched workspace to ${termName}`
    );

    if (user?.role === "dlo") {
      navigate("/dlo");
    } else if (user?.role === "supervisor") {
      navigate("/supervisor");
    } else if (user?.role === "academic") {
      navigate("/academic");
    } else if (user?.role === "hod") {
      navigate("/hod");
    } else if (user?.role === "student") {
      navigate("/student");
    } else if (user?.role === "clo") {
      navigate("/clo");
    }
  };

  const getAssociatedMetrics = (term: any) => {
    const termId = String(term.id);
    const isDeptRole = user?.role === "dlo" || user?.role === "hod";
    const isSupervisorRole = user?.role === "supervisor" || user?.role === "academic";
    const isStudent = user?.role === "student";

    if (isDeptRole) {
      const termApps = applications.filter(
        (app: any) =>
          String(app.academic_term_id ?? app.term_id ?? app.term?.id) === termId
      );
      const activeCount = termApps.filter((app: any) => app.status === "active" || app.status === "approved").length;
      return (
        <div className="grid grid-cols-2 gap-4 bg-muted/40 rounded-xl p-4 border border-border/30">
          <div className="space-y-1">
            <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Department Apps</p>
            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-primary shrink-0" />
              <span className="text-sm font-bold">{termApps.length}</span>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Placements</p>
            <div className="flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4 text-primary shrink-0" />
              <span className="text-sm font-bold">{activeCount}</span>
            </div>
          </div>
        </div>
      );
    }

    if (isSupervisorRole) {
      const termInternships = internships.filter(
        (intern: any) =>
          String(intern.academic_term_id ?? intern.term_id ?? intern.term?.id) === termId
      );
      return (
        <div className="bg-muted/40 rounded-xl p-4 border border-border/30">
          <div className="space-y-1">
            <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Assigned Interns</p>
            <div className="flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4 text-primary shrink-0" />
              <span className="text-sm font-bold">{termInternships.length} student(s)</span>
            </div>
          </div>
        </div>
      );
    }

    if (isStudent) {
      const matchedInternship = studentInternships.find(
        (i: any) => String(i.academic_term_id ?? i.term_id ?? i.term?.id) === termId
      );
      const matchedApp = studentApps.find(
        (a: any) => String(a.academic_term_id ?? a.term_id ?? a.term?.id) === termId
      );

      if (matchedInternship) {
        const companyName = matchedInternship.company?.name || matchedInternship.company_name || "Company Placement";
        return (
          <div className="bg-muted/40 rounded-xl p-3.5 border border-border/30 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-semibold uppercase text-[10px] tracking-wider flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-primary" /> Placement
              </span>
              <span className="font-semibold px-2 py-0.5 rounded-full text-[11px] capitalize bg-primary/10 text-primary">
                {matchedInternship.status || "Enrolled"}
              </span>
            </div>
            <p className="font-medium text-xs text-foreground truncate">{companyName}</p>
          </div>
        );
      }

      if (matchedApp) {
        const companyName = matchedApp.company?.name || matchedApp.company_name || "Industrial Attachment Application";
        return (
          <div className="bg-muted/40 rounded-xl p-3.5 border border-border/30 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-semibold uppercase text-[10px] tracking-wider flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-primary" /> Application
              </span>
              <span className="font-semibold px-2 py-0.5 rounded-full text-[11px] capitalize bg-blue-500/10 text-blue-600 dark:text-blue-400">
                {matchedApp.status || "Submitted"}
              </span>
            </div>
            <p className="font-medium text-xs text-foreground truncate">{companyName}</p>
          </div>
        );
      }
    }

    return null;
  };

  if (loading) return <SkeletonDashboard statCount={3} />;

  return (
    <div className="space-y-10 max-w-5xl mx-auto py-6">
      {/* Welcome Banner */}
      <div className="bg-primary/5 border border-primary/10 rounded-3xl p-8 md:p-10 relative overflow-hidden">
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-semibold">
            <Layers className="w-3.5 h-3.5" /> Workspace Selector
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">
            Welcome back, {user?.name}!
          </h1>
          <p className="text-muted-foreground text-sm md:text-base leading-relaxed">
            Please select an academic term workspace below. Each workspace acts as an isolated dashboard tailored for that term's department placements, students, and works.
          </p>
        </div>
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-5 flex items-center justify-center pointer-events-none">
          <Layers className="w-48 h-48 text-primary" />
        </div>
      </div>

      {/* ── SECTION 1: Active Academic Term Workspaces ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h2 className="text-xl font-bold text-foreground">Active Academic Term Workspaces</h2>
            </div>
            <p className="text-muted-foreground text-xs mt-1">
              Select an active workspace card to view and manage current live works
            </p>
          </div>
          <button
            onClick={loadData}
            disabled={refreshing}
            className="px-3.5 py-2 border border-border rounded-xl hover:bg-muted disabled:opacity-50 flex items-center gap-2 text-sm font-medium transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {activeTerms.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-border rounded-2xl bg-card space-y-3">
            <Calendar className="w-10 h-10 text-muted-foreground mx-auto opacity-40" />
            <div>
              <h3 className="font-bold text-sm">No active terms found</h3>
              <p className="text-muted-foreground text-xs mt-0.5">
                There are currently no active academic terms configured in the system.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {activeTerms.map((term: any) => {
              const isCurrent = String(selectedTermId) === String(term.id);
              const metrics = getAssociatedMetrics(term);

              return (
                <div
                  key={term.id}
                  onClick={() => handleSelectWorkspace(term.id, term.name, false)}
                  className={`group bg-card border hover:shadow-lg rounded-2xl p-6 transition-all cursor-pointer flex flex-col justify-between space-y-6 relative overflow-hidden ${
                    isCurrent
                      ? "border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-500/[0.02]"
                      : "border-border hover:border-emerald-500"
                  }`}
                >
                  {/* Top Accent Line */}
                  <div
                    className={`absolute top-0 left-0 w-full h-[3px] transition-all ${
                      isCurrent
                        ? "bg-emerald-500"
                        : "bg-emerald-500/30 group-hover:bg-emerald-500"
                    }`}
                  />

                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-lg text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                            {term.name}
                          </h3>
                          {isCurrent && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500 text-white">
                              <CheckCircle2 className="w-3 h-3" /> Current
                            </span>
                          )}
                        </div>
                        <p className="text-muted-foreground text-xs mt-1">
                          Type: <span className="capitalize font-medium text-foreground">{term.type === "short_term" ? "Vacation" : "Semestral"}</span>
                        </p>
                      </div>
                      <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 text-xs font-semibold rounded-full capitalize shrink-0 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        {term.status}
                      </span>
                    </div>

                    {term.description && (
                      <p className="text-muted-foreground text-xs line-clamp-2 leading-relaxed">
                        {term.description}
                      </p>
                    )}

                    {/* Role-specific Metrics & Context */}
                    {metrics}

                    <div className="text-muted-foreground text-xs space-y-1 pt-1 border-t border-border/40">
                      <p className="flex justify-between">
                        <span>Start Date:</span>
                        <span className="font-medium text-foreground">
                          {term.start_date ? new Date(term.start_date).toLocaleDateString("en-GB") : "—"}
                        </span>
                      </p>
                      <p className="flex justify-between">
                        <span>End Date:</span>
                        <span className="font-medium text-foreground">
                          {term.end_date ? new Date(term.end_date).toLocaleDateString("en-GB") : "—"}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 font-bold text-xs pt-4 border-t border-border/50">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      {isCurrent ? "Currently in Workspace" : "Enter Workspace"}
                    </span>
                    <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── SECTION 2: Archived & Past Term Workspaces ── */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Archive className="w-5 h-5 text-amber-500 dark:text-amber-400" />
              <h2 className="text-xl font-bold text-foreground">Archived & Past Term Workspaces</h2>
            </div>
            <p className="text-muted-foreground text-xs mt-1">
              Select a past term workspace card to enter read-only snapshots, past logbooks, and historical scores
            </p>
          </div>
        </div>

        {archivedTerms.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-border rounded-2xl bg-card space-y-3">
            <Archive className="w-10 h-10 text-muted-foreground mx-auto opacity-30" />
            <div>
              <h3 className="font-bold text-sm text-foreground">No archived terms available</h3>
              <p className="text-muted-foreground text-xs mt-0.5">
                Past academic terms will automatically appear here once archived or completed.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {archivedTerms.map((term: any) => {
              const isCurrent = String(selectedTermId) === String(term.id);
              const metrics = getAssociatedMetrics(term);

              return (
                <div
                  key={term.id}
                  onClick={() => handleSelectWorkspace(term.id, term.name, true)}
                  className={`group bg-card border hover:shadow-lg rounded-2xl p-8 transition-all cursor-pointer flex flex-col justify-between space-y-6 relative overflow-hidden ${
                      isCurrent
                        ? "border-amber-500 ring-2 ring-amber-500/20 bg-amber-500/[0.02]"
                        : "border-border hover:border-amber-500/60"
                    }`}
                >
                  {/* Top Accent Line */}
                  <div
                    className={`absolute top-0 left-0 w-full h-[3px] transition-all ${
                      isCurrent
                        ? "bg-amber-500"
                        : "bg-amber-500/30 group-hover:bg-amber-500"
                    }`}
                  />

                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-lg text-foreground group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                            {term.name}
                          </h3>
                          {isCurrent && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white">
                              <CheckCircle2 className="w-3 h-3" /> Current (Archive)
                            </span>
                          )}
                        </div>
                        <p className="text-muted-foreground text-xs mt-1">
                          Type: <span className="capitalize font-medium text-foreground">{term.type === "short_term" ? "Vacation" : "Semestral"}</span>
                        </p>
                      </div>
                      <span className="px-2.5 py-1 bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 text-xs font-semibold rounded-full capitalize shrink-0 flex items-center gap-1.5">
                        <Lock className="w-3 h-3" />
                        {term.status || "Archived"}
                      </span>
                    </div>

                    {term.description ? (
                      <p className="text-muted-foreground text-xs line-clamp-2 leading-relaxed">
                        {term.description}
                      </p>
                    ) : (
                      <p className="text-muted-foreground text-xs leading-relaxed italic">
                        Archived academic term workspace snapshot (read-only historical data).
                      </p>
                    )}

                    {/* Role-specific Metrics & Context */}
                    {metrics}

                    <div className="text-muted-foreground text-xs space-y-1 pt-1 border-t border-border/40">
                      <p className="flex justify-between">
                        <span>Start Date:</span>
                        <span className="font-medium text-foreground">
                          {term.start_date ? new Date(term.start_date).toLocaleDateString("en-GB") : "—"}
                        </span>
                      </p>
                      <p className="flex justify-between">
                        <span>End Date:</span>
                        <span className="font-medium text-foreground">
                          {term.end_date ? new Date(term.end_date).toLocaleDateString("en-GB") : "—"}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-amber-700 dark:text-amber-400 font-bold text-xs pt-4 border-t border-border/50">
                    <span className="flex items-center gap-1.5">
                      <Archive className="w-3.5 h-3.5" />
                      {isCurrent ? "Viewing Archived Workspace" : "Enter Workspace"}
                    </span>
                    <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── SECTION 3: Upcoming / Draft Term Workspaces (if any) ── */}
      {upcomingTerms.length > 0 && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                <h2 className="text-xl font-bold text-foreground">Upcoming Academic Terms</h2>
              </div>
              <p className="text-muted-foreground text-xs mt-1">
                Upcoming terms scheduled for future attachment periods
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {upcomingTerms.map((term: any) => {
              const isCurrent = String(selectedTermId) === String(term.id);
              return (
                <div
                  key={term.id}
                  onClick={() => handleSelectWorkspace(term.id, term.name, false)}
                  className={`group bg-card border hover:shadow-lg rounded-2xl p-6 transition-all cursor-pointer flex flex-col justify-between space-y-6 relative overflow-hidden ${
                    isCurrent
                      ? "border-blue-500 ring-2 ring-blue-500/20 bg-blue-500/[0.02]"
                      : "border-border hover:border-blue-500/60"
                  }`}
                >
                  <div
                    className={`absolute top-0 left-0 w-full h-[3px] transition-all ${
                      isCurrent
                        ? "bg-blue-500"
                        : "bg-blue-500/30 group-hover:bg-blue-500"
                    }`}
                  />

                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-bold text-lg text-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {term.name}
                        </h3>
                        <p className="text-muted-foreground text-xs mt-1">
                          Type: <span className="capitalize font-medium text-foreground">{term.type === "short_term" ? "Vacation" : "Semestral"}</span>
                        </p>
                      </div>
                      <span className="px-2.5 py-1 bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 text-xs font-semibold rounded-full capitalize shrink-0">
                        {term.status || "Upcoming"}
                      </span>
                    </div>

                    {term.description && (
                      <p className="text-muted-foreground text-xs line-clamp-2 leading-relaxed">
                        {term.description}
                      </p>
                    )}

                    <div className="text-muted-foreground text-xs space-y-1 pt-1 border-t border-border/40">
                      <p className="flex justify-between">
                        <span>Start Date:</span>
                        <span className="font-medium text-foreground">
                          {term.start_date ? new Date(term.start_date).toLocaleDateString("en-GB") : "—"}
                        </span>
                      </p>
                      <p className="flex justify-between">
                        <span>End Date:</span>
                        <span className="font-medium text-foreground">
                          {term.end_date ? new Date(term.end_date).toLocaleDateString("en-GB") : "—"}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-blue-600 dark:text-blue-400 font-bold text-xs pt-4 border-t border-border/50">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      {isCurrent ? "Viewing Workspace" : "Enter Workspace"}
                    </span>
                    <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

