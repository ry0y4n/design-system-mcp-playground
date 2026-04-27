import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@design-system-mcp-playground/design-system/styles";
import "./styles.css";
import { App } from "./App.js";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
