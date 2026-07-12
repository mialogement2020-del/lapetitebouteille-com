import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";
import "./i18n";

const startMonitoring = () => {
  void import("./lib/perfReporter").then(({ initPerfReporter }) => initPerfReporter());
  void import("./lib/analytics").then(({ initAnalytics }) => initAnalytics());
};

const scheduleMonitoring = () => {
  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(startMonitoring, { timeout: 3000 });
    return;
  }

  window.setTimeout(startMonitoring, 1500);
};

// Initialize app
createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);

scheduleMonitoring();
