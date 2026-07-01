// Shared helpers for resolving fields off an `application` (myApp) object whose shape
// varies depending on which API endpoint/serializer returned it.

// Before company acceptance, no confirmed/proposed date exists yet on the application
// itself — fall back to the academic term's internship window (the institutional period),
// either embedded on the application resource or looked up from a separately-fetched terms list.
export function getInternshipStartDate(app: any, terms?: any[]): string | undefined {
  const direct = app.confirmed_start_date
    ?? app.internship?.confirmed_start_date
    ?? app.internship?.start_date
    ?? app.start_date
    ?? app.proposed_start_date
    ?? app.academic_term?.start_date
    ?? app.term?.start_date
    ?? undefined;
  if (direct) return direct;
  const term = findMatchingTerm(app, terms);
  return term?.internshipStart ?? term?.start_date ?? term?.internship_start;
}

export function getInternshipEndDate(app: any, terms?: any[]): string | undefined {
  const direct = app.confirmed_end_date
    ?? app.internship?.confirmed_end_date
    ?? app.internship?.end_date
    ?? app.end_date
    ?? app.proposed_end_date
    ?? app.academic_term?.end_date
    ?? app.term?.end_date
    ?? undefined;
  if (direct) return direct;
  const term = findMatchingTerm(app, terms);
  return term?.internshipEnd ?? term?.end_date ?? term?.internship_end;
}

function findMatchingTerm(app: any, terms?: any[]): any | undefined {
  if (!terms || terms.length === 0) return undefined;
  const termId = app.academic_term_id ?? app.academic_term?.id ?? app.term_id ?? app.term?.id;
  if (termId == null) return undefined;
  return terms.find((t) => String(t.id) === String(termId));
}

import { fmtDate } from "./date-utils";

export function formatDisplayDate(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const res = fmtDate(value);
  return res === "—" ? undefined : res;
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
