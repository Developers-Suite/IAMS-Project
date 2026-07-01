const TEMPLATE_OVERRIDES_KEY = "iams_template_overrides";
const LOGBOOK_TEMPLATE_ID = "logbook-template";

function getLogbookTemplateOverride() {
  try {
    const raw = localStorage.getItem(TEMPLATE_OVERRIDES_KEY);
    if (!raw) return null;
    const all = JSON.parse(raw);
    return all?.[LOGBOOK_TEMPLATE_ID] ?? null;
  } catch {
    return null;
  }
}

export function openManualLogbookSheet(): void {
  const override = getLogbookTemplateOverride();
  const customInstructions = override?.body 
    ? `<div style="margin-bottom: 20px; font-size: 11px; color: #444; border: 1px solid #ddd; padding: 10px; border-radius: 4px; background: #fafafa; white-space: pre-wrap;">${override.body}</div>`
    : "";

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Printable Industrial Attachment Logbook Sheet</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Arial', sans-serif;
      line-height: 1.5;
      color: #333;
      padding: 0.5in;
      background: white;
    }
    @media print {
      body {
        margin: 0.3in;
        padding: 0;
      }
      .no-print {
        display: none !important;
      }
    }
    .container {
      max-width: 8.5in;
      margin: 0 auto;
      border: 1px solid #ccc;
      padding: 20px;
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
    .header-table {
      width: 100%;
      margin-top: 15px;
      margin-bottom: 20px;
      border-collapse: collapse;
    }
    .header-table td {
      padding: 6px;
      border: 1px solid #999;
      font-size: 11px;
    }
    .log-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 25px;
    }
    .log-table th, .log-table td {
      border: 1px solid #333;
      padding: 10px;
      text-align: left;
      font-size: 12px;
    }
    .log-table th {
      background-color: #f3f4f6;
      font-weight: bold;
    }
    .row-day {
      font-weight: bold;
      width: 15%;
    }
    .row-date {
      width: 15%;
    }
    .row-activities {
      height: 80px;
    }
    .row-remarks {
      width: 25%;
    }
    .sign-section {
      margin-top: 25px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      font-size: 11px;
    }
    .sign-box {
      border: 1px solid #999;
      padding: 12px;
      border-radius: 4px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="no-print" style="text-align: center;">
      <button class="print-button" onclick="window.print()">Print / Save as PDF</button>
    </div>
    
    <div style="text-align: center; border-bottom: 2px solid #1e3a8a; padding-bottom: 8px;">
      <img src="${window.location.origin}/HTULH.png" alt="HTU Letterhead" style="max-width: 100%; height: auto; max-height: 90px; object-fit: contain;" />
    </div>

    <h2 style="text-align: center; margin-top: 15px; font-size: 16px; text-transform: uppercase; color: #1e3a8a; margin-bottom: 15px;">
      Weekly Attachment Logbook Sheet
    </h2>

    ${customInstructions}

    <table class="header-table">
      <tr>
        <td style="width: 15%;"><strong>Student Name:</strong></td>
        <td style="width: 35%;"></td>
        <td style="width: 15%;"><strong>Index Number:</strong></td>
        <td style="width: 35%;"></td>
      </tr>
      <tr>
        <td><strong>Department:</strong></td>
        <td></td>
        <td><strong>Week Number:</strong></td>
        <td></td>
      </tr>
      <tr>
        <td><strong>Company Name:</strong></td>
        <td></td>
        <td><strong>Dates (From - To):</strong></td>
        <td></td>
      </tr>
    </table>

    <table class="log-table">
      <thead>
        <tr>
          <th>Day</th>
          <th>Date</th>
          <th>Description of Activities & Skills Acquired</th>
          <th>Supervisor's Initials / Stamp</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="row-day">MONDAY</td>
          <td class="row-date"></td>
          <td class="row-activities"></td>
          <td class="row-remarks"></td>
        </tr>
        <tr>
          <td class="row-day">TUESDAY</td>
          <td class="row-date"></td>
          <td class="row-activities"></td>
          <td class="row-remarks"></td>
        </tr>
        <tr>
          <td class="row-day">WEDNESDAY</td>
          <td class="row-date"></td>
          <td class="row-activities"></td>
          <td class="row-remarks"></td>
        </tr>
        <tr>
          <td class="row-day">THURSDAY</td>
          <td class="row-date"></td>
          <td class="row-activities"></td>
          <td class="row-remarks"></td>
        </tr>
        <tr>
          <td class="row-day">FRIDAY</td>
          <td class="row-date"></td>
          <td class="row-activities"></td>
          <td class="row-remarks"></td>
        </tr>
        <tr>
          <td class="row-day">SATURDAY</td>
          <td class="row-date"></td>
          <td class="row-activities"></td>
          <td class="row-remarks"></td>
        </tr>
      </tbody>
    </table>

    <div class="sign-section">
      <div class="sign-box">
        <h4 style="border-bottom: 1px solid #ccc; padding-bottom: 4px; margin-bottom: 6px; font-size: 12px; color: #1e3a8a;">
          Industry Supervisor
        </h4>
        <p style="margin-bottom: 12px;">Comments:</p>
        <div style="height: 35px; border-bottom: 1px dashed #999; margin-bottom: 12px;"></div>
        <p>Signature & Date: ___________________________</p>
      </div>
      <div class="sign-box">
        <h4 style="border-bottom: 1px solid #ccc; padding-bottom: 4px; margin-bottom: 6px; font-size: 12px; color: #1e3a8a;">
          Academic Supervisor / Coordinator
        </h4>
        <p style="margin-bottom: 12px;">Comments / Assessment:</p>
        <div style="height: 35px; border-bottom: 1px dashed #999; margin-bottom: 12px;"></div>
        <p>Signature & Date: ___________________________</p>
      </div>
    </div>
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
