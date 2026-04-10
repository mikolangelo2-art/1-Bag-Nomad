import { StrictMode, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import "./posthogInit.js";
import "./theme/luxury-tokens.css";
import "./theme/luxury-animations.css";
import "./theme/luxury-app.css";
import "./index.css";
import App from "./App.jsx";

const MarketingLanding = lazy(() => import("./landing/MarketingLanding.jsx"));

const rawPath = window.location.pathname.replace(/\/$/, "") || "/";
const useMarketing = rawPath === "/marketing";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    {useMarketing ? (
      <Suspense fallback={null}>
        <MarketingLanding />
      </Suspense>
    ) : (
      <App />
    )}
  </StrictMode>
);
