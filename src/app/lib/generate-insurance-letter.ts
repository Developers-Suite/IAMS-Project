export interface InsuranceLetterData {
  studentName: string;
  studentId: string;
  department: string;
  level: string;
  companyName: string;
  startDate?: string;
  endDate?: string;
  coordinatorName?: string;
  signatureUrl?: string;
}

const TEMPLATE_OVERRIDES_KEY = "iams_template_overrides";
const INSURANCE_LETTER_TEMPLATE_ID = "insurance-letter";

function getInsuranceLetterOverride() {
  try {
    const raw = localStorage.getItem(TEMPLATE_OVERRIDES_KEY);
    if (!raw) return null;
    const all = JSON.parse(raw);
    return all?.[INSURANCE_LETTER_TEMPLATE_ID] ?? null;
  } catch {
    return null;
  }
}

export function openInsuranceLetter(data: InsuranceLetterData): void {
  const today = new Date();
  const dateStr = today.toLocaleDateString("en-GB", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const override = getInsuranceLetterOverride();
  const defaultBody = `To Whom It May Concern,\n\nRE: GROUP PERSONAL ACCIDENT INSURANCE COVER FOR [Student Name] (ID: [Student ID])\n\nWe write to confirm that [Student Name], a student of the Department of [Department], Ho Technical University, is covered under the University's Group Personal Accident Insurance policy during the period of their industrial attachment from [Start Date] to [End Date] at [Company Name].\n\nThis insurance covers any accidental injury that may occur during the discharge of their duties at your organization.\n\nThank you for your partnership in mentoring our student.`;

  const bodyTemplate = override?.body || defaultBody;
  const signatureUrl = override?.signatureUrl || data.signatureUrl;

  const filledBody = bodyTemplate
    .split("[Student Name]").join(data.studentName)
    .split("[Student ID]").join(data.studentId)
    .split("[Company Name]").join(data.companyName)
    .split("[Start Date]").join(data.startDate || "")
    .split("[End Date]").join(data.endDate || "")
    .split("[Department]").join(data.department);

  const renderedParagraphs = filledBody
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => `<p style="margin-bottom: 0.15in; text-align: justify;">${line}</p>`)
    .join("\n");

  const signatureHtml = signatureUrl
    ? `
    <div class="signature-section" style="margin-top: 0.4in; page-break-inside: avoid;">
      <p style="margin-bottom: 0.05in;">Yours faithfully,</p>
      <img src="${signatureUrl}" alt="Signature" style="max-height: 60px; object-fit: contain; display: block; margin-bottom: 0.05in;" />
      <p style="font-weight: bold; border-top: 1px solid #ccc; display: inline-block; padding-top: 2px;">Industrial Attachment Coordinator</p>
    </div>
    `
    : `
    <div class="signature-section" style="margin-top: 0.4in; page-break-inside: avoid;">
      <p style="margin-bottom: 0.4in;">Yours faithfully,</p>
      <p style="font-weight: bold; border-top: 1px solid #ccc; display: inline-block; padding-top: 2px;">Industrial Attachment Coordinator</p>
    </div>
    `;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Insurance Confirmation Letter</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Garamond', 'Georgia', serif;
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
    }
    .print-button {
      background: #1e3a8a;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      font-size: 14px;
      cursor: pointer;
      margin-bottom: 0.3in;
      display: inline-block;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="no-print" style="text-align: center;">
      <button class="print-button" onclick="window.print()">Print / Save as PDF</button>
    </div>
    <div class="letterhead" style="text-align: center; margin-bottom: 0.3in; border-bottom: 2px solid #1e3a8a; padding-bottom: 10px;">
      <img src="/HTULH.png" alt="HTU Letterhead" style="max-width: 100%; height: auto; max-height: 100px; object-fit: contain;" />
    </div>
    <div class="date" style="text-align: right; margin-bottom: 0.2in;">Date: ${dateStr}</div>
    <div class="body" style="font-size: 11pt;">
      ${renderedParagraphs}
    </div>
    ${signatureHtml}
  </div>
</body>
</html>
  `;

  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  }
}
