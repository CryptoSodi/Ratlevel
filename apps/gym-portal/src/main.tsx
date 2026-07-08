import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { colors } from "@ratlevel/ui";

import { App } from "./App";
import "./styles/global.css";

// Brand tokens are injected as CSS variables so @ratlevel/ui stays the single
// source of truth for both products.
const root = document.documentElement;
for (const [key, value] of Object.entries(colors)) {
  root.style.setProperty(`--c-${key.replace(/([A-Z])/g, "-$1").toLowerCase()}`, value);
}

const container = document.getElementById("root");
if (!container) {
  throw new Error("Root element missing");
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>
);
