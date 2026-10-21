import React from "react";
import { createRoot } from "react-dom/client";
import SelloraApp from "./SelloraApp";
import { GlobalFooter } from "./components/GlobalFooter";
import "./sellora-app.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <SelloraApp />
    <GlobalFooter />
  </React.StrictMode>
);
