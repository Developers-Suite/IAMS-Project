
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
