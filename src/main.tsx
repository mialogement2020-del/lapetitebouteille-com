import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";
import "./i18n";

const startMonitoring = () => {
  void Promise.all([
    import("./lib/perfReporter"),
    import("./lib/analytics"),
  ]).then(([perf, analytics]) => {
    perf.initPerfReporter();
    analytics.initAnalytics();
  });
};

const registerServiceWorker = () => {
  if (!("serviceWorker" in navigator)) return;

  navigator.serviceWorker.register("/sw.js").catch(() => {
    // Keep boot quiet if service workers are unavailable in the current browser.
  });
};

if ("requestIdleCallback" in window) {
  window.requestIdleCallback(startMonitoring, { timeout: 20000 });
  window.requestIdleCallback(registerServiceWorker, { timeout: 30000 });
} else {
  window.setTimeout(startMonitoring, 20000);
  window.setTimeout(registerServiceWorker, 30000);
}

// Initialize app
createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);
