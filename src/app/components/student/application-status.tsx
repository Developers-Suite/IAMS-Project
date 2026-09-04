import { StatusBadge } from "../status-badge";

interface ApplicationStatusProps {
  status: string;
  createdAt: string;
  internshipStartDate?: string;
  isEnded?: boolean;
}

export function ApplicationStatus({ status, createdAt, internshipStartDate, isEnded = false }: ApplicationStatusProps) {
  const displayStatus = isEnded && status !== "completed" ? "completed" : status;
  return (
    <div
      className={`rounded-xl p-5 border ${
        (displayStatus === "active" || displayStatus === "Active")
          ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800"
          : (displayStatus === "completed" || displayStatus === "Completed")
          ? "bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800"
          : (displayStatus === "rejected" || displayStatus === "Rejected")
          ? "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800"
          : "bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800"
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-muted-foreground uppercase font-semibold" style={{ fontSize: "0.65rem" }}>
            CURRENT STATUS
          </p>
          <div className="flex items-center gap-2 mt-1">
            <StatusBadge status={displayStatus} />
            <span className="text-muted-foreground" style={{ fontSize: "0.8rem" }}>
              since {createdAt}
            </span>
          </div>
          {internshipStartDate && (
            <p className="text-muted-foreground mt-2" style={{ fontSize: "0.8rem" }}>
              Internship begins: <span className="font-medium text-foreground">{internshipStartDate}</span>
            </p>
          )}
        </div>
        {isEnded && (
          <p className="text-blue-700 dark:text-blue-400" style={{ fontSize: "0.8rem" }}>
            The internship period has officially ended. Final grades are currently under review. You are eligible to apply for another internship.
          </p>
        )}
        {!isEnded && displayStatus === "pending_company_approval" && (
          <p className="text-amber-700 dark:text-amber-400" style={{ fontSize: "0.8rem" }}>
            Your application is on hold until the DLO/CLO verifies the selected company. No action needed from you.
          </p>
        )}
        {!isEnded && (displayStatus === "submitted" || displayStatus === "under_review" || displayStatus === "Pending") && (
          <p className="text-amber-700 dark:text-amber-400" style={{ fontSize: "0.8rem" }}>
            Your application is awaiting departmental review by the DLO.
          </p>
        )}
      </div>
    </div>
  );
}
