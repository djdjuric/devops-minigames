import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { DuckProvider } from "./components/DuckContext.jsx";
import "./styles.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <DuckProvider>
      <App />
    </DuckProvider>
  </StrictMode>,
);
