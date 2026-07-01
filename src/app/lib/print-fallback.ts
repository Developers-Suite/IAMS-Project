/**
 * Fallback utilities for sandbox environments and pop-up blockers
 */

export function showPrintFallback(htmlContent: string, titleText: string): void {
  const overlay = document.createElement("div");
  overlay.style.position = "fixed";
  overlay.style.inset = "0";
  overlay.style.backgroundColor = "rgba(0,0,0,0.5)";
  overlay.style.zIndex = "99999";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.padding = "20px";

  const box = document.createElement("div");
  box.style.backgroundColor = "#fff";
  box.style.border = "1px solid #ccc";
  box.style.borderRadius = "12px";
  box.style.padding = "24px";
  box.style.width = "100%";
  box.style.maxWidth = "800px";
  box.style.height = "90vh";
  box.style.display = "flex";
  box.style.flexDirection = "column";
  box.style.boxShadow = "0 10px 25px rgba(0,0,0,0.2)";
  box.style.color = "#000";
  box.style.fontFamily = "sans-serif";

  const title = document.createElement("h3");
  title.innerText = `${titleText} (Popup Blocked Fallback)`;
  title.style.fontWeight = "bold";
  title.style.fontSize = "1.2rem";
  title.style.marginBottom = "10px";
  box.appendChild(title);

  const desc = document.createElement("p");
  desc.innerText = "Your browser blocked the pop-up print window. You can print the document below using the Print button:";
  desc.style.fontSize = "0.85rem";
  desc.style.color = "#666";
  desc.style.marginBottom = "12px";
  box.appendChild(desc);

  const iframe = document.createElement("iframe");
  iframe.style.width = "100%";
  iframe.style.flexGrow = "1";
  iframe.style.border = "1px solid #ddd";
  iframe.style.borderRadius = "6px";
  iframe.srcdoc = htmlContent;
  box.appendChild(iframe);

  const btnRow = document.createElement("div");
  btnRow.style.display = "flex";
  btnRow.style.justifyContent = "end";
  btnRow.style.gap = "10px";
  btnRow.style.marginTop = "15px";

  const closeBtn = document.createElement("button");
  closeBtn.innerText = "Close";
  closeBtn.style.padding = "8px 16px";
  closeBtn.style.borderRadius = "6px";
  closeBtn.style.border = "1px solid #ccc";
  closeBtn.style.backgroundColor = "transparent";
  closeBtn.style.cursor = "pointer";
  closeBtn.onclick = () => document.body.removeChild(overlay);
  btnRow.appendChild(closeBtn);

  const printBtn = document.createElement("button");
  printBtn.innerText = "Print / Save as PDF";
  printBtn.style.padding = "8px 16px";
  printBtn.style.borderRadius = "6px";
  printBtn.style.border = "none";
  printBtn.style.backgroundColor = "#1e3a8a";
  printBtn.style.color = "#fff";
  printBtn.style.fontWeight = "bold";
  printBtn.style.cursor = "pointer";
  printBtn.onclick = () => {
    iframe.contentWindow?.print();
  };
  btnRow.appendChild(printBtn);

  box.appendChild(btnRow);
  overlay.appendChild(box);
  document.body.appendChild(overlay);
}

export function showCSVFallback(csvContent: string, _filename: string): void {
  const overlay = document.createElement("div");
  overlay.style.position = "fixed";
  overlay.style.inset = "0";
  overlay.style.backgroundColor = "rgba(0,0,0,0.5)";
  overlay.style.zIndex = "99999";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.padding = "20px";

  const box = document.createElement("div");
  box.style.backgroundColor = "#fff";
  box.style.border = "1px solid #ccc";
  box.style.borderRadius = "12px";
  box.style.padding = "24px";
  box.style.width = "100%";
  box.style.maxWidth = "600px";
  box.style.boxShadow = "0 10px 25px rgba(0,0,0,0.2)";
  box.style.color = "#000";
  box.style.fontFamily = "sans-serif";

  const title = document.createElement("h3");
  title.innerText = "Export Data (Sandbox Fallback)";
  title.style.fontWeight = "bold";
  title.style.fontSize = "1.2rem";
  title.style.marginBottom = "10px";
  box.appendChild(title);

  const desc = document.createElement("p");
  desc.innerText = "Your browser environment blocked the automatic file download. You can copy the CSV content below and save it as a '.csv' file:";
  desc.style.fontSize = "0.85rem";
  desc.style.color = "#666";
  desc.style.marginBottom = "12px";
  box.appendChild(desc);

  const textarea = document.createElement("textarea");
  textarea.value = csvContent;
  textarea.readOnly = true;
  textarea.style.width = "100%";
  textarea.style.height = "250px";
  textarea.style.padding = "10px";
  textarea.style.fontFamily = "monospace";
  textarea.style.fontSize = "0.75rem";
  textarea.style.borderRadius = "6px";
  textarea.style.border = "1px solid #ccc";
  textarea.style.backgroundColor = "#f5f5f5";
  textarea.style.color = "#333";
  textarea.style.resize = "none";
  box.appendChild(textarea);

  const btnRow = document.createElement("div");
  btnRow.style.display = "flex";
  btnRow.style.justifyContent = "end";
  btnRow.style.gap = "10px";
  btnRow.style.marginTop = "15px";

  const closeBtn = document.createElement("button");
  closeBtn.innerText = "Close";
  closeBtn.style.padding = "8px 16px";
  closeBtn.style.borderRadius = "6px";
  closeBtn.style.border = "1px solid #ccc";
  closeBtn.style.backgroundColor = "transparent";
  closeBtn.style.cursor = "pointer";
  closeBtn.onclick = () => document.body.removeChild(overlay);
  btnRow.appendChild(closeBtn);

  const copyBtn = document.createElement("button");
  copyBtn.innerText = "Copy to Clipboard";
  copyBtn.style.padding = "8px 16px";
  copyBtn.style.borderRadius = "6px";
  copyBtn.style.border = "none";
  copyBtn.style.backgroundColor = "#1e3a8a";
  copyBtn.style.color = "#fff";
  copyBtn.style.fontWeight = "bold";
  copyBtn.style.cursor = "pointer";
  copyBtn.onclick = () => {
    navigator.clipboard.writeText(csvContent);
    copyBtn.innerText = "Copied!";
    setTimeout(() => { copyBtn.innerText = "Copy to Clipboard"; }, 2000);
  };
  btnRow.appendChild(copyBtn);

  box.appendChild(btnRow);
  overlay.appendChild(box);
  document.body.appendChild(overlay);
}
