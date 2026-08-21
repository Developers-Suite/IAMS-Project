import { useState } from "react";
import { MapPin, LayoutList, Calendar as CalendarIcon } from "lucide-react";
import { GpsLocationDisplay } from "../gps-location-display";
import { StudentAttendanceCalendar } from "../student-attendance-calendar";

interface AttendanceRecord {
  id: string;
  date: string;
  checkInTime: string;
  checkInType: string;
  location: string;
  verificationStatus: string;
  status?: string;
  lat?: number | string | null;
  lng?: number | string | null;
  notes?: string | null;
  attendance_date?: string;
  check_in_time?: string;
  check_out_time?: string;
}

interface StudentAttendanceViewProps {
  attendanceRecords: AttendanceRecord[];
  studentName?: string;
  studentId?: string;
  internshipStartDate?: string;
  internshipEndDate?: string;
}

export function StudentAttendanceView({
  attendanceRecords,
  studentName,
  studentId,
  internshipStartDate,
  internshipEndDate,
}: StudentAttendanceViewProps) {
  const [viewMode, setViewMode] = useState<"table" | "calendar">("table");

  // Normalize records for the calendar
  const calendarRecords = attendanceRecords.map((r) => ({
    id: r.id,
    attendance_date: r.attendance_date || r.date,
    date: r.date || r.attendance_date,
    check_in_time: r.check_in_time || (r.checkInTime !== "—" ? r.checkInTime : null),
    status: r.status || (r.verificationStatus === "Verified" ? "present" : r.verificationStatus?.toLowerCase() || "present"),
    notes: r.notes || (r.checkInType === "manual" ? r.location : null),
    check_in_type: r.checkInType,
    gps_check_in_lat: r.lat,
    gps_check_in_lng: r.lng,
    verificationStatus: r.verificationStatus,
  }));

  return (
    <div className="space-y-4">
      {/* View Switcher */}
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Student Attendance History
        </div>
        <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border">
          <button
            onClick={() => setViewMode("table")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              viewMode === "table" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <LayoutList className="w-3.5 h-3.5" /> Table
          </button>
          <button
            onClick={() => setViewMode("calendar")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              viewMode === "calendar" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <CalendarIcon className="w-3.5 h-3.5" /> Calendar
          </button>
        </div>
      </div>

      {viewMode === "calendar" ? (
        <StudentAttendanceCalendar
          records={calendarRecords}
          studentName={studentName}
          studentId={studentId}
          internshipStartDate={internshipStartDate}
          internshipEndDate={internshipEndDate}
        />
      ) : attendanceRecords.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground">
          <MapPin className="w-10 h-10 mx-auto mb-3" />
          <p style={{ fontSize: "0.85rem" }}>No attendance records found.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/20">
                  <th className="px-4 py-3 text-left text-muted-foreground font-semibold" style={{ fontSize: "0.7rem" }}>
                    DATE
                  </th>
                  <th className="px-4 py-3 text-left text-muted-foreground font-semibold" style={{ fontSize: "0.7rem" }}>
                    CHECK-IN
                  </th>
                  <th className="px-4 py-3 text-left text-muted-foreground font-semibold" style={{ fontSize: "0.7rem" }}>
                    TYPE
                  </th>
                  <th className="px-4 py-3 text-left text-muted-foreground font-semibold" style={{ fontSize: "0.7rem" }}>
                    LOCATION
                  </th>
                  <th className="px-4 py-3 text-left text-muted-foreground font-semibold" style={{ fontSize: "0.7rem" }}>
                    STATUS
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {attendanceRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-secondary/20 transition-colors">
                    <td className="px-4 py-3 font-medium" style={{ fontSize: "0.85rem" }}>
                      {typeof r.date === "string" && r.date.includes("T") ? r.date.split("T")[0] : (r.date ?? "—")}
                    </td>
                    <td className="px-4 py-3 font-medium text-muted-foreground" style={{ fontSize: "0.85rem" }}>
                      {r.checkInTime || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          r.checkInType === "gps"
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400"
                            : "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400"
                        }`}
                        style={{ fontSize: "0.65rem" }}
                      >
                        {r.checkInType === "gps" ? "GPS" : "Manual"}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-[260px]">
                      <GpsLocationDisplay
                        lat={r.lat}
                        lng={r.lng}
                        notes={r.notes || (r.checkInType === "manual" ? r.location : undefined)}
                        showMapLink={true}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          r.verificationStatus === "Verified" || r.status === "present"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                            : r.verificationStatus === "Rejected" || r.status === "absent"
                            ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"
                            : r.status === "excused"
                            ? "bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                        }`}
                        style={{ fontSize: "0.65rem" }}
                      >
                        {r.status === "absent" ? "Absent" : r.status === "excused" ? "Excused" : r.verificationStatus || r.status || "Pending"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
