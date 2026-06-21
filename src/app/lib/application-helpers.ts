// Shared helpers for resolving fields off an `application` (myApp) object whose shape
// varies depending on which API endpoint/serializer returned it.

export function getInternshipStartDate(app: any): string | undefined {
  return app.confirmed_start_date
    ?? app.internship?.confirmed_start_date
    ?? app.internship?.start_date
    ?? app.start_date
    ?? app.proposed_start_date
    ?? undefined;
}

export function getInternshipEndDate(app: any): string | undefined {
  return app.confirmed_end_date
    ?? app.internship?.confirmed_end_date
    ?? app.internship?.end_date
    ?? app.end_date
    ?? app.proposed_end_date
    ?? undefined;
}

export function formatDisplayDate(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB");
}

// department may come back as a plain string, or as a {name} / {department_name} object — never render the raw object
export function resolveDepartmentName(app: any, fallback: string): string {
  const dept = app.student?.department ?? app.department;
  if (typeof dept === "string" && dept.trim()) return dept;
  if (dept && typeof dept === "object") {
    const name = dept.name ?? dept.department_name;
    if (typeof name === "string" && name.trim()) return name;
  }
  return fallback;
}
