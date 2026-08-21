import { useState, useMemo } from "react";
import { 
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, 
  MapPin, CheckCircle2, XCircle, Shield, AlertCircle 
} from "lucide-react";
import { GpsLocationDisplay } from "./gps-location-display";

export interface AttendanceCalendarRecord {
  id: string | number;
  attendance_date?: string;
  date?: string;
  check_in_time?: string | null;
  check_out_time?: string | null;
  status: "present" | "absent" | "late" | "half_day" | "excused" | string;
  notes?: string | null;
  manual_reason?: string | null;
  check_in_type?: "gps" | "manual" | string;
  gps_check_in_lat?: number | string | null;
  gps_check_in_lng?: number | string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  verified_by?: any;
  verified_at?: string | null;
  verificationStatus?: string;
}

interface StudentAttendanceCalendarProps {
  records: AttendanceCalendarRecord[];
  studentName?: string;
  studentId?: string;
  internshipStartDate?: string;
  internshipEndDate?: string;
  canVerify?: boolean;
  onVerify?: (recordId: string, status: string) => void | Promise<void>;
}

const STATUS_CONFIG: Record<string, { bg: string; text: string; border: string; label: string; icon: any }> = {
  present: {
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-300 dark:border-emerald-700",
    label: "Present",
    icon: CheckCircle2,
  },
  absent: {
    bg: "bg-red-50 dark:bg-red-950/40",
    text: "text-red-700 dark:text-red-300",
    border: "border-red-300 dark:border-red-700",
    label: "Absent",
    icon: XCircle,
  },
  late: {
    bg: "bg-amber-50 dark:bg-amber-950/40",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-300 dark:border-amber-700",
    label: "Late",
    icon: Clock,
  },
  half_day: {
    bg: "bg-blue-50 dark:bg-blue-950/40",
    text: "text-blue-700 dark:text-blue-300",
    border: "border-blue-300 dark:border-blue-700",
    label: "Half Day",
    icon: Clock,
  },
  excused: {
    bg: "bg-violet-50 dark:bg-violet-950/40",
    text: "text-violet-700 dark:text-violet-300",
    border: "border-violet-300 dark:border-violet-700",
    label: "Excused",
    icon: Shield,
  },
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function StudentAttendanceCalendar({
  records,
  studentName,
  studentId,
  internshipStartDate,
  internshipEndDate,
  canVerify = false,
  onVerify,
}: StudentAttendanceCalendarProps) {
  // Current view month & year
  const [currentDate, setCurrentDate] = useState(() => {
    // If records exist, default to the month of the most recent record, or today
    if (records.length > 0) {
      const dates = records
        .map((r) => (r.attendance_date || r.date)?.slice(0, 10))
        .filter(Boolean)
        .sort();
      if (dates.length > 0) {
        const latest = new Date(dates[dates.length - 1]!);
        if (!isNaN(latest.getTime())) {
          return new Date(latest.getFullYear(), latest.getMonth(), 1);
        }
      }
    }
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    return todayStr;
  });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Create date lookup map for O(1) matching
  const recordMap = useMemo(() => {
    const map = new Map<string, AttendanceCalendarRecord>();
    records.forEach((r) => {
      const dStr = (r.attendance_date || r.date)?.slice(0, 10);
      if (dStr) {
        map.set(dStr, r);
      }
    });
    return map;
  }, [records]);

  // Summary counts for currently loaded records
  const summary = useMemo(() => {
    let present = 0;
    let absent = 0;
    let late = 0;
    let halfDay = 0;
    let excused = 0;

    records.forEach((r) => {
      const s = (r.status || "").toLowerCase();
      if (s === "present") present++;
      else if (s === "absent") absent++;
      else if (s === "late") late++;
      else if (s === "half_day") halfDay++;
      else if (s === "excused") excused++;
    });

    const total = records.length;
    const rate = total > 0 ? Math.round(((present + late + halfDay) / total) * 100) : 0;

    return { present, absent, late, halfDay, excused, total, rate };
  }, [records]);

  // Calendar grid calculations
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // Weekday index of 1st day of month (0 = Sun, 1 = Mon, ... 6 = Sat)
  const firstDayWeekday = new Date(year, month, 1).getDay();
  // Adjust so Monday is 0 and Sunday is 6
  const startingEmptyCells = (firstDayWeekday + 6) % 7;

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    const now = new Date();
    setCurrentDate(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDateStr(now.toISOString().split("T")[0]);
  };

  const monthName = currentDate.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  const selectedRecord = selectedDateStr ? recordMap.get(selectedDateStr) : null;
  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <div className="space-y-6">
      {/* Top Bar: Student Header & Summary Stats */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-card border border-border rounded-2xl p-5 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-primary" />
            <h2 className="text-lg md:text-xl font-bold tracking-tight">
              {studentName ? `${studentName}'s Attendance Calendar` : "Attendance Calendar"}
            </h2>
          </div>
          {studentId && (
            <p className="text-muted-foreground text-xs mt-0.5">Student ID: {studentId}</p>
          )}
          {internshipStartDate && (
            <p className="text-muted-foreground text-xs mt-1">
              Period: {new Date(internshipStartDate).toLocaleDateString("en-GB")}
              {internshipEndDate ? ` to ${new Date(internshipEndDate).toLocaleDateString("en-GB")}` : ""}
            </p>
          )}
        </div>

        {/* Summary Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/20 text-xs font-semibold text-primary">
            Rate: {summary.rate}%
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-medium flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Present: {summary.present}</span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-red-50 text-red-700 border border-red-200 text-xs font-medium flex items-center gap-1.5">
            <XCircle className="w-3.5 h-3.5" />
            <span>Absent: {summary.absent}</span>
          </div>
          {summary.excused > 0 && (
            <div className="px-3 py-1.5 rounded-xl bg-violet-50 text-violet-700 border border-violet-200 text-xs font-medium flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              <span>Excused: {summary.excused}</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Calendar View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Grid (2 Cols) */}
        <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
          {/* Calendar Navigation */}
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base md:text-lg">{monthName}</h3>
            <div className="flex items-center gap-1.5">
              <button
                onClick={goToToday}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-border hover:bg-accent transition"
              >
                Today
              </button>
              <button
                onClick={prevMonth}
                className="p-1.5 rounded-lg border border-border hover:bg-accent transition"
                title="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={nextMonth}
                className="p-1.5 rounded-lg border border-border hover:bg-accent transition"
                title="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Weekday Header */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-muted-foreground py-2 border-b border-border">
            {WEEKDAYS.map((w, idx) => (
              <div key={w} className={idx >= 5 ? "text-muted-foreground/60" : ""}>
                {w}
              </div>
            ))}
          </div>

          {/* Calendar Cells */}
          <div className="grid grid-cols-7 gap-1.5">
            {/* Empty padding for days before month start */}
            {Array.from({ length: startingEmptyCells }).map((_, idx) => (
              <div key={`empty-${idx}`} className="h-16 md:h-20 rounded-xl bg-muted/20 opacity-40" />
            ))}

            {/* Days of Month */}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const dayNum = idx + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
              const dayDate = new Date(year, month, dayNum);
              const isWeekend = dayDate.getDay() === 0 || dayDate.getDay() === 6;
              const isToday = dateStr === todayStr;
              const isSelected = dateStr === selectedDateStr;
              const record = recordMap.get(dateStr);
              const status = record?.status ? (record.status.toLowerCase() as string) : null;
              const cfg = status ? STATUS_CONFIG[status] : null;

              return (
                <div
                  key={dateStr}
                  onClick={() => setSelectedDateStr(dateStr)}
                  className={`h-16 md:h-20 p-1.5 rounded-xl border flex flex-col justify-between cursor-pointer transition-all duration-200 ${
                    isSelected
                      ? "ring-2 ring-primary border-primary shadow-sm"
                      : "border-border/60 hover:border-primary/50"
                  } ${
                    cfg
                      ? cfg.bg
                      : isWeekend
                      ? "bg-muted/15 text-muted-foreground/60"
                      : "bg-card"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold ${
                        isToday
                          ? "w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px]"
                          : isSelected
                          ? "text-primary"
                          : ""
                      }`}
                    >
                      {dayNum}
                    </span>
                    {cfg && (
                      <cfg.icon className={`w-3 h-3 ${cfg.text} shrink-0`} />
                    )}
                  </div>

                  {/* Cell Footer Label */}
                  {status ? (
                    <div className="w-full">
                      <span
                        className={`block text-[10px] font-semibold truncate rounded px-1 py-0.5 border ${
                          cfg?.border || "border-border"
                        } ${cfg?.text || ""}`}
                      >
                        {status === "absent"
                          ? "Absent"
                          : status === "present"
                          ? record?.check_in_time ? record.check_in_time.slice(0, 5) : "Present"
                          : cfg?.label || status}
                      </span>
                    </div>
                  ) : (
                    isWeekend && (
                      <span className="text-[9px] text-muted-foreground/40 italic">Weekend</span>
                    )
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="pt-3 border-t border-border flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Legend:</span>
            <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Present</div>
            <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Absent</div>
            <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Late</div>
            <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Half Day</div>
            <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-violet-500" /> Excused</div>
          </div>
        </div>

        {/* Selected Date Details Inspector (1 Col) */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <p className="text-xs uppercase font-bold text-muted-foreground tracking-wider">Date Inspector</p>
                <h4 className="text-base font-bold mt-0.5">
                  {selectedDateStr
                    ? new Date(selectedDateStr).toLocaleDateString("en-GB", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })
                    : "Select a date"}
                </h4>
              </div>
            </div>

            {selectedRecord ? (
              <div className="space-y-4">
                {/* Status Card */}
                <div className={`p-4 rounded-xl border ${STATUS_CONFIG[selectedRecord.status?.toLowerCase()]?.bg || "bg-muted/20"} ${STATUS_CONFIG[selectedRecord.status?.toLowerCase()]?.border || "border-border"}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground">Recorded Status</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold capitalize ${STATUS_CONFIG[selectedRecord.status?.toLowerCase()]?.text || ""}`}>
                      {selectedRecord.status}
                    </span>
                  </div>
                  {selectedRecord.status === "absent" && (
                    <p className="text-xs text-red-700 dark:text-red-300 mt-2 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      Missed check-in: No attendance logged for this working day.
                    </p>
                  )}
                </div>

                {/* Timing Grid */}
                <div className="grid grid-cols-2 gap-3 bg-muted/20 p-3.5 rounded-xl border border-border">
                  <div>
                    <p className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Check-In
                    </p>
                    <p className="text-sm font-semibold mt-1">{selectedRecord.check_in_time ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Check-Out
                    </p>
                    <p className="text-sm font-semibold mt-1">{selectedRecord.check_out_time ?? "—"}</p>
                  </div>
                </div>

                {/* Location / GPS Details */}
                {(selectedRecord.gps_check_in_lat || selectedRecord.latitude || selectedRecord.notes || selectedRecord.manual_reason) && (
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> Location & Notes
                    </p>
                    <div className="bg-secondary/40 p-3 rounded-xl border border-border/60 text-xs">
                      <GpsLocationDisplay
                        lat={selectedRecord.gps_check_in_lat ?? selectedRecord.latitude}
                        lng={selectedRecord.gps_check_in_lng ?? selectedRecord.longitude}
                        notes={selectedRecord.notes}
                        showMapLink={true}
                      />
                      {selectedRecord.manual_reason && (
                        <p className="mt-2 pt-2 border-t border-border text-amber-700 dark:text-amber-400 italic">
                          "{selectedRecord.manual_reason}"
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Verification Status */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-muted-foreground">Verification:</span>
                  <span className="font-medium">
                    {selectedRecord.verified_by ? (
                      <span className="text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                      </span>
                    ) : selectedRecord.status === "absent" ? (
                      <span className="text-red-600 flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5" /> Unexcused
                      </span>
                    ) : (
                      <span className="text-amber-600 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> Pending
                      </span>
                    )}
                  </span>
                </div>
              </div>
            ) : (
              <div className="py-10 text-center text-muted-foreground space-y-2">
                <CalendarIcon className="w-8 h-8 mx-auto opacity-30" />
                <p className="text-xs">No attendance record logged for this date.</p>
              </div>
            )}
          </div>

          {/* Action Buttons for Supervisors */}
          {canVerify && selectedRecord && onVerify && (
            <div className="pt-4 border-t border-border space-y-2">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Supervisor Action</p>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  onClick={() => onVerify(String(selectedRecord.id), "present")}
                  className="px-2 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition"
                >
                  <CheckCircle2 className="w-3 h-3" /> Present
                </button>
                <button
                  onClick={() => onVerify(String(selectedRecord.id), "excused")}
                  className="px-2 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition"
                >
                  <Shield className="w-3 h-3" /> Excuse
                </button>
                <button
                  onClick={() => onVerify(String(selectedRecord.id), "absent")}
                  className="px-2 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition"
                >
                  <XCircle className="w-3 h-3" /> Absent
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
