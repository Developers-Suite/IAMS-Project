import { toast } from "sonner";
import { showPrintFallback } from "./print-fallback";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function exportLogbookToPDF(companyName: string, entries: any[]) {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${escapeHtml(companyName)} - Logbook Entries</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { display: flex; align-items: center; gap: 12px; margin-bottom: 5px; }
          .header img { height: 50px; }
          h1 { color: #1a1a2e; margin: 0; }
          .meta { color: #666; font-size: 0.9em; margin-bottom: 20px; }
          .entry { border: 1px solid #ddd; padding: 15px; margin-bottom: 15px; border-radius: 8px; }
          .entry-date { font-weight: bold; color: #0B5ED7; }
          .entry-activities { margin-top: 10px; color: #333; }
          .entry-skills { margin-top: 8px; color: #666; font-size: 0.9em; }
          .entry-status { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 0.8em; margin-top: 8px; }
          .status-approved { background-color: #d4edda; color: #155724; }
          .status-submitted { background-color: #d1ecf1; color: #0c5460; }
          .status-draft { background-color: #e2e3e5; color: #383d41; }
          .status-revision { background-color: #fff3cd; color: #856404; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body onload="window.print()">
        <div class="header">
          <img src="/logo%201.png" alt="" />
          <h1>${escapeHtml(companyName)}</h1>
        </div>
        <div class="meta">
          <p>Generated on ${new Date().toLocaleDateString("en-GB")}</p>
          <p>Total Entries: ${entries.length}</p>
          <p>Approved: ${entries.filter((e) => e.status === "approved").length}</p>
        </div>
        ${
          entries.length > 0
            ? entries
                .map(
                  (entry) => `
            <div class="entry">
              <div class="entry-date">${escapeHtml(new Date(entry.entry_date).toLocaleDateString("en-GB"))}</div>
              <div class="entry-activities"><strong>Activities:</strong> ${escapeHtml(entry.activities_description || "—")}</div>
              ${entry.skills_learned ? `<div class="entry-skills"><strong>Skills:</strong> ${escapeHtml(entry.skills_learned)}</div>` : ""}
              <div class="entry-status status-${escapeHtml(entry.status)}">${escapeHtml(entry.status.replace(/_/g, " ").toUpperCase())}</div>
            </div>
          `
                )
                .join("")
            : "<p>No logbook entries found.</p>"
        }
      </body>
    </html>
  `;

  try {
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, "_blank");
    if (!win) {
      showPrintFallback(html, `${companyName} - Logbook Entries`);
      URL.revokeObjectURL(url);
      return;
    }
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  } catch (err) {
    console.warn("Failed to open print popup, displaying in-app modal instead", err);
    showPrintFallback(html, `${companyName} - Logbook Entries`);
  }
}
