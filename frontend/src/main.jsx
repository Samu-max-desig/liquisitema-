import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import ErrorBoundary from "./services/sistema/ErrorBoundary.jsx";
import { iniciarCapturadorGlobal } from "./services/sistema/errorHandler.js";

iniciarCapturadorGlobal();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
