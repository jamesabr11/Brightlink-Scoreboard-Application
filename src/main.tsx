import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css"; // <-- THIS IS THE MAGIC LINE
import { BRAND } from "./lib/branding";

document.title = `${BRAND.school} Scoreboard`;
document.documentElement.style.setProperty("--brand", BRAND.red);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
