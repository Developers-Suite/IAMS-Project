
// Override Date.prototype.toLocaleDateString globally to format en-GB dates as dd-mm-yyyy instead of dd/mm/yyyy
const originalToLocaleDateString = Date.prototype.toLocaleDateString;
Date.prototype.toLocaleDateString = function (
  locales?: Intl.LocalesArgument,
  options?: Intl.DateTimeFormatOptions
): string {
  const activeLocales = locales || "en-GB";
  if (
    activeLocales === "en-GB" ||
    (Array.isArray(activeLocales) && activeLocales.includes("en-GB")) ||
    (typeof activeLocales === "string" && activeLocales.startsWith("en-GB"))
  ) {
    if (!options) {
      const day = String(this.getDate()).padStart(2, "0");
      const month = String(this.getMonth() + 1).padStart(2, "0");
      const year = this.getFullYear();
      return `${day}-${month}-${year}`;
    }
    const result = originalToLocaleDateString.call(this, activeLocales, options);
    return result.replace(/\//g, "-");
  }
  return originalToLocaleDateString.call(this, activeLocales, options);
};

// Override Date.prototype.toLocaleString globally to format en-GB datetimes with hyphens
const originalToLocaleString = Date.prototype.toLocaleString;
Date.prototype.toLocaleString = function (
  locales?: Intl.LocalesArgument,
  options?: Intl.DateTimeFormatOptions
): string {
  const activeLocales = locales || "en-GB";
  if (
    activeLocales === "en-GB" ||
    (Array.isArray(activeLocales) && activeLocales.includes("en-GB")) ||
    (typeof activeLocales === "string" && activeLocales.startsWith("en-GB"))
  ) {
    const result = originalToLocaleString.call(this, activeLocales, options);
    return result.replace(/\//g, "-");
  }
  return originalToLocaleString.call(this, activeLocales, options);
};

import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  import "./styles/index.css";
  import { registerServiceWorker } from "./app/lib/pwa-utils";

  // After a new deploy, a stale tab may still hold JS chunk hashes that no
  // longer exist on the server. Force a one-time reload to fetch the fresh
  // index.html (and its correct chunk references) instead of showing a dead error.
  window.addEventListener("vite:preloadError", () => {
    const key = "iams_reloaded_after_preload_error";
    if (!sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, "1");
      window.location.reload();
    }
  });

  createRoot(document.getElementById("root")!).render(<App />);

  // Register SW after render so it doesn't block initial paint
  registerServiceWorker();
