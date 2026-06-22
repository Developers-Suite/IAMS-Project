import { Phone, AlertCircle } from "lucide-react";

type CompanyChoice = "none" | "existing" | "new";
type BranchChoice = "none" | "existing" | "new";

interface FormData {
  termId: string;
  companyChoice: CompanyChoice;
  selectedCompanyId: string;
  newCompanyName: string;
  newCompanyContactPerson: string;
  newCompanyContactEmail: string;
  branchChoice: BranchChoice;
  selectedBranchId: string;
  newBranchName: string;
  newBranchRegion: string;
  newBranchLocation: string;
  phoneNumber: string;
  emergencyContact: string;
  emergencyPhone: string;
  additionalNotes: string;
  agreeToTerms: boolean;
}

interface PersonalDetailsFormProps {
  form: FormData;
  updateForm: (updates: Partial<FormData>) => void;
  user: any;
  fetchedProfile?: { studentId?: string; department?: string } | null;
}

export function PersonalDetailsForm({ form, updateForm, user, fetchedProfile }: PersonalDetailsFormProps) {
  const samePhoneNumbers =
    !!form.phoneNumber && !!form.emergencyPhone && form.phoneNumber.trim() === form.emergencyPhone.trim();

  return (
    <div className="space-y-5">
      <div>
        <h3>Your Details</h3>
        <p className="text-muted-foreground mt-1" style={{ fontSize: "0.85rem" }}>
          Provide your contact information.
        </p>
      </div>

      {/* Auto-filled profile data */}
      <div className="bg-secondary/30 rounded-xl p-4 space-y-2">
        <p className="text-muted-foreground font-semibold uppercase tracking-wider" style={{ fontSize: "0.65rem" }}>
          AUTO-FILLED FROM PROFILE
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            ["Full Name", user?.name || ""],
            ["Student ID", fetchedProfile?.studentId || user?.studentId || "—"],
            ["Department", fetchedProfile?.department || user?.department || "—"],
            ["Email", user?.email || ""],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-muted-foreground" style={{ fontSize: "0.7rem" }}>
                {label}
              </p>
              <p style={{ fontSize: "0.85rem" }} className="font-medium">
                {value}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label style={{ fontSize: "0.8rem" }}>Phone Number *</label>
          <div className="relative mt-1">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="tel"
              value={form.phoneNumber}
              onChange={(e) => updateForm({ phoneNumber: e.target.value })}
              placeholder="+233..."
              className="w-full pl-9 pr-3 py-2 border border-border rounded-lg bg-background"
              style={{ fontSize: "0.85rem" }}
            />
          </div>
        </div>
        <div>
          <label style={{ fontSize: "0.8rem" }}>Emergency Contact Name *</label>
          <input
            type="text"
            value={form.emergencyContact}
            onChange={(e) => updateForm({ emergencyContact: e.target.value })}
            placeholder="e.g., Mrs. Akua Doe"
            className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background"
            style={{ fontSize: "0.85rem" }}
          />
        </div>
        <div>
          <label style={{ fontSize: "0.8rem" }}>Emergency Contact Phone *</label>
          <div className="relative mt-1">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="tel"
              value={form.emergencyPhone}
              onChange={(e) => updateForm({ emergencyPhone: e.target.value })}
              placeholder="+233..."
              className={`w-full pl-9 pr-3 py-2 border rounded-lg bg-background ${samePhoneNumbers ? "border-red-400" : "border-border"}`}
              style={{ fontSize: "0.85rem" }}
            />
          </div>
          {samePhoneNumbers && (
            <p className="text-red-600 mt-1 flex items-center gap-1" style={{ fontSize: "0.75rem" }}>
              <AlertCircle className="w-3.5 h-3.5" />
              Emergency contact phone must be different from your own phone number.
            </p>
          )}
        </div>
        <div className="md:col-span-2">
          <label style={{ fontSize: "0.8rem" }}>Additional Notes</label>
          <textarea
            value={form.additionalNotes}
            onChange={(e) => updateForm({ additionalNotes: e.target.value })}
            placeholder="Any special requirements, health concerns, or other relevant information..."
            rows={3}
            className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background"
            style={{ fontSize: "0.85rem" }}
          />
        </div>
      </div>
    </div>
  );
}
