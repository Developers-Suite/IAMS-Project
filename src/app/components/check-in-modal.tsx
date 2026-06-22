import { useState, useEffect, useRef } from "react";
import { MapPin, X, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { apiClient } from "../lib/api-client";
import { toast } from "sonner";

interface CheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  internshipId?: number;
  internshipStatus?: string;
}

const WARNINGS = [
  {
    title: "First check-in — location will be saved permanently",
    body: "Your GPS location during this check-in will be recorded as your internship site. All future daily check-ins must be within 500 m of this point.",
    button: "Next →",
  },
  {
    title: "Are you at your company right now?",
    body: "If you check in from the wrong place, you will not be able to check in normally for the rest of your internship. Make sure you are physically inside or right outside your company premises.",
    button: "Yes, I'm at my company →",
  },
  {
    title: "Final confirmation — this cannot be undone",
    body: "Once you confirm, your current GPS location becomes your permanent check-in anchor. Any future check-in from more than 500 m away will require supervisor approval.",
    button: "I understand — proceed to check-in",
  },
];

export function CheckInModal({
  isOpen,
  onClose,
  onSuccess,
  internshipId,
  internshipStatus,
}: CheckInModalProps) {
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [isResolvingAddress, setIsResolvingAddress] = useState(false);
  const [locationDetails, setLocationDetails] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [checkedInTime, setCheckedInTime] = useState<string | null>(null);
  const [outsideInternshipPeriod, setOutsideInternshipPeriod] = useState(false);
  const [warningStep, setWarningStep] = useState(0); // 0=skip, 1/2/3=first-checkin warnings
  const [outsideGeofence, setOutsideGeofence] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [manualReason, setManualReason] = useState("");
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);
  const inFlightRef = useRef(false);

  const isInternshipActive = internshipStatus === "active" || internshipStatus === "approved";
  const canCheckIn = !!internshipId && isInternshipActive;
  const isCheckedIn = !!checkedInTime;

  // Reset all state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setIsGettingLocation(false);
      setIsResolvingAddress(false);
      setLocationDetails("");
      setLat(null);
      setLng(null);
      setGpsAccuracy(0);
      setIsSubmitting(false);
      setGpsError(null);
      setCheckedInTime(null);
      setOutsideInternshipPeriod(false);
      setWarningStep(0);
      setOutsideGeofence(false);
      setManualMode(false);
      setManualReason("");
      setIsSubmittingManual(false);
      inFlightRef.current = false;
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !internshipId) return;

    const loadCheckInStatus = async () => {
      try {
        const today = new Date().toISOString().split("T")[0];

        const internships = await apiClient.getInternships();
        const internship = internships.data?.find(
          (i: any) => String(i.id) === String(internshipId)
        );

        if (internship?.start_date && internship?.end_date) {
          const start = new Date(internship.start_date);
          const end = new Date(internship.end_date);
          const todayDate = new Date(today);
          if (todayDate < start || todayDate > end) {
            setOutsideInternshipPeriod(true);
          }
        }

        const res = await apiClient.getInternshipAttendance(String(internshipId), {
          from_date: today,
          to_date: today,
        });

        if (!res.success) return;

        const records = Array.isArray(res.data) ? res.data : [];
        const todayRecord = records.find(
          (r: any) =>
            r.status === "present" || r.status === "late" || r.status === "half_day"
        );

        if (todayRecord) {
          setCheckedInTime(todayRecord.check_in_time);
          setLocationDetails(todayRecord.notes || "");
          setLat(todayRecord.gps_check_in_lat || null);
          setLng(todayRecord.gps_check_in_lng || null);
        } else if (internship?.gps_latitude == null) {
          // No anchor stored yet — show 3 warnings before GPS capture
          setWarningStep(1);
        }
      } catch (error) {
        console.error("Error loading check-in status:", error);
      }
    };

    loadCheckInStatus();
  }, [isOpen, internshipId]);

  const handleGetLocation = () => {
    setIsGettingLocation(true);
    setGpsError(null);
    setOutsideGeofence(false);

    if (!("geolocation" in navigator)) {
      setGpsError("Geolocation is not supported by your browser");
      setIsGettingLocation(false);
      toast.error("Geolocation not supported");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        setLat(latitude);
        setLng(longitude);
        setGpsAccuracy(Math.round(accuracy));
        setIsGettingLocation(false);

        // Reverse-geocode to get a human-readable address
        setIsResolvingAddress(true);
        try {
          const geo = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
            { headers: { "Accept-Language": "en" } }
          ).then((r) => r.json());
          setLocationDetails(
            geo?.display_name ?? `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`
          );
        } catch {
          setLocationDetails(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
        } finally {
          setIsResolvingAddress(false);
        }

        toast.success("GPS location captured!");
      },
      (error) => {
        setIsGettingLocation(false);
        let msg = "Unable to get location";
        if (error.code === error.PERMISSION_DENIED) msg = "Location permission denied";
        else if (error.code === error.POSITION_UNAVAILABLE) msg = "Location information unavailable";
        else if (error.code === error.TIMEOUT) msg = "Location request timed out";
        setGpsError(msg);
        toast.error(msg);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleCheckIn = async () => {
    if (inFlightRef.current) return;
    if (!canCheckIn) { toast.error("Check-in only available during active internship"); return; }
    if (!locationDetails.trim()) { toast.error("Please capture your GPS location first"); return; }

    inFlightRef.current = true;
    setIsSubmitting(true);

    try {
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      const today = now.toISOString().split("T")[0];

      localStorage.setItem(
        `check_in_${internshipId}_${today}`,
        JSON.stringify({ time: timeStr, location: locationDetails, lat, lng, timestamp: now.toISOString() })
      );
      window.dispatchEvent(new CustomEvent("checkInUpdated", { detail: { internshipId, today, time: timeStr } }));

      const res = await (apiClient.checkIn as any)({
        internship_id: internshipId!,
        date: today,
        check_in_time: timeStr,
        gps_check_in_lat: lat ?? undefined,
        gps_check_in_lng: lng ?? undefined,
        notes: locationDetails || undefined,
        status: "present",
        gps_accuracy_metres: gpsAccuracy || undefined,
      });

      if (!res.success) {
        if (res.error_code === "outside_geofence" || res.error_code === "location_required") {
          setOutsideGeofence(true);
          inFlightRef.current = false;
          setIsSubmitting(false);
          return;
        }
        toast.error(res.message ?? "Check-in failed");
        inFlightRef.current = false;
        setIsSubmitting(false);
        return;
      }

      setCheckedInTime(timeStr);
      toast.success("Checked in successfully!");
      if (onSuccess) await onSuccess();
      setTimeout(() => onClose(), 300);
    } catch (error) {
      console.error("Check-in error:", error);
      toast.error("An error occurred during check-in");
    } finally {
      inFlightRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleManualCheckIn = async () => {
    if (!manualReason.trim()) { toast.error("Please provide a reason for manual check-in"); return; }
    if (inFlightRef.current) return;

    inFlightRef.current = true;
    setIsSubmittingManual(true);

    try {
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      const today = now.toISOString().split("T")[0];

      const res = await (apiClient.checkIn as any)({
        internship_id: internshipId!,
        date: today,
        check_in_time: timeStr,
        gps_check_in_lat: lat ?? undefined,
        gps_check_in_lng: lng ?? undefined,
        notes: locationDetails || undefined,
        status: "present",
        gps_accuracy_metres: gpsAccuracy || undefined,
        manual: true,
        manual_reason: manualReason,
      });

      if (!res.success) {
        toast.error(res.message ?? "Manual check-in failed");
        return;
      }

      setCheckedInTime(timeStr);
      toast.success("Manual check-in submitted. Your supervisor will verify it.");
      if (onSuccess) await onSuccess();
      setTimeout(() => onClose(), 300);
    } catch (error) {
      console.error("Manual check-in error:", error);
      toast.error("An error occurred");
    } finally {
      inFlightRef.current = false;
      setIsSubmittingManual(false);
    }
  };

  if (!isOpen) return null;

  // --- First-check-in warning screens ---
  if (warningStep > 0) {
    const w = WARNINGS[warningStep - 1];
    const nextStep = warningStep < 3 ? warningStep + 1 : 0;
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4">
        <div className="bg-card border border-border rounded-t-2xl md:rounded-2xl w-full md:max-w-md shadow-2xl">
          <div className="border-b border-border p-6 flex items-start justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
              <span className="text-sm font-semibold text-muted-foreground">
                Warning {warningStep} of 3
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-accent rounded-lg transition-colors text-muted-foreground"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-6 space-y-4">
            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg p-4 space-y-2">
              <p className="font-bold text-amber-800 dark:text-amber-200">{w.title}</p>
              <p className="text-sm text-amber-700 dark:text-amber-300">{w.body}</p>
            </div>
            <button
              onClick={() => setWarningStep(nextStep)}
              className="w-full py-3 rounded-lg font-semibold bg-amber-500 hover:bg-amber-600 text-white transition-colors"
            >
              {w.button}
            </button>
            <button
              onClick={onClose}
              className="w-full py-2 border border-border rounded-lg hover:bg-accent font-medium text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- Main modal ---
  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-t-2xl md:rounded-2xl w-full md:max-w-md shadow-2xl max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-b border-border p-6 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground">Daily Check-in</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {isCheckedIn ? `Checked in at ${checkedInTime}` : "Record your attendance"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-accent rounded-lg transition-colors text-muted-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Outside internship period banner */}
          {outsideInternshipPeriod && (
            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg p-3 flex gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-amber-700 dark:text-amber-300">Outside Internship Period</p>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                  Check-ins are only recorded within the internship dates.
                </p>
              </div>
            </div>
          )}

          {isCheckedIn ? (
            /* Success state */
            <>
              <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4 flex items-center justify-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                <div className="text-center">
                  <p className="font-semibold text-emerald-700 dark:text-emerald-300">Checked In</p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                    At {checkedInTime}
                  </p>
                </div>
              </div>
              {locationDetails && (
                <div className="rounded-lg border border-border bg-background p-3 text-sm">
                  <p className="font-medium text-foreground mb-1">Location</p>
                  <p className="text-muted-foreground text-xs">{locationDetails}</p>
                </div>
              )}
              <button
                onClick={onClose}
                className="w-full py-2.5 rounded-lg font-semibold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-2 text-sm"
              >
                <CheckCircle2 className="w-4 h-4" /> Close
              </button>
            </>
          ) : (outsideGeofence || manualMode) ? (
            /* Manual check-in panel — triggered by geofence rejection or voluntary choice */
            <>
              {outsideGeofence ? (
                <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
                    <p className="font-semibold text-red-700 dark:text-red-300">Outside check-in area</p>
                  </div>
                  <p className="text-sm text-red-600 dark:text-red-400">
                    You appear to be outside your company's check-in area. Submit a manual
                    check-in and your supervisor will be notified to verify it.
                  </p>
                  {locationDetails && (
                    <p className="text-xs text-red-500 dark:text-red-400">
                      Your location: {locationDetails}
                    </p>
                  )}
                </div>
              ) : (
                <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                    <p className="font-semibold text-amber-700 dark:text-amber-300">Manual check-in</p>
                  </div>
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    Provide a reason for checking in manually. Your supervisor will be
                    notified to verify your attendance.
                  </p>
                </div>
              )}
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-2 block">
                  Reason for manual check-in *
                </label>
                <textarea
                  value={manualReason}
                  onChange={(e) => setManualReason(e.target.value)}
                  placeholder="Explain why you are checking in from this location (e.g. working at client site, attending off-site training)..."
                  rows={3}
                  disabled={isSubmittingManual}
                  className="w-full px-4 py-2.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 resize-none"
                />
              </div>
              <button
                onClick={handleManualCheckIn}
                disabled={isSubmittingManual || !manualReason.trim()}
                className={`w-full py-2.5 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 text-sm ${
                  isSubmittingManual || !manualReason.trim()
                    ? "bg-muted text-muted-foreground cursor-not-allowed opacity-50"
                    : "bg-amber-500 hover:bg-amber-600 text-white"
                }`}
              >
                {isSubmittingManual ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
                ) : (
                  <>Request Manual Check-in</>
                )}
              </button>
              <button
                onClick={() => { setOutsideGeofence(false); setManualMode(false); }}
                className="w-full py-2 border border-border rounded-lg hover:bg-accent font-medium text-sm transition-colors"
              >
                ← Try GPS again
              </button>
              <button
                onClick={onClose}
                disabled={isSubmittingManual}
                className="w-full py-2 border border-border rounded-lg hover:bg-accent font-medium text-sm transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </>
          ) : (
            /* Normal check-in form */
            <>
              {/* GPS Button */}
              <button
                onClick={handleGetLocation}
                disabled={isGettingLocation || isResolvingAddress || isSubmitting || !canCheckIn}
                className={`w-full py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all ${
                  lat && lng
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                    : "bg-primary text-primary-foreground hover:opacity-90"
                } ${isGettingLocation || isResolvingAddress ? "opacity-75" : ""} ${!canCheckIn ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {isGettingLocation ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Getting location...</>
                ) : isResolvingAddress ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Resolving address...</>
                ) : lat && lng ? (
                  <><CheckCircle2 className="w-4 h-4" /> Location captured</>
                ) : (
                  <><MapPin className="w-4 h-4" /> Capture GPS Location</>
                )}
              </button>

              {/* Resolved location display */}
              {locationDetails && (
                <div className="rounded-lg border border-border bg-background p-3 text-sm">
                  <p className="font-medium text-foreground mb-1">Your location</p>
                  <p className="text-muted-foreground text-xs">{locationDetails}</p>
                </div>
              )}

              {/* GPS Error */}
              {gpsError && (
                <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-2.5 flex gap-2 text-xs">
                  <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                  <p className="text-red-700 dark:text-red-300">{gpsError}</p>
                </div>
              )}

              {/* Check-in Button */}
              <button
                onClick={handleCheckIn}
                disabled={isSubmitting || !locationDetails.trim() || !canCheckIn || isResolvingAddress}
                className={`w-full py-2.5 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 text-sm ${
                  isSubmitting || !locationDetails.trim() || !canCheckIn || isResolvingAddress
                    ? "bg-muted text-muted-foreground cursor-not-allowed opacity-50"
                    : "bg-primary text-primary-foreground hover:opacity-90"
                }`}
              >
                {isSubmitting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Checking in...</>
                ) : (
                  <><CheckCircle2 className="w-4 h-4" /> Check-in</>
                )}
              </button>

              <button
                onClick={onClose}
                disabled={isSubmitting}
                className="w-full py-2 border border-border rounded-lg hover:bg-accent font-medium text-sm transition-colors disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => setManualMode(true)}
                disabled={isSubmitting || !canCheckIn}
                className="w-full py-1.5 text-sm text-muted-foreground hover:text-foreground underline-offset-2 hover:underline transition-colors disabled:opacity-40"
              >
                Can't use GPS? Request manual check-in
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
