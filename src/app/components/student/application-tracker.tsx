import { useState } from "react";
import { FileText } from "lucide-react";
import { CompanyAcceptanceModal } from "./company-acceptance-modal";
import { ApplicationStatus } from "./application-status";
import { ApplicationActions } from "./application-actions";
import { ApplicationHistory } from "./application-history";
import { openPlacementLetter } from "../../lib/generate-placement-letter";
import { downloadCompanyAcceptanceFormPDF } from "../../lib/generate-company-acceptance-form";
import { toast } from "sonner";
import { apiClient } from "../../lib/api-client";
import { getInternshipStartDate, getInternshipEndDate, formatDisplayDate, resolveDepartmentName } from "../../lib/application-helpers";

interface ApplicationTrackerProps {
  myApp: any;
  terms?: any[];
  onViewWindows: () => void;
  onCancelApplication?: () => void;
  onAcceptanceSubmitted?: () => void;
}

function getStatusHistory(app: any) {
  const history: { status: string; timestamp: string; description: string; actor: string }[] = [];
  const createdAt = app.created_at ?? app.dateApplied ?? "";
  const supervisorName = app.academic_supervisor?.name ?? app.supervisorAssigned ?? "Academic Supervisor";
  const companyStatus = app.company?.approval_status ?? app.companyStatus;
  const internshipStartDate = getInternshipStartDate(app);
  const s = (app.status ?? "").toLowerCase();

  history.push({
    status: "Submitted",
    timestamp: createdAt ? `${createdAt.split("T")[0]}T09:00:00` : "—",
    description: "Application submitted by student",
    actor: "Student",
  });
  if (s === "pending_company_approval") {
    history.push({
      status: "Awaiting Company Approval",
      timestamp: createdAt ? `${createdAt.split("T")[0]}T09:30:00` : "—",
      description: "Application is on hold until the selected company is verified by the DLO/CLO.",
      actor: "DLO/CLO",
    });
  }
  if (companyStatus === "Approved" || companyStatus === "approved") {
    history.push({
      status: "Company Verified",
      timestamp: createdAt ? `${createdAt.split("T")[0]}T14:30:00` : "—",
      description: "Company verified and approved in the system",
      actor: "DLO",
    });
  }
  if (["approved", "company_accepted", "active", "completed"].includes(s)) {
    history.push({
      status: "Approved",
      timestamp: app.reviewed_at ? app.reviewed_at.split("T")[0] + "T16:00:00" : (createdAt ? `${createdAt.split("T")[0]}T16:00:00` : "—"),
      description: "Application approved by DLO. Placement letter generated.",
      actor: "DLO",
    });
  }
  if (["company_accepted", "active", "completed"].includes(s)) {
    history.push({
      status: "Company Accepted",
      timestamp: app.accepted_at ? app.accepted_at.split("T")[0] : "—",
      description: `Company confirmed. Supervisor: ${app.industry_supervisor_name ?? "TBC"}`,
      actor: "Company / Student",
    });
  }
  if (internshipStartDate && ["approved", "company_accepted", "active", "completed"].includes(s)) {
    history.push({
      status: "Internship Begins",
      timestamp: formatDisplayDate(internshipStartDate) ?? internshipStartDate,
      description: `Internship start date tracked for ${app.company?.name ?? app.companyName ?? "the selected company"}.`,
      actor: "System",
    });
  }
  if (supervisorName && supervisorName !== "Academic Supervisor") {
    history.push({
      status: "Supervisor Assigned",
      timestamp: "—",
      description: `Academic supervisor ${supervisorName} assigned.`,
      actor: "DLO",
    });
  }
  if (["active", "completed"].includes(s)) {
    history.push({
      status: "Active",
      timestamp: app.confirmed_start_date ?? "—",
      description: "Internship officially started.",
      actor: "System",
    });
  }
  if (s === "completed") {
    history.push({
      status: "Completed",
      timestamp: "—",
      description: "Internship completed. Final evaluation submitted.",
      actor: "System",
    });
  }
  return history;
}

export function ApplicationTracker({
  myApp,
  terms,
  onViewWindows,
  onCancelApplication,
  onAcceptanceSubmitted,
}: ApplicationTrackerProps) {
  const [acceptanceModalOpen, setAcceptanceModalOpen] = useState(false);

  if (!myApp) {
    return (
      <div className="bg-card border border-border rounded-xl p-12 text-center space-y-4">
        <FileText className="w-12 h-12 text-muted-foreground mx-auto" />
        <h3>No Application Found</h3>
        <p className="text-muted-foreground" style={{ fontSize: "0.85rem" }}>
          You have not submitted an application yet. Browse open internship windows and apply.
        </p>
        <button
          type="button"
          onClick={onViewWindows}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
          style={{ fontSize: "0.85rem" }}
        >
          View Open Windows
        </button>
      </div>
    );
  }

  const statusHistory = getStatusHistory(myApp);
  const internshipStartDate = formatDisplayDate(getInternshipStartDate(myApp, terms));
  const dateApplied = myApp.created_at ? new Date(myApp.created_at).toLocaleDateString("en-GB") : (myApp.dateApplied ?? "—");

  const handleDownloadLetter = () => {
    const companyName = typeof myApp.company?.name === "string" ? myApp.company.name : (typeof myApp.companyName === "string" ? myApp.companyName : "Company");
    const companyAddress = typeof myApp.company?.address === "string" ? myApp.company.address : undefined;
    const supervisorName = typeof myApp.academic_supervisor?.user?.name === "string" ? myApp.academic_supervisor.user.name : (typeof myApp.supervisorAssigned === "string" ? myApp.supervisorAssigned : undefined);

    openPlacementLetter({
      studentName: myApp.student?.user?.name ?? myApp.studentName ?? "Student",
      studentId: myApp.student?.student_id ?? myApp.studentId ?? "—",
      department: resolveDepartmentName(myApp, "—"),
      level: myApp.student?.level ?? myApp.level ?? "—",
      companyName,
      companyAddress,
      supervisorName: myApp.internship?.academic_supervisor?.user?.name ?? supervisorName,
      startDate: formatDisplayDate(getInternshipStartDate(myApp, terms)),
      endDate: formatDisplayDate(getInternshipEndDate(myApp, terms)),
    });
  };

  // ✅ UPDATED: Uses direct PDF download, no popup
  const handleDownloadAcceptanceForm = async () => {
    if (!myApp) return;

    const companyName = typeof myApp.company?.name === "string"
      ? myApp.company.name
      : (typeof myApp.companyName === "string" ? myApp.companyName : "Company");

    const companyAddress = typeof myApp.company?.address === "string"
      ? myApp.company.address
      : undefined;

    const toastId = toast.loading("Generating PDF...");

    try {
      const success = await downloadCompanyAcceptanceFormPDF({
        studentName: myApp.student?.user?.name ?? myApp.studentName ?? "Student",
        studentId: myApp.student?.student_id ?? myApp.studentId ?? "",
        department: resolveDepartmentName(myApp, ""),
        level: myApp.student?.level ?? myApp.level ?? "",
        companyName,
        companyAddress,
        startDate: formatDisplayDate(getInternshipStartDate(myApp, terms)),
        endDate: formatDisplayDate(getInternshipEndDate(myApp, terms)),
      });

      toast.dismiss(toastId);

      if (success) {
        toast.success("Company acceptance form PDF downloaded!");
      } else {
        toast.error("Failed to generate PDF. Please try again.");
      }
    } catch (error) {
      toast.dismiss(toastId);
      console.error("PDF generation error:", error);
      toast.error("An error occurred while generating the PDF.");
    }
  };

  const handleCancelApplication = async () => {
    if (!myApp?.id) return;
    try {
      // Use withdraw (not delete) — delete only works on drafts
      const res = await apiClient.withdrawApplication(String(myApp.id));
      if (res.success) {
        toast.success("Application cancelled. You can now apply with a different company.");
        onCancelApplication?.();
      } else {
        toast.error(res.message ?? "Failed to cancel application");
      }
    } catch (error) {
      console.error("Cancel error:", error);
      toast.error("An error occurred");
    }
  };

  const companyName = typeof myApp.company?.name === "string" ? myApp.company.name : (typeof myApp.companyName === "string" ? myApp.companyName : "Company");
  const proposedStartDate = getInternshipStartDate(myApp, terms);
  const proposedEndDate = getInternshipEndDate(myApp, terms);

  return (
    <div className="space-y-5">
      <ApplicationStatus status={myApp.status} createdAt={dateApplied} internshipStartDate={internshipStartDate} />

      <ApplicationActions
        status={myApp.status}
        onDownloadLetter={handleDownloadLetter}
        onDownloadAcceptanceForm={handleDownloadAcceptanceForm}
        onSubmitAcceptance={() => setAcceptanceModalOpen(true)}
        onRejectCompany={handleCancelApplication}
      />

      <ApplicationHistory history={statusHistory} />

      <CompanyAcceptanceModal
        isOpen={acceptanceModalOpen}
        onClose={() => setAcceptanceModalOpen(false)}
        onSuccess={() => {
          setAcceptanceModalOpen(false);
          onAcceptanceSubmitted?.();
        }}
        applicationId={myApp.id}
        companyName={companyName}
        studentName={myApp.student?.user?.name ?? myApp.studentName ?? "Student"}
        studentId={myApp.student?.student_id ?? myApp.studentId}
        department={resolveDepartmentName(myApp, "")}
        level={myApp.student?.level ?? myApp.level}
        companyAddress={typeof myApp.company?.address === "string" ? myApp.company.address : undefined}
        proposedStartDate={proposedStartDate}
        proposedEndDate={proposedEndDate}
      />
    </div>
  );
}