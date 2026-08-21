// Display labels for backend's lowercase status values
const statusLabels: Record<string, string> = {
  approved: "Approved",
  active: "Active",
  submitted: "Submitted",
  under_review: "Under Review",
  rejected: "Rejected",
  completed: "Completed",
  archived: "Archived",
  upcoming: "Upcoming",
  draft: "Draft",
  company_accepted: "Accepted",
  pending: "Pending",
  pending_company_approval: "Pending Company Approval",
  pending_supervisor_approval: "Pending Supervisor Approval",
  revision_requested: "Revision Requested",
  withdrawn: "Withdrawn",
  calculated: "Calculated",
  published: "Published",
  scheduled: "Scheduled",
  cancelled: "Cancelled",
  terminated: "Terminated",
  inactive: "Inactive",
  present: "Present",
  absent: "Absent",
  late: "Late",
  half_day: "Half Day",
  verified: "Verified",
  unverified: "Unverified",
};

const statusColors: Record<string, string> = {
  // Lowercase (backend values)
  approved: "bg-emerald-100 text-emerald-700",
  active: "bg-blue-100 text-blue-700",
  submitted: "bg-indigo-100 text-indigo-700",
  under_review: "bg-amber-100 text-amber-700",
  rejected: "bg-red-100 text-red-700",
  completed: "bg-violet-100 text-violet-700",
  archived: "bg-gray-200 text-gray-600",
  upcoming: "bg-cyan-100 text-cyan-700",
  company_accepted: "bg-teal-100 text-teal-700",
  draft: "bg-gray-100 text-gray-600",
  calculated: "bg-orange-100 text-orange-700",
  published: "bg-emerald-100 text-emerald-700",
  scheduled: "bg-cyan-100 text-cyan-700",
  cancelled: "bg-red-100 text-red-700",
  terminated: "bg-red-200 text-red-800",
  pending: "bg-amber-100 text-amber-700",
  pending_company_approval: "bg-amber-100 text-amber-700 border border-amber-200",
  pending_supervisor_approval: "bg-amber-100 text-amber-700",
  revision_requested: "bg-orange-100 text-orange-700",
  withdrawn: "bg-gray-100 text-gray-600",
  inactive: "bg-gray-200 text-gray-600",
  present: "bg-emerald-100 text-emerald-700",
  absent: "bg-red-100 text-red-700",
  late: "bg-amber-100 text-amber-700",
  half_day: "bg-yellow-100 text-yellow-700",
  verified: "bg-emerald-100 text-emerald-700",
  unverified: "bg-gray-100 text-gray-600",
  // Capitalised legacy values (kept for backwards-compat)
  Approved: "bg-emerald-100 text-emerald-700",
  Active: "bg-blue-100 text-blue-700",
  Pending: "bg-amber-100 text-amber-700",
  Rejected: "bg-red-100 text-red-700",
  Completed: "bg-violet-100 text-violet-700",
  Archived: "bg-gray-200 text-gray-600",
  Upcoming: "bg-cyan-100 text-cyan-700",
  "Company Accepted": "bg-teal-100 text-teal-700",
  Submitted: "bg-indigo-100 text-indigo-700",
};

function humanizeStatus(str: string): string {
  return str
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function StatusBadge({ status }: { status: string | any }) {
  const raw = typeof status === "string" ? status : (status?.name ?? status?.status ?? String(status) ?? "Unknown");
  const normalizedKey = raw.toLowerCase().trim();
  const label = statusLabels[raw] ?? statusLabels[normalizedKey] ?? humanizeStatus(raw);
  
  const colorClass =
    statusColors[raw] ??
    statusColors[normalizedKey] ??
    (normalizedKey.includes("reject") || normalizedKey.includes("cancel")
      ? "bg-red-100 text-red-700"
      : normalizedKey.includes("pend") || normalizedKey.includes("review")
      ? "bg-amber-100 text-amber-700"
      : normalizedKey.includes("approve") || normalizedKey.includes("active")
      ? "bg-emerald-100 text-emerald-700"
      : "bg-gray-100 text-gray-700");

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-medium ${colorClass}`}
      style={{ fontSize: "0.75rem" }}
    >
      {label}
    </span>
  );
}
