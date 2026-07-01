import { useEffect, useState, useCallback, useMemo } from "react";
import { SkeletonTableRows } from "../../components/skeleton";
import { Shield, Search, Filter, Download, ChevronLeft, ChevronRight, Calendar, User, Eye, LogIn, LogOut, AlertTriangle, Clock } from "lucide-react";
import { exportToCSV } from "../../lib/csv-export";
import { toast } from "sonner";
import { apiClient } from "../../lib/api-client";
import { DatePicker } from "../../components/ui/date-picker";

const actionColors: Record<string, string> = {
  // Auth
  "User Login":             "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  "User Logout":            "bg-gray-200 text-gray-600 dark:bg-gray-500/15 dark:text-gray-300",
  "Login Failed":           "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
  // Users
  "User Created":           "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  "User Updated":           "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
  "Role Changed":           "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
  "User Activated":         "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  "User Deactivated":       "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
  // Attendance
  "Attendance Check-In":    "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300",
  "Attendance Check-Out":   "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
  "Attendance Verified":    "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300",
  // Companies
  "Company Approved":       "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300",
  "Company Rejected":       "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
  // Applications
  "Application Approved":   "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300",
  "Application Rejected":   "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300",
  // Internships
  "Internship Activated":   "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300",
  "Internship Completed":   "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  "Internship Terminated":  "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
  "Supervisor Assigned":    "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  "Final Report Submitted": "bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300",
  // Terms
  "Term Created":           "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  "Term Archived":          "bg-gray-200 text-gray-600 dark:bg-gray-500/15 dark:text-gray-300",
  // Grades
  "Grade Approved":         "bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300",
  "Grade Published":        "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300",
  // Logbooks
  "Logbook Approved":       "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300",
  "Logbook Rejected":       "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300",
  // Assessments & Invitations
  "Assessment Approved":    "bg-pink-100 text-pink-700 dark:bg-pink-500/15 dark:text-pink-300",
  "Invitation Accepted":    "bg-lime-100 text-lime-700 dark:bg-lime-500/15 dark:text-lime-300",
  // Report scores
  "Report Graded":          "bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300",
  "Report Score Submitted": "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
  "Report Score Approved":  "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300",
  // Presentations
  "Presentation Scheduled": "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  "Presentation Graded":    "bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300",
  "Presentation Approved":  "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300",
  // Site visitations
  "Site Visit Scheduled":   "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300",
  "Site Visit Completed":   "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  "Site Visit Cancelled":   "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
  "Visit Score Submitted":  "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
  "Visit Score Approved":   "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300",
  // Issues
  "Issue Reported":         "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300",
  "Issue Status Updated":   "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  "Issue Escalated":        "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
  // Grading config
  "Grading Config Created":         "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  "Grading Config Updated":         "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
  "Grading Config Set Default":     "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  "Grading Config Submitted":       "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
  "Grading Config Approved":        "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300",
  // Magic link & OAuth
  "Magic Link Sent":              "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300",
  "Magic Link Verified":          "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  "Google Login":                 "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  // Applications (lifecycle)
  "Application Created":          "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
  "Application Submitted":        "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300",
  "Application Withdrawn":        "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  "Application Accepted":         "bg-lime-100 text-lime-700 dark:bg-lime-500/15 dark:text-lime-300",
  "Applications Bulk Approved":   "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300",
  // Logbook entries
  "Logbook Entry Created":        "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
  "Logbook Entry Submitted":      "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300",
  // Companies (CRUD)
  "Company Registered":           "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  "Company Updated":              "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
  "Company Deactivated":          "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
  // Industrial assessments
  "Industrial Assessment Saved":      "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
  "Industrial Assessment Submitted":  "bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300",
  // Final grades
  "Final Grade Compiled":         "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300",
  "Grade Revision Requested":     "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300",
  // Terms
  "Term Updated":                 "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
  "Term Published":               "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  // Users
  "Student Profile Updated":      "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
  // System & admin
  "Setting Updated":        "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
  "Department Created":     "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  "Department Updated":     "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
  // Announcements
  "Announcement Created":   "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300",
  "Announcement Pinned":    "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  "Announcement Unpinned":  "bg-gray-200 text-gray-600 dark:bg-gray-500/15 dark:text-gray-300",
  "Announcement Deleted":   "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
  // DLO
  "DLO Created":            "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
};

// Tag-based groupings for the category filter
const TAG_GROUPS: Record<string, string[]> = {
  "Auth":       ["User Login", "User Logout", "Login Failed", "Magic Link Sent", "Magic Link Verified", "Google Login"],
  "Users":      ["User Created", "User Updated", "Role Changed", "User Activated", "User Deactivated", "DLO Created", "Student Profile Updated"],
  "Attendance": ["Attendance Check-In", "Attendance Check-Out", "Attendance Verified"],
  "Companies":  ["Company Approved", "Company Rejected", "Company Registered", "Company Updated", "Company Deactivated"],
  "Applications": ["Application Approved", "Application Rejected", "Application Created", "Application Submitted", "Application Withdrawn", "Application Accepted", "Applications Bulk Approved"],
  "Internships": ["Internship Activated", "Internship Completed", "Internship Terminated", "Supervisor Assigned", "Final Report Submitted"],
  "Logbooks":   ["Logbook Approved", "Logbook Rejected", "Logbook Entry Created", "Logbook Entry Submitted"],
  "Grades":     ["Grade Approved", "Grade Published", "Grade Revision Requested", "Final Grade Compiled", "Report Graded", "Report Score Submitted", "Report Score Approved", "Presentation Graded", "Presentation Approved", "Presentation Scheduled", "Visit Score Submitted", "Visit Score Approved", "Assessment Approved", "Industrial Assessment Saved", "Industrial Assessment Submitted", "Grading Config Created", "Grading Config Updated", "Grading Config Set Default", "Grading Config Submitted", "Grading Config Approved"],
  "Issues":     ["Issue Reported", "Issue Status Updated", "Issue Escalated"],
  "System":     ["Setting Updated", "Department Created", "Department Updated", "Term Created", "Term Updated", "Term Published", "Term Archived", "Announcement Created", "Announcement Pinned", "Announcement Unpinned", "Announcement Deleted"],
};

const PAGE_SIZE = 15;

type AuditLogItem = {
  id: string;
  timestamp: string;
  user: string;
  userId: string | null;
  action: string;
  modelType: string;
  modelId: string | null;
  description: string;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  ipAddress: string | null;
  tags: string | null;
};

function normalizeAuditLogs(logs: any[]): AuditLogItem[] {
  return logs.map((log, index) => ({
    id: String(log.id ?? `audit-${index}`),
    timestamp: log.created_at ?? log.timestamp ?? new Date().toISOString(),
    user: log.user?.name ?? log.user_name ?? "System",
    userId: log.user_id ? String(log.user_id) : null,
    action: log.action ?? "Updated",
    modelType: (log.auditable_type ?? "Record").split("\\").pop() ?? "Record",
    modelId: log.auditable_id ? String(log.auditable_id) : null,
    description: log.description ?? log.details ?? "No additional details.",
    oldValues: log.old_values ?? null,
    newValues: log.new_values ?? null,
    ipAddress: log.ip_address ?? null,
    tags: log.tags ?? null,
  }));
}

const ALL_ACTIONS = Object.keys(actionColors).sort();

function ActionBadge({ action }: { action: string }) {
  const color = actionColors[action] ?? "bg-secondary text-secondary-foreground";
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-medium ${color}`}
      style={{ fontSize: "0.72rem", whiteSpace: "nowrap" }}
    >
      <Shield className="w-3 h-3 shrink-0" />{action}
    </span>
  );
}

export function AuditLogsPage() {
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [userFilter, setUserFilter] = useState("All");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(0);
  const [selectedLog, setSelectedLog] = useState<string | null>(null);
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [allUsers, setAllUsers] = useState<string[]>([]);

  useEffect(() => {
    apiClient.getUsers().then((res) => {
      if (res.success) {
        setAllUsers(
          [...res.data]
            .map((u: any) => u.name as string)
            .filter(Boolean)
            .sort()
        );
      }
    });
  }, []);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    const filters: Record<string, unknown> = {};
    if (dateFrom) { filters.from = dateFrom; filters.per_page = 500; }
    if (dateTo)   { filters.to   = dateTo;   filters.per_page = 500; }
    if (!dateFrom && !dateTo) filters.per_page = 10000;

    const response = await apiClient.getAuditLogs(filters);
    if (response.success) {
      setLogs(normalizeAuditLogs(response.data));
    } else {
      setLogs([]);
    }
    setLoading(false);
  }, [dateFrom, dateTo]);

  useEffect(() => {
    loadLogs().catch(() => setLoading(false));
  }, [loadLogs]);

  // Category changes reset the action filter
  const handleCategoryChange = (cat: string) => {
    setCategoryFilter(cat);
    setActionFilter("All");
    setPage(0);
  };

  const actionsForCategory = categoryFilter !== "All"
    ? TAG_GROUPS[categoryFilter] ?? []
    : ALL_ACTIONS;

  const filtered = logs.filter((log) => {
    if (search) {
      const q = search.toLowerCase();
      if (
        !log.user.toLowerCase().includes(q) &&
        !log.action.toLowerCase().includes(q) &&
        !log.modelType.toLowerCase().includes(q) &&
        !log.description.toLowerCase().includes(q) &&
        !(log.ipAddress ?? "").toLowerCase().includes(q)
      ) return false;
    }
    if (categoryFilter !== "All") {
      const inCategory = (TAG_GROUPS[categoryFilter] ?? []).includes(log.action);
      if (!inCategory) return false;
    }
    if (actionFilter !== "All" && log.action !== actionFilter) return false;
    if (userFilter   !== "All" && log.user   !== userFilter)   return false;
    return true;
  });

  // Summary stats (computed from full unfiltered logs)
  const stats = useMemo(() => {
    const today = new Date().toDateString();
    const todayLogs = logs.filter(l => new Date(l.timestamp).toDateString() === today);
    const logins = logs.filter(l => l.action === "User Login").length;
    const failures = logs.filter(l => l.action === "Login Failed").length;
    const uniqueUsers = new Set(logs.map(l => l.userId).filter(Boolean)).size;
    return { total: logs.length, todayCount: todayLogs.length, logins, failures, uniqueUsers };
  }, [logs]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages - 1);
  const paged      = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  const clearFilters = () => {
    setSearch(""); setActionFilter("All"); setCategoryFilter("All");
    setUserFilter("All"); setDateFrom(""); setDateTo(""); setPage(0);
  };

  const hasFilters = search || actionFilter !== "All" || categoryFilter !== "All" || userFilter !== "All" || dateFrom || dateTo;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1>Audit Logs</h1>
          <p className="text-muted-foreground" style={{ fontSize: "0.85rem" }}>
            {loading
              ? "Loading audit logs…"
              : `Complete system activity trail · ${filtered.length.toLocaleString()} of ${logs.length.toLocaleString()} records`}
          </p>
        </div>
        <button
          className="px-4 py-2 bg-card border border-border rounded-lg hover:bg-accent transition-colors flex items-center gap-2"
          style={{ fontSize: "0.85rem" }}
          onClick={() => {
            exportToCSV(
              filtered.map((l) => ({
                Timestamp:    l.timestamp,
                User:         l.user,
                "IP Address": l.ipAddress ?? "",
                Action:       l.action,
                Category:     l.tags ?? "",
                "Model Type": l.modelType,
                "Model ID":   l.modelId ?? "",
                Description:  l.description,
              })),
              "audit_logs"
            );
            toast.success("Audit logs exported!");
          }}
        >
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* Stats bar */}
      {!loading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Events",     value: stats.total.toLocaleString(),        icon: Shield,        color: "text-primary" },
            { label: "Events Today",     value: stats.todayCount.toLocaleString(),   icon: Clock,         color: "text-amber-500" },
            { label: "Successful Logins",value: stats.logins.toLocaleString(),       icon: LogIn,         color: "text-emerald-500" },
            { label: "Failed Logins",    value: stats.failures.toLocaleString(),     icon: AlertTriangle, color: "text-red-500" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-muted/50 ${color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <p className="font-semibold" style={{ fontSize: "1.1rem" }}>{value}</p>
                <p className="text-muted-foreground" style={{ fontSize: "0.72rem" }}>{label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <div className="flex flex-wrap gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search user, action, description, IP…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-background"
              style={{ fontSize: "0.85rem" }}
            />
          </div>

          {/* Category filter */}
          <select
            value={categoryFilter}
            onChange={(e) => handleCategoryChange(e.target.value)}
            className="px-3 py-2 border border-border rounded-lg bg-background"
            style={{ fontSize: "0.85rem" }}
          >
            <option value="All">All Categories</option>
            {Object.keys(TAG_GROUPS).map((cat) => (
              <option key={cat}>{cat}</option>
            ))}
          </select>

          {/* Action filter */}
          <select
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setPage(0); }}
            className="px-3 py-2 border border-border rounded-lg bg-background"
            style={{ fontSize: "0.85rem" }}
          >
            <option value="All">All Actions</option>
            {actionsForCategory.map((a) => <option key={a}>{a}</option>)}
          </select>

          {/* User filter */}
          <select
            value={userFilter}
            onChange={(e) => { setUserFilter(e.target.value); setPage(0); }}
            className="px-3 py-2 border border-border rounded-lg bg-background"
            style={{ fontSize: "0.85rem" }}
          >
            <option value="All">All Users</option>
            {allUsers.map((u) => <option key={u}>{u}</option>)}
          </select>

          {/* Date range */}
          <div className="flex items-center gap-2">
            <DatePicker
              value={dateFrom}
              onChange={(val) => { setDateFrom(val); setPage(0); }}
              placeholder="From"
              className="w-[140px]"
            />
            <span className="text-muted-foreground" style={{ fontSize: "0.8rem" }}>to</span>
            <DatePicker
              value={dateTo}
              onChange={(val) => { setDateTo(val); setPage(0); }}
              placeholder="To"
              className="w-[140px]"
            />
          </div>
        </div>

        {hasFilters && (
          <button
            onClick={clearFilters}
            className="text-primary hover:underline flex items-center gap-1"
            style={{ fontSize: "0.8rem" }}
          >
            <Filter className="w-3.5 h-3.5" /> Clear all filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 text-muted-foreground font-medium" style={{ fontSize: "0.75rem" }}>Timestamp</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium" style={{ fontSize: "0.75rem" }}>User</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium" style={{ fontSize: "0.75rem" }}>Action</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium" style={{ fontSize: "0.75rem" }}>Resource</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium" style={{ fontSize: "0.75rem" }}>Description</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium" style={{ fontSize: "0.75rem" }}>IP</th>
                <th className="px-4 py-3" style={{ fontSize: "0.75rem" }}></th>
              </tr>
            </thead>
            <tbody>
              {loading && <SkeletonTableRows rows={10} cols={7} />}
              {!loading && paged.map((log) => (
                <tr
                  key={log.id}
                  className={`border-b border-border last:border-0 hover:bg-muted/20 cursor-pointer ${selectedLog === log.id ? "bg-primary/5" : ""}`}
                  onClick={() => setSelectedLog(selectedLog === log.id ? null : log.id)}
                >
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap" style={{ fontSize: "0.8rem" }}>
                    <p>{new Date(log.timestamp).toLocaleDateString("en-GB")}</p>
                    <p style={{ fontSize: "0.7rem" }}>{new Date(log.timestamp).toLocaleTimeString()}</p>
                  </td>
                  <td className="px-4 py-3" style={{ fontSize: "0.85rem" }}>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <User className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <span className="truncate max-w-[120px]">{log.user}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <ActionBadge action={log.action} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap" style={{ fontSize: "0.8rem" }}>
                    {log.modelType}{log.modelId ? ` #${log.modelId}` : ""}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground max-w-[220px] truncate" style={{ fontSize: "0.8rem" }}>
                    {log.description}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap" style={{ fontSize: "0.75rem", fontFamily: "monospace" }}>
                    {log.ipAddress ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelectedLog(selectedLog === log.id ? null : log.id); }}
                      className="p-1.5 rounded-md hover:bg-accent text-muted-foreground"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && paged.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground" style={{ fontSize: "0.85rem" }}>
                    {logs.length === 0
                      ? "No audit logs recorded yet. Actions will appear here as users interact with the system."
                      : "No logs match your current filters."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Detail panel */}
        {selectedLog && (() => {
          const log = logs.find((l) => l.id === selectedLog);
          if (!log) return null;
          return (
            <div className="border-t border-border bg-muted/20 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <ActionBadge action={log.action} />
                <span className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>Log #{log.id}</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-muted-foreground mb-0.5" style={{ fontSize: "0.7rem" }}>Timestamp</p>
                  <p style={{ fontSize: "0.85rem" }}>{new Date(log.timestamp).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-0.5" style={{ fontSize: "0.7rem" }}>Performed By</p>
                  <p style={{ fontSize: "0.85rem" }}>{log.user}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-0.5" style={{ fontSize: "0.7rem" }}>IP Address</p>
                  <p style={{ fontSize: "0.85rem", fontFamily: "monospace" }}>{log.ipAddress ?? "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-0.5" style={{ fontSize: "0.7rem" }}>Resource</p>
                  <p style={{ fontSize: "0.85rem" }}>{log.modelType}{log.modelId ? ` #${log.modelId}` : ""}</p>
                </div>
              </div>
              <div>
                <p className="text-muted-foreground mb-1" style={{ fontSize: "0.7rem" }}>Description</p>
                <p style={{ fontSize: "0.85rem" }}>{log.description}</p>
              </div>
              {(log.oldValues || log.newValues) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {log.oldValues && (
                    <div>
                      <p className="text-muted-foreground mb-1" style={{ fontSize: "0.7rem" }}>Before</p>
                      <pre className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg p-3 text-red-800 dark:text-red-300 overflow-x-auto" style={{ fontSize: "0.75rem" }}>
                        {JSON.stringify(log.oldValues, null, 2)}
                      </pre>
                    </div>
                  )}
                  {log.newValues && (
                    <div>
                      <p className="text-muted-foreground mb-1" style={{ fontSize: "0.7rem" }}>After</p>
                      <pre className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 rounded-lg p-3 text-emerald-800 dark:text-emerald-300 overflow-x-auto" style={{ fontSize: "0.75rem" }}>
                        {JSON.stringify(log.newValues, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
              {log.tags && (
                <div>
                  <p className="text-muted-foreground mb-1" style={{ fontSize: "0.7rem" }}>Tags</p>
                  <div className="flex flex-wrap gap-1">
                    {log.tags.split(",").map((tag) => (
                      <span key={tag} className="px-2 py-0.5 rounded bg-secondary text-secondary-foreground" style={{ fontSize: "0.75rem" }}>{tag.trim()}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* Pagination */}
        <div className="border-t border-border px-4 py-3 flex items-center justify-between">
          <p className="text-muted-foreground" style={{ fontSize: "0.8rem" }}>
            {filtered.length === 0
              ? "0 records"
              : `Showing ${safePage * PAGE_SIZE + 1}–${Math.min((safePage + 1) * PAGE_SIZE, filtered.length)} of ${filtered.length.toLocaleString()}`}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(Math.max(0, safePage - 1))}
              disabled={safePage === 0}
              className="p-1.5 rounded-md hover:bg-accent disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const pageNum = totalPages <= 7 ? i : safePage <= 3 ? i : safePage >= totalPages - 4 ? totalPages - 7 + i : safePage - 3 + i;
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`w-8 h-8 rounded-md ${safePage === pageNum ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
                  style={{ fontSize: "0.8rem" }}
                >
                  {pageNum + 1}
                </button>
              );
            })}
            <button
              onClick={() => setPage(Math.min(totalPages - 1, safePage + 1))}
              disabled={safePage >= totalPages - 1}
              className="p-1.5 rounded-md hover:bg-accent disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
