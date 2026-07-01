import { showCSVFallback } from "./print-fallback";

// CSV export utility — generates and triggers download of CSV files

/**
 * Convert an array of objects to a CSV string and trigger download.
 */
export function exportToCSV<T extends Record<string, unknown>>(
  data: T[],
  filename: string,
  columns?: { key: keyof T; label: string }[]
) {
  if (data.length === 0) return;

  const cols = columns || Object.keys(data[0]).map((k) => ({ key: k as keyof T, label: String(k) }));
  
  const header = cols.map((c) => `"${c.label}"`).join(",");
  const rows = data.map((row) =>
    cols
      .map((c) => {
        const val = row[c.key];
        const str = val === null || val === undefined ? "" : String(val);
        return `"${str.replace(/"/g, '""')}"`;
      })
      .join(",")
  );

  const csv = [header, ...rows].join("\n");
  
  try {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}_${new Date().toISOString().split("T")[0]}.csv`;
    
    // Sandbox workaround: append to body before click
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Revoke after a delay to ensure the browser has started the download
    setTimeout(() => URL.revokeObjectURL(url), 100);
  } catch (err) {
    console.warn("Standard download blocked, using copy-paste fallback dialog", err);
    showCSVFallback(csv, filename);
  }
}
