import { showPrintFallback } from "./print-fallback";

export interface PlacementLetterData {
  studentName: string;
  studentId: string;
  department: string;
  level: string;
  program?: string;
  companyName: string;
  companyAddress?: string;
  companyContactPerson?: string;
  supervisorName?: string;
  termName?: string;
  startDate?: string;
  endDate?: string;
  dloName?: string;
  universityName?: string;
}

// Persisted by the CLO from the Templates page (see src/app/pages/templates.tsx).
// Falls back to the hardcoded letter below when no custom template has been saved.
const TEMPLATE_OVERRIDES_KEY = "iams_template_overrides";
const PLACEMENT_LETTER_TEMPLATE_ID = "placement-letter";

function isSafeUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

interface TemplateOverride {
  body?: string;
  signatureUrl?: string;
}

function getPlacementLetterOverride(): TemplateOverride | null {
  try {
    const raw = localStorage.getItem(TEMPLATE_OVERRIDES_KEY);
    if (!raw) return null;
    const all = JSON.parse(raw);
    return all?.[PLACEMENT_LETTER_TEMPLATE_ID] ?? null;
  } catch {
    return null;
  }
}

function fillPlaceholders(body: string, data: PlacementLetterData): string {
  const supervisor = data.supervisorName || data.dloName || "";
  return body
    .split("[Student Name]").join(data.studentName)
    .split("[Student ID]").join(data.studentId)
    .split("[Company Name]").join(data.companyName)
    .split("[Start Date]").join(data.startDate || "")
    .split("[End Date]").join(data.endDate || "")
    .split("[Department]").join(data.department)
    .split("[Supervisor Name]").join(supervisor);
}

function renderCustomBody(body: string, data: PlacementLetterData): string {
  const filled = fillPlaceholders(body, data);
  return filled
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => `<p>${line}</p>`)
    .join("\n");
}

export function openPlacementLetter(data: PlacementLetterData): void {
  const today = new Date();
  const dateStr = today.toLocaleDateString("en-GB", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const studentLevel = data.level || "Level 4";
  const supervisorLine = data.supervisorName
    ? `For queries, please contact ${data.supervisorName}, Department of ${data.department}.`
    : `For queries, please contact the Department of ${data.department}.`;

  const override = getPlacementLetterOverride();

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Placement Letter</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Times New Roman', Times, Georgia, serif;
      line-height: 1.6;
      color: #333;
      background: white;
      padding: 0.5in;
    }
    @media print {
      body {
        margin: 1in;
        padding: 0;
        background: white;
      }
      .no-print {
        display: none !important;
      }
    }
    .container {
      max-width: 8.5in;
      margin: 0 auto;
      height: 11in;
      display: flex;
      flex-direction: column;
    }
    .letterhead {
      text-align: center;
      border-bottom: 3px solid #1e3a5f;
      padding-bottom: 0.3in;
      margin-bottom: 0.3in;
    }
    .letterhead-logo {
      height: 0.8in;
      margin-bottom: 0.1in;
    }
    .letterhead-title {
      font-size: 18px;
      font-weight: bold;
      color: #1e3a5f;
      margin-bottom: 0.05in;
    }
    .letterhead-subtitle {
      font-size: 12px;
      color: #555;
      font-style: italic;
    }
    .date {
      text-align: right;
      font-size: 11px;
      margin-bottom: 0.3in;
      margin-top: 0.2in;
    }
    .recipient {
      font-size: 11px;
      margin-bottom: 0.2in;
    }
    .recipient-line {
      margin: 0.05in 0;
    }
    .salutation {
      margin: 0.2in 0;
      font-size: 12px;
    }
    .body {
      font-size: 12px;
      flex-grow: 1;
      margin-bottom: 0.3in;
    }
    .body p {
      margin-bottom: 0.15in;
      text-align: justify;
    }
    .body p:first-child {
      text-indent: 0.5in;
    }
    .signature-block {
      margin-top: 0.4in;
      font-size: 11px;
      position: relative;
    }
    .signature-container {
      position: relative;
      height: 1.2in;
      margin-top: 0.1in;
      margin-bottom: 0.1in;
    }
    .signature-line {
      border-top: 1px solid #333;
      width: 2in;
      margin-top: 0.35in;
      margin-bottom: 0.05in;
      display: inline-block;
    }
    .signature-image {
      height: 0.8in;
      position: absolute;
      top: 0;
      left: 0;
      z-index: 2;
    }
    .stamp-image {
      height: 1.1in;
      position: absolute;
      top: -0.15in;
      left: 0.5in;
      z-index: 1;
      opacity: 0.85;
    }
    .signature-title {
      font-weight: bold;
      font-size: 11px;
    }
    .signature-subtitle {
      font-size: 10px;
      color: #666;
    }
    .closing {
      margin-bottom: 0.15in;
    }
    .print-button {
      display: block;
      margin: 0.3in 0;
      padding: 0.5in 1in;
      background: #1e3a5f;
      color: white;
      border: none;
      border-radius: 4px;
      font-size: 14px;
      cursor: pointer;
      text-align: center;
    }
    .print-button:hover {
      background: #152d4a;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="no-print" style="text-align: center; margin-bottom: 0.3in;">
      <button class="print-button" onclick="window.print()">Print / Save as PDF</button>
    </div>

    <div class="letterhead" style="text-align: center; border-bottom: 2px solid #1e3a8a; padding-bottom: 10px; margin-bottom: 20px;">
      <img src="${window.location.origin}/HTULH.png" alt="Ho Technical University Letterhead" style="max-width: 100%; height: auto; max-height: 100px; object-fit: contain;" />
    </div>

    <div class="date">Date: ${dateStr}</div>

    <div class="recipient">
      <div class="recipient-line"><strong>TO: The Manager</strong></div>
      <div class="recipient-line">${data.companyName}</div>
      ${data.companyAddress ? `<div class="recipient-line">${data.companyAddress}</div>` : ""}
    </div>

    <div class="salutation">Dear Sir/Madam,</div>

    <div class="body">
      ${override?.body ? renderCustomBody(override.body, data) : `
      <p><strong>LETTER OF INTRODUCTION — INDUSTRIAL ATTACHMENT</strong></p>

      <p>
        We write to introduce <strong>${data.studentName}</strong> (Student ID: <strong>${data.studentId}</strong>),
        a ${studentLevel} student of the Department of <strong>${data.department}</strong>.
        This student is expected to undertake Industrial Attachment at your esteemed organisation
        ${data.startDate ? `from <strong>${data.startDate}</strong>` : ""}
        ${data.endDate ? `to <strong>${data.endDate}</strong>` : ""}
        as part of the academic programme.
      </p>

      <p>
        We kindly request that you extend to this student the necessary guidance and supervision
        during the attachment period. The student will contribute meaningfully to your operations
        whilst gaining invaluable practical experience in the profession.
      </p>

      <p>${supervisorLine}</p>
      `}
    </div>

    <div class="closing">Yours faithfully,</div>

    <div class="signature-block">
      <div class="signature-container">
        <img class="signature-image" src="${override?.signatureUrl && isSafeUrl(override.signatureUrl) ? override.signatureUrl : `${window.location.origin}/Signature.png`}" alt="Signature" />
        <img class="stamp-image" src="${window.location.origin}/Stamp.png" alt="University Stamp" />
      </div>
      <div class="signature-title">${data.dloName || "Industrial Liaison Officer"}</div>
      <div class="signature-subtitle">Industrial Liaison Office</div>
      <div class="signature-subtitle">${data.universityName || "Ho Technical University"}</div>
    </div>
  </div>
</body>
</html>
`;

  try {
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, "_blank");
    if (!win) {
      showPrintFallback(html, "Placement Letter");
      URL.revokeObjectURL(url);
      return;
    }
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  } catch (err) {
    console.warn("Failed to open placement letter window, displaying in-app modal instead", err);
    showPrintFallback(html, "Placement Letter");
  }
}
