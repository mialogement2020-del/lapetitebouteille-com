import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n";

// Initialize app
createRoot(document.getElementById("root")!).render(<App />);
