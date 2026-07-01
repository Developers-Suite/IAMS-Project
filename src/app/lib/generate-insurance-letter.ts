import { showPrintFallback } from "./print-fallback";

export interface InsuranceLetterData {
  studentName: string;
  studentId: string;
  department: string;
  level: string;
  companyName: string;
  companyAddress?: string;
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
  const signatureUrl = override?.signatureUrl || data.signatureUrl;
  const coordinatorName = override?.coordinatorName || data.coordinatorName || "Mrs. Stella A. B. Adzika"; // Default HTU Industrial Liaison Officer

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Indemnity Form</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Times New Roman', Times, Georgia, serif;
      line-height: 1.5;
      color: #000;
      background: white;
      padding: 0.3in 0.5in;
    }
    @media print {
      body {
        margin: 0;
        padding: 0.3in 0.4in;
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
      margin-bottom: 0.2in;
      display: inline-block;
    }
    .letterhead {
      text-align: center;
      border-bottom: 2px solid #000;
      padding-bottom: 5px;
      margin-bottom: 15px;
    }
    .title {
      text-align: center;
      font-size: 16pt;
      font-weight: bold;
      letter-spacing: 2px;
      margin-bottom: 20px;
      text-decoration: underline;
    }
    .paragraph {
      font-size: 11pt;
      text-align: justify;
      margin-bottom: 15px;
      text-indent: 0.25in;
    }
    .underline-field {
      border-bottom: 1px dotted #000;
      display: inline-block;
      padding: 0 4px;
      font-weight: bold;
    }
    .sign-section {
      margin-top: 15px;
      font-size: 10pt;
    }
    .sign-block {
      margin-bottom: 15px;
      page-break-inside: avoid;
    }
    .sign-title {
      font-weight: bold;
      text-decoration: underline;
      margin-bottom: 6px;
    }
    .sign-row {
      margin-bottom: 4px;
      display: flex;
      align-items: flex-end;
    }
    .field-label {
      width: 100px;
      flex-shrink: 0;
    }
    .field-line {
      flex-grow: 1;
      border-bottom: 1px dotted #000;
      padding-bottom: 2px;
      position: relative;
    }
    .signature-img {
      position: absolute;
      bottom: 2px;
      left: 10px;
      max-height: 45px;
    }
    .right-sign-line {
      width: 2.2in;
      text-align: center;
      margin-left: 20px;
      border-top: 1px solid #000;
      margin-top: 25px;
      font-weight: bold;
      font-size: 9.5pt;
    }
    .footer-note {
      border-top: 1px solid #ccc;
      margin-top: 20px;
      padding-top: 8px;
      font-size: 8.5pt;
      font-style: italic;
      color: #444;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="no-print" style="text-align: center;">
      <button class="print-button" onclick="window.print()">Print / Save as PDF</button>
    </div>
    
    <div class="letterhead">
      <img src="${window.location.origin}/HTULH.png" alt="HTU Letterhead" style="max-width: 100%; height: auto; max-height: 90px; object-fit: contain;" />
    </div>
    
    <div class="title">INDEMNITY FORM</div>
    
    <div class="paragraph" style="text-indent: 0;">
      I, <span class="underline-field" style="min-width: 250px; text-align: center; display: inline-block;">${data.studentName}</span> of <span class="underline-field" style="min-width: 250px; text-align: center; display: inline-block;">Ho Technical University</span><br/>
      <span style="font-size: 8.5pt; color: #555; display: inline-block; width: 250px; text-align: center; margin-top: 2px; font-style: italic;">(Name of Student)</span>
      <span style="font-size: 8.5pt; color: #555; display: inline-block; width: 250px; text-align: center; margin-top: 2px; font-style: italic;">(Institution)</span>
    </div>
    
    <div class="paragraph">
      declare that I accept to undertake industrial attachment training with <span class="underline-field">${data.companyName}</span> (hereinafter, referred to as <span class="underline-field">${data.companyName}</span>) - <span class="underline-field">${data.companyAddress || "—"}</span>, from <span class="underline-field">${data.startDate || "—"}</span> to <span class="underline-field">${data.endDate || "—"}</span>. During this period, <span class="underline-field">${data.companyName}</span> will not be responsible for the payment of salary or any other allowance or fringe benefit(s) otherwise specified.
    </div>
    
    <div class="paragraph">
      I, further, declare that <span class="underline-field">${data.companyName}</span> shall not be held liable whatsoever or under the Workmen's Compensation Law (1987) PNDC 187 for any loss, damage or injury that I may suffer if the loss, damage or injury was caused by any act of omission, arising from my negligence or an "Act of God".
    </div>
    
    <div class="sign-section">
      <!-- Student block -->
      <div class="sign-block" style="display: flex; justify-content: space-between;">
        <div style="width: 60%;">
          <p class="sign-title">SIGNED by the said Student:</p>
          <p style="margin-bottom: 8px; font-style: italic; color: #555;">in the presence of (Student's Witness):</p>
          <div class="sign-row">
            <span class="field-label">Name:</span>
            <span class="field-line"></span>
          </div>
          <div class="sign-row" style="margin-top: 8px;">
            <span class="field-label">Date:</span>
            <span class="field-line" style="width: 150px; flex-grow: 0;"></span>
            <span style="margin-left: 10px; margin-right: 5px;">Signature:</span>
            <span class="field-line"></span>
          </div>
        </div>
        <div style="display: flex; flex-direction: column; justify-content: flex-end; align-items: center;">
          <div class="right-sign-line">Signature of Student</div>
        </div>
      </div>
      
      <!-- HTU block -->
      <div class="sign-block" style="display: flex; justify-content: space-between;">
        <div style="width: 60%; space-y-2;">
          <p class="sign-title">SIGNED on behalf of the HTU:</p>
          <div class="sign-row" style="margin-top: 6px;">
            <span class="field-label">Name:</span>
            <span class="field-line">${coordinatorName}</span>
          </div>
          <div class="sign-row" style="margin-top: 6px;">
            <span class="field-label">Designation:</span>
            <span class="field-line">Industrial Liaison Officer</span>
          </div>
          <div class="sign-row" style="margin-top: 6px;">
            <span class="field-label">Signature:</span>
            <span class="field-line" style="min-height: 25px;">
              ${signatureUrl ? `<img class="signature-img" src="${signatureUrl}" alt="Signature" />` : ""}
            </span>
          </div>
          <div class="sign-row" style="margin-top: 6px;">
            <span class="field-label">Date:</span>
            <span class="field-line">${dateStr}</span>
          </div>
        </div>
        <div style="display: flex; flex-direction: column; justify-content: flex-end; align-items: center;">
          <div class="right-sign-line">Industrial Liaison Office Stamp</div>
        </div>
      </div>
      
      <!-- Company block -->
      <div class="sign-block" style="display: flex; justify-content: space-between;">
        <div style="width: 60%;">
          <p class="sign-title">SIGNED on behalf of ${data.companyName}:</p>
          <p style="margin-bottom: 8px; font-style: italic; color: #555;">in the presence of (Witness):</p>
          <div class="sign-row">
            <span class="field-label">Name:</span>
            <span class="field-line"></span>
          </div>
          <div class="sign-row" style="margin-top: 8px;">
            <span class="field-label">Date:</span>
            <span class="field-line" style="width: 150px; flex-grow: 0;"></span>
            <span style="margin-left: 10px; margin-right: 5px;">Signature:</span>
            <span class="field-line"></span>
          </div>
        </div>
        <div style="display: flex; flex-direction: column; justify-content: flex-end; align-items: center;">
          <div class="right-sign-line">Signature Rep:</div>
        </div>
      </div>
    </div>
    
    <div class="footer-note">
      NB: Please scan this completed form and email to <strong style="color: #1e3a8a;">industrialliaison@htu.edu.gh</strong> or WhatsApp to <strong style="color: #1e3a8a;">0244 055762</strong> at the start of attachment.
    </div>
  </div>
</body>
</html>
  `;

  try {
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();
    } else {
      showPrintFallback(html, "Indemnity Form");
    }
  } catch (err) {
    console.warn("Failed to open Indemnity Form window, displaying in-app modal instead", err);
    showPrintFallback(html, "Indemnity Form");
  }
}
